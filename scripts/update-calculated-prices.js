require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateCalculatedPrices = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully');

    console.log('🔄 Starting calculated price updates for all products...');

    // Get all products with their current price values
    const products = await Products.find({}, { price: 1, title: 1 });
    console.log(`📦 Found ${products.length} products to update`);

    if (products.length === 0) {
      console.log('ℹ️  No products found in database');
      return;
    }

    // Calculate and update prices for each product
    const bulkOperations = products.map(product => {
      const originalPrice = parseFloat(product.price) || 0;

      // Add 20% to the original price
      const updatedPrice = Math.round(originalPrice * 1.2 * 100) / 100;

      // Subtract 15% from the updated price
      const finalPriceDiscount = Math.round(updatedPrice * 0.85 * 100) / 100;

      return {
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              updatedPrice: updatedPrice,
              finalPriceDiscount: finalPriceDiscount,
            },
          },
        },
      };
    });

    const result = await Products.bulkWrite(bulkOperations);

    console.log(`✅ Successfully updated calculated prices!`);
    console.log(`📊 Products matched: ${result.matchedCount}`);
    console.log(`📊 Products modified: ${result.modifiedCount}`);

    if (result.modifiedCount === 0) {
      console.log(
        'ℹ️  No products were modified (calculated prices might already be up to date)'
      );
    }

    // Verify the update by checking a few random products
    const sampleSize = Math.min(5, products.length);
    const sampleProducts = await Products.aggregate([
      { $sample: { size: sampleSize } },
      {
        $project: {
          title: 1,
          price: 1,
          updatedPrice: 1,
          finalPriceDiscount: 1,
        },
      },
    ]);

    console.log('🔍 Sample verification:');
    sampleProducts.forEach(product => {
      const originalPrice = parseFloat(product.price) || 0;
      const expectedUpdated = Math.round(originalPrice * 1.2 * 100) / 100;
      const expectedFinal = Math.round(expectedUpdated * 0.85 * 100) / 100;

      const updatedMatch =
        Math.abs(product.updatedPrice - expectedUpdated) < 0.01 ? '✅' : '❌';
      const finalMatch =
        Math.abs(product.finalPriceDiscount - expectedFinal) < 0.01
          ? '✅'
          : '❌';

      console.log(`  "${product.title}":`);
      console.log(`    Original: $${originalPrice.toFixed(2)}`);
      console.log(
        `    ${updatedMatch} Updated (+20%): $${product.updatedPrice.toFixed(
          2
        )} (expected: $${expectedUpdated.toFixed(2)})`
      );
      console.log(
        `    ${finalMatch} Final (-15%): $${product.finalPriceDiscount.toFixed(
          2
        )} (expected: $${expectedFinal.toFixed(2)})`
      );
      console.log('');
    });

    console.log('🎉 Calculated price updates completed successfully!');
  } catch (error) {
    console.error('❌ Error updating calculated prices:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

console.log('🚀 Starting calculated price update script...');
console.log('📈 Calculation 1: updatedPrice = price + 20%');
console.log('📉 Calculation 2: finalPriceDiscount = updatedPrice - 15%');
console.log('🎯 Updating ALL products in the database');
console.log(
  '⚠️  This will only update the updatedPrice and finalPriceDiscount fields'
);
console.log('💰 Original price field will remain unchanged');
console.log(
  '🔢 Calculations use exact decimal precision (rounded to 2 decimal places)'
);
console.log('═'.repeat(70));

updateCalculatedPrices();
