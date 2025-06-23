const express = require('express');
const {
  trackMetaAddToCart,
  trackMetaPurchase,
  trackMetaViewContent,
  trackMetaPageView,
  trackMetaInitiateCheckout,
  trackMetaLead,
  trackMetaCustomEvent,
  trackMetaBatchEvents,
  getMetaConfigStatus,
  testMetaEvent
} = require('../controller/metaConversions.controller');

// Import middleware for authentication and authorization
const verifyToken = require('../middleware/verifyToken');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Public Meta tracking routes (for frontend and webhook usage)
router.post('/track/add-to-cart', trackMetaAddToCart);
router.post('/track/purchase', trackMetaPurchase);
router.post('/track/view-content', trackMetaViewContent);
router.post('/track/page-view', trackMetaPageView);
router.post('/track/initiate-checkout', trackMetaInitiateCheckout);
router.post('/track/lead', trackMetaLead);
router.post('/track/custom-event', trackMetaCustomEvent);
router.post('/track/batch-events', trackMetaBatchEvents);

// Public status and test endpoints (no authentication required)
router.get('/status', getMetaConfigStatus);
router.post('/test', testMetaEvent);

// Protected configuration routes (admin only)
router.get('/config/status', verifyToken, roleAuth(['admin']), getMetaConfigStatus);
router.post('/config/test', verifyToken, roleAuth(['admin']), testMetaEvent);

module.exports = router; 