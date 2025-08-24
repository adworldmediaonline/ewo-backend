import express from 'express';
import {
  addOrder,
  cancelOrder,
  diagnoseFeedbackEmail,
  getOrders,
  getPaymentDetails,
  getSingleOrder,
  paymentIntent,
  processRefund,
  sendDeliveryNotification,
  sendShippingNotification,
  triggerFeedbackEmail,
  updateOrderStatus,
  updateShippingDetails,
  verifyEmailConfiguration,
} from '../controller/order.controller.js';
const router = express.Router();

// get orders
router.get('/orders', getOrders);
// single order
router.get('/:id', getSingleOrder);
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
// get payment details for an order
router.get('/payment-details/:orderId', getPaymentDetails);

// trigger feedback email for delivered order (Admin only)
router.post('/trigger-feedback/:id', triggerFeedbackEmail);

// Diagnostic routes for troubleshooting
router.get('/diagnose-feedback/:id', diagnoseFeedbackEmail);
router.get('/verify-email-config', verifyEmailConfiguration);

export default router;
