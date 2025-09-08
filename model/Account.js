import { mongooseInstance } from '../lib/dbConnect.js';

const accountSchema = new mongooseInstance.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: false,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    accessTokenExpiresAt: {
      type: Date,
      required: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: false,
    },
    scope: {
      type: String,
      required: false,
    },
    idToken: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'account',
  }
);

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
