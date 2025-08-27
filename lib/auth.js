import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { emailOTP } from 'better-auth/plugins';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { sendEmailGmail } from './email-services-gmail.js';

dotenv.config();

// Common iOS Safari and mobile issues and their solutions:
// 1. Cookies with SameSite=None must also be Secure
// 2. iOS Safari blocks third-party cookies by default
// 3. Cross-origin requests need proper CORS headers
// 4. Some versions of iOS Safari have issues with partitioned cookies
// 5. Mobile browsers may have different cookie policies
// 6. Social login redirects may need special handling for mobile

// Log environment information for debugging
console.log('🔧 Better-Auth Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI ? '✅ Configured' : '❌ Missing',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
    ? '✅ Configured'
    : '❌ Missing',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
    ? '✅ Configured'
    : '❌ Missing',
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'Not set',
});

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is required');
}

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db('evo_db');

// Dynamic baseURL configuration
const getBaseURL = () => {
  // Check environment variables first
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // For development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8090';
  }

  // For production, use Vercel URL or custom domain
  return 'https://ewo-backend.vercel.app';
};

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: getBaseURL(),
  basePath: '/api/auth',

  // Enable detailed logging for debugging mobile issues
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },

  user: {
    role: {
      defaultValue: 'user',
      type: 'string',
      input: false,
      required: false,
    },
  },

  trustedOrigins: [
    // Development origins
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:8090',
    'http://localhost:8081',

    // Production origins
    'https://ewo-admin.vercel.app',
    'https://www.eastwestoffroad.com',
    'https://eastwestoffroad.com',
    'https://ewo-staging.vercel.app',
    'https://ewo-backend.vercel.app',

    // Mobile app origins
    'expo://*',
    'capacitor://*',
    'ionic://*',

    // Dynamic origins based on environment
    ...(process.env.NODE_ENV === 'production' ? [getBaseURL()] : []),
  ],

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    // Improve mobile compatibility
    requireEmailVerification: true,
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
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationOnSignUp: true,
    // Improve mobile compatibility
    linkExpiresIn: 900, // 15 minutes instead of default 10
  },

  session: {
    // Improve session handling for mobile
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  // Add better error handling and mobile support
  hooks: {
    beforeRequest: async request => {
      // Log requests for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth Request:', request.method, request.url);
      }
      return request;
    },
    afterRequest: async (response, request) => {
      // Log responses for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth Response:', response.status, request.url);
      }
      return response;
    },
  },

  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectURI:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000/api/auth/callback/google'
          : `${getBaseURL()}/api/auth/callback/google`,
      // Additional Google OAuth settings for better mobile support
      scope: ['openid', 'email', 'profile'],
      accessType: 'offline',
      includeGrantedScopes: true,
      // Mobile-specific settings
      responseType: 'code',
      hd: undefined, // Allow any Google account domain
      loginHint: undefined,
      // Better mobile compatibility
      pkce: {
        enabled: true,
        method: 'S256',
      },
    },
  },

  plugins: [
    // inferAdditionalFields(),
    emailOTP({
      // Improve mobile compatibility
      rateLimit: {
        window: 60, // 1 minute
        max: 5, // 5 attempts per minute
      },
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
  ],

  // Advanced configuration for better mobile support
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      partitioned: false, // Disable partitioned cookies for better mobile compatibility
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
    },
    // Improve cross-origin handling for mobile
    crossOrigin: {
      enabled: true,
      credentials: 'include',
      origin: true, // Allow all origins in development
    },
    // Additional headers for mobile compatibility
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
});

// Export additional debugging information
export const debugAuthConfig = () => ({
  baseURL: getBaseURL(),
  environment: process.env.NODE_ENV,
  googleConfigured: !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ),
  trustedOriginsCount: auth.options.trustedOrigins?.length || 0,
  cookieSettings: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    partitioned: false,
  },
});

console.log('🚀 Better-Auth initialized successfully!');
console.log('📊 Debug Info:', debugAuthConfig());
