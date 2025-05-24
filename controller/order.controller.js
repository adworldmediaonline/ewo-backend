const { secret } = require('../config/secret');
const stripe = require('stripe')(secret.stripe_key);
const Order = require('../model/Order');
const Products = require('../model/Products');
const { sendOrderConfirmation } = require('../services/emailService');
const UsedAddresses = require('../model/UsedAddresses');

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

    // If this is a guest checkout (no user ID), ensure the field is set properly
    if (!orderData.user) {
      orderData.isGuestOrder = true;
    }

    // Special case: if address is short/simple (like "rrrrdss"), check for any exact matches in existing orders
    // and cancel any address discount if already used
    if (
      orderData.address &&
      orderData.address.length < 8 &&
      orderData.addressDiscountApplied
    ) {
      console.log(
        'Checking short address for existing matches:',
        orderData.address
      );

      const normalizedAddress = orderData.address.toLowerCase().trim();
      const existingOrderWithAddress = await Order.findOne({
        address: { $regex: new RegExp(`^${normalizedAddress}$`, 'i') },
      });

      if (existingOrderWithAddress) {
        console.log(
          'Found exact match for short address in orders:',
          existingOrderWithAddress._id
        );
        console.log('Canceling address discount due to existing address match');

        // Remove the address discount from the order
        orderData.addressDiscountApplied = false;
        orderData.addressDiscountAmount = 0;

        // Recalculate total if needed
        if (orderData.addressDiscountAmount) {
          orderData.totalAmount += orderData.addressDiscountAmount;
          orderData.discount -= orderData.addressDiscountAmount;
        }
      }
    }

    // If address discount was applied, store the address as used
    if (orderData.addressDiscountApplied) {
      const addressKey = generateAddressKey(orderData);
      console.log('Storing used address with key:', addressKey);

      await UsedAddresses.create({
        addressKey,
        address: orderData.address,
        city: orderData.city,
        state: orderData.state,
        zipCode: orderData.zipCode,
        country: orderData.country,
        usedAt: new Date(),
      });
    }

    const order = await Order.create(orderData);

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

// Check if address is eligible for unique address discount
exports.checkAddressDiscount = async (req, res, next) => {
  try {
    const addressData = req.body;

    // Generate a unique key for this address (normalized)
    const addressKey = generateAddressKey(addressData);

    console.log('Checking address discount eligibility for:', addressData);
    console.log('Generated address key:', addressKey);

    // Check if this address has been used before in UsedAddresses table
    const existingUsedAddress = await UsedAddresses.findOne({ addressKey });

    if (existingUsedAddress) {
      console.log('Address found in UsedAddresses:', existingUsedAddress);
    }

    // Also check if this address exists in any previous order using exact match
    // Normalize the input data for consistency
    const normalizedAddress = (addressData.address || '').toLowerCase().trim();
    const normalizedCity = (addressData.city || '').toLowerCase().trim();
    const normalizedState = (addressData.state || '').toLowerCase().trim();
    const normalizedZipCode = (addressData.zipCode || '').trim();

    console.log('Normalized address parts for matching:');
    console.log('Address:', normalizedAddress);
    console.log('City:', normalizedCity);
    console.log('State:', normalizedState);
    console.log('Zip:', normalizedZipCode);

    // Look for exact matches in orders
    const existingOrderAddressQuery = {
      $and: [],
    };

    // Only add conditions for fields that have values
    if (normalizedAddress) {
      existingOrderAddressQuery.$and.push({
        address: { $regex: new RegExp(`^${normalizedAddress}$`, 'i') },
      });
    }

    if (normalizedCity) {
      existingOrderAddressQuery.$and.push({
        city: { $regex: new RegExp(`^${normalizedCity}$`, 'i') },
      });
    }

    if (normalizedState) {
      existingOrderAddressQuery.$and.push({
        state: { $regex: new RegExp(`^${normalizedState}$`, 'i') },
      });
    }

    if (normalizedZipCode) {
      existingOrderAddressQuery.$and.push({
        zipCode: { $regex: new RegExp(`^${normalizedZipCode}$`, 'i') },
      });
    }

    // If we don't have enough address parts to query, don't consider it eligible
    if (existingOrderAddressQuery.$and.length < 2) {
      console.log('Not enough address parts to determine eligibility');
      return res.status(200).json({
        success: true,
        eligible: false,
        message:
          'Please provide more address details to check discount eligibility',
      });
    }

    console.log('Order query:', JSON.stringify(existingOrderAddressQuery));

    // Execute the query
    const existingOrderAddress = await Order.findOne(existingOrderAddressQuery);

    if (existingOrderAddress) {
      console.log('Found matching address in order:', existingOrderAddress._id);
    }

    // Special handling for very short addresses (like "rrrrdss")
    // If address is very short (less than 5 chars) and matches exactly, don't give discount
    let shortAddressMatch = false;
    if (normalizedAddress && normalizedAddress.length < 8) {
      const exactAddressMatch = await Order.findOne({
        address: { $regex: new RegExp(`^${normalizedAddress}$`, 'i') },
      });

      if (exactAddressMatch) {
        console.log('Found exact match for short address:', normalizedAddress);
        shortAddressMatch = true;
      }
    }

    // Not eligible if found in either table or is a short address match
    const isEligible =
      !existingUsedAddress && !existingOrderAddress && !shortAddressMatch;

    // Prepare appropriate message
    let message;
    if (!isEligible) {
      if (existingUsedAddress) {
        message = 'This address has already been used for a discount';
      } else if (shortAddressMatch) {
        message =
          'This address matches a previous order and is not eligible for the discount';
      } else {
        message =
          'This address matches a previous order and is not eligible for the discount';
      }
    } else {
      message = 'Address is eligible for 10% discount!';
    }

    console.log('Eligibility result:', isEligible, message);

    res.status(200).json({
      success: true,
      eligible: isEligible,
      message: message,
    });
  } catch (error) {
    console.log('Error checking address discount:', error);
    next(error);
  }
};

// Helper function to generate a consistent address key
function generateAddressKey(addressData) {
  // Normalize and combine address parts to create a unique key
  const address = (addressData.address || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  const city = (addressData.city || '').toLowerCase().trim();
  const state = (addressData.state || '').toLowerCase().trim();
  const zipCode = (addressData.zipCode || '').trim();
  const country = (addressData.country || '').toLowerCase().trim();

  // If the address is very short (like "rrrrdss"), consider it as-is without normalization
  // to avoid missing matches due to normalization
  if (address.length < 8) {
    return `${address}|${city}|${state}|${zipCode}|${country}`;
  }

  // For longer addresses, apply more aggressive normalization
  // Remove common words and symbols that don't affect the address uniqueness
  const normalizedAddress = address
    .replace(/\bapt\.?\b|\bapartment\b/gi, '')
    .replace(/\bste\.?\b|\bsuite\b/gi, '')
    .replace(/\bunit\b/gi, '')
    .replace(/\bno\.?\b|\bnumber\b/gi, '')
    .replace(/\b(north|south|east|west|n|s|e|w)\.?\b/gi, '')
    .replace(
      /\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?)\b/gi,
      ''
    )
    .replace(/[.,#-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return `${normalizedAddress}|${city}|${state}|${zipCode}|${country}`;
}
