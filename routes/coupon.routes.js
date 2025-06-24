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
  applyCoupon,
  getCouponAnalytics,
  bulkUpdateCoupons,
  duplicateCoupon,
  getValidCoupons,
  getCouponsByProduct,
  getOverallAnalytics,
} = require('../controller/coupon.controller');

// Import middleware for authentication and authorization
const verifyToken = require('../middleware/verifyToken');
const roleAuth = require('../middleware/roleAuth');

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

//validate coupon code (public endpoint for frontend - used during checkout)
router.post('/validate', validateCoupon);

//apply coupon to order (internal use - used during order processing)
router.post('/apply', applyCoupon);

//get valid coupons for user (public endpoint - used by customers)
router.get('/valid/list', getValidCoupons);

//get coupons applicable to specific products (public endpoint - used by customers)
router.post('/products/applicable', getCouponsByProduct);

//get coupon analytics - Only Admin role can view analytics
router.get('/:id/analytics', verifyToken, roleAuth('Admin'), getCouponAnalytics);

//get overall coupon analytics - Only Admin role can view overall analytics
router.get('/analytics/overview', verifyToken, roleAuth('Admin'), getOverallAnalytics);

//bulk update coupons - Only Admin role can perform bulk operations
router.patch('/bulk/update', verifyToken, roleAuth('Admin'), bulkUpdateCoupons);

//duplicate coupon - Only Admin role can duplicate coupons
router.post('/:id/duplicate', verifyToken, roleAuth('Admin'), duplicateCoupon);

module.exports = router;
