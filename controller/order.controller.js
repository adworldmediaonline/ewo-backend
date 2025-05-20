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
    const orderData = req.body;

    // If this is a guest checkout (no user ID), ensure the field is set properly
    if (!orderData.user) {
      orderData.isGuestOrder = true;
    }

    const orderItems = await Order.create(orderData);

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
  console.log('Stripe signature header:', req.headers['stripe-signature']);
  console.log('Stripe webhook secret:', secret.stripe_webhook_secret);
  console.log('Raw body (length):', req.body.length);
  console.log('Webhook body (should be Buffer):', Buffer.isBuffer(req.body));
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
  } catch (err) {
    console.log('err', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

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
                    title: metadata.order_product || 'Product Purchase',
                    price: paymentIntent.amount / 100,
                    orderQuantity: 1,
                  },
                ],
          subTotal: paymentIntent.amount / 100,
          shippingCost: Number(metadata.order_shippingCost || 0),
          discount: Number(metadata.order_discount || 0),
          totalAmount: paymentIntent.amount / 100,
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
