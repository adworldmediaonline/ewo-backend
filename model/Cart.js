const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    cartItems: [
      {
        _id: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        img: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        orderQuantity: {
          type: Number,
          required: true,
          min: 1,
        },
        sku: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
cartSchema.index({ email: 1 });
cartSchema.index({ createdAt: -1 });
cartSchema.index({ isActive: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
