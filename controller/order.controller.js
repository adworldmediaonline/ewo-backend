const { secret } = require('../config/secret');
const stripe = require('stripe')(secret.stripe_key);
const Order = require('../model/Order');
const Products = require('../model/Products');
const {
  sendOrderConfirmation,
  sendShippingNotificationWithTracking,
  sendDeliveryNotificationWithTracking,
} = require('../services/emailService');

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

// addOrder
exports.addOrder = async (req, res, next) => {
  try {
    const orderData = req.body;

    // Log the incoming order data for debugging
    console.log('📋 Incoming Order Data:', {
      subTotal: orderData.subTotal,
      shippingCost: orderData.shippingCost,
      discount: orderData.discount,
      firstTimeDiscount: orderData.firstTimeDiscount,
      totalAmount: orderData.totalAmount,
    });

    // If this is a guest checkout (no user ID), ensure the field is set properly
    if (!orderData.user) {
      orderData.isGuestOrder = true;
    }

    const order = await Order.create(orderData);

    console.log('✅ Order Created in Database:', {
      _id: order._id,
      subTotal: order.subTotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      firstTimeDiscount: order.firstTimeDiscount,
      totalAmount: order.totalAmount,
    });

    // Update product quantities
    await updateProductQuantities(order.cart);

    // Send confirmation email using email service
    const emailSent = await sendOrderConfirmation(order);

    // Update order to mark email as sent
    if (emailSent) {
      await Order.findByIdAndUpdate(order._id, { emailSent: true });
    }

    res.status(200).json({
      success: true,
      message: 'Order added successfully',
      order: order,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get Orders
exports.getOrders = async (req, res, next) => {
  try {
    const orderItems = await Order.find({}).populate('user');
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

// later user
// Handle Stripe webhook events
exports.handleStripeWebhook = async (req, res) => {
  // console.log('Stripe signature header:', req.headers['stripe-signature']);
  // console.log('Stripe webhook secret:', secret.stripe_webhook_secret);
  // console.log('Raw body (length):', req.body.length);
  // console.log('Webhook body (should be Buffer):', Buffer.isBuffer(req.body));
  // res.status(200).json({ received: true });
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      secret.stripe_webhook_secret
      // process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('event');
    console.log('signature', signature);
  } catch (err) {
    console.log('err', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('event successfully verified');
  // Handle the event asynchronously
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;

        // Extract order data from metadata
        const metadata = paymentIntent.metadata || {};

        // Parse cart data if available in metadata
        let cartItems = [];
        if (metadata.order_cart) {
          try {
            cartItems = JSON.parse(metadata.order_cart);

            // Ensure product IDs are correctly formatted
            cartItems = cartItems.map(item => {
              // If ID is present, ensure it's a string
              if (item._id) {
                item._id = item._id.toString();
              }
              return item;
            });
          } catch (error) {
            console.error('Failed to parse cart data:', error);
          }
        } else {
          // If we have a product name but no cart data, try to find the product by name/title
          if (metadata.order_product) {
            try {
              const product = await Products.findOne({
                title: { $regex: new RegExp(metadata.order_product, 'i') },
              });

              if (product) {
                cartItems = [
                  {
                    _id: product._id.toString(),
                    title: product.title,
                    price: paymentIntent.amount / 100,
                    orderQuantity: 1,
                  },
                ];
              } else {
              }
            } catch (error) {
              console.error('Error finding product by title:', error);
            }
          }
        }

        // For dev/testing: Create a minimal order if metadata is insufficient
        // This ensures at least something is saved when a payment succeeds
        const minimalOrder = {
          name: metadata.order_name || metadata.email || 'Customer',
          email:
            metadata.order_email || metadata.email || 'customer@example.com',
          contact: metadata.order_contact || '1234567890',
          address: metadata.order_address || 'Address from payment',
          city: metadata.order_city || 'City',
          country: metadata.order_country || 'Country',
          zipCode: metadata.order_zipCode || '12345',
          status: 'pending',
          paymentMethod: 'Card',
          cart:
            cartItems.length > 0
              ? cartItems
              : [
                  {
                    title: metadata.order_product,
                    price: paymentIntent.amount / 100,
                    orderQuantity: 1,
                  },
                ],
          subTotal: paymentIntent.amount / 100,
          shippingCost: Number(metadata.order_shippingCost || 0),
          discount: Number(metadata.order_discount || 0),
          totalAmount: paymentIntent.amount / 100,
          state: metadata.order_state || 'pending',
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
          },
          isGuestOrder: !metadata.order_user,
          user: metadata.order_user || undefined, // Make it undefined for guest checkout
        };

        try {
          // Create the order with minimal data
          const order = await Order.create(minimalOrder);

          // Check product IDs in cart
          const productIds = order.cart.map(item => item._id).filter(Boolean);

          // Update product quantities
          await updateProductQuantities(order.cart);
          console.log('order', order);
          // Send confirmation email using email service
          const emailSent = await sendOrderConfirmation(order);

          // Update order to mark email as sent
          if (emailSent) {
            await Order.findByIdAndUpdate(order._id, { emailSent: true });
          }
        } catch (error) {
          console.log(error);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
  }
  res.status(200).json({ received: true });
};
