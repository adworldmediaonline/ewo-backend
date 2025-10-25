require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateCalculatedPrices = async () => {
  try {

    await connectDB();

    // Get all products with their current price values
    const products = await Products.find({}, { price: 1, title: 1 });

    if (products.length === 0) {
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

    });

  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};


updateCalculatedPrices();
