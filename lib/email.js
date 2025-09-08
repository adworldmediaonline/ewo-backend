import nodemailer from 'nodemailer';
import { secret } from '../config/env.js';

// Default configuration using environment variables
const getDefaultConfig = () => {
  const provider = secret.emailProvider;

  switch (provider) {
    case 'gmail':
      return {
        provider: 'gmail',
        user: secret.emailUser,
        pass: secret.emailPassword,
        from: secret.emailFrom,
        fromName: secret.emailFromName,
      };

    case 'smtp':
      return {
        provider: 'smtp',
        host: secret.emailHost,
        port: secret.emailPort,
        secure: secret.emailSecure,
        user: secret.emailUser,
        pass: secret.emailPassword,
        from: secret.emailFrom,
        fromName: secret.emailFromName,
      };

    case 'custom':
      return {
        provider: 'custom',
        host: secret.emailHost,
        port: secret.emailPort,
        secure: secret.emailSecure,
        user: secret.emailUser,
        pass: secret.emailPassword,
        service: secret.emailService,
        from: secret.emailFrom,
        fromName: secret.emailFromName,
      };

    case 'ethereal':
    default:
      return {
        provider: 'ethereal',
        from: secret.emailFrom,
        fromName: secret.emailFromName || 'Test App',
      };
  }
};

// Create transporter based on configuration
const createTransporter = async config => {
  switch (config.provider) {
    case 'gmail':
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

    case 'smtp':
      return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure || false,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

    case 'custom': {
      const customTransport = {
        host: config.host,
        port: config.port,
        secure: config.secure || false,
      };

      if (config.service) {
        customTransport.service = config.service;
      }

      if (config.user && config.pass) {
        customTransport.auth = {
          user: config.user,
          pass: config.pass,
        };
      }

      return nodemailer.createTransport(customTransport);
    }

    case 'ethereal':
    default: {
      // Create a test account for Ethereal
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  }
};

// Main sendEmail function with optional configuration
export const sendEmail = async (to, subject, text, html, config = {}) => {
  // Merge provided config with defaults
  const finalConfig = {
    ...getDefaultConfig(),
    ...config,
  };

  // Create transporter
  const transporter = await createTransporter(finalConfig);

  // Determine from address
  let fromAddress;
  if (finalConfig.from) {
    fromAddress = finalConfig.fromName
      ? `"${finalConfig.fromName}" <${finalConfig.from}>`
      : finalConfig.from;
  } else if (finalConfig.provider === 'ethereal') {
    // For Ethereal, we need to get the test account user
    const testAccount = await nodemailer.createTestAccount();
    fromAddress = finalConfig.fromName
      ? `"${finalConfig.fromName}" <${testAccount.user}>`
      : testAccount.user;
  } else {
    throw new Error('From address is required for non-Ethereal providers');
  }

  // Send email
  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    ...(html && { html }),
  };

  const info = await transporter.sendMail(mailOptions);

  console.log('Message sent: %s', info.messageId);

  // Log preview URL for Ethereal
  if (finalConfig.provider === 'ethereal') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Preview URL: %s', previewUrl);
    return {
      messageId: info.messageId,
      previewUrl,
      provider: finalConfig.provider,
    };
  }

  return {
    messageId: info.messageId,
    provider: finalConfig.provider,
  };
};

// Convenience functions for specific providers
export const sendGmail = async (to, subject, text, html, user, pass) => {
  const config = {
    provider: 'gmail',
    user: user || secret.emailUser,
    pass: pass || secret.emailPassword,
  };
  return sendEmail(to, subject, text, html, config);
};

export const sendSmtp = async (
  to,
  subject,
  text,
  html,
  host,
  port,
  user,
  pass
) => {
  const config = {
    provider: 'smtp',
    host: host || secret.emailHost,
    port: port || secret.emailPort,
    user: user || secret.emailUser,
    pass: pass || secret.emailPassword,
  };
  return sendEmail(to, subject, text, html, config);
};

export const sendEthereal = async (to, subject, text, html) => {
  const config = {
    provider: 'ethereal',
  };
  return sendEmail(to, subject, text, html, config);
};

// Reusable HTML templates for common email types
const createOTPEmailTemplate = (options = {}) => {
  const {
    appName = 'Your App',
    otp,
    message,
    actionText = 'Enter this code on the verification page to complete your account setup.',
    footerText,
    expiresIn = 10,
    attempts = 3,
  } = options;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${appName}!</h2>
      <p>${message}:</p>
      ${
        otp
          ? `
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; border: 2px dashed #007bff;">
        ${otp}
      </div>
      `
          : ''
      }
      <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; color: #1976d2;"><strong>⏰ This code will expire in ${expiresIn} minutes</strong></p>
        <p style="margin: 5px 0 0 0; color: #1976d2;">🔄 You have ${attempts} attempts to enter the correct code</p>
      </div>
      <p>${actionText}</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        ${
          footerText ||
          `This is an automated message from ${appName}. Please do not reply to this email.`
        }
      </p>
    </div>
  `;
};

// Convenience function for sending OTP emails
export const sendOTPEmail = async (to, subject, otp, message, options = {}) => {
  const html = createOTPEmailTemplate({
    otp,
    message,
    ...options,
  });

  return sendEmail(to, subject, '', html);
};
