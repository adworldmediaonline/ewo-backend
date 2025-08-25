import { mongooseInstance } from '../lib/dbConnect.js';

const verificationSchema = new mongooseInstance.Schema(
  {
    identifier: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Verification = mongooseInstance.model(
  'Verification',
  verificationSchema
);

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;
