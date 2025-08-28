import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer, emailOTP, jwt } from 'better-auth/plugins';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { sendEmailGmail } from './email-services-gmail.js';

dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is required');
}

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db('evo_db');

// Utility function to extract JWT token from request headers
export const extractTokenFromHeaders = headers => {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Utility function to verify JWT token
export const verifyToken = async token => {
  try {
    const session = await auth.api.getSession({
      headers: { authorization: `Bearer ${token}` },
    });
    return session;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const auth = betterAuth({
  database: mongodbAdapter(db),
  // baseURL: `http://localhost:8090`,
  baseURL: process.env.API_BASE_URL,

  user: {
    role: {
      defaultValue: 'user',
      type: 'string',
      input: false,
      required: false,
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:8090',
    'https://www.eastwestoffroad.com',
  ],

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
                  <p style="margin: 0; color: #856404;"><strong>⏰ This link will expire in 24 hours</strong></p>
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
    // JWT plugin for token-based authentication (following official docs)
    jwt({
      jwks: {
        keyPairConfig: {
          alg: 'EdDSA',
          crv: 'Ed25519',
        },
      },
      jwt: {
        issuer: process.env.API_BASE_URL,
        audience: process.env.API_BASE_URL,
        expirationTime: '24h', // 24 hours for better user experience
        getSubject: session => session.user.id,
        definePayload: ({ user }) => {
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            createdAt: user.createdAt,
          };
        },
      },
    }),

    // Bearer plugin for Authorization header support (following official docs)
    bearer(),

    // Email OTP plugin
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      allowedAttempts: 3,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
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
  ],

  // Cookie configuration for cross-site support
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production' ? true : false, // Set to false for localhost development
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false, // Set to false for localhost development
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use 'lax' for localhost, 'none' for production
      partitioned: process.env.NODE_ENV === 'production' ? true : false, // Disable for localhost
    },
  },
});
