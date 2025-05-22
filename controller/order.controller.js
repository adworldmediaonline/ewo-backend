const { secret } = require('../config/secret');
const stripe = require('stripe')(secret.stripe_key);
const Order = require('../model/Order');
const Products = require('../model/Products');
const { sendOrderConfirmation } = require('../services/emailService');

// create-payment-intent
exports.paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;
    const price = Number(product.price);
    const amount = price * 100;

    // Prepare metadata
    const metadata = {};

    // Add basic fields directly
    metadata.email = product.email || '';

    // IMPORTANT: Store the orderReferenceId for duplicate prevention
    if (product.orderData?.orderReferenceId) {
      metadata.orderReferenceId = product.orderData.orderReferenceId;
      console.log(
        'Setting orderReferenceId in payment intent metadata:',
        metadata.orderReferenceId
      );
    }

    // Add orderData fields with prefix
    if (product.orderData) {
      Object.keys(product.orderData).forEach(key => {
        const value = product.orderData[key];
        if (value !== undefined && value !== null) {
          // Directly add common fields that Stripe might use
          if (
            [
              'email',
              'name',
              'address',
              'city',
              'state',
              'country',
              'zipCode',
            ].includes(key)
          ) {
            metadata[key] = String(value).substring(0, 500);
          } else {
            // Add other fields with prefix
            metadata[`order_${key}`] = String(value).substring(0, 500);
          }
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

    console.log(
      'Creating payment intent with metadata:',
      JSON.stringify(metadata)
    );

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: amount,
      payment_method_types: ['card'],
      metadata: metadata,
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    next(error);
  }
};

// addOrder
exports.addOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    console.log(
      'Received order creation request with reference ID:',
      orderData.orderReferenceId
    );

    // Check if we have a reference ID
    if (orderData.orderReferenceId) {
      // Look for an existing order with this reference ID
      const existingOrder = await Order.findOne({
        orderReferenceId: orderData.orderReferenceId,
      });

      if (existingOrder) {
        console.log(
          `Order with reference ID ${orderData.orderReferenceId} already exists. Returning existing order.`
        );
        // Return the existing order if found
        return res.status(200).json({
          success: true,
          message: 'Order already exists',
          order: existingOrder,
        });
      }

      // Also check for orders created in the last minute with the same email and amount
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentOrders = await Order.find({
        createdAt: { $gte: oneMinuteAgo },
        email: orderData.email,
      });

      const matchingOrder = recentOrders.find(order => {
        return Math.abs(order.totalAmount - orderData.totalAmount) < 1;
      });

      if (matchingOrder) {
        console.log(
          `Found matching recent order with ID ${matchingOrder._id}. Returning existing order.`
        );
        return res.status(200).json({
          success: true,
          message: 'Order already exists',
          order: matchingOrder,
        });
      }
    }

    // If this is a guest checkout (no user ID), ensure the field is set properly
    if (!orderData.user) {
      orderData.isGuestOrder = true;
    }

    console.log(
      'Creating new order with reference ID:',
      orderData.orderReferenceId
    );
    const orderItems = await Order.create(orderData);

    // Check if we should update product quantities immediately
    // This happens for non-Stripe payments like COD
    if (
      orderData.paymentMethod !== 'Card' ||
      (orderData.isPaid && orderData.paymentIntent)
    ) {
      console.log('Updating product quantities for completed order');
      await updateProductQuantities(orderData.cart);
    }

    res.status(200).json({
      success: true,
      message: 'Order added successfully',
      order: orderItems,
    });
  } catch (error) {
    console.error('Add order error:', error);
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
    console.error('Get orders error:', error);
    next(error);
  }
};

// get Orders
exports.getSingleOrder = async (req, res, next) => {
  try {
    const orderItem = await Order.findById(req.params.id).populate('user');
    res.status(200).json(orderItem);
  } catch (error) {
    console.error('Get single order error:', error);
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
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
    console.error('Update order status error:', error);
    next(error);
  }
};

