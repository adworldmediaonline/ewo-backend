// Test script to check refund functionality
const mongoose = require('mongoose');
const Order = require('./model/Order');

async function testRefundCapability() {
  try {
    // Connect to database (you may need to update the connection string)
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db'
    );

    console.log('🔍 Checking recent orders for refund capability...');

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

    console.log(`📋 Found ${recentOrders.length} recent card orders:`);

    recentOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.orderId || order._id}:`);
      console.log(`   Payment Intent: ${order.paymentIntent?.id || 'Missing'}`);
      console.log(
        `   Charge ID: ${
          order.paymentIntent?.chargeId || 'Missing (needed for refunds)'
        }`
      );
      console.log(`   Status: ${order.paymentIntent?.status || 'Unknown'}`);
      console.log(`   Amount: $${order.totalAmount}`);
      console.log(
        `   Refundable: ${
          order.paymentIntent?.chargeId ? '✅ Yes' : '❌ No (missing charge ID)'
        }`
      );
    });

    console.log('\n💡 Next steps:');
    console.log(
      '1. Place a new order to test the enhanced charge data capture'
    );
    console.log('2. Use the refund API: POST /api/order/refund/:orderId');
    console.log(
      '3. Check payment details: GET /api/order/payment-details/:orderId'
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testRefundCapability();
