import nodemailer from 'nodemailer';

export async function sendEmailGmail({ to, subject, html }) {
  try {
    // Create Gmail transporter with App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GOOGLE_APP_PASSWORD, // Your 16-character App Password
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'EWO'}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    // Log specific authentication errors for debugging
    if (error.code === 'EAUTH') {
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
    return true;
  } catch (error) {
    return false;
  }
}
