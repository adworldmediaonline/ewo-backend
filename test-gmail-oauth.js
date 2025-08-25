import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function testGmailAppPassword() {
  console.log('🔍 Testing Gmail App Password Configuration...\n');

  // Check environment variables
  const requiredVars = ['GMAIL_USER', 'GOOGLE_APP_PASSWORD'];

  console.log('📋 Environment Variables Check:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅ Set' : '❌ Missing';
    const displayValue =
      varName === 'GOOGLE_APP_PASSWORD' && value
        ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}`
        : value || 'Not found';
    console.log(`   ${varName}: ${status} - ${displayValue}`);
  });

  console.log('\n🚀 Creating Gmail App Password transporter...');

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    console.log('✅ Transporter created successfully');

    // Test connection
    console.log('\n🔗 Testing connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully');

    // Test sending a simple email
    console.log('\n📧 Testing email sending...');
    const info = await transporter.sendMail({
      from: `"Test App" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to yourself for testing
      subject: 'Gmail App Password Test - ' + new Date().toISOString(),
      html: `
        <h1>🎉 Gmail App Password Test Successful!</h1>
        <p>This email confirms that your Gmail App Password setup is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>User:</strong> ${process.env.GMAIL_USER}</p>
        <p><strong>Method:</strong> App Password (2-Step Verification)</p>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📧 To:', info.accepted);
    console.log('📤 From:', info.from);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

    if (error.code === 'EAUTH') {
      console.error('\n🔐 Gmail Authentication Error Details:');
      console.error('   Error Code:', error.code);
      console.error('   Command:', error.command);

      console.error('\n💡 App Password Setup Guide:');
      console.error('   1. Enable 2-Step Verification on your Google account');
      console.error('   2. Go to: https://myaccount.google.com/security');
      console.error('   3. Click "App passwords" (under 2-Step Verification)');
      console.error('   4. Select "Mail" as the app and "Other" as device');
      console.error('   5. Generate and copy the 16-character password');
      console.error(
        '   6. Add to your .env file: GOOGLE_APP_PASSWORD=your_password'
      );

      console.error('\n🔒 Security Note:');
      console.error(
        '   - App passwords bypass most Google security heuristics'
      );
      console.error(
        '   - They are more reliable than OAuth for server applications'
      );
      console.error(
        '   - Each app password is unique and can be revoked individually'
      );
    }

    // Additional debugging
    console.error('\n🔍 Additional Error Information:');
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testGmailAppPassword().catch(console.error);
