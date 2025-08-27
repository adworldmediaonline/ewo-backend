// Test script to check refund functionality
const mongoose = require('mongoose');
const Order = require('./model/Order');

async function testRefundCapability() {
  try {
    // Connect to database (you may need to update the connection string)
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db'
    );

    // Find recent orders with payment intent data
    const recentOrders = await Order.find({
      'paymentIntent.id': { $exists: true },
      paymentMethod: 'Card',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        '_id orderId paymentIntent.id paymentIntent.chargeId paymentIntent.status totalAmount'
      );

    recentOrders.forEach((order, index) => {});
  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}

testRefundCapability();
