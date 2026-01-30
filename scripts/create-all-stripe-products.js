import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_KEY);

/**
 * Creates Stripe products for all products in the database
 *
 * Usage: node scripts/create-all-stripe-products.js
 *
 * This script will:
 * - Fetch all products from the database
 * - Create a Stripe product for each product
 * - Apply 25% discount to finalPriceDiscount before creating in Stripe
 * - Update database with Stripe Product ID
 */
const createAllStripeProducts = async () => {
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Fetch all products from database
    console.log('📦 Fetching all products from database...');
    const products = await Products.find({});
    stats.total = products.length;

    if (products.length === 0) {
      console.log('⚠️  No products found in database. Exiting...\n');
      return;
    }

    console.log(`✅ Found ${products.length} products to process\n`);
    console.log('🚀 Starting Stripe product creation process...\n');
    console.log('='.repeat(80) + '\n');

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const currentNumber = i + 1;

      console.log(`[${currentNumber}/${products.length}] Processing: ${product.title || 'Untitled'}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);

      try {
        // Validate required fields
        if (!product.title) {
          console.log(`   ⚠️  Skipping: Product title is required\n`);
          stats.skipped++;
          stats.errors.push({
            sku: product.sku,
            title: product.title || 'Untitled',
            error: 'Product title is required',
          });
          continue;
        }

        if (!product.finalPriceDiscount && !product.price) {
          console.log(`   ⚠️  Skipping: Product must have either finalPriceDiscount or price\n`);
          stats.skipped++;
          stats.errors.push({
            sku: product.sku,
            title: product.title,
            error: 'Product must have either finalPriceDiscount or price',
          });
          continue;
        }

        // Get original price
        const originalPrice = product.finalPriceDiscount || product.price || 0;

        // Apply 25% discount to finalPriceDiscount
        const discountedPrice = Math.round(originalPrice * 0.75 * 100) / 100;

        // Convert price to cents (Stripe requires amount in smallest currency unit)
        const unitAmount = Math.round(discountedPrice * 100);

        if (unitAmount <= 0) {
          console.log(`   ⚠️  Skipping: Product price must be greater than 0\n`);
          stats.skipped++;
          stats.errors.push({
            sku: product.sku,
            title: product.title,
            error: 'Product price must be greater than 0',
          });
          continue;
        }

        // Prepare Stripe product data
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

        // Create product in Stripe
        const stripeProduct = await stripe.products.create(stripeProductData);

        // Update database with Stripe product ID
        await Products.updateOne(
          { _id: product._id },
          { $set: { stripeProductId: stripeProduct.id } }
        );

        console.log(`   ✅ Created successfully!`);
        console.log(`   Original Price: $${originalPrice.toFixed(2)}`);
        console.log(`   Stripe Price (25% discount): $${discountedPrice.toFixed(2)}`);
        console.log(`   Stripe Product ID: ${stripeProduct.id}`);
        console.log(`   Stripe Price ID: ${stripeProduct.default_price}\n`);

        stats.successful++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);

        if (error.type === 'StripeInvalidRequestError') {
          console.log(`   Stripe Error: ${error.message}`);
          if (error.param) {
            console.log(`   Parameter: ${error.param}`);
          }
        }

        console.log('');

        stats.failed++;
        stats.errors.push({
          sku: product.sku,
          title: product.title || 'Untitled',
          error: error.message,
        });
      }
    }

    // Display final summary
    console.log('='.repeat(80));
    console.log('\n📊 Final Summary:\n');
    console.log(`   Total Products: ${stats.total}`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   ⚠️  Skipped: ${stats.skipped}\n`);

    if (stats.errors.length > 0) {
      console.log('❌ Errors encountered:\n');
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. SKU: ${error.sku || 'N/A'} | Title: ${error.title}`);
        console.log(`      Error: ${error.error}\n`);
      });
    }

    if (stats.successful > 0) {
      console.log(`🎉 Successfully created ${stats.successful} product(s) in Stripe!\n`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
createAllStripeProducts();
