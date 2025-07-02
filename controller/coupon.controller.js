const Coupon = require('../model/Coupon');
const CouponUsage = require('../model/CouponUsage');
const Product = require('../model/Products');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

// addCoupon
const addCoupon = async (req, res, next) => {
  try {
    console.log('🎫 Creating new coupon with data:', {
      title: req.body.title,
      couponCode: req.body.couponCode,
      couponCodeUpperCase: req.body.couponCode?.toUpperCase(),
      couponCodeLength: req.body.couponCode?.length,
      couponCodeBytes: req.body.couponCode
        ? Buffer.from(req.body.couponCode).toString('hex')
        : null,
      discountType: req.body.discountType,
      applicableType: req.body.applicableType,
    });

    // Validate coupon code uniqueness
    const existingCoupon = await Coupon.findOne({
      couponCode: req.body.couponCode?.toUpperCase(),
    });

    if (existingCoupon) {
      console.log('🚫 Duplicate coupon code attempt:', {
        attemptedCode: req.body.couponCode?.toUpperCase(),
        existingCouponId: existingCoupon._id,
        existingCouponTitle: existingCoupon.title,
        existingCouponCreated: existingCoupon.createdAt,
      });

      return res.status(400).json({
        success: false,
        message: `Coupon code "${req.body.couponCode?.toUpperCase()}" already exists. Please use a different code.`,
        details: {
          existingCouponTitle: existingCoupon.title,
          existingCouponCreated: existingCoupon.createdAt,
        },
      });
    }

    // Set default values for backward compatibility
    const couponData = {
      ...req.body,
      discountType: req.body.discountType || 'percentage',
      applicableType:
        req.body.applicableType || (req.body.productType ? 'category' : 'all'),
    };

    // Handle product type for backward compatibility
    if (req.body.productType && !req.body.applicableCategories) {
      couponData.applicableCategories = [req.body.productType];
    }

    console.log('✅ No duplicate found, creating coupon...');
    const newCoupon = new Coupon(couponData);

    if (!newCoupon.startTime) {
      newCoupon.startTime = new Date();
    }

    await newCoupon.save();

    console.log('🎉 Coupon created successfully:', {
      id: newCoupon._id,
      couponCode: newCoupon.couponCode,
      title: newCoupon.title,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon Added Successfully!',
      data: newCoupon,
    });
  } catch (error) {
    console.error('❌ Coupon creation error:', {
      errorCode: error.code,
      errorMessage: error.message,
      attemptedCouponCode: req.body.couponCode,
      errorName: error.name,
      errorKeyPattern: error.keyPattern,
      errorKeyValue: error.keyValue,
    });

    if (error.code === 11000) {
      // MongoDB duplicate key error
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      const duplicateValue = error.keyValue
        ? error.keyValue[duplicateField]
        : 'unknown';

      return res.status(400).json({
        success: false,
        message: `Coupon code "${duplicateValue}" already exists in database. Please use a different code.`,
        errorType: 'duplicate_key',
        duplicateField,
        duplicateValue,
        suggestion: 'Try a completely different coupon code',
      });
    }
    next(error);
  }
};
// addAllCoupon
const addAllCoupon = async (req, res, next) => {
  try {
    await Coupon.deleteMany();
    await Coupon.insertMany(req.body);
    res.status(200).send({
      message: 'Coupon Added successfully!',
    });
  } catch (error) {
    next(error);
  }
};
// getAllCoupons
const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({}).sort({ _id: -1 });
    res.send(coupons);
  } catch (error) {
    next(error);
  }
};
// getCouponById
const getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    res.send(coupon);
  } catch (error) {
    next(error);
  }
};
// updateCoupon
const updateCoupon = async (req, res, next) => {
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
    next(error);
  }
};
// deleteCoupon
const deleteCoupon = async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Coupon delete successfully',
    });
  } catch (error) {
    next(error);
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
      userId,
    } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
      });
    }

    console.log('🎟️ Validating coupon:', {
      couponCode,
      cartItemsCount: cartItems.length,
      cartTotal,
      cartSubtotal,
      shippingCost,
      userId,
    });

    // Find coupon
    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
    }).populate('applicableProducts excludedProducts');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code',
      });
    }

    console.log('🎫 Found coupon:', {
      title: coupon.title,
      applicableType: coupon.applicableType,
      applicableProducts: coupon.applicableProducts?.map(p =>
        p._id?.toString()
      ),
      discountType: coupon.discountType,
      minimumAmount: coupon.minimumAmount,
    });

    // Debug cart items
    console.log(
      '🛒 Cart items for validation:',
      cartItems.map(item => ({
        productId: item.productId || item._id,
        title: item.title,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        price: item.price,
      }))
    );

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is expired or not available',
      });
    }

    // Check user restrictions
    if (userId && !coupon.canBeUsedBy(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible to use this coupon',
      });
    }

    // Check user usage limit
    if (coupon.usageLimitPerUser && userId) {
      const userUsageCount = await CouponUsage.getUserUsageCount(
        coupon._id,
        userId
      );
      if (userUsageCount >= coupon.usageLimitPerUser) {
        return res.status(400).json({
          success: false,
          message: 'You have reached the usage limit for this coupon',
        });
      }
    }

    // Calculate discount with additional options
    const discountResult = coupon.calculateDiscount(cartItems, cartTotal, {
      cartSubtotal,
      shippingCost,
    });

    console.log('💰 Discount calculation result:', discountResult);

    if (discountResult.discount === 0) {
      // Provide more detailed error message for debugging
      let detailedMessage = discountResult.message;

      if (discountResult.message === 'No applicable items in cart') {
        const applicableItems = coupon.getApplicableItems(cartItems);
        detailedMessage += `. Coupon applies to ${coupon.applicableType}`;

        if (coupon.applicableType === 'product') {
          detailedMessage += ` (${coupon.applicableProducts.length} specific products)`;
        } else if (coupon.applicableType === 'category') {
          detailedMessage += ` (categories: ${coupon.applicableCategories.join(
            ', '
          )})`;
        } else if (coupon.applicableType === 'brand') {
          detailedMessage += ` (brands: ${coupon.applicableBrands.join(', ')})`;
        }

        console.log('❌ No applicable items found. Debugging info:', {
          couponApplicableType: coupon.applicableType,
          applicableProducts: coupon.applicableProducts?.map(p =>
            p._id?.toString()
          ),
          applicableCategories: coupon.applicableCategories,
          applicableBrands: coupon.applicableBrands,
          cartItemIds: cartItems.map(item => item.productId || item._id),
          applicableItemsFound: applicableItems.length,
        });
      }

      return res.status(400).json({
        success: false,
        message: detailedMessage,
      });
    }

    // Get applicable items for detailed response
    const applicableItems = coupon.getApplicableItems(cartItems);
    const applicableProductNames = applicableItems
      .map(item => item.title)
      .filter(Boolean);

    console.log('✅ Coupon validation successful:', {
      discount: discountResult.discount,
      applicableItems: discountResult.applicableItems,
      applicableProductNames,
    });

    res.json({
      success: true,
      message: discountResult.message,
      data: {
        couponId: coupon._id,
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discount: discountResult.discount, // Dollar amount
        // Add original coupon values for display purposes
        discountPercentage: coupon.discountPercentage, // Original percentage (9.97)
        discountAmount: coupon.discountAmount, // Original fixed amount
        applicableItems: discountResult.applicableItems,
        applicableItemsTotal: discountResult.applicableItemsTotal, // Amount that discount was applied to
        applicableProductNames, // Array of product names that discount applies to
        title: coupon.title,
        description: coupon.description,
        appliedToFullTotal: discountResult.appliedToFullTotal,
        applicableType: coupon.applicableType, // 'all', 'product', 'category', 'brand'
      },
    });
  } catch (error) {
    console.error('❌ Coupon validation error:', error);
    next(error);
  }
};

