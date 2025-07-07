const { secret } = require('../config/secret');
const stripe = require('stripe')(secret.stripe_key);
const Order = require('../model/Order');
const Products = require('../model/Products');
const {
  sendOrderConfirmation,
  sendShippingNotificationWithTracking,
  sendDeliveryNotificationWithTracking,
} = require('../services/emailService');
const CartTrackingService = require('../services/cartTracking.service');

// create-payment-intent
exports.paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;

    // Get price from request
    const price = Number(product.price);

    // Try to get totalAmount directly from orderData if available
    let amount;
    if (product.orderData && product.orderData.totalAmount) {
      const totalAmount = Number(product.orderData.totalAmount);
      amount = Math.round(totalAmount * 100);
      console.log(
        'Using orderData.totalAmount for Stripe payment:',
        totalAmount
      );
    } else {
      // Fallback to price
      amount = Math.round(price * 100);
      console.log('Using price for Stripe payment:', price);
    }

    console.log('Request body:', product);
    console.log('Final amount in cents for Stripe:', amount);

    // Handle zero or negative amounts (free orders due to 100% discounts)
    if (amount <= 0) {
      console.log(
        '🎁 Free order detected - amount is $0 or negative:',
        amount / 100
      );
      return res.status(200).json({
        success: true,
        isFreeOrder: true,
        message: 'This is a free order - no payment required',
        totalAmount: amount / 100,
      });
    }

    // Stripe requires minimum $0.50 USD (50 cents)
    if (amount < 50) {
      console.log('⚠️ Amount too low for Stripe processing:', amount / 100);
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
    if (product.orderData) {
      Object.keys(product.orderData).forEach(key => {
        const value = product.orderData[key];
        if (value !== undefined && value !== null) {
          metadata[`order_${key}`] = String(value).substring(0, 500);
        }
      });
    }

    // IMPORTANT: Check if cart is directly available
    const cart = product.cart || (product.orderData && product.orderData.cart);

    // Add cart info if available
    if (cart && Array.isArray(cart) && cart.length > 0) {
      // Store the first product title
      metadata.order_product = cart[0].title || 'Product Purchase';
      // Store total number of items
      metadata.order_item_count = String(cart.length);

      // Store a simplified version of the cart for inventory management
      const simplifiedCart = cart.map(item => {
        // Ensure we capture the product ID in a consistent format
        const id = item._id
          ? item._id.toString()
          : item.productId
          ? item.productId.toString()
          : null;

        console.log(`Cart item ${item.title} ID: ${id}`);

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
      } catch (error) {
        console.error('Error stringifying cart:', error);
      }
    } else {
      console.error('⚠️ NO CART DATA FOUND IN REQUEST:');
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: amount,
      payment_method_types: ['card'],
      metadata: metadata,
    });

    console.log('Payment intent created successfully:', paymentIntent.id);

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    next(error);
  }
};

