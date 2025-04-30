const { secret } = require('../config/secret');
const stripe = require('stripe')(secret.stripe_key);
const Order = require('../model/Order');
const { sendOrderConfirmation } = require('../services/emailService');

// create-payment-intent
exports.paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;
    const price = Number(product.price);
    const amount = price * 100;

    console.log('Creating payment intent with data:', JSON.stringify(product));

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

    // Add cart info if available
    if (
      product.cart &&
      Array.isArray(product.cart) &&
      product.cart.length > 0
    ) {
      // Store the first product title
      metadata.order_product = product.cart[0].title || 'Product Purchase';
      // Store total number of items
      metadata.order_item_count = String(product.cart.length);
    }

    console.log('Payment intent metadata:', metadata);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: amount,
      payment_method_types: ['card'],
      metadata: metadata,
    });

    console.log('Payment intent created:', paymentIntent.id);

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// addOrder
exports.addOrder = async (req, res, next) => {
  try {
    const orderItems = await Order.create(req.body);

    res.status(200).json({
      success: true,
      message: 'Order added successfully',
      order: orderItems,
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

exports.updateOrderStatus = async (req, res) => {
  const newStatus = req.body.status;
  try {
    await Order.updateOne(
      {
        _id: req.params.id,
      },
      {
        $set: {
          status: newStatus,
        },
      },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Handle Stripe webhook events
exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      secret.stripe_webhook_secret
    );

    console.log(`Webhook verified! Event type: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Return a 200 response immediately to acknowledge receipt of the event
  res.status(200).json({ received: true });

  // Handle the event asynchronously
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
        console.log('Payment intent metadata:', paymentIntent.metadata);

        // Extract order data from metadata
        const metadata = paymentIntent.metadata || {};

        // For dev/testing: Create a minimal order if metadata is insufficient
        // This ensures at least something is saved when a payment succeeds
        const minimalOrder = {
          name: metadata.order_name || metadata.email || 'Customer',
          email:
            metadata.order_email || metadata.email || 'customer@example.com',
          contact: metadata.order_contact || '1234567890',
          address: 'Address from payment',
          city: 'City',
          country: 'Country',
          zipCode: '12345',
          status: 'pending',
          paymentMethod: 'Card',
          cart: [
            {
              title: metadata.order_product || 'Product Purchase',
              price: paymentIntent.amount / 100,
              orderQuantity: 1,
            },
          ],
          subTotal: paymentIntent.amount / 100,
          shippingCost: 0,
          discount: 0,
          totalAmount: paymentIntent.amount / 100,
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
          },
          user: metadata.order_user || '645f748c1e46a19cbbe3b7c8', // Default user ID, replace with a valid one
        };

        try {
          // Create the order with minimal data
          const order = await Order.create(minimalOrder);
          console.log(`Order created from webhook: ${order._id}`);

          // Send confirmation email using email service
          const emailSent = await sendOrderConfirmation(order);

          // Update order to mark email as sent
          if (emailSent) {
            await Order.findByIdAndUpdate(order._id, { emailSent: true });
            console.log(`Confirmation email sent for order ${order._id}`);
          }
        } catch (error) {
          console.error('Error saving order:', error);
          // Log the complete error for debugging
          console.error('Full error details:', JSON.stringify(error, null, 2));
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log(`Payment failed: ${failedPaymentIntent.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    console.error('Full error stack:', error.stack);
  }
};
