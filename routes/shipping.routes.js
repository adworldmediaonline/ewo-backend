import express from 'express';
import {
  shipOrder,
  updateTracking,
  getShippingStatus,
  getShippableOrders,
  getShippedOrders,
  bulkShipOrders,
} from '../controller/shipping.controller.js';

const router = express.Router();

router.get('/shippable-orders', getShippableOrders);
router.get('/shipped-orders', getShippedOrders);
router.get('/status/:id', getShippingStatus);
router.post('/ship/:id', shipOrder);
router.patch('/tracking/:id', updateTracking);
router.post('/bulk-ship', bulkShipOrders);

export default router;
