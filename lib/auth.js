import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { nextCookies } from 'better-auth/next-js';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

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

  user: {
    additionalFields: {
      role: {
        defaultValue: 'user',
        type: 'string',
        input: false,
        required: true,
        // enum: ['super_admin', 'admin', 'user'],
      },
    },
  },

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Users are automatically signed in after signup

    requireEmailVerification: false, // Set to true in production
  },

  trustedOrigins: ['http://localhost:3000'],
  plugins: [inferAdditionalFields(), nextCookies()],

  // Social providers configuration
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
});
