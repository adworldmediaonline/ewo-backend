import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    image: {
      type: String,
      required: false,
    },

    shippingAddress: String,

    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  },
  {
    timestamps: true,
    collection: 'user',
  }
);

// Add indexes for better query performance
userSchema.index({ createdAt: -1 }); // Index for sorting by creation date
userSchema.index({ role: 1, createdAt: -1 }); // Compound index for role filtering and sorting
userSchema.index({ email: 1 }); // Already has unique index, but explicit for clarity

const User = mongoose.model('User', userSchema);

export default User;
