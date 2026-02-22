/**
 * Public store settings routes - no auth required.
 * Used by storefront for coupon behavior and shipping settings.
 */
import express from 'express';
import * as adminSettingsService from '../services/admin-settings.service.js';

const router = express.Router();

router.get('/coupon', async (req, res, next) => {
  try {
    const settings = await adminSettingsService.getCouponSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.get('/shipping', async (req, res, next) => {
  try {
    const settings = await adminSettingsService.getShippingSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export default router;
