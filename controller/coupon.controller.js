const Coupon = require('../model/Coupon');
const CouponUsage = require('../model/CouponUsage');
const Product = require('../model/Products');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

// addCoupon
const addCoupon = async (req, res, next) => {
  try {
    // Validate coupon code uniqueness
    const existingCoupon = await Coupon.findOne({ 
      couponCode: req.body.couponCode?.toUpperCase() 
    });
    
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    // Set default values for backward compatibility
    const couponData = {
      ...req.body,
      discountType: req.body.discountType || 'percentage',
      applicableType: req.body.applicableType || (req.body.productType ? 'category' : 'all'),
    };

    // Handle product type for backward compatibility
    if (req.body.productType && !req.body.applicableCategories) {
      couponData.applicableCategories = [req.body.productType];
    }

    const newCoupon = new Coupon(couponData);
    
    if (!newCoupon.startTime) {
      newCoupon.startTime = new Date();
    }
    
    await newCoupon.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Coupon Added Successfully!',
      data: newCoupon
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code must be unique'
      });
    }
    next(error);
  }
};
// addAllCoupon
const addAllCoupon = async (req, res,next) => {
  try {
    await Coupon.deleteMany();
    await Coupon.insertMany(req.body);
    res.status(200).send({
      message: 'Coupon Added successfully!',
    });
  } catch (error) {
    next(error)
  }
};
// getAllCoupons
const getAllCoupons = async (req, res,next) => {
  try {
    const coupons = await Coupon.find({}).sort({ _id: -1 });
    res.send(coupons);
  } catch (error) {
    next(error)
  }
};
// getCouponById
const getCouponById = async (req, res,next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    res.send(coupon);
  } catch (error) {
    next(error)
  }
};
// updateCoupon
const updateCoupon = async (req, res,next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (coupon) {
      coupon.title = req.body.title;
      coupon.couponCode = req.body.couponCode;
      coupon.endTime = dayjs().utc().format(req.body.endTime);
      coupon.discountPercentage = req.body.discountPercentage;
      coupon.minimumAmount = req.body.minimumAmount;
      coupon.productType = req.body.productType;
      coupon.logo = req.body.logo;
      await coupon.save();
      res.send({ message: 'Coupon Updated Successfully!' });
    }
  } catch (error) {
    // console.log('coupon error',error)
    next(error)
  }
};
// deleteCoupon
const deleteCoupon = async (req, res,next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success:true,
      message:'Coupon delete successfully',
    })
  } catch (error) {
    next(error)
  }
};

// validateCoupon - Enhanced coupon validation
const validateCoupon = async (req, res, next) => {
  try {
    const { 
      couponCode, 
      cartItems = [], 
      cartTotal = 0, 
      cartSubtotal = 0,
      shippingCost = 0,
      userId 
    } = req.body;
    
    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    // Find coupon
    const coupon = await Coupon.findOne({ 
      couponCode: couponCode.toUpperCase() 
    }).populate('applicableProducts excludedProducts');
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is expired or not available'
      });
    }

    // Check user restrictions
    if (userId && !coupon.canBeUsedBy(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible to use this coupon'
      });
    }

    // Check user usage limit
    if (coupon.usageLimitPerUser && userId) {
      const userUsageCount = await CouponUsage.getUserUsageCount(coupon._id, userId);
      if (userUsageCount >= coupon.usageLimitPerUser) {
        return res.status(400).json({
          success: false,
          message: 'You have reached the usage limit for this coupon'
        });
      }
    }

    // Calculate discount with additional options
    const discountResult = coupon.calculateDiscount(cartItems, cartTotal, {
      cartSubtotal,
      shippingCost
    });
    
    if (discountResult.discount === 0) {
      return res.status(400).json({
        success: false,
        message: discountResult.message
      });
    }

    res.json({
      success: true,
      message: discountResult.message,
      data: {
        couponId: coupon._id,
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discount: discountResult.discount,
        applicableItems: discountResult.applicableItems,
        title: coupon.title,
        description: coupon.description
      }
    });
  } catch (error) {
    next(error);
  }
};

