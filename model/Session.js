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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }
  // {
  //   timestamps: true,
  // }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
