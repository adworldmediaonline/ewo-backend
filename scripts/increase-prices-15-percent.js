import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const increasePricesBy15Percent = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Fetch all products
    const products = await Products.find({});
    console.log(`📦 Found ${products.length} products to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each product
    for (const product of products) {
      const currentFinalPrice = product.finalPriceDiscount || 0;
      const currentUpdatedPrice = product.updatedPrice || 0;

      // Skip if both prices are 0
      if (currentFinalPrice === 0 && currentUpdatedPrice === 0) {
        console.log(`⏭️  Skipped: ${product.title} (SKU: ${product.sku}) - Both prices are 0`);
        skippedCount++;
        continue;
      }

      // Calculate 6.67% increase
      const newFinalPrice = currentFinalPrice * 1.0667;
      const newUpdatedPrice = currentUpdatedPrice * 1.0667;

      // Update the product
      await Products.updateOne(
        { _id: product._id },
        {
          $set: {
            finalPriceDiscount: Number(newFinalPrice.toFixed(2)),
            updatedPrice: Number(newUpdatedPrice.toFixed(2)),
          },
        }
      );

      updatedCount++;
      console.log(
        `✅ Updated: ${product.title} (SKU: ${product.sku})\n` +
        `   finalPriceDiscount: $${currentFinalPrice.toFixed(2)} → $${newFinalPrice.toFixed(2)}\n` +
        `   updatedPrice: $${currentUpdatedPrice.toFixed(2)} → $${newUpdatedPrice.toFixed(2)}\n`
      );
    }

    console.log('\n🎉 Price update completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}\n`);

  } catch (error) {
    console.error('❌ Error updating prices:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

increasePricesBy15Percent();

