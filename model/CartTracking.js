import mongoose from 'mongoose';

const cartTrackingSchema = new mongoose.Schema(
  {
    // User Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for guest users
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allow null values but create index for non-null
    },

    // Product Information
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productTitle: {
      type: String,
      required: true,
    },
    productSku: {
      type: String,
      index: true,
    },
    productCategory: {
      type: String,
      index: true,
    },
    productBrand: {
      type: String,
      index: true,
    },

    // Pricing Information
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    markedUpPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Cart Context
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    selectedOption: {
      title: String,
      price: Number,
      stock: Number,
    },
    cartItemsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cartTotalValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // User Behavior
    timeOnProductPage: {
      type: Number, // in seconds
      min: 0,
    },
    source: {
      type: String,
      enum: [
        'product-page',
        'quick-view',
        'search-results',
        'category-page',
        'recommendations',
        'wishlist',
        'compare',
        'shop-page',
        'home-page',
      ],
      required: true,
      index: true,
    },
    referrer: {
      type: String,
      trim: true,
    },

    // Technical Information
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
      },
      browser: String,
      os: String,
      screenResolution: String,
    },
    location: {
      country: String,
      city: String,
      timezone: String,
    },
    ipAddress: {
      type: String,
      // Store hashed/anonymized IP for privacy
    },

    // Conversion Tracking
    isFirstTimeUser: {
      type: Boolean,
      default: false,
    },
    isReturningCustomer: {
      type: Boolean,
      default: false,
    },
    previousPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },

    // A/B Testing & Experiments
    experiments: [
      {
        name: String,
        variant: String,
        _id: false,
      },
    ],

    // Conversion Funnel
    eventType: {
      type: String,
      enum: [
        'add_to_cart',
        'cart_viewed',
        'checkout_started',
        'purchase_completed',
      ],
      default: 'add_to_cart',
      required: true,
      index: true,
    },
    conversionPath: [String], // Track user journey

    // Additional Metadata
    campaignSource: String,
    campaignMedium: String,
    campaignName: String,
    utmParams: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },

    // Processing Status
    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processingErrors: [String],

    // Data Quality
    dataQuality: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      issues: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
cartTrackingSchema.index({ createdAt: -1 });
cartTrackingSchema.index({ sessionId: 1, createdAt: -1 });
cartTrackingSchema.index({ userId: 1, createdAt: -1 });
cartTrackingSchema.index({ productId: 1, createdAt: -1 });
cartTrackingSchema.index({ source: 1, eventType: 1, createdAt: -1 });
cartTrackingSchema.index({ userEmail: 1, createdAt: -1 });

// Compound indexes for analytics
cartTrackingSchema.index({
  productCategory: 1,
  productBrand: 1,
  createdAt: -1,
});
cartTrackingSchema.index({ isFirstTimeUser: 1, eventType: 1, createdAt: -1 });
cartTrackingSchema.index({ 'device.type': 1, source: 1, createdAt: -1 });

// Virtual for conversion rate calculation
cartTrackingSchema.virtual('hasConverted').get(function () {
  return this.eventType === 'purchase_completed';
});

// Static methods for analytics
cartTrackingSchema.statics.getConversionRateByProduct = function (
  productId,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        productId: mongoose.Types.ObjectId(productId),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
  ]);
};

cartTrackingSchema.statics.getTopProducts = function (
  limit = 10,
  startDate,
  endDate
) {
  const matchCondition = {
    eventType: 'add_to_cart',
    ...(startDate &&
      endDate && { createdAt: { $gte: startDate, $lte: endDate } }),
  };

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$productId',
        productTitle: { $first: '$productTitle' },
        productSku: { $first: '$productSku' },
        totalAdds: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        avgPrice: { $avg: '$finalPrice' },
        uniqueUsers: { $addToSet: '$sessionId' },
      },
    },
    {
      $project: {
        productTitle: 1,
        productSku: 1,
        totalAdds: 1,
        totalQuantity: 1,
        avgPrice: { $round: ['$avgPrice', 2] },
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { totalAdds: -1 } },
    { $limit: limit },
  ]);
};

// Pre-save middleware for data validation and enhancement
cartTrackingSchema.pre('save', function (next) {
  // Calculate data quality score
  let score = 100;
  const issues = [];

  if (!this.timeOnProductPage) {
    score -= 10;
    issues.push('Missing time on product page');
  }

  if (!this.device.type) {
    score -= 5;
    issues.push('Missing device information');
  }

  if (!this.location.country) {
    score -= 5;
    issues.push('Missing location information');
  }

  this.dataQuality = { score, issues };

  // Auto-generate session ID if not provided
  if (!this.sessionId) {
    this.sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  next();
});

const CartTracking = mongoose.model('CartTracking', cartTrackingSchema);

export default CartTracking;
