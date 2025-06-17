const express = require('express');
const {
  shipOrder,
  updateTracking,
  getShippingStatus,
  getShippableOrders,
  getShippedOrders,
  bulkShipOrders,
} = require('../controller/shipping.controller');

const router = express.Router();

router.get('/shippable-orders', getShippableOrders);
router.get('/shipped-orders', getShippedOrders);
router.get('/status/:id', getShippingStatus);
router.post('/ship/:id', shipOrder);
router.patch('/tracking/:id', updateTracking);
router.post('/bulk-ship', bulkShipOrders);

module.exports = router;
