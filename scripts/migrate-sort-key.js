import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { generateNKeysBetween } from 'fractional-indexing';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const migrateSortKey = async () => {
  try {
    await connectDB();

    const products = await Products.find({})
      .sort({ skuArrangementOrderNo: 1, createdAt: 1 })
      .select('_id sku title')
      .lean();

    if (products.length === 0) {
      console.log('No products to migrate.');
      return;
    }

    const keys = generateNKeysBetween(null, null, products.length);
    const bulkOperations = products.map((product, index) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { sortKey: keys[index] } },
      },
    }));

    const result = await Products.bulkWrite(bulkOperations);
    console.log(`Migrated sortKey for ${result.modifiedCount} products.`);

    const sampleSize = Math.min(3, products.length);
    const sample = await Products.find({})
      .sort({ sortKey: 1 })
      .limit(sampleSize)
      .select('sku title sortKey')
      .lean();
    console.log('Sample after migration:', sample);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

migrateSortKey();
