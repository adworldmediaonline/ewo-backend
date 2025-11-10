import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { emailOTP } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';
import { secret } from '../config/env.js';
import { sendOTPEmail } from './email.js';

const {
  mongodbUri,
  betterAuthUrl,
  googleClientId,
  googleClientSecret,
  betterAuthSecret,
  nodeEnv,
} = secret;

if (!mongodbUri) {
  throw new Error('MONGODB_URI environment variable is required');
}

const client = new MongoClient(mongodbUri);
const db = client.db('evo_db');

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: betterAuthUrl,
  secret: betterAuthSecret,

  user: {
    additionalFields: {
      role: {
        defaultValue: 'user',
        type: 'string',
        input: false,
        // required: true,
        enum: ['super-admin', 'admin', 'user'],
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },

  emailVerification: {
    // TODO: Enable this when we have a way to auto sign in after verification
    // autoSignInAfterVerification: true,
  },

  trustedOrigins: [
    'http://localhost:3000',
    'https://www.eastwestoffroad.com',
    'http://localhost:4000',
    'https://admin.eastwestoffroad.com',
    'https://admin-v2.eastwestoffroad.com'
  ],

  plugins: [
    inferAdditionalFields(),
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
          let actionText = '';

          // Configure email based on type
          switch (type) {
            case 'sign-in':
              subject = 'Sign in to your account';
              message = 'Use this code to sign in to your account';
              actionText =
                'Enter this code on the sign-in page to access your account.';
              break;

            case 'email-verification':
              subject = 'Verify your email address';
              message =
                'Welcome! Please verify your email address with this code';
              actionText =
                'Enter this code on the verification page to complete your account setup.';
              break;

            case 'forget-password':
              subject = 'Reset your password';
              message = 'Use this code to reset your password';
              actionText =
                'Enter this code on the password reset page to create a new password.';
              break;

            default:
              subject = 'Reset code';
              message = 'Use this reset code';
              actionText = 'Enter this code to complete the reset process.';
          }

          // Send email using reusable template
          await sendOTPEmail(email, subject, otp, message, {
            appName: 'East West Off Road',
            actionText,
            footerText:
              'This is an automated message from East West Off Road App. Please do not reply to this email.',
            expiresIn: 10,
            attempts: 3,
          });


        } catch (error) {
          throw error;
        }
      },
    }),
  ],

  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },

  advanced: {
    useSecureCookies: nodeEnv === 'production',
    cookiePrefix: 'backend',
    crossSubDomainCookies:
      nodeEnv === 'production'
        ? {
          enabled: true,
          domain: '.eastwestoffroad.com',
        }
        : undefined,
    defaultCookieAttributes:
      nodeEnv === 'production'
        ? {
          secure: true,
          httpOnly: true,
          sameSite: 'none',
          partitioned: true,
        }
        : {
          secure: false, // Allow HTTP in development
          httpOnly: true,
          sameSite: 'lax', // Better for development
          domain: 'localhost', // Explicit domain for localhost
        },
  },
});
