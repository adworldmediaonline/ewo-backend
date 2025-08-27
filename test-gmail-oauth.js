import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function testGmailAppPassword() {
  // Check environment variables
  const requiredVars = ['GMAIL_USER', 'GOOGLE_APP_PASSWORD'];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅ Set' : '❌ Missing';
    const displayValue =
      varName === 'GOOGLE_APP_PASSWORD' && value
        ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}`
        : value || 'Not found';
  });

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    // Test connection
    await transporter.verify();

    // Test sending a simple email
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
  } catch (error) {
    if (error.code === 'EAUTH') {
    }
  }
}

// Run the test
testGmailAppPassword().catch(console.error);
