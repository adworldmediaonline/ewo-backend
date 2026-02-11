import express from 'express';
import {
  addOrder,
  cancelOrder,
  calculateTaxPreview,
  diagnoseFeedbackEmail,
  getOrderEmails,
  getOrders,
  getPaymentDetails,
  getSingleOrder,
  paymentIntent,
  processRefund,
  sendBulkReviewRequestEmails,
  sendDeliveryNotification,
  sendPromotionalEmail,
  sendShippingNotification,
  triggerFeedbackEmail,
  updateOrderStatus,
  updateShippingDetails,
  verifyEmailConfiguration,
} from '../controller/order.controller.js';
const router = express.Router();

// Specific routes must come before parameterized routes to avoid conflicts

// get orders
router.get('/orders', getOrders);

// Promotional emails routes (must be before /:id)
router.get('/emails', getOrderEmails);
router.post('/send-promotional-email', sendPromotionalEmail);

// Diagnostic routes for troubleshooting (must be before /:id)
router.get('/diagnose-feedback/:id', diagnoseFeedbackEmail);
router.get('/verify-email-config', verifyEmailConfiguration);

// Payment management routes (must be before /:id)
router.get('/payment-details/:orderId', getPaymentDetails);

// trigger feedback email for delivered order (Admin only)
router.post('/trigger-feedback/:id', triggerFeedbackEmail);

// Send bulk review request emails (Super Admin only)
router.post('/send-bulk-review-requests', sendBulkReviewRequestEmails);

// calculate tax preview (for checkout UI)
router.post('/calculate-tax', calculateTaxPreview);
// add a create payment intent
router.post('/create-payment-intent', paymentIntent);
// save Order
router.post('/saveOrder', addOrder);
// update status
router.patch('/update-status/:id', updateOrderStatus);
// send shipping notification with tracking
router.post('/send-shipping-notification/:id', sendShippingNotification);
// send delivery notification
router.post('/send-delivery-notification/:id', sendDeliveryNotification);
// update shipping details and optionally send notification
router.patch('/update-shipping/:id', updateShippingDetails);

// Enhanced: Payment management routes
// process refund for an order
router.post('/refund/:orderId', processRefund);
// cancel order (with automatic refund if applicable)
router.post('/cancel/:orderId', cancelOrder);

// single order (must be last - parameterized route)
router.get('/:id', getSingleOrder);

export default router;