// addOrder - PRIMARY payment processing method (does not rely on webhooks)
exports.addOrder = async (req, res, next) => {
  try {
    const orderData = req.body;

    // Log the incoming order data for debugging
    console.log('📋 Processing Order (Primary Payment Flow):', {
      subTotal: orderData.subTotal,
      shippingCost: orderData.shippingCost,
      discount: orderData.discount,
      firstTimeDiscount: orderData.firstTimeDiscount,
      totalAmount: orderData.totalAmount,
      appliedCoupons: orderData.appliedCoupons,
      appliedCouponsCount: orderData.appliedCoupons?.length || 0,
      paymentIntentId: orderData.paymentIntentId,
      paymentMethod: orderData.paymentMethod,
      hasPaymentInfo: !!orderData.paymentInfo,
      paymentInfoId: orderData.paymentInfo?.id,
      isPaid: orderData.isPaid,
      paidAt: orderData.paidAt,
    });

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

    console.log('🎫 Fixed appliedCoupons data:', orderData.appliedCoupons);

    // PRIMARY PAYMENT PROCESSING: Capture and process payment intent data
    // This is the main payment processing flow - does NOT rely on webhooks
    let paymentIntentId = orderData.paymentIntentId;

    // Handle both paymentIntentId and paymentInfo fields from frontend
    if (!paymentIntentId && orderData.paymentInfo) {
      paymentIntentId = orderData.paymentInfo.id;
      console.log(
        '🔄 Extracted payment intent ID from paymentInfo:',
        paymentIntentId
      );
    }

    if (paymentIntentId && orderData.paymentMethod === 'Card') {
      try {
        console.log(
          '💳 Processing Stripe payment intent (Primary Flow):',
          paymentIntentId
        );

        // Retrieve the payment intent from Stripe to get complete information
        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId,
          {
            expand: ['charges.data.balance_transaction'],
          }
        );

        console.log('🔍 Retrieved payment intent:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          charges: paymentIntent.charges?.data?.length || 0,
        });

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

        console.log(
          '✅ Enhanced payment intent data prepared (Primary Flow):',
          {
            id: orderData.paymentIntent.id,
            chargeId: orderData.paymentIntent.chargeId,
            status: orderData.paymentIntent.status,
            amount: orderData.paymentIntent.amount,
            receiptUrl: orderData.paymentIntent.receiptUrl,
          }
        );
      } catch (stripeError) {
        console.error(
          '❌ Error retrieving payment intent from Stripe:',
          stripeError
        );

        // Fallback: Use payment intent data from frontend if available
        if (orderData.paymentInfo && orderData.paymentInfo.id) {
          console.log('🔄 Using fallback payment info from frontend');
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

    console.log('✅ Order Created in Database (Primary Flow):', {
      _id: order._id,
      subTotal: order.subTotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      firstTimeDiscount: order.firstTimeDiscount,
      totalAmount: order.totalAmount,
      appliedCoupons: order.appliedCoupons,
      appliedCouponsCount: order.appliedCoupons?.length || 0,
      paymentIntentId: order.paymentIntent?.id,
      chargeId: order.paymentIntent?.chargeId,
      paymentMethod: order.paymentMethod,
    });

    // Update product quantities
    await updateProductQuantities(order.cart);

    // Send confirmation email using email service
    console.log('📧 Sending order confirmation email:', {
      _id: order._id,
      email: order.email,
      paymentMethod: order.paymentMethod,
    });

    const emailSent = await sendOrderConfirmation(order);

    // Update order to mark email as sent
    if (emailSent) {
      await Order.findByIdAndUpdate(order._id, { emailSent: true });
    }

    // Send purchase event to Meta Conversions API asynchronously
    setImmediate(() => {
      CartTrackingService.sendPurchaseToMeta(orderData, req).catch(error => {
        console.error(
          'Meta Purchase API call failed (non-blocking):',
          error.message
        );
      });
    });

    res.status(200).json({
      success: true,
      message: 'Order added successfully',
      order: order,
    });
  } catch (error) {
    console.log('❌ Error in addOrder (Primary Flow):', error);
    next(error);
  }
};

// get Orders
exports.getOrders = async (req, res, next) => {
  try {
    const orderItems = await Order.find({})
      .populate('user')
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orderItems,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get Orders
exports.getSingleOrder = async (req, res, next) => {
  try {
    const orderItem = await Order.findById(req.params.id).populate('user');
    res.status(200).json(orderItem);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
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
    console.error('Error updating order status:', error);
    next(error);
  }
};

/**
 * Send shipping notification with tracking details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.sendShippingNotification = async (req, res, next) => {
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
    console.error('Error in sendShippingNotification controller:', error);
    next(error);
  }
};

/**
 * Send delivery notification for completed order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.sendDeliveryNotification = async (req, res, next) => {
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
    console.error('Error in sendDeliveryNotification controller:', error);
    next(error);
  }
};

/**
 * Update order with shipping details and send notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateShippingDetails = async (req, res, next) => {
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
    console.error('Error updating shipping details:', error);
    next(error);
  }
};

/**
 * Update product quantities after successful order
 * @param {Array} cartItems - Array of cart items with product info
 */
async function updateProductQuantities(cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    console.log('No cart items to update quantities for');
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
      console.log(`Finding product with ID: "${productId}"`);
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

// Handle Stripe webhook events (OPTIONAL - not required for core functionality)
exports.handleStripeWebhook = async (req, res) => {
  // NOTE: This webhook handler is optional and not required for core payment functionality
  // All payment data is captured during order creation in the addOrder method
  // This webhook can be used in the future for additional payment event handling

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      secret.stripe_webhook_secret
    );
    console.log('📡 Webhook event received:', event.type);
  } catch (err) {
    console.log('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event asynchronously (optional processing)
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(
          '💳 Payment intent succeeded via webhook:',
          paymentIntent.id
        );

        // Optional: Update order status or perform additional processing
        // Note: Primary order creation happens in addOrder method, not here

        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log(
          '❌ Payment intent failed via webhook:',
          failedPaymentIntent.id
        );

        // Optional: Handle failed payments
        // Note: This is supplementary to main order processing

        break;

      default:
        console.log(`📋 Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`❌ Error processing webhook: ${error.message}`);
    // Don't fail the webhook response - just log the error
  }

  // Always respond with success to acknowledge webhook receipt
  res.status(200).json({ received: true });
};

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
    console.error('Error building payment intent data:', error);
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
exports.processRefund = async (req, res, next) => {
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

    console.log('💸 Processing refund:', {
      orderId: order._id,
      chargeId: order.paymentIntent.chargeId,
      paymentIntentId: order.paymentIntent.id,
      refundAmount: refundAmount,
      reason: reason,
    });

    // Process refund through Stripe
    let refund;
    try {
      if (order.paymentIntent.chargeId) {
        // Preferred method: Use charge ID
        console.log(
          '💳 Using charge ID for refund:',
          order.paymentIntent.chargeId
        );
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
        console.log(
          '💳 Using payment intent ID for refund:',
          order.paymentIntent.id
        );

        // First, retrieve the payment intent to get the charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(
          order.paymentIntent.id,
          {
            expand: ['charges.data'],
          }
        );

        console.log('🔍 Payment Intent retrieved:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          chargesCount: paymentIntent.charges?.data?.length || 0,
          charges:
            paymentIntent.charges?.data?.map(charge => ({
              id: charge.id,
              status: charge.status,
              amount: charge.amount,
            })) || [],
        });

        if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
          const chargeId = paymentIntent.charges.data[0].id;
          console.log('💳 Retrieved charge ID from payment intent:', chargeId);

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
          console.log(
            '⚠️ No charges found, trying payment intent refund directly'
          );

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
            console.log('✅ Refund created using payment intent ID directly');
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
      console.error('❌ Stripe refund error:', stripeError);
      return res.status(400).json({
        success: false,
        message: `Refund failed: ${stripeError.message}`,
      });
    }

    console.log('✅ Stripe refund processed:', {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });

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
exports.cancelOrder = async (req, res, next) => {
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

    console.log('🚫 Cancelling order:', {
      orderId: order._id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
    });

    // Process refund if order was paid by card
    if (
      order.paymentMethod === 'Card' &&
      (order.paymentIntent?.chargeId || order.paymentIntent?.id)
    ) {
      try {
        let refund;

        if (order.paymentIntent.chargeId) {
          // Preferred method: Use charge ID
          console.log(
            '💳 Using charge ID for cancellation refund:',
            order.paymentIntent.chargeId
          );
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
          console.log(
            '💳 Using payment intent ID for cancellation refund:',
            order.paymentIntent.id
          );

          // First, retrieve the payment intent to get the charge ID
          const paymentIntent = await stripe.paymentIntents.retrieve(
            order.paymentIntent.id,
            {
              expand: ['charges.data'],
            }
          );

          if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
            const chargeId = paymentIntent.charges.data[0].id;
            console.log(
              '💳 Retrieved charge ID from payment intent for cancellation:',
              chargeId
            );

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
            console.log(
              '⚠️ No charges found for cancellation, trying payment intent refund directly'
            );

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
              console.log(
                '✅ Cancellation refund created using payment intent ID directly'
              );
            } catch (directRefundError) {
              console.error(
                '❌ Direct payment intent cancellation refund failed:',
                directRefundError.message
              );
              throw new Error(
                `No charges found for this payment intent and direct cancellation refund failed: ${directRefundError.message}`
              );
            }
          }
        }

        console.log('✅ Cancellation refund processed:', {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status,
        });

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
            $set: { status: 'cancel' },
          },
          { new: true }
        );

        res.status(200).json({
          success: true,
          message: 'Order cancelled and refund processed successfully',
          data: {
            refundId: refund.id,
            amount: refund.amount / 100, // Convert back to dollars
            status: refund.status,
            receiptNumber: refund.receipt_number,
          },
        });
      } catch (stripeError) {
        console.error('Error processing cancellation refund:', stripeError);

        // Still cancel the order even if refund fails
        await Order.findByIdAndUpdate(orderId, { status: 'cancel' });

        res.status(200).json({
          success: true,
          message:
            'Order cancelled, but refund failed. Please process refund manually.',
          data: {
            refundError: stripeError.message,
          },
        });
      }
    } else {
      // Non-card payment or free order - just cancel
      await Order.findByIdAndUpdate(orderId, { status: 'cancel' });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          paymentMethod: order.paymentMethod,
          note: 'No refund processed - order was not paid by card',
        },
      });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    next(error);
  }
};

/**
 * Get payment details for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getPaymentDetails = async (req, res, next) => {
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
    console.error('Error getting payment details:', error);
    next(error);
  }
};
