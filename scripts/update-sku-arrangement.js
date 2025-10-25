require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateSkuArrangement = async () => {
  try {

    await connectDB();

    // Get all products with their current SKU values
    const products = await Products.find({}, { sku: 1 });

    if (products.length === 0) {
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

    // Verify the update by checking a few random products
    const sampleSize = Math.min(5, products.length);
    const sampleProducts = await Products.aggregate([
      { $sample: { size: sampleSize } },
      { $project: { sku: 1, skuArrangementOrderNo: 1, title: 1 } },
    ]);

    sampleProducts.forEach(product => {
      const match = product.sku === product.skuArrangementOrderNo ? '✅' : '❌';

    });

  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};


updateSkuArrangement();
