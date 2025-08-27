import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }) {
  try {
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

    const info = await transporter.sendMail({
      from: '"Better Auth App" <anna.yost80@ethereal.email>',
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    throw error;
  }
}
