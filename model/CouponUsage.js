import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },

    // Usage Details
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    applicableItems: {
      type: Number,
      default: 0,
    },

    // Metadata
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin', 'api'],
      default: 'web',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ couponId: 1, createdAt: -1 });
couponUsageSchema.index({ userId: 1, createdAt: -1 });

// Static methods for analytics
couponUsageSchema.statics.getCouponUsageStats = function (
  couponId,
  startDate,
  endDate
) {
  const matchStage = { couponId: mongoose.Types.ObjectId(couponId) };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' },
        totalRevenue: { $sum: '$orderTotal' },
        avgOrderValue: { $avg: '$orderTotal' },
        avgDiscount: { $avg: '$discountAmount' },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        totalUsage: 1,
        totalDiscount: 1,
        totalRevenue: 1,
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
        avgDiscount: { $round: ['$avgDiscount', 2] },
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
  ]);
};

couponUsageSchema.statics.getUserUsageCount = function (couponId, userId) {
  const query = { couponId: mongoose.Types.ObjectId(couponId) };
  if (userId) {
    query.userId = mongoose.Types.ObjectId(userId);
  }
  return this.countDocuments(query);
};

const CouponUsage =
  mongoose.models.CouponUsage ||
  mongoose.model('CouponUsage', couponUsageSchema);
export default CouponUsage;
