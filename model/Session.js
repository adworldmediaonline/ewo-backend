import { mongooseInstance } from '../lib/dbConnect.js';

const sessionSchema = new mongooseInstance.Schema(
  {
    // id: {
    //   type: String,
    //   required: true,
    //   unique: true,
    //   index: true,
    // },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    token: {
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
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
