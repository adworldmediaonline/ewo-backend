const express = require('express');
const {
  paymentIntent,
  addOrder,
  getOrders,
  updateOrderStatus,
  getSingleOrder,
  sendShippingNotification,
  sendDeliveryNotification,
  updateShippingDetails,
  processRefund,
  cancelOrder,
  getPaymentDetails,
} = require('../controller/order.controller');

// router
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

module.exports = router;
