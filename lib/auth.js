import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { sendEmailGmail } from './email-services-gmail.js';
// import { sendEmail } from './email-services.js';

// import { connectToDatabase, getMongoDb } from './dbConnect.js';
// Load environment variables first
dotenv.config();
// Check if MONGO_URI exists
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is required');
}

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db('evo_db');

export const auth = betterAuth({
  database: mongodbAdapter(db),

  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url, token }, request) => {
      try {
        await sendEmailGmail({
          to: user.email,
          subject: 'Reset your password',
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>We received a request to reset your password for your East West off road account.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${url}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <p style="margin: 0; color: #856404;"><strong>⏰ This link will expire in 1 hour</strong></p>
                  <p style="margin: 5px 0 0 0; color: #856404;">🔒 If you didn't request this, please ignore this email</p>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">${url}</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  This is an automated message from East West off road App. Please do not reply to this email.
                </p>
              </div>
            `,
        });
        console.log('✅ PASSWORD RESET EMAIL COMPLETED!');
      } catch (error) {
        console.error('❌ PASSWORD RESET EMAIL FAILED:', error);
        throw error;
      }
    },
    onPasswordReset: async ({ user }, request) => {
      console.log(`✅ Password reset completed for user: ${user.email}`);
      // You can add additional logic here like logging, notifications, etc.
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationOnSignUp: true,
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          defaultValue: 'user',
          type: 'string',
          input: false,
          required: true,
          // enum: ['super_admin', 'admin', 'user'],
        },
      },
    }),
    emailOTP({
      // disableSignUp: true,
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      allowedAttempts: 3,
      sendVerificationOnSignUp: true, // Send OTP when user signs up
      overrideDefaultEmailVerification: true, // Use OTP instead of links for email verification
      // disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        try {
          let subject = '';
          let message = '';

          if (type === 'sign-in') {
            subject = 'Sign in to your account';
            message = 'Use this code to sign in to your account';
          } else if (type === 'email-verification') {
            subject = 'Verify your email address';
            message =
              'Welcome! Please verify your email address with this code';
          } else if (type === 'forget-password') {
            subject = 'Reset your password';
            message = 'Use this code to reset your password';
          } else {
            subject = 'Verification code';
            message = 'Use this verification code';
          }

          await sendEmailGmail({
            to: email,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Welcome to East West off road!</h2>
                  <p>${message}:</p>
                  <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; border: 2px dashed #007bff;">
                    ${otp}
                  </div>
                  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #1976d2;"><strong>⏰ This code will expire in 10 minutes</strong></p>
                    <p style="margin: 5px 0 0 0; color: #1976d2;">🔄 You have 3 attempts to enter the correct code</p>
                  </div>
                  <p>Enter this code on the verification page to complete your account setup.</p>
                  <p>If you didn't create an account, please ignore this email.</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 12px;">
                    This is an automated message from East West off road App. Please do not reply to this email.
                  </p>
                </div>
              `,
          });
          console.log('✅ OTP EMAIL COMPLETED!');
        } catch (error) {
          console.error('❌ OTP EMAIL FAILED:', error);
          throw error;
        }
      },
    }),
    nextCookies(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    'http://localhost:3000',
    'https://www.eastwestoffroad.com',
    process.env.STORE_URL_FRONTEND,
  ],
});
