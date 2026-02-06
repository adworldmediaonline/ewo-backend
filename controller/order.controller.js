import Stripe from 'stripe';
import { secret } from '../config/secret.js';
import Order from '../model/Order.js';
import Products from '../model/Products.js';
import Review from '../model/Review.js';
import CartTrackingService from '../services/cartTracking.service.js';
import {
  scheduleFeedbackEmail,
  sendDeliveryNotificationWithTracking,
  sendOrderCancellation,
  sendOrderConfirmation,
  sendShippingNotificationWithTracking,
  verifyEmailConfig,
} from '../services/emailService.js';
const stripe = new Stripe(secret.stripe_key);

// create-payment-intent
export const paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;

    // Get price from request
    const price = Number(product.price);

    // Extract orderData
    const orderData = product.orderData || {};

    // Extract cart, shipping cost, and tax
    const cart = product.cart || orderData.cart || [];
    const shippingCost = Number(orderData.shippingCost || 0);
    const tax = Number(orderData.tax || 0);
    const subTotal = Number(orderData.subTotal || price);
    const discount = Number(orderData.discount || 0);

    // Calculate total amount including tax
    const totalAmount = subTotal + shippingCost + tax - discount;

    // Try to get totalAmount directly from orderData if available
    let amount;
    if (orderData.totalAmount) {
      amount = Math.round(Number(orderData.totalAmount) * 100);
    } else {
      amount = Math.round(totalAmount * 100);
    }

    // Handle zero or negative amounts (free orders due to 100% discounts)
    if (amount <= 0) {
      return res.status(200).json({
        success: true,
        isFreeOrder: true,
        message: 'This is a free order - no payment required',
        totalAmount: amount / 100,
      });
    }

    // Stripe requires minimum $0.50 USD (50 cents)
    if (amount < 50) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be at least $0.50',
        totalAmount: amount / 100,
      });
    }

    // Prepare metadata
    const metadata = {};

    // Add basic fields directly
    metadata.email = product.email || '';

    // Add orderData fields with prefix
    if (orderData) {
      Object.keys(orderData).forEach(key => {
        const value = orderData[key];
        if (value !== undefined && value !== null) {
          metadata[`order_${key}`] = String(value).substring(0, 500);
        }
      });
    }

    // Prepare line items for Stripe Tax calculation
    const lineItems = [];

    // Add product line items
    if (cart && Array.isArray(cart) && cart.length > 0) {
      cart.forEach(item => {
        const itemPrice = Number(item.finalPriceDiscount || item.price || 0);
        const quantity = Number(item.orderQuantity || 1);
        const itemAmount = Math.round(itemPrice * quantity * 100); // Convert to cents

        if (itemAmount > 0) {
          lineItems.push({
            amount: itemAmount,
            reference: item._id?.toString() || item.productId?.toString() || `product_${item.title}`,
            tax_code: 'txcd_99999999', // General merchandise tax code
          });
        }
      });

      // Store the first product title
      metadata.order_product = cart[0].title || 'Product Purchase';
      // Store total number of items
      metadata.order_item_count = String(cart.length);

      // Store a simplified version of the cart for inventory management
      const simplifiedCart = cart.map(item => {
        const id = item._id
          ? item._id.toString()
          : item.productId
            ? item.productId.toString()
            : null;

        return {
          _id: id,
          title: item.title,
          price: item.price,
          orderQuantity: item.orderQuantity || 1,
        };
      });

      // Stringify and limit to Stripe metadata size constraints
      try {
        metadata.order_cart = JSON.stringify(simplifiedCart).substring(0, 500);
      } catch (error) { }
    }

    // Add shipping as a line item if shipping cost > 0
    if (shippingCost > 0) {
      lineItems.push({
        amount: Math.round(shippingCost * 100), // Convert to cents
        reference: 'shipping',
        tax_code: 'txcd_11061000', // Shipping tax code
      });
    }

    // Add tax as a line item if tax > 0
    if (tax > 0) {
      lineItems.push({
        amount: Math.round(tax * 100), // Convert to cents
        reference: 'tax',
        tax_code: 'txcd_99999999', // General tax code
      });
    }

    // Create payment intent parameters
    const paymentIntentParams = {
      currency: 'usd',
      amount: amount,
      payment_method_types: ['card'],
      metadata: metadata,
    };

    // If we have customer address and line items, create Stripe Tax calculation
    if (orderData.address && orderData.city && orderData.state && orderData.zipCode && orderData.country && lineItems.length > 0) {
      try {
        // Create Stripe Tax calculation
        const taxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: lineItems,
          customer_details: {
            address: {
              line1: orderData.address,
              city: orderData.city,
              state: orderData.state,
              postal_code: orderData.zipCode,
              country: orderData.country,
            },
            address_source: 'billing',
          },
        });

        // Attach tax calculation to payment intent
        paymentIntentParams.hooks = {
          inputs: {
            tax: {
              calculation: taxCalculation.id,
            },
          },
        };
      } catch (taxError) {
        // If tax calculation fails, log error but continue without tax calculation hook
        console.error('Stripe Tax calculation error:', taxError.message);
        // Continue with regular payment intent creation
      }
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    next(error);
  }
};

