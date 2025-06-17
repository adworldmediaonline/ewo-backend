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

// User specific routes (requires authentication)
router.get('/journey/user/:userId', verifyToken, getUserCartJourney);
router.get('/journey/email/:email', getUserCartJourney);
router.get('/journey/session/:sessionId', getUserCartJourney);

// Admin routes (requires admin authentication)
router.get('/analytics', verifyToken, roleAuth(['admin']), getCartAnalytics);
router.get(
  '/conversion-funnel',
  verifyToken,
  roleAuth(['admin']),
  getCartConversionFunnel
);
router.get(
  '/popular-products',
  verifyToken,
  roleAuth(['admin']),
  getPopularProducts
);
router.get('/stats', verifyToken, roleAuth(['admin']), getCartTrackingStats);

module.exports = router;
