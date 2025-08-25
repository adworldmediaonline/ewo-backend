import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }) {
  try {
    console.log('🚀 Starting email send process...');
    console.log('📧 Email details:', { to, subject });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'anna.yost80@ethereal.email',
        pass: 'h8br5jQFGMAaH1VHPv',
      },
    });

    console.log('✅ Transporter created with your Ethereal credentials');

    const info = await transporter.sendMail({
      from: '"Better Auth App" <anna.yost80@ethereal.email>',
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));

    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}