// addOrder - PRIMARY payment processing method (does not rely on webhooks)
export const addOrder = async (req, res, next) => {
  try {
    const orderData = req.body;


    // If this is a guest checkout (no user ID), ensure the field is set properly
    if (!orderData.user) {
      orderData.isGuestOrder = true;
    }

    // Fix appliedCoupons field mapping: convert 'discount' to 'discountAmount'
    if (orderData.appliedCoupons && Array.isArray(orderData.appliedCoupons)) {
      orderData.appliedCoupons = orderData.appliedCoupons.map(coupon => ({
        ...coupon,
        discountAmount: coupon.discount || coupon.discountAmount || 0,
        // Keep both fields for compatibility
        discount: coupon.discount || coupon.discountAmount || 0,
      }));
    }

    // PRIMARY PAYMENT PROCESSING: Capture and process payment intent data
    // This is the main payment processing flow - does NOT rely on webhooks
    let paymentIntentId = orderData.paymentIntentId;

    // Handle both paymentIntentId and paymentInfo fields from frontend
    if (!paymentIntentId && orderData.paymentInfo) {
      paymentIntentId = orderData.paymentInfo.id;
    }

    if (paymentIntentId && orderData.paymentMethod === 'Card') {
      try {
        // Retrieve the payment intent from Stripe to get complete information
        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId,
          {
            expand: ['charges.data.balance_transaction'],
          }
        );

        // Extract charge information (needed for refunds)
        let chargeData = null;
        if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data[0];
          chargeData = {
            chargeId: charge.id,
            receiptUrl: charge.receipt_url,
            receiptNumber: charge.receipt_number,
            paidAt: charge.created ? new Date(charge.created * 1000) : null,
            stripeFee: charge.balance_transaction
              ? charge.balance_transaction.fee
              : null,
            netAmount: charge.balance_transaction
              ? charge.balance_transaction.net
              : null,
          };

          // Extract payment method details (safe, non-sensitive info)
          if (charge.payment_method_details) {
            const pmDetails = charge.payment_method_details;
            chargeData.paymentMethodDetails = {
              type: pmDetails.type,
            };

            // Add card-specific details if available
            if (pmDetails.card) {
              chargeData.paymentMethodDetails.cardBrand = pmDetails.card.brand;
              chargeData.paymentMethodDetails.cardLast4 = pmDetails.card.last4;
              chargeData.paymentMethodDetails.cardExpMonth =
                pmDetails.card.exp_month;
              chargeData.paymentMethodDetails.cardExpYear =
                pmDetails.card.exp_year;
              chargeData.paymentMethodDetails.cardCountry =
                pmDetails.card.country;
              chargeData.paymentMethodDetails.cardFunding =
                pmDetails.card.funding;
            }
          }
        }

        // Structure the payment intent data for storage
        orderData.paymentIntent = {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          paymentMethodId: paymentIntent.payment_method,
          customerId: paymentIntent.customer,
          createdAt: paymentIntent.created
            ? new Date(paymentIntent.created * 1000)
            : null,
          refunds: [],
          // Include charge data if available
          ...chargeData,
          // Store original payment intent data for reference
          legacyData: {
            originalAmount: paymentIntent.amount,
            originalCurrency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
            processedViaAddOrder: true, // Mark as processed via primary flow
            frontendPaymentInfo: orderData.paymentInfo, // Store original frontend data
          },
        };
      } catch (stripeError) {
        console.error(
          '❌ Error retrieving payment intent from Stripe:',
          stripeError
        );

        // Fallback: Use payment intent data from frontend if available
        if (orderData.paymentInfo && orderData.paymentInfo.id) {
          orderData.paymentIntent = {
            id: orderData.paymentInfo.id,
            status: orderData.paymentInfo.status || 'succeeded',
            amount: orderData.paymentInfo.amount || orderData.totalAmount * 100,
            currency: orderData.paymentInfo.currency || 'usd',
            clientSecret: orderData.paymentInfo.client_secret,
            legacyData: {
              fallbackMode: true,
              processedViaAddOrder: true,
              frontendPaymentInfo: orderData.paymentInfo,
              stripeError: stripeError.message,
              note: 'Used frontend payment data due to Stripe API error',
            },
          };
        } else {
          // Last resort: Create minimal payment info
          orderData.paymentIntent = {
            id: paymentIntentId,
            status: 'unknown',
            amount: orderData.totalAmount * 100,
            currency: 'usd',
            legacyData: {
              error: stripeError.message,
              fallbackMode: true,
              processedViaAddOrder: true,
              frontendPaymentInfo: orderData.paymentInfo,
            },
          };
        }
      }
    } else if (orderData.paymentMethod === 'Free Order (100% Discount)') {
      // Handle free orders
      orderData.paymentIntent = {
        id: 'free-order-' + Date.now(),
        status: 'succeeded',
        amount: 0,
        currency: 'usd',
        legacyData: {
          freeOrder: true,
          reason: '100% discount applied',
          processedViaAddOrder: true,
        },
      };
    } else if (orderData.paymentMethod === 'COD') {
      // Handle Cash on Delivery orders
      orderData.paymentIntent = {
        id: 'cod-order-' + Date.now(),
        status: 'pending',
        amount: orderData.totalAmount * 100,
        currency: 'usd',
        legacyData: {
          codOrder: true,
          reason: 'Cash on Delivery',
          processedViaAddOrder: true,
        },
      };
    }

    // Clean up frontend-only fields before saving to database
    delete orderData.paymentInfo; // Remove frontend paymentInfo field
    delete orderData.isPaid; // Remove frontend isPaid field
    delete orderData.paidAt; // Remove frontend paidAt field

    const order = await Order.create(orderData);

    // Update product quantities
    await updateProductQuantities(order.cart);

    // Send confirmation email using email service
    const emailSent = await sendOrderConfirmation(order);

    // Update order to mark email as sent
    if (emailSent) {
      await Order.findByIdAndUpdate(order._id, { emailSent: true });
    }

    // Send purchase event to Meta Conversions API asynchronously
    setImmediate(() => {
      CartTrackingService.sendPurchaseToMeta(orderData, req).catch(error => {
        console.error('Meta Purchase API call failed (non-blocking):', error);
      });
    });

    res.status(200).json({
      success: true,
      message: 'Order added successfully',
      order: order,
    });
  } catch (error) {
    next(error);
  }
};

