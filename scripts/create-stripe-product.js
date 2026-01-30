import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_KEY);

/**
 * Creates a Stripe product from a database product by SKU
 *
 * Usage: node scripts/create-stripe-product.js <SKU>
 * Example: node scripts/create-stripe-product.js SKU-12345
 */
const createStripeProduct = async () => {
  try {
    // Get SKU from command line arguments
    const sku = process.argv[2];

    if (!sku) {
      console.error('❌ Error: SKU is required');
      console.log('\nUsage: node scripts/create-stripe-product.js <SKU>');
      console.log('Example: node scripts/create-stripe-product.js SKU-12345\n');
      process.exit(1);
    }

    console.log(`🔍 Looking up product with SKU: ${sku}...\n`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Fetch product from database
    const product = await Products.findOne({ sku: sku.trim() });

    if (!product) {
      console.error(`❌ Error: Product with SKU "${sku}" not found in database`);
      process.exit(1);
    }

    console.log(`✅ Found product: ${product.title}`);
    console.log(`   SKU: ${product.sku}`);

    const originalPrice = product.finalPriceDiscount || product.price || 0;
    console.log(`   Original Price: $${originalPrice.toFixed(2)}`);
    console.log(`   Image: ${product.img}\n`);

    // Validate required fields
    if (!product.title) {
      console.error('❌ Error: Product title is required');
      process.exit(1);
    }

    if (!product.finalPriceDiscount && !product.price) {
      console.error('❌ Error: Product must have either finalPriceDiscount or price');
      process.exit(1);
    }

    // Apply 25% discount to finalPriceDiscount
    const discountedPrice = Math.round(originalPrice * 0.75 * 100) / 100;

    console.log(`💰 Applying 25% discount...`);
    console.log(`   Original Price: $${originalPrice.toFixed(2)}`);
    console.log(`   Discounted Price (25% off): $${discountedPrice.toFixed(2)}\n`);

    // Prepare Stripe product data
    const priceAmount = discountedPrice;

    // Convert price to cents (Stripe requires amount in smallest currency unit)
    const unitAmount = Math.round(priceAmount * 100);

    if (unitAmount <= 0) {
      console.error('❌ Error: Product price must be greater than 0');
      process.exit(1);
    }

    const stripeProductData = {
      name: product.title,
      description: product.description || '',
      images: product.img ? [product.img] : [],
      metadata: {
        sku: product.sku,
      },
      default_price_data: {
        unit_amount: unitAmount,
        currency: 'usd',
      },
      // Mark as shippable physical product
      shippable: true,
      // Use tax code for tangible goods
      tax_code: 'txcd_99999999',
    };

    console.log('📦 Creating product in Stripe...');
    console.log(`   Name: ${stripeProductData.name}`);
    console.log(`   Original Price: $${originalPrice.toFixed(2)}`);
    console.log(`   Stripe Price (after 25% discount): $${priceAmount.toFixed(2)} (${unitAmount} cents)`);
    console.log(`   Currency: ${stripeProductData.default_price_data.currency}`);
    console.log(`   Image URL: ${stripeProductData.images[0] || 'None'}\n`);

    // Create product in Stripe
    const stripeProduct = await stripe.products.create(stripeProductData);

    console.log('✅ Product created successfully in Stripe!');
    console.log(`   Stripe Product ID: ${stripeProduct.id}`);
    console.log(`   Stripe Price ID: ${stripeProduct.default_price}\n`);

    // Update database with Stripe product ID
    if (product.stripeProductId && product.stripeProductId !== stripeProduct.id) {
      console.log(`⚠️  Warning: Product already has a Stripe Product ID: ${product.stripeProductId}`);
      console.log(`   New Stripe Product ID: ${stripeProduct.id}`);
      console.log('   Updating database with new Stripe Product ID...\n');
    }

    await Products.updateOne(
      { _id: product._id },
      { $set: { stripeProductId: stripeProduct.id } }
    );

    console.log('✅ Database updated with Stripe Product ID\n');

    // Display summary
    console.log('📋 Summary:');
    console.log(`   Database Product ID: ${product._id}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Title: ${product.title}`);
    console.log(`   Stripe Product ID: ${stripeProduct.id}`);
    console.log(`   Stripe Price ID: ${stripeProduct.default_price}`);
    console.log(`   Original Price: $${originalPrice.toFixed(2)} USD`);
    console.log(`   Stripe Price (25% discount applied): $${priceAmount.toFixed(2)} USD\n`);

    console.log('🎉 Process completed successfully!');

  } catch (error) {
    console.error('❌ Error creating Stripe product:', error.message);

    if (error.type === 'StripeInvalidRequestError') {
      console.error(`   Stripe Error: ${error.message}`);
      if (error.param) {
        console.error(`   Parameter: ${error.param}`);
      }
    }

    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
createStripeProduct();
