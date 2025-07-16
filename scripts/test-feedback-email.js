const mongoose = require('mongoose');
const { secret } = require('../config/secret');
const {
  diagnoseFeedbackEmail,
  verifyEmailConfig,
} = require('../services/emailService');

// Connect to MongoDB
mongoose.connect(secret.db_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testFeedbackEmail() {
  try {
    console.log('🚀 Starting feedback email diagnostic test...');

    // Test email configuration
    console.log('\n📧 Testing email configuration...');
    const emailValid = await verifyEmailConfig();
    console.log(`Email config valid: ${emailValid}`);

    // Get command line argument for order ID
    const orderId = process.argv[2];

    if (!orderId) {
      console.log('\n❌ Please provide an order ID as argument');
      console.log('Usage: node scripts/test-feedback-email.js <ORDER_ID>');
      process.exit(1);
    }

    // Run diagnostic
    console.log(`\n🔍 Running diagnostic for order: ${orderId}`);
    const diagnostic = await diagnoseFeedbackEmail(orderId);

    console.log('\n📊 Diagnostic Results:');
    console.log(JSON.stringify(diagnostic, null, 2));

    // Summary
    console.log('\n📋 Summary:');
    console.log(`Environment: ${diagnostic.environment}`);
    console.log(`Email Config Valid: ${diagnostic.emailConfigValid}`);
    console.log(`Issues Found: ${diagnostic.issues.length}`);

    if (diagnostic.issues.length > 0) {
      console.log('\n❌ Issues:');
      diagnostic.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });

      console.log('\n💡 Recommendations:');
      diagnostic.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log('\n✅ No issues found - feedback email should work');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testFeedbackEmail();