// get Orders - Optimized with pagination, search, and aggregation
export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build match query for aggregation
    const matchStage = {};

    // Add search filter if provided
    if (search) {
      matchStage.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { invoice: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
      ];
    }

    // Add status filter if provided
    if (status) {
      matchStage.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59.999)
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = endDateTime;
      }
    }

    // Use aggregation pipeline for better performance
    // Split into two parallel queries for better performance
    const [orderItems, totalResult] = await Promise.all([
      // Fetch orders with user data
      Order.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'user', // Collection name is 'user' (singular) as defined in User model
            localField: 'user',
            foreignField: '_id',
            as: 'userData',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  imageURL: '$image', // Map 'image' field to 'imageURL' for frontend compatibility
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'reviews', // Collection name for Review model
            localField: '_id',
            foreignField: 'orderId',
            as: 'reviews',
          },
        },
        {
          $addFields: {
            user: {
              $cond: {
                if: { $gt: [{ $size: '$userData' }, 0] },
                then: { $arrayElemAt: ['$userData', 0] },
                else: null,
              },
            },
            hasReview: {
              $gt: [{ $size: '$reviews' }, 0],
            },
            reviewCount: { $size: '$reviews' },
          },
        },
        {
          $unset: 'userData', // Remove temporary field
        },
      ]),
      // Get total count
      Order.aggregate([
        { $match: matchStage },
        { $count: 'count' },
      ]),
    ]);

    const orderItemsResult = orderItems || [];
    const total = totalResult[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: orderItemsResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// get Orders
export const getSingleOrder = async (req, res, next) => {
  try {
    const orderItem = await Order.findById(req.params.id).populate('user');

    res.status(200).json(orderItem);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  const { status: newStatus } = req.body;
  const orderId = req.params.id;

  try {
    // Get the current order to check previous status
    const currentOrder = await Order.findById(orderId).populate('user');

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update the order status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } },
      { new: true }
    ).populate('user');

    let emailResult = null;

    // If status changed to 'shipped' and shipping notification hasn't been sent
    if (newStatus === 'shipped' && !currentOrder.shippingNotificationSent) {
      // Prepare basic shipping data (can be enhanced with tracking info later)
      const basicShippingData = {
        shippedDate: new Date(),
        carrier: 'Standard Shipping',
        trackingNumber: 'Processing',
      };

      // Send shipping notification
      emailResult = await sendShippingNotificationWithTracking(
        orderId,
        basicShippingData
      );

      if (!emailResult.success) {
        console.warn(
          'Failed to send shipping notification:',
          emailResult.message
        );
        // Don't fail the status update if email fails
      }
    }

    // If status changed to 'delivered' and delivery notification hasn't been sent
    if (newStatus === 'delivered' && !currentOrder.deliveryNotificationSent) {
      // Prepare delivery data using existing shipping details
      const deliveryData = {
        deliveredDate: new Date(),
        trackingNumber: currentOrder.shippingDetails?.trackingNumber,
        carrier: currentOrder.shippingDetails?.carrier || 'Standard Shipping',
        trackingUrl: currentOrder.shippingDetails?.trackingUrl,
      };

      // Send delivery notification
      emailResult = await sendDeliveryNotificationWithTracking(
        orderId,
        deliveryData
      );

      if (!emailResult.success) {
        console.warn(
          'Failed to send delivery notification:',
          emailResult.message
        );
        // Don't fail the status update if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      emailSent: emailResult ? emailResult.success : false,
      emailMessage: emailResult ? emailResult.message : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send shipping notification with tracking details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const sendShippingNotification = async (req, res, next) => {
  const orderId = req.params.id; // Order ID from URL parameter
  const { trackingNumber, carrier, estimatedDelivery } = req.body; // Admin provides tracking info

  try {
    // Validate required fields
    if (!carrier) {
      return res.status(400).json({
        success: false,
        message: 'Carrier is required',
      });
    }

    // Prepare shipping data
    const shippingData = {
      trackingNumber: trackingNumber || null, // Tracking number from carrier (separate from order ID)
      carrier,
      estimatedDelivery: estimatedDelivery || null,
    };

    // Send shipping notification with tracking
    const result = await sendShippingNotificationWithTracking(
      orderId,
      shippingData
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          trackingNumber: result.trackingNumber,
          carrier: result.carrier,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send delivery notification for completed order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const sendDeliveryNotification = async (req, res, next) => {
  const orderId = req.params.id; // Order ID from URL parameter
  const { deliveredDate } = req.body; // Optional delivery date from admin

  try {
    // Validate order exists and is shipped
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: 'Order must be shipped before it can be marked as delivered',
      });
    }

    // Prepare delivery data
    const deliveryData = {
      deliveredDate: deliveredDate ? new Date(deliveredDate) : new Date(),
      trackingNumber: order.shippingDetails?.trackingNumber,
      carrier: order.shippingDetails?.carrier || 'Standard Shipping',
      trackingUrl: order.shippingDetails?.trackingUrl,
    };

    // Send delivery notification with tracking
    const result = await sendDeliveryNotificationWithTracking(
      orderId,
      deliveryData
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          deliveredDate: result.deliveredDate,
          trackingNumber: result.trackingNumber,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update order with shipping details and send notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateShippingDetails = async (req, res, next) => {
  const orderId = req.params.id;
  const {
    trackingNumber,
    carrier,
    trackingUrl,
    estimatedDelivery,
    sendEmail = true,
  } = req.body;

  try {
    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Prepare shipping details
    const shippingDetails = {
      trackingNumber:
        trackingNumber || order.shippingDetails?.trackingNumber || 'Processing',
      carrier: carrier || order.shippingDetails?.carrier || 'Standard Shipping',
      trackingUrl: trackingUrl || order.shippingDetails?.trackingUrl || null,
      estimatedDelivery: estimatedDelivery
        ? new Date(estimatedDelivery)
        : order.shippingDetails?.estimatedDelivery || null,
      shippedDate: order.shippingDetails?.shippedDate || new Date(),
    };

    // Update order with shipping details
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: 'shipped',
          shippingDetails: shippingDetails,
        },
      },
      { new: true }
    );

    let emailResult = null;

    // Send email if requested and not already sent
    if (sendEmail && !order.shippingNotificationSent) {
      emailResult = await sendShippingNotificationWithTracking(
        orderId,
        shippingDetails
      );
    }

    res.status(200).json({
      success: true,
      message: 'Shipping details updated successfully',
      data: {
        orderId: updatedOrder._id,
        status: updatedOrder.status,
        shippingDetails: updatedOrder.shippingDetails,
        emailSent: emailResult ? emailResult.success : false,
        emailMessage: emailResult
          ? emailResult.message
          : 'Email not requested or already sent',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product quantities after successful order
 * @param {Array} cartItems - Array of cart items with product info
 */
async function updateProductQuantities(cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return;
  }

  // Process each item in cart
  for (const item of cartItems) {
    try {
      // Get product ID - could be stored directly or as a string property
      let productId = item._id || item.productId || null;

      // If the item has a nested product object, try to get ID from there
      if (!productId && item.product && item.product._id) {
        productId = item.product._id;
      }

      if (!productId) {
        continue;
      }

      // Ensure productId is a string
      productId = productId.toString();

      const orderQuantity = parseInt(item.orderQuantity || 1, 10);

      // First check if product exists with direct find
      const product = await Products.findById(productId);

      if (!product) {
        continue;
      }

      // First update quantity
      const quantityResult = await Products.updateOne(
        { _id: productId },
        { $inc: { quantity: -orderQuantity } }
      );

      // Then update sellCount
      const sellCountResult = await Products.updateOne(
        { _id: productId },
        { $inc: { sellCount: orderQuantity } }
      );

      // Verify the updates
      const updatedProduct = await Products.findById(productId);

      if (!updatedProduct) {
        continue;
      }

      // Update status if needed
      if (
        updatedProduct.quantity <= 0 &&
        updatedProduct.status !== 'out-of-stock'
      ) {
        const statusResult = await Products.updateOne(
          { _id: productId },
          { $set: { status: 'out-of-stock' } }
        );
      }
    } catch (error) {
      console.error(`Error updating product inventory:`, error);
      console.error('Error stack:', error.stack);
    }
  }
}

/**
 * Build comprehensive payment intent data from Stripe payment intent
 * @param {Object} paymentIntent - Stripe payment intent object
 * @returns {Object} - Structured payment intent data
 */
async function buildPaymentIntentData(paymentIntent) {
  try {
    // Extract charge information (needed for refunds)
    let chargeData = {};
    if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
      const charge = paymentIntent.charges.data[0];
      chargeData = {
        chargeId: charge.id,
        receiptUrl: charge.receipt_url,
        receiptNumber: charge.receipt_number,
        paidAt: charge.created ? new Date(charge.created * 1000) : null,
        stripeFee: charge.balance_transaction
          ? charge.balance_transaction.fee
          : null,
        netAmount: charge.balance_transaction
          ? charge.balance_transaction.net
          : null,
      };

      // Extract payment method details (safe, non-sensitive info)
      if (charge.payment_method_details) {
        const pmDetails = charge.payment_method_details;
        chargeData.paymentMethodDetails = {
          type: pmDetails.type,
        };

        // Add card-specific details if available
        if (pmDetails.card) {
          chargeData.paymentMethodDetails.cardBrand = pmDetails.card.brand;
          chargeData.paymentMethodDetails.cardLast4 = pmDetails.card.last4;
          chargeData.paymentMethodDetails.cardExpMonth =
            pmDetails.card.exp_month;
          chargeData.paymentMethodDetails.cardExpYear = pmDetails.card.exp_year;
          chargeData.paymentMethodDetails.cardCountry = pmDetails.card.country;
          chargeData.paymentMethodDetails.cardFunding = pmDetails.card.funding;
        }
      }
    }

    // Structure the payment intent data for storage
    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      paymentMethodId: paymentIntent.payment_method,
      customerId: paymentIntent.customer,
      createdAt: paymentIntent.created
        ? new Date(paymentIntent.created * 1000)
        : null,
      refunds: [],
      // Include charge data if available
      ...chargeData,
      // Store original payment intent data for reference
      legacyData: {
        originalAmount: paymentIntent.amount,
        originalCurrency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        webhookProcessed: true,
      },
    };
  } catch (error) {
    // Return minimal data if processing fails
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      legacyData: {
        error: error.message,
        fallbackMode: true,
      },
    };
  }
}

// Add helper function for extracting client information
const extractClientInfo = req => {
  return {
    clientIpAddress:
      req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    clientUserAgent: req.headers['user-agent'],
    eventSourceUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    fbp: req.headers['fbp'] || req.body.fbp,
    fbc: req.headers['fbc'] || req.body.fbc,
  };
};

/**
 * Process refund for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const processRefund = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { amount, reason = 'requested_by_customer' } = req.body;

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order has payment intent data
    if (
      !order.paymentIntent ||
      (!order.paymentIntent.chargeId && !order.paymentIntent.id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have valid payment data for refund',
      });
    }

    // Validate refund amount
    const maxRefundAmount = order.totalAmount * 100; // Convert to cents
    const refundAmount = amount || maxRefundAmount;

    if (refundAmount > maxRefundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed the order total',
      });
    }

    // Calculate already refunded amount
    const alreadyRefunded = order.paymentIntent.refunds.reduce(
      (sum, refund) => sum + (refund.amount || 0),
      0
    );

    if (alreadyRefunded + refundAmount > maxRefundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds remaining refundable amount',
      });
    }

    // Process refund through Stripe
    let refund;
    try {
      if (order.paymentIntent.chargeId) {
        // Preferred method: Use charge ID

        refund = await stripe.refunds.create({
          charge: order.paymentIntent.chargeId,
          amount: refundAmount,
          reason: reason,
          metadata: {
            orderId: order._id.toString(),
            orderNumber: order.orderId || order._id.toString(),
          },
        });
      } else if (order.paymentIntent.id) {
        // Alternative method: Use payment intent ID

        // First, retrieve the payment intent to get the charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(
          order.paymentIntent.id,
          {
            expand: ['charges.data'],
          }
        );

        if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
          const chargeId = paymentIntent.charges.data[0].id;

          refund = await stripe.refunds.create({
            charge: chargeId,
            amount: refundAmount,
            reason: reason,
            metadata: {
              orderId: order._id.toString(),
              orderNumber: order.orderId || order._id.toString(),
            },
          });

          // Update order with the charge ID for future use
          await Order.findByIdAndUpdate(orderId, {
            $set: { 'paymentIntent.chargeId': chargeId },
          });
        } else {
          // For test mode or cases where charges aren't immediately available,
          // try using payment intent ID directly

          try {
            refund = await stripe.refunds.create({
              payment_intent: order.paymentIntent.id,
              amount: refundAmount,
              reason: reason,
              metadata: {
                orderId: order._id.toString(),
                orderNumber: order.orderId || order._id.toString(),
              },
            });
          } catch (directRefundError) {
            console.error(
              '❌ Direct payment intent refund failed:',
              directRefundError.message
            );
            throw new Error(
              `No charges found for this payment intent and direct refund failed: ${directRefundError.message}`
            );
          }
        }
      } else {
        throw new Error('No valid payment data found for refund');
      }
    } catch (stripeError) {
      return res.status(400).json({
        success: false,
        message: `Refund failed: ${stripeError.message}`,
      });
    }

    // Update order with refund information
    const refundData = {
      refundId: refund.id,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      createdAt: new Date(),
      receiptNumber: refund.receipt_number,
    };

    await Order.findByIdAndUpdate(
      orderId,
      {
        $push: { 'paymentIntent.refunds': refundData },
        $set: {
          status: refundAmount === maxRefundAmount ? 'cancel' : 'processing',
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        status: refund.status,
        receiptNumber: refund.receipt_number,
      },
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    next(error);
  }
};

/**
 * Cancel an order (full refund if paid)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason = 'requested_by_customer' } = req.body;

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is already cancelled
    if (order.status === 'cancel') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    // Check if order has been shipped
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that has been shipped or delivered',
      });
    }

    // Process refund if order was paid by card
    if (
      order.paymentMethod === 'Card' &&
      (order.paymentIntent?.chargeId || order.paymentIntent?.id)
    ) {
      try {
        let refund;

        if (order.paymentIntent.chargeId) {
          // Preferred method: Use charge ID
          refund = await stripe.refunds.create({
            charge: order.paymentIntent.chargeId,
            reason: reason,
            metadata: {
              orderId: order._id.toString(),
              orderNumber: order.orderId || order._id.toString(),
              cancellation: true,
            },
          });
        } else if (order.paymentIntent.id) {
          // Alternative method: Use payment intent ID

          // First, retrieve the payment intent to get the charge ID
          const paymentIntent = await stripe.paymentIntents.retrieve(
            order.paymentIntent.id,
            {
              expand: ['charges.data'],
            }
          );

          if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
            const chargeId = paymentIntent.charges.data[0].id;

            refund = await stripe.refunds.create({
              charge: chargeId,
              reason: reason,
              metadata: {
                orderId: order._id.toString(),
                orderNumber: order.orderId || order._id.toString(),
                cancellation: true,
              },
            });

            // Update order with the charge ID for future use
            await Order.findByIdAndUpdate(orderId, {
              $set: { 'paymentIntent.chargeId': chargeId },
            });
          } else {
            // For test mode or cases where charges aren't immediately available,
            // try using payment intent ID directly

            try {
              refund = await stripe.refunds.create({
                payment_intent: order.paymentIntent.id,
                reason: reason,
                metadata: {
                  orderId: order._id.toString(),
                  orderNumber: order.orderId || order._id.toString(),
                  cancellation: true,
                },
              });
            } catch (directRefundError) {
              throw new Error(
                `No charges found for this payment intent and direct cancellation refund failed: ${directRefundError.message}`
              );
            }
          }
        }

        // Update order with refund information
        const refundData = {
          refundId: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
          createdAt: new Date(),
          receiptNumber: refund.receipt_number,
        };

        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          {
            $push: { 'paymentIntent.refunds': refundData },
            $set: { status: 'cancel' },
          },
          { new: true }
        );

        // Send cancellation email
        const emailSent = await sendOrderCancellation(updatedOrder);
        if (emailSent) {
        } else {
        }

        res.status(200).json({
          success: true,
          message: 'Order cancelled and refund processed successfully',
          data: {
            refundId: refund.id,
            amount: refund.amount / 100, // Convert back to dollars
            status: refund.status,
            receiptNumber: refund.receipt_number,
            emailSent: emailSent,
          },
        });
      } catch (stripeError) {
        // Still cancel the order even if refund fails
        const cancelledOrder = await Order.findByIdAndUpdate(
          orderId,
          { status: 'cancel' },
          { new: true }
        );

        // Send cancellation email even if refund failed
        const emailSent = await sendOrderCancellation(cancelledOrder);

        res.status(200).json({
          success: true,
          message:
            'Order cancelled, but refund failed. Please process refund manually.',
          data: {
            refundError: stripeError.message,
            emailSent: emailSent,
          },
        });
      }
    } else {
      // Non-card payment or free order - just cancel
      const cancelledOrder = await Order.findByIdAndUpdate(
        orderId,
        { status: 'cancel' },
        { new: true }
      );

      // Send cancellation email for non-card orders
      const emailSent = await sendOrderCancellation(cancelledOrder);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          paymentMethod: order.paymentMethod,
          note: 'No refund processed - order was not paid by card',
          emailSent: emailSent,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment details for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getPaymentDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Extract payment details
    const paymentDetails = {
      orderId: order._id,
      orderNumber: order.orderId,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentIntent: order.paymentIntent
        ? {
          id: order.paymentIntent.id,
          status: order.paymentIntent.status,
          amount: order.paymentIntent.amount,
          currency: order.paymentIntent.currency,
          chargeId: order.paymentIntent.chargeId,
          receiptUrl: order.paymentIntent.receiptUrl,
          receiptNumber: order.paymentIntent.receiptNumber,
          paymentMethodDetails: order.paymentIntent.paymentMethodDetails,
          createdAt: order.paymentIntent.createdAt,
          paidAt: order.paymentIntent.paidAt,
          refunds: order.paymentIntent.refunds || [],
        }
        : null,
      refundable:
        order.paymentMethod === 'Card' &&
        (order.paymentIntent?.chargeId || order.paymentIntent?.id),
      refundedAmount:
        order.paymentIntent?.refunds?.reduce(
          (sum, refund) => sum + (refund.amount || 0),
          0
        ) || 0,
    };

    res.status(200).json({
      success: true,
      data: paymentDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger feedback email for delivered order (Admin only)
 * Manual trigger - only checks if review exists, not if automated email was sent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const triggerFeedbackEmail = async (req, res, next) => {
  const orderId = req.params.id; // Order ID from URL parameter

  try {
    // Import models
    const OrderModel = (await import('../model/Order.js')).default;
    const ReviewModel = (await import('../model/Review.js')).default;
    const { sendFeedbackEmail } = await import('../services/emailService.js');

    // Find the order
    const order = await OrderModel.findById(orderId).populate('user');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.email) {
      return res.status(400).json({
        success: false,
        message: 'Order has no email address',
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered before feedback can be requested',
      });
    }

    // Check if customer has already submitted a review
    const existingReview = await ReviewModel.findOne({ orderId: order._id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Customer has already submitted a review for this order',
      });
    }

    // Send the feedback email directly (no delay for manual trigger)
    try {
      const emailSent = await sendFeedbackEmail(order);

      if (emailSent) {
        // Optionally mark as sent (but don't prevent future manual sends)
        // We don't update feedbackEmailSent here since manual sends are independent
        res.status(200).json({
          success: true,
          message: 'Review request email sent successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send review request email. Please check email configuration.',
        });
      }
    } catch (emailError) {
      console.error('Error sending feedback email:', emailError);
      res.status(500).json({
        success: false,
        message: emailError?.message || 'Failed to send review request email. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Error in triggerFeedbackEmail:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'An unexpected error occurred while processing the request.',
    });
  }
};

// Diagnostic function for troubleshooting feedback email issues
export const diagnoseFeedbackEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const diagnostic = await diagnoseFeedbackEmail(id);

    res.status(200).json({
      success: true,
      diagnostic,
    });
  } catch (error) {
    next(error);
  }
};

// Verify email configuration
export const verifyEmailConfiguration = async (req, res, next) => {
  try {
    const isValid = await verifyEmailConfig();

    res.status(200).json({
      success: true,
      emailConfigValid: isValid,
      message: isValid
        ? 'Email configuration is valid'
        : 'Email configuration has issues',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send review request emails to multiple orders
 * Super Admin only - can send to all orders or filtered by date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const sendBulkReviewRequestEmails = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

    // Build match query for orders
    const matchStage = {
      status: 'delivered', // Only send to delivered orders
      email: { $exists: true, $ne: null, $ne: '' }, // Must have email
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = endDateTime;
      }
    }

    // Find all matching orders and check for reviews
    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'user',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'orderId',
          as: 'reviews',
        },
      },
      {
        $addFields: {
          hasReview: {
            $gt: [{ $size: '$reviews' }, 0],
          },
          user: {
            $cond: {
              if: { $gt: [{ $size: '$userData' }, 0] },
              then: {
                $let: {
                  vars: { userObj: { $arrayElemAt: ['$userData', 0] } },
                  in: {
                    _id: '$$userObj._id',
                    name: '$$userObj.name',
                    email: '$$userObj.email',
                    imageURL: '$$userObj.image',
                  },
                },
              },
              else: null,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orders found matching the criteria',
        totalOrders: 0,
        emailsSent: 0,
        emailsFailed: 0,
        skipped: 0,
      });
    }

    // Import email service functions
    let sendFeedbackEmail;
    try {
      const emailService = await import('../services/emailService.js');
      sendFeedbackEmail = emailService.sendFeedbackEmail;
      
      if (!sendFeedbackEmail || typeof sendFeedbackEmail !== 'function') {
        throw new Error('sendFeedbackEmail function not found in emailService');
      }
    } catch (importError) {
      console.error('Error importing email service:', importError);
      return res.status(500).json({
        success: false,
        message: 'Failed to load email service. Please check server configuration.',
        error: importError?.message || 'Unknown import error',
      });
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    let skipped = 0;
    const failedOrders = [];

    // Send emails to each order
    for (const order of orders) {
      try {
        // Skip if customer has already submitted a review
        if (order.hasReview) {
          skipped++;
          continue;
        }

        // Get full order document for email sending
        const OrderModel = (await import('../model/Order.js')).default;
        const fullOrder = await OrderModel.findById(order._id).populate('user');
        
        if (!fullOrder) {
          emailsFailed++;
          failedOrders.push({
            orderId: order.orderId || order._id,
            email: order.email,
            error: 'Order not found',
          });
          continue;
        }

        // Validate order has required fields
        if (!fullOrder.email) {
          emailsFailed++;
          failedOrders.push({
            orderId: order.orderId || order._id,
            email: order.email || 'No email',
            error: 'Order has no email address',
          });
          continue;
        }

        if (fullOrder.status !== 'delivered') {
          skipped++;
          continue;
        }

        // Send the feedback email
        try {
          const emailSent = await sendFeedbackEmail(fullOrder);

          if (emailSent) {
            emailsSent++;
            // Note: We don't update feedbackEmailSent here since manual sends are independent
            // The automated system will still mark it, but manual sends can happen regardless
          } else {
            emailsFailed++;
            failedOrders.push({
              orderId: order.orderId || order._id,
              email: order.email,
              error: 'Email service returned false',
            });
          }
        } catch (emailError) {
          console.error(`Error sending email to order ${order._id}:`, emailError);
          emailsFailed++;
          failedOrders.push({
            orderId: order.orderId || order._id,
            email: order.email,
            error: emailError?.message || 'Failed to send email',
          });
        }
      } catch (error) {
        console.error(`Error processing order ${order._id}:`, error);
        emailsFailed++;
        failedOrders.push({
          orderId: order.orderId || order._id,
          email: order.email,
          error: error?.message || 'Unknown error',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Review request emails processed. ${emailsSent} sent, ${emailsFailed} failed, ${skipped} skipped`,
      totalOrders: orders.length,
      emailsSent,
      emailsFailed,
      skipped,
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined,
    });
  } catch (error) {
    console.error('Error in sendBulkReviewRequestEmails:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'An unexpected error occurred while processing bulk review requests.',
      error: error?.message || 'Unknown error',
    });
  }
};
