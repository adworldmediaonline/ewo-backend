const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      type: String,
      required: false,
      default: '',
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: false,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    
    // Discount Configuration
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'],
      default: 'percentage',
    },
    discountPercentage: {
      type: Number,
      required: function() { return this.discountType === 'percentage'; },
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      required: function() { return this.discountType === 'fixed_amount'; },
      min: 0,
    },
    
    // Buy X Get Y Configuration
    buyQuantity: {
      type: Number,
      required: function() { return this.discountType === 'buy_x_get_y'; },
      min: 1,
    },
    getQuantity: {
      type: Number,
      required: function() { return this.discountType === 'buy_x_get_y'; },
      min: 1,
    },
    
    // Usage Restrictions
    minimumAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    maximumAmount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usageLimitPerUser: {
      type: Number,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Product/Category Restrictions
    applicableType: {
      type: String,
      enum: ['all', 'category', 'product', 'brand'],
      default: 'all',
    },
    productType: {
      type: String,
      required: function() { return this.applicableType === 'category'; },
    },
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
    }],
    applicableCategories: [{
      type: String,
    }],
    applicableBrands: [{
      type: String,
    }],
    excludedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
    }],
    
    // User Restrictions
    userRestrictions: {
      newUsersOnly: {
        type: Boolean,
        default: false,
      },
      allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      excludedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    },
    
    // Advanced Settings
    stackable: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    // Application Scope - whether to apply to subtotal only or full total including shipping
    applyToFullTotal: {
      type: Boolean,
      default: true, // For now, apply to full total. Change to false for subtotal only
    },
    
    // Status and Metadata
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'exhausted'],
      default: 'active',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    
    // Analytics
    analytics: {
      totalUsage: {
        type: Number,
        default: 0,
      },
      totalDiscount: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      lastUsed: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to update status
couponSchema.pre('save', function(next) {
  const now = new Date();
  
  // Auto-update status based on dates and usage
  if (this.endTime && now > this.endTime) {
    this.status = 'expired';
  } else if (this.usageLimit && this.usageCount >= this.usageLimit) {
    this.status = 'exhausted';
  } else if (this.startTime && now < this.startTime) {
    this.status = 'inactive';
  } else if (this.status === 'expired' || this.status === 'exhausted') {
    // Keep expired/exhausted status
  } else {
    this.status = 'active';
  }
  
  // Ensure coupon code is uppercase
  if (this.couponCode) {
    this.couponCode = this.couponCode.toUpperCase();
  }
  
  next();
});

// Instance Methods
couponSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    (!this.startTime || now >= this.startTime) &&
    (!this.endTime || now <= this.endTime) &&
    (!this.usageLimit || this.usageCount < this.usageLimit)
  );
};

couponSchema.methods.canBeUsedBy = function(userId) {
  if (!this.isValid()) return false;
  
  const restrictions = this.userRestrictions;
  
  // Check if user is excluded
  if (restrictions.excludedUsers && restrictions.excludedUsers.includes(userId)) {
    return false;
  }
  
  // Check if only specific users are allowed
  if (restrictions.allowedUsers && restrictions.allowedUsers.length > 0) {
    return restrictions.allowedUsers.includes(userId);
  }
  
  return true;
};

