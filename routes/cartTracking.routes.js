import express from 'express';
import {
  bulkTrackCartEvents,
  getCartAnalytics,
  getCartConversionFunnel,
  getCartTrackingEvents,
  getCartTrackingStats,
  getConversionFunnelForAdmin,
  getPopularProducts,
  getPopularProductsForAdmin,
  getUserCartJourney,
  markAsConverted,
  trackAddToCart,
  trackCartAction,
} from '../controller/cartTracking.controller.js';

// Import middleware for authentication and authorization

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
router.get('/events', getCartTrackingEvents);
router.get('/analytics/conversion-funnel', getConversionFunnelForAdmin);
router.get('/analytics/popular-products', getPopularProductsForAdmin);

export default router;
