/**
 * Admin settings routes - Super Admin and Admin.
 * Uses Better Auth (session) - same as page-section routes.
 * Coupon behavior and shipping settings.
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';
import * as adminSettingsController from '../controller/admin-settings.controller.js';

const router = express.Router();

router.use(requireAuth, roleAuth('super-admin', 'admin'));

router.get('/coupon', adminSettingsController.getCouponSettings);
router.patch('/coupon', adminSettingsController.updateCouponSettings);
router.get('/shipping', adminSettingsController.getShippingSettings);
router.patch('/shipping', adminSettingsController.updateShippingSettings);

export default router;
