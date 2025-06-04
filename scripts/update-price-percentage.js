require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updatePricePercentage = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully');

    console.log('🔄 Starting price adjustments for all products...');

    const result = await Products.updateMany(
      {},
      {
        $set: {
          increasePriceWithInPercent: 20,
          discountOnPrice: 15,
        },
      }
    );

    console.log(`✅ Successfully updated price adjustments!`);
    console.log(`📊 Products matched: ${result.matchedCount}`);
    console.log(`📊 Products modified: ${result.modifiedCount}`);

    if (result.modifiedCount === 0) {
      console.log(
        'ℹ️  No products were modified (all prices might already be updated)'
      );
    }

    console.log('🎉 Price adjustments completed successfully!');
  } catch (error) {
    console.error('❌ Error updating price adjustments:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

console.log('🚀 Starting product price adjustment script...');
console.log('📦 Price Increase: 20% (increasePriceWithInPercent)');
console.log('📦 Price Discount: 15% (discountOnPrice)');
console.log('🎯 Updating ALL products in the database');
console.log(
  '⚠️  This will only update the increasePriceWithInPercent and discountOnPrice fields'
);
console.log('═'.repeat(50));

updatePricePercentage();
