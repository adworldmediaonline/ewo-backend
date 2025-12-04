import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const updateCalculatedPrices = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Get all products with their current price values
    const products = await Products.find({}, { price: 1, title: 1, sku: 1 });
    console.log(`📦 Found ${products.length} products to update\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found. Exiting...');
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

    console.log('🔄 Executing bulk update operation...');
    const result = await Products.bulkWrite(bulkOperations);
    console.log(`✅ Bulk update completed!`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}\n`);

    // Verify the update by checking a few random products
    const sampleSize = Math.min(5, products.length);
    console.log(`🔍 Verifying updates on ${sampleSize} sample products...\n`);

    const sampleProducts = await Products.aggregate([
      { $sample: { size: sampleSize } },
      {
        $project: {
          title: 1,
          price: 1,
          updatedPrice: 1,
          finalPriceDiscount: 1,
          sku: 1,
        },
      },
    ]);

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

      console.log(
        `${updatedMatch}${finalMatch} ${product.title} (SKU: ${product.sku})\n` +
        `   Original: $${originalPrice.toFixed(2)}\n` +
        `   Updated Price: $${product.updatedPrice?.toFixed(2) || 'N/A'} (expected: $${expectedUpdated.toFixed(2)})\n` +
        `   Final Discount: $${product.finalPriceDiscount?.toFixed(2) || 'N/A'} (expected: $${expectedFinal.toFixed(2)})\n`
      );
    });

    console.log('\n🎉 Price calculation update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating calculated prices:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};


updateCalculatedPrices();