// applyCoupon - Apply coupon to order
const applyCoupon = async (req, res, next) => {
  try {
    const { couponId, orderId, userId, discountAmount, orderTotal, sessionId } = req.body;
    
    // Find and validate coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon'
      });
    }

    // Create usage record
    const usage = new CouponUsage({
      couponId,
      orderId,
      userId,
      sessionId,
      discountAmount,
      orderTotal,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      source: 'web'
    });

    await usage.save();

    // Update coupon analytics
    coupon.usageCount += 1;
    coupon.analytics.totalUsage += 1;
    coupon.analytics.totalDiscount += discountAmount;
    coupon.analytics.totalRevenue += orderTotal;
    coupon.analytics.lastUsed = new Date();

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        usageId: usage._id,
        discountAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// getCouponAnalytics
const getCouponAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const analyticsData = await CouponUsage.getCouponUsageStats(id, startDate, endDate);
    
    res.json({
      success: true,
      data: {
        coupon: {
          _id: coupon._id,
          title: coupon.title,
          couponCode: coupon.couponCode,
          status: coupon.status,
          usageCount: coupon.usageCount,
          usageLimit: coupon.usageLimit
        },
        analytics: analyticsData[0] || {
          totalUsage: 0,
          totalDiscount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          avgDiscount: 0,
          uniqueUsers: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// bulkUpdateCoupons
const bulkUpdateCoupons = async (req, res, next) => {
  try {
    const { couponIds, updateData } = req.body;
    
    if (!couponIds || !Array.isArray(couponIds) || couponIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Coupon IDs array is required'
      });
    }

    const result = await Coupon.updateMany(
      { _id: { $in: couponIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} coupons updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// duplicateCoupon
const duplicateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newCouponCode } = req.body;

    if (!newCouponCode) {
      return res.status(400).json({
        success: false,
        message: 'New coupon code is required'
      });
    }

    // Check if new coupon code already exists
    const existingCoupon = await Coupon.findOne({ 
      couponCode: newCouponCode.toUpperCase() 
    });
    
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    // Find original coupon
    const originalCoupon = await Coupon.findById(id);
    if (!originalCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Original coupon not found'
      });
    }

    // Create duplicate
    const duplicateData = originalCoupon.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.__v;
    
    duplicateData.couponCode = newCouponCode.toUpperCase();
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.usageCount = 0;
    duplicateData.analytics = {
      totalUsage: 0,
      totalDiscount: 0,
      totalRevenue: 0
    };

    const newCoupon = new Coupon(duplicateData);
    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon duplicated successfully',
      data: newCoupon
    });
  } catch (error) {
    next(error);
  }
};

// getValidCoupons - Get all valid coupons for a user
const getValidCoupons = async (req, res, next) => {
  try {
    const { userId } = req.query;
    
    const coupons = await Coupon.findValidCoupons(userId)
      .select('title description couponCode discountType discountPercentage discountAmount minimumAmount endTime logo')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

// getCouponsByProduct - Get applicable coupons for specific products
const getCouponsByProduct = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    // Get products to check categories and brands
    const products = await Product.find({ _id: { $in: productIds } })
      .select('category brand productType');

    const categories = [...new Set(products.map(p => p.category))];
    const brands = [...new Set(products.map(p => p.brand))];
    const productTypes = [...new Set(products.map(p => p.productType))];

    // Find applicable coupons
    const coupons = await Coupon.find({
      status: 'active',
      $or: [
        { applicableType: 'all' },
        { applicableType: 'product', applicableProducts: { $in: productIds } },
        { applicableType: 'category', applicableCategories: { $in: categories } },
        { applicableType: 'category', productType: { $in: productTypes } },
        { applicableType: 'brand', applicableBrands: { $in: brands } }
      ],
      excludedProducts: { $nin: productIds }
    }).select('title description couponCode discountType discountPercentage discountAmount minimumAmount endTime logo');

    res.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

// getOverallAnalytics
const getOverallAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analyticsData = await Coupon.getAnalytics(startDate, endDate);
    
    res.json({
      success: true,
      data: analyticsData[0] || {
        totalCoupons: 0,
        activeCoupons: 0,
        totalUsage: 0,
        totalDiscount: 0,
        totalRevenue: 0,
        avgDiscountPercentage: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addCoupon,
  addAllCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getCouponAnalytics,
  bulkUpdateCoupons,
  duplicateCoupon,
  getValidCoupons,
  getCouponsByProduct,
  getOverallAnalytics,
};
