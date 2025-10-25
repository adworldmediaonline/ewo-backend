require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Products = require('../model/Products');

const updateAllQuantities = async () => {
  try {

    await connectDB();

    const result = await Products.updateMany({}, { $set: { quantity: 1000 } });

  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};



updateAllQuantities();
