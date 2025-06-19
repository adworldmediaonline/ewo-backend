require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateAllQuantities = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully');

    console.log('🔄 Starting quantity update for all products...');

    const result = await Products.updateMany({}, { $set: { quantity: 1000 } });

    console.log(`✅ Successfully updated quantities!`);
    console.log(`📊 Products matched: ${result.matchedCount}`);
    console.log(`📊 Products modified: ${result.modifiedCount}`);

    if (result.modifiedCount === 0) {
      console.log(
        'ℹ️  No products were modified (all quantities might already be 1000)'
      );
    }

    console.log('🎉 Quantity update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating quantities:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

console.log('🚀 Starting product quantity update script...');
console.log('📦 Target quantity: 1000');
console.log('🎯 Updating ALL products in the database');
console.log('⚠️  This will only update the quantity field');
console.log('═'.repeat(50));

updateAllQuantities();
