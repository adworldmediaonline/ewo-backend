const express = require('express');
const router = express.Router();
const {
  addCoupon,
  addAllCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  validateMultipleCoupons,
  applyCoupon,
  getCouponAnalytics,
  bulkUpdateCoupons,
  duplicateCoupon,
  getValidCoupons,
  getCouponsByProduct,
  getOverallAnalytics,
} = require('../controller/coupon.controller');

// Import Coupon model for debug endpoint
const Coupon = require('../model/Coupon');

// Import middleware for authentication and authorization
const verifyToken = require('../middleware/verifyToken');
const roleAuth = require('../middleware/roleAuth');

// Check if coupon code is available
router.get(
  '/check-availability/:couponCode',
  verifyToken,
  roleAuth('Admin'),
  async (req, res) => {
    try {
      const couponCode = req.params.couponCode.toUpperCase();
      const existingCoupon = await Coupon.findOne({ couponCode });

      if (existingCoupon) {
        return res.json({
          success: false,
          available: false,
          message: `Coupon code "${couponCode}" is already taken`,
          existingCoupon: {
            title: existingCoupon.title,
            createdAt: existingCoupon.createdAt,
          },
        });
      }

      res.json({
        success: true,
        available: true,
        message: `Coupon code "${couponCode}" is available`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking coupon availability',
        error: error.message,
      });
    }
  }
);

//add a coupon - Only Admin role can create coupons
router.post('/add', verifyToken, roleAuth('Admin'), addCoupon);

//add multiple coupon - Only Admin role can create multiple coupons
router.post('/all', verifyToken, roleAuth('Admin'), addAllCoupon);

//get all coupon - Only Admin role can view all coupons
router.get('/', verifyToken, roleAuth('Admin'), getAllCoupons);

//get a coupon - Only Admin role can view specific coupon
router.get('/:id', verifyToken, roleAuth('Admin'), getCouponById);

//update a coupon - Only Admin role can update coupons
router.patch('/:id', verifyToken, roleAuth('Admin'), updateCoupon);

//delete a coupon - Only Admin role can delete coupons
router.delete('/:id', verifyToken, roleAuth('Admin'), deleteCoupon);

// Enhanced Coupon Management Routes - Admin Only

// Debug endpoint to test cart validation
router.post('/debug/validate/:couponCode', async (req, res) => {
  try {
    const { cartItems = [] } = req.body;
    const coupon = await Coupon.findOne({
      couponCode: req.params.couponCode.toUpperCase(),
    }).populate('applicableProducts');

    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }

    const applicableItems = coupon.getApplicableItems(cartItems);

    res.json({
      success: true,
      debug: {
        couponApplicableProducts: coupon.applicableProducts?.map(p =>
          p._id.toString()
        ),
        cartItemIds: cartItems.map(item => item.productId || item._id),
        applicableItemsCount: applicableItems.length,
        applicableItems: applicableItems.map(item => ({
          productId: item.productId || item._id,
          title: item.title,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug endpoint to check coupon details
router.get('/debug/:couponCode', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      couponCode: req.params.couponCode.toUpperCase(),
    }).populate('applicableProducts');

    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }

    res.json({
      success: true,
      data: {
        title: coupon.title,
        applicableType: coupon.applicableType,
        applicableProducts: coupon.applicableProducts?.map(p => ({
          id: p._id.toString(),
          title: p.title,
          sku: p.sku,
        })),
        discountType: coupon.discountType,
        discountPercentage: coupon.discountPercentage,
        minimumAmount: coupon.minimumAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//validate coupon code (public endpoint for frontend - used during checkout)
router.post('/validate', validateCoupon);

//validate multiple coupon codes (public endpoint for frontend - used for multiple coupons)
router.post('/validate-multiple', validateMultipleCoupons);

//apply coupon to order (internal use - used during order processing)
router.post('/apply', applyCoupon);

//get valid coupons for user (public endpoint - used by customers)
router.get('/valid/list', getValidCoupons);

//get coupons applicable to specific products (public endpoint - used by customers)
router.post('/products/applicable', getCouponsByProduct);

//get coupon analytics - Only Admin role can view analytics
router.get(
  '/:id/analytics',
  verifyToken,
  roleAuth('Admin'),
  getCouponAnalytics
);

//get overall coupon analytics - Only Admin role can view overall analytics
router.get(
  '/analytics/overview',
  verifyToken,
  roleAuth('Admin'),
  getOverallAnalytics
);

//bulk update coupons - Only Admin role can perform bulk operations
router.patch('/bulk/update', verifyToken, roleAuth('Admin'), bulkUpdateCoupons);

//duplicate coupon - Only Admin role can duplicate coupons
router.post('/:id/duplicate', verifyToken, roleAuth('Admin'), duplicateCoupon);

// Debug endpoint to list all coupon codes
router.get(
  '/debug/list-codes',
  verifyToken,
  roleAuth('Admin'),
  async (req, res) => {
    try {
      const coupons = await Coupon.find(
        {},
        'couponCode title applicableType createdAt'
      )
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        success: true,
        count: coupons.length,
        coupons: coupons.map(coupon => ({
          couponCode: coupon.couponCode,
          title: coupon.title,
          applicableType: coupon.applicableType,
          createdAt: coupon.createdAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching coupon codes',
        error: error.message,
      });
    }
  }
);

module.exports = router;