// applyCoupon - Apply coupon to order
const applyCoupon = async (req, res, next) => {
  try {
    const { couponId, orderId, userId, discountAmount, orderTotal, sessionId } =
      req.body;

    // Find and validate coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon',
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
      source: 'web',
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
        discountAmount,
      },
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
        message: 'Coupon not found',
      });
    }

    const analyticsData = await CouponUsage.getCouponUsageStats(
      id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: {
        coupon: {
          _id: coupon._id,
          title: coupon.title,
          couponCode: coupon.couponCode,
          status: coupon.status,
          usageCount: coupon.usageCount,
          usageLimit: coupon.usageLimit,
        },
        analytics: analyticsData[0] || {
          totalUsage: 0,
          totalDiscount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          avgDiscount: 0,
          uniqueUsers: 0,
        },
      },
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
        message: 'Coupon IDs array is required',
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
        modified: result.modifiedCount,
      },
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
        message: 'New coupon code is required',
      });
    }

    // Check if new coupon code already exists
    const existingCoupon = await Coupon.findOne({
      couponCode: newCouponCode.toUpperCase(),
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    // Find original coupon
    const originalCoupon = await Coupon.findById(id);
    if (!originalCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Original coupon not found',
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
      totalRevenue: 0,
    };

    const newCoupon = new Coupon(duplicateData);
    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon duplicated successfully',
      data: newCoupon,
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
      .select(
        'title description couponCode discountType discountPercentage discountAmount minimumAmount endTime logo'
      )
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: coupons,
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
        message: 'Product IDs array is required',
      });
    }

    // Get products to check categories and brands
    const products = await Product.find({ _id: { $in: productIds } }).select(
      'category brand productType'
    );

    const categories = [...new Set(products.map(p => p.category))];
    const brands = [...new Set(products.map(p => p.brand))];
    const productTypes = [...new Set(products.map(p => p.productType))];

    // Find applicable coupons
    const coupons = await Coupon.find({
      status: 'active',
      $or: [
        { applicableType: 'all' },
        { applicableType: 'product', applicableProducts: { $in: productIds } },
        {
          applicableType: 'category',
          applicableCategories: { $in: categories },
        },
        { applicableType: 'category', productType: { $in: productTypes } },
        { applicableType: 'brand', applicableBrands: { $in: brands } },
      ],
      excludedProducts: { $nin: productIds },
    }).select(
      'title description couponCode discountType discountPercentage discountAmount minimumAmount endTime logo'
    );

    res.json({
      success: true,
      data: coupons,
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
        avgDiscountPercentage: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// validateMultipleCoupons - Enhanced multiple coupon validation
const validateMultipleCoupons = async (req, res, next) => {
  try {
    const {
      couponCodes = [], // Array of coupon codes to validate
      cartItems = [],
      cartTotal = 0,
      cartSubtotal = 0,
      shippingCost = 0,
      userId,
      excludeAppliedCoupons = [], // Already applied coupon codes to avoid duplicates
    } = req.body;

    if (!Array.isArray(couponCodes) || couponCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one coupon code is required',
      });
    }

    console.log('🎟️ Validating multiple coupons:', {
      couponCodes,
      cartItemsCount: cartItems.length,
      cartTotal,
      cartSubtotal,
      shippingCost,
      userId,
      excludeAppliedCoupons,
    });

    // Find all requested coupons
    const coupons = await Promise.all(
      couponCodes.map(async code => {
        const coupon = await Coupon.findOne({
          couponCode: code.toUpperCase(),
        }).populate('applicableProducts excludedProducts');
        return { code: code.toUpperCase(), coupon };
      })
    );

    console.log(
      '🎫 Found coupons:',
      coupons.map(c => ({
        code: c.code,
        found: !!c.coupon,
        title: c.coupon?.title,
      }))
    );

    const validationResults = [];
    const appliedCoupons = [];
    let totalDiscount = 0;
    const usedProductIds = new Set(); // Track which products already have discounts applied

    // Validate each coupon
    for (const { code, coupon } of coupons) {
      if (!coupon) {
        validationResults.push({
          couponCode: code,
          success: false,
          message: 'Invalid coupon code',
          discount: 0,
        });
        continue;
      }

      // Skip if coupon is already applied
      if (excludeAppliedCoupons.includes(code)) {
        validationResults.push({
          couponCode: code,
          success: false,
          message: 'Coupon already applied',
          discount: 0,
        });
        continue;
      }

      // Check if coupon is valid
      if (!coupon.isValid()) {
        validationResults.push({
          couponCode: code,
          success: false,
          message: 'Coupon is expired or not available',
          discount: 0,
        });
        continue;
      }

      // Check user restrictions
      if (userId && !coupon.canBeUsedBy(userId)) {
        validationResults.push({
          couponCode: code,
          success: false,
          message: 'You are not eligible to use this coupon',
          discount: 0,
        });
        continue;
      }

      // Get applicable items for this coupon
      const applicableItems = coupon.getApplicableItems(cartItems);

      // Filter out items that already have other coupons applied
      const availableItems = applicableItems.filter(item => {
        const productId = item.productId || item._id;
        return !usedProductIds.has(productId.toString());
      });

      if (availableItems.length === 0) {
        const reason =
          applicableItems.length === 0
            ? 'No applicable items in cart'
            : 'All applicable items already have other coupons applied';

        validationResults.push({
          couponCode: code,
          success: false,
          message: reason,
          discount: 0,
        });
        continue;
      }

      // Calculate discount for available items only
      const discountResult = coupon.calculateDiscount(
        availableItems,
        cartTotal,
        {
          cartSubtotal,
          shippingCost,
        }
      );

      if (discountResult.discount > 0) {
        // Mark these products as used
        availableItems.forEach(item => {
          const productId = item.productId || item._id;
          usedProductIds.add(productId.toString());
        });

        const applicableProductNames = availableItems
          .map(item => item.title)
          .filter(Boolean);

        const couponData = {
          couponId: coupon._id,
          couponCode: coupon.couponCode,
          title: coupon.title,
          discountType: coupon.discountType,
          discount: discountResult.discount,
          discountPercentage: coupon.discountPercentage,
          discountAmount: coupon.discountAmount,
          applicableItems: availableItems.length,
          applicableItemsTotal: discountResult.applicableItemsTotal,
          applicableProductNames,
          applicableType: coupon.applicableType,
          appliedToFullTotal: discountResult.appliedToFullTotal,
        };

        appliedCoupons.push(couponData);
        totalDiscount += discountResult.discount;

        validationResults.push({
          couponCode: code,
          success: true,
          message: discountResult.message,
          discount: discountResult.discount,
          couponData,
        });

        console.log(
          `✅ Coupon ${code} applied: $${discountResult.discount} discount on ${availableItems.length} items`
        );
      } else {
        validationResults.push({
          couponCode: code,
          success: false,
          message: discountResult.message,
          discount: 0,
        });
      }
    }

    console.log('💰 Multiple coupon validation complete:', {
      totalCouponsRequested: couponCodes.length,
      validCouponsApplied: appliedCoupons.length,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      usedProducts: Array.from(usedProductIds),
    });

    res.json({
      success: true,
      message: `${appliedCoupons.length} coupon(s) applied successfully`,
      data: {
        appliedCoupons,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        validationResults,
        summary: {
          totalCouponsRequested: couponCodes.length,
          validCouponsApplied: appliedCoupons.length,
          totalProductsWithDiscounts: usedProductIds.size,
        },
      },
    });
  } catch (error) {
    console.error('❌ Multiple coupon validation error:', error);
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
  validateMultipleCoupons,
};
