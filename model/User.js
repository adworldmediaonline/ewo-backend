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

const User = mongoose.model('User', userSchema);

export default User;
