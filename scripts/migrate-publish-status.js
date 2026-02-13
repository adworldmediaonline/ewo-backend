/**
 * Migration script: Set publishStatus to 'published' for all existing products.
 * Run this once after adding the Draft & Publish feature to ensure older products
 * (which don't have the publishStatus field) are visible on the storefront.
 *
 * Usage: node scripts/migrate-publish-status.js
 * Or: npm run migrate:publish-status
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Product from '../model/Products.js';

dotenv.config();

const migratePublishStatus = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    const result = await Product.updateMany(
      {},
      { $set: { publishStatus: 'published' } }
    );

    console.log('✅ Migration completed!');
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}\n`);
    console.log('All existing products now have publishStatus: "published".\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  }
};

migratePublishStatus();
