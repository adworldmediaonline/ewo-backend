const express = require('express');
const {
  trackAddToCart,
  trackCartAction,
  getCartAnalytics,
  getCartConversionFunnel,
  getPopularProducts,
  getUserCartJourney,
  markAsConverted,
  getCartTrackingStats,
  bulkTrackCartEvents,
  getCartTrackingStatsForAdmin,
  getCartTrackingEvents,
  getConversionFunnelForAdmin,
  getPopularProductsForAdmin,
} = require('../controller/cartTracking.controller');

// Import middleware for authentication and authorization
const verifyToken = require('../middleware/verifyToken');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Public tracking routes (for frontend tracking)
router.post('/track/add-to-cart', trackAddToCart);
router.post('/track/cart-action', trackCartAction);
router.post('/track/bulk-events', bulkTrackCartEvents);

// Conversion tracking (called when order is placed)
router.post('/track/conversion', markAsConverted);

// User specific routes (no authentication required for now)
router.get('/journey/user/:userId', getUserCartJourney);
router.get('/journey/email/:email', getUserCartJourney);
router.get('/journey/session/:sessionId', getUserCartJourney);

// Admin routes (no authentication required for now)
router.get('/analytics', getCartAnalytics);
router.get('/conversion-funnel', getCartConversionFunnel);
router.get('/popular-products', getPopularProducts);
router.get('/stats', getCartTrackingStats);

// New admin routes for admin panel (no authentication required for now)
router.get('/analytics/stats', getCartTrackingStatsForAdmin);
router.get('/events', getCartTrackingEvents);
router.get('/analytics/conversion-funnel', getConversionFunnelForAdmin);
router.get('/analytics/popular-products', getPopularProductsForAdmin);

module.exports = router;
