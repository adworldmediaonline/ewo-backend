import nodemailer from 'nodemailer';

export async function sendEmailGmail({ to, subject, html }) {
  try {
    console.log('🚀 Starting Gmail App Password email send process...');
    console.log('📧 Email details:', { to, subject });

    // Create Gmail transporter with App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GOOGLE_APP_PASSWORD, // Your 16-character App Password
      },
    });

    console.log('✅ Gmail App Password transporter created successfully');

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'EWO'}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully via Gmail!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📧 To:', info.accepted);
    console.log('📤 From:', info.from);

    return info;
  } catch (error) {
    console.error('❌ Gmail App Password email sending failed:', error);

    // Log specific authentication errors for debugging
    if (error.code === 'EAUTH') {
      console.error('🔐 Gmail authentication failed. Check your credentials:');
      console.error(
        '   - GMAIL_USER:',
        process.env.GMAIL_USER ? '✅ Set' : '❌ Missing'
      );
      console.error(
        '   - GOOGLE_APP_PASSWORD:',
        process.env.GOOGLE_APP_PASSWORD ? '✅ Set' : '❌ Missing'
      );

      console.error('\n💡 App Password Setup Guide:');
      console.error('   1. Enable 2-Step Verification on your Google account');
      console.error('   2. Go to Google Account > Security > App passwords');
      console.error('   3. Generate a new app password for "Mail"');
      console.error(
        '   4. Use the 16-character password in GOOGLE_APP_PASSWORD'
      );
    }

    throw error;
  }
}

// Helper function to verify Gmail App Password connection
export async function verifyGmailConnection() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    await transporter.verify();
    console.log('✅ Gmail App Password connection verified successfully');
    return true;
  } catch (error) {
    console.error(
      '❌ Gmail App Password connection verification failed:',
      error
    );
    return false;
  }
}
