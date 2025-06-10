require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateSkuArrangement = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully');

    console.log('🔄 Starting SKU arrangement update for all products...');

    // Get all products with their current SKU values
    const products = await Products.find({}, { sku: 1 });
    console.log(`📦 Found ${products.length} products to update`);

    if (products.length === 0) {
      console.log('ℹ️  No products found in database');
      return;
    }

    // Update each product's skuArrangementOrderNo with its sku value
    const bulkOperations = products.map(product => ({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            skuArrangementOrderNo: product.sku,
          },
        },
      },
    }));

    const result = await Products.bulkWrite(bulkOperations);

    console.log(`✅ Successfully updated SKU arrangement!`);
    console.log(`📊 Products matched: ${result.matchedCount}`);
    console.log(`📊 Products modified: ${result.modifiedCount}`);

    if (result.modifiedCount === 0) {
      console.log(
        'ℹ️  No products were modified (all skuArrangementOrderNo might already match their SKU values)'
      );
    }

    // Verify the update by checking a few random products
    const sampleSize = Math.min(5, products.length);
    const sampleProducts = await Products.aggregate([
      { $sample: { size: sampleSize } },
      { $project: { sku: 1, skuArrangementOrderNo: 1, title: 1 } },
    ]);

    console.log('🔍 Sample verification:');
    sampleProducts.forEach(product => {
      const match = product.sku === product.skuArrangementOrderNo ? '✅' : '❌';
      console.log(
        `  ${match} "${product.title}": SKU="${product.sku}" → skuArrangementOrderNo="${product.skuArrangementOrderNo}"`
      );
    });

    console.log('🎉 SKU arrangement update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating SKU arrangement:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

console.log('🚀 Starting SKU arrangement update script...');
console.log('🎯 Updating skuArrangementOrderNo field for ALL products');
console.log(
  "📝 Each product's skuArrangementOrderNo will be set to its SKU value"
);
console.log('⚠️  This will NOT modify SKU or any other existing fields');
console.log('═'.repeat(60));

updateSkuArrangement();