// Handle Stripe webhook events
exports.handleStripeWebhook = async (req, res) => {
  console.log('Stripe webhook received');
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      secret.stripe_webhook_secret
    );
  } catch (err) {
    console.log('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Event type: ${event.type}`);

  // Handle the event asynchronously
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;

        // Extract order data from metadata
        const metadata = paymentIntent.metadata || {};
        console.log('Payment intent metadata:', JSON.stringify(metadata));

        // Check if we have a reference ID from the frontend
        const orderReferenceId = metadata.orderReferenceId;
        console.log('Order reference ID from webhook:', orderReferenceId);

        if (!orderReferenceId) {
          console.log(
            'No order reference ID found in webhook, skipping order update'
          );
          return res.status(200).json({ received: true, noReference: true });
        }

        // Try to find the order by reference ID
        let existingOrder = await Order.findOne({
          orderReferenceId: orderReferenceId,
        });

        // If no order found by reference ID, try to find by other means
        if (!existingOrder) {
          console.log(
            `No order found with reference ID ${orderReferenceId}, checking recent orders`
          );

          // Check for orders created in the last 5 minutes with matching email
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const recentOrders = await Order.find({
            createdAt: { $gte: fiveMinutesAgo },
          });

          console.log(`Found ${recentOrders.length} recent orders`);

          // Check if any recent order matches the email and amount
          const matchingOrder = recentOrders.find(order => {
            const sameEmail =
              order.email === (metadata.email || metadata.order_email);
            const sameAmount =
              Math.abs(order.totalAmount - paymentIntent.amount / 100) < 1;
            return sameEmail && sameAmount;
          });

          if (matchingOrder) {
            console.log(
              `Found matching recent order with ID ${matchingOrder._id}`
            );
            existingOrder = matchingOrder;
          } else {
            console.log(
              'No matching order found, webhook will not create a new order'
            );
            return res
              .status(200)
              .json({ received: true, noMatchingOrder: true });
          }
        }

        // Update the existing order with payment information
        console.log(
          `Updating order ${existingOrder._id} with payment information`
        );

        const updatedOrder = await Order.findByIdAndUpdate(
          existingOrder._id,
          {
            $set: {
              paymentIntent: {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                status: paymentIntent.status,
              },
              isPaid: true,
              paidAt: new Date(),
              status: 'processing',
            },
          },
          { new: true }
        );

        // Update product quantities based on the order
        if (updatedOrder && updatedOrder.cart && updatedOrder.cart.length > 0) {
          await updateProductQuantities(updatedOrder.cart);
        }

        // Send confirmation email
        const emailSent = await sendOrderConfirmation(updatedOrder);

        // Update order to mark email as sent
        if (emailSent) {
          await Order.findByIdAndUpdate(updatedOrder._id, { emailSent: true });
        }

        console.log(
          `Order ${updatedOrder._id} successfully updated by webhook`
        );
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        // You can handle failed payments here
        console.log(`Payment failed for intent ${failedPaymentIntent.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    console.error(error.stack);
  }

  res.status(200).json({ received: true });
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

  console.log(`Updating quantities for ${cartItems.length} products`);

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
        console.log('No product ID found for item:', item.title);
        continue;
      }

      // Ensure productId is a string
      productId = productId.toString();

      const orderQuantity = parseInt(item.orderQuantity || 1, 10);

      console.log(
        `Updating product ${productId} (${item.title}): reducing quantity by ${orderQuantity}`
      );

      // Find the product first to get current quantities
      const product = await Products.findById(productId);

      if (!product) {
        console.log(`Product with ID ${productId} not found`);
        continue;
      }

      // Calculate new quantity, ensuring it doesn't go below 0
      const newQuantity = Math.max(0, product.quantity - orderQuantity);
      const newSellCount = product.sellCount + orderQuantity;

      // Update both quantity and sellCount in one operation
      const updateResult = await Products.findByIdAndUpdate(
        productId,
        {
          quantity: newQuantity,
          sellCount: newSellCount,
          // Update status if needed
          ...(newQuantity <= 0 ? { status: 'out-of-stock' } : {}),
        },
        { new: true }
      );

      console.log(
        `Updated product ${productId}: new quantity = ${updateResult.quantity}, sellCount = ${updateResult.sellCount}`
      );
    } catch (error) {
      console.error(`Error updating product inventory:`, error);
      console.error('Error details:', error.message);
    }
  }
}
