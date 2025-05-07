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

    // IMPORTANT: Check if cart is directly available
    const cart = product.cart || (product.orderData && product.orderData.cart);

    // Add cart info if available
    if (cart && Array.isArray(cart) && cart.length > 0) {
      // Store the first product title
      metadata.order_product = cart[0].title || 'Product Purchase';
      // Store total number of items
      metadata.order_item_count = String(cart.length);

      console.log('Cart data found:', JSON.stringify(cart, null, 2));

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

      // Log the cart data that will be stored
      console.log('Payment intent cart data:', simplifiedCart);

      // Stringify and limit to Stripe metadata size constraints
      try {
        metadata.order_cart = JSON.stringify(simplifiedCart).substring(0, 500);
      } catch (error) {
        console.error('Error stringifying cart:', error);
      }
    } else {
      console.error(
        '⚠️ NO CART DATA FOUND IN REQUEST:',
        JSON.stringify(product, null, 2)
      );
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
        console.log(
          'Payment intent metadata:',
          JSON.stringify(paymentIntent.metadata, null, 2)
        );

        // Extract order data from metadata
        const metadata = paymentIntent.metadata || {};

        // Parse cart data if available in metadata
        let cartItems = [];
        if (metadata.order_cart) {
          try {
            cartItems = JSON.parse(metadata.order_cart);
            console.log(
              'Successfully parsed cart data:',
              JSON.stringify(cartItems, null, 2)
            );

            // Ensure product IDs are correctly formatted
            cartItems = cartItems.map(item => {
              // If ID is present, ensure it's a string
              if (item._id) {
                item._id = item._id.toString();
              }
              return item;
            });

            console.log(
              'Processed cart items:',
              JSON.stringify(cartItems, null, 2)
            );
          } catch (error) {
            console.error('Failed to parse cart data:', error);
            console.error('Raw cart data:', metadata.order_cart);
          }
        } else {
          console.log('No cart data found in metadata');

          // If we have a product name but no cart data, try to find the product by name/title
          if (metadata.order_product) {
            try {
              console.log(
                `Attempting to find product by title: "${metadata.order_product}"`
              );
              const product = await Products.findOne({
                title: { $regex: new RegExp(metadata.order_product, 'i') },
              });

              if (product) {
                console.log(
                  `Found product by title: ${product.title} (ID: ${product._id})`
                );
                cartItems = [
                  {
                    _id: product._id.toString(),
                    title: product.title,
                    price: paymentIntent.amount / 100,
                    orderQuantity: 1,
                  },
                ];
              } else {
                console.log(
                  `Could not find product with title: ${metadata.order_product}`
                );
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
          console.log(`Order created from webhook: ${order._id}`);

          // Debug the cart items
          console.log('Cart items for inventory update:', order.cart);

          // Check product IDs in cart
          const productIds = order.cart.map(item => item._id).filter(Boolean);
          console.log('Product IDs to update:', productIds);

          // Update product quantities
          await updateProductQuantities(order.cart);

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

/**
 * Update product quantities after successful order
 * @param {Array} cartItems - Array of cart items with product info
 */
async function updateProductQuantities(cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    console.log('No cart items to update quantities for');
    return;
  }

  console.log(
    `Attempting to update quantities for ${cartItems.length} products`
  );
  console.log('FULL CART ITEMS:', JSON.stringify(cartItems, null, 2));

  // Process each item in cart
  for (const item of cartItems) {
    try {
      // Log the complete item for debugging
      console.log('PROCESSING CART ITEM:', JSON.stringify(item, null, 2));

      // Get product ID - could be stored directly or as a string property
      let productId = item._id || item.productId || null;

      // If the item has a nested product object, try to get ID from there
      if (!productId && item.product && item.product._id) {
        productId = item.product._id;
      }

      if (!productId) {
        console.log('Item missing product ID:', JSON.stringify(item));
        continue;
      }

      // Ensure productId is a string
      productId = productId.toString();

      // Log before the update
      console.log(`Updating product: ${productId}`);

      const orderQuantity = parseInt(item.orderQuantity || 1, 10);
      console.log(`Quantity to reduce: ${orderQuantity}`);

      // First check if product exists with direct find
      console.log(`Finding product with ID: "${productId}"`);
      const product = await Products.findById(productId);

      if (!product) {
        console.log(`Product not found with ID: ${productId}`);
        continue;
      }

      console.log(`Found product ${productId}:`, {
        title: product.title,
        currentQuantity: product.quantity,
        currentSellCount: product.sellCount,
        status: product.status,
      });

      // Directly make separate updates for quantity and sellCount
      console.log(`UPDATING PRODUCT: ${productId}`);

      // First update quantity
      const quantityResult = await Products.updateOne(
        { _id: productId },
        { $inc: { quantity: -orderQuantity } }
      );

      console.log('Quantity update result:', quantityResult);

      // Then update sellCount
      const sellCountResult = await Products.updateOne(
        { _id: productId },
        { $inc: { sellCount: orderQuantity } }
      );

      console.log('SellCount update result:', sellCountResult);

      // Verify the updates
      const updatedProduct = await Products.findById(productId);

      if (!updatedProduct) {
        console.log(`Failed to retrieve product ${productId} after update`);
        continue;
      }

      console.log(`Product after update:`, {
        title: updatedProduct.title,
        newQuantity: updatedProduct.quantity,
        newSellCount: updatedProduct.sellCount,
        status: updatedProduct.status,
      });

      // Update status if needed
      if (
        updatedProduct.quantity <= 0 &&
        updatedProduct.status !== 'out-of-stock'
      ) {
        console.log(`Setting product ${productId} to out-of-stock`);

        const statusResult = await Products.updateOne(
          { _id: productId },
          { $set: { status: 'out-of-stock' } }
        );

        console.log('Status update result:', statusResult);
      }
    } catch (error) {
      console.error(`Error updating product inventory:`, error);
      console.error('Error stack:', error.stack);
    }
  }
}