couponSchema.methods.calculateDiscount = function(cartItems, cartTotal, options = {}) {
  if (!this.isValid()) return { discount: 0, message: 'Coupon is not valid' };
  
  const { cartSubtotal = cartTotal, shippingCost = 0 } = options;
  
  // Determine the base amount for minimum/maximum checks
  // For now, use full total. In the future, this can be configured per coupon
  const baseAmountForLimits = this.applyToFullTotal ? cartTotal : cartSubtotal;
  
  // Check minimum amount
  if (baseAmountForLimits < this.minimumAmount) {
    return {
      discount: 0,
      message: `Minimum order amount of $${this.minimumAmount} required`
    };
  }
  
  // Check maximum amount
  if (this.maximumAmount && baseAmountForLimits > this.maximumAmount) {
    return {
      discount: 0,
      message: `Maximum order amount of $${this.maximumAmount} exceeded`
    };
  }
  
  // Filter applicable items
  const applicableItems = this.getApplicableItems(cartItems);
  if (applicableItems.length === 0) {
    return {
      discount: 0,
      message: 'No applicable items in cart'
    };
  }
  
  const applicableItemsTotal = applicableItems.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );
  
  let discount = 0;
  
  switch (this.discountType) {
    case 'percentage':
      if (this.applyToFullTotal) {
        // Apply percentage to full total (subtotal + shipping)
        discount = cartTotal * (this.discountPercentage / 100);
      } else {
        // Apply percentage only to applicable items (subtotal portion)
        discount = applicableItemsTotal * (this.discountPercentage / 100);
      }
      break;
    case 'fixed_amount':
      // Fixed amount applies regardless of scope, but cap at available amount
      const maxDiscount = this.applyToFullTotal ? cartTotal : applicableItemsTotal;
      discount = Math.min(this.discountAmount, maxDiscount);
      break;
    case 'buy_x_get_y':
      discount = this.calculateBuyXGetYDiscount(applicableItems);
      break;
    case 'free_shipping':
      // Free shipping discount equals the shipping cost
      discount = shippingCost;
      break;
  }
  
  return {
    discount: Math.round(discount * 100) / 100,
    message: 'Coupon applied successfully',
    applicableItems: applicableItems.length,
    appliedToFullTotal: this.applyToFullTotal
  };
};

couponSchema.methods.getApplicableItems = function(cartItems) {
  if (this.applicableType === 'all') {
    return cartItems.filter(item => 
      !this.excludedProducts.includes(item.productId || item._id)
    );
  }
  
  return cartItems.filter(item => {
    // Check exclusions first
    if (this.excludedProducts.includes(item.productId || item._id)) {
      return false;
    }
    
    switch (this.applicableType) {
      case 'product':
        return this.applicableProducts.includes(item.productId || item._id);
      case 'category':
        return this.applicableCategories.includes(item.category) || 
               (this.productType && item.productType === this.productType);
      case 'brand':
        return this.applicableBrands.includes(item.brand);
      default:
        return false;
    }
  });
};

couponSchema.methods.calculateBuyXGetYDiscount = function(items) {
  if (!this.buyQuantity || !this.getQuantity) return 0;
  
  let totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  let freeItems = Math.floor(totalQuantity / this.buyQuantity) * this.getQuantity;
  
  // Find cheapest items to make free
  const sortedItems = items.sort((a, b) => a.price - b.price);
  let discount = 0;
  let remainingFreeItems = freeItems;
  
  for (const item of sortedItems) {
    if (remainingFreeItems <= 0) break;
    const freeFromThisItem = Math.min(item.quantity, remainingFreeItems);
    discount += freeFromThisItem * item.price;
    remainingFreeItems -= freeFromThisItem;
  }
  
  return discount;
};

// Static Methods
couponSchema.statics.findValidCoupons = function(userId = null) {
  const now = new Date();
  const query = {
    status: 'active',
    $or: [
      { startTime: { $exists: false } },
      { startTime: { $lte: now } }
    ],
    $and: [
      {
        $or: [
          { endTime: { $exists: false } },
          { endTime: { $gte: now } }
        ]
      },
      {
        $or: [
          { usageLimit: { $exists: false } },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
        ]
      }
    ]
  };
  
  return this.find(query);
};

couponSchema.statics.getAnalytics = function(startDate, endDate) {
  const matchStage = {};
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
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalUsage: { $sum: '$analytics.totalUsage' },
        totalDiscount: { $sum: '$analytics.totalDiscount' },
        totalRevenue: { $sum: '$analytics.totalRevenue' },
        avgDiscountPercentage: { $avg: '$discountPercentage' }
      }
    }
  ]);
};

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
