const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: false },
    productId: {
      type: ObjectId,
      ref: 'Products',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    // Guest user fields for feedback emails
    guestEmail: { type: String, required: false },
    guestName: { type: String, required: false },
    orderId: { type: ObjectId, ref: 'Order', required: false },
    isFromFeedbackEmail: { type: Boolean, default: false },
    // Security tracking fields
    submissionIP: { type: String, required: false },
    submissionUserAgent: { type: String, required: false },
    submissionTimestamp: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

const Reviews = mongoose.model('Reviews', reviewSchema);
module.exports = Reviews;
