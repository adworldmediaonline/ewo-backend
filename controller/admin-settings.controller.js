/**
 * Admin settings controller - coupon behavior and shipping.
 * Super Admin only.
 */
import * as adminSettingsService from '../services/admin-settings.service.js';

const COUPON_STRATEGIES = ['best_savings', 'first_created', 'highest_percentage', 'customer_choice'];

export const getCouponSettings = async (req, res, next) => {
  try {
    const settings = await adminSettingsService.getCouponSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCouponSettings = async (req, res, next) => {
  try {
    const { autoApply, autoApplyStrategy, showToastOnApply } = req.body;

    if (typeof autoApply !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoApply must be a boolean',
      });
    }
    if (!COUPON_STRATEGIES.includes(autoApplyStrategy)) {
      return res.status(400).json({
        success: false,
        message: `autoApplyStrategy must be one of: ${COUPON_STRATEGIES.join(', ')}`,
      });
    }
    if (typeof showToastOnApply !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'showToastOnApply must be a boolean',
      });
    }

    const data = { autoApply, autoApplyStrategy, showToastOnApply };
    await adminSettingsService.updateCouponSettings(data);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getShippingSettings = async (req, res, next) => {
  try {
    const settings = await adminSettingsService.getShippingSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateShippingSettings = async (req, res, next) => {
  try {
    const { freeShippingThreshold } = req.body;

    if (freeShippingThreshold != null) {
      const num = Number(freeShippingThreshold);
      if (Number.isNaN(num) || num < 0) {
        return res.status(400).json({
          success: false,
          message: 'freeShippingThreshold must be a non-negative number or null',
        });
      }
    }

    const data = {
      freeShippingThreshold:
        freeShippingThreshold == null || freeShippingThreshold === ''
          ? null
          : Number(freeShippingThreshold),
    };
    await adminSettingsService.updateShippingSettings(data);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
