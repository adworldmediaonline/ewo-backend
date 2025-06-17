const express = require('express');
const {
  paymentIntent,
  addOrder,
  getOrders,
  updateOrderStatus,
  getSingleOrder,
  sendShippingNotification,
  updateShippingDetails,
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
// update shipping details and optionally send notification
router.patch('/update-shipping/:id', updateShippingDetails);

module.exports = router;
