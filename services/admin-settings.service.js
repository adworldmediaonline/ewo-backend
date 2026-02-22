/**
 * Admin settings service - store_settings collection.
 * Keys: "coupon" (coupon behavior), "shipping" (free shipping threshold).
 */
import mongoose from 'mongoose';

const COLLECTION = 'store_settings';
const COUPON_KEY = 'coupon';
const SHIPPING_KEY = 'shipping';

const DEFAULTS = {
  coupon: {
    autoApply: false,
    autoApplyStrategy: 'best_savings',
    showToastOnApply: true,
  },
  shipping: {
    freeShippingThreshold: null,
  },
};

function getCollection() {
  return mongoose.connection.db.collection(COLLECTION);
}

export async function getCouponSettings() {
  const col = getCollection();
  const doc = await col.findOne({ key: COUPON_KEY });
  if (!doc) return DEFAULTS.coupon;
  return {
    autoApply: doc.autoApply ?? DEFAULTS.coupon.autoApply,
    autoApplyStrategy: doc.autoApplyStrategy ?? DEFAULTS.coupon.autoApplyStrategy,
    showToastOnApply: doc.showToastOnApply ?? DEFAULTS.coupon.showToastOnApply,
  };
}

export async function updateCouponSettings(data) {
  const col = getCollection();
  await col.updateOne(
    { key: COUPON_KEY },
    {
      $set: {
        ...data,
        key: COUPON_KEY,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return data;
}

export async function getShippingSettings() {
  const col = getCollection();
  const doc = await col.findOne({ key: SHIPPING_KEY });
  if (!doc) return DEFAULTS.shipping;
  return {
    freeShippingThreshold:
      doc.freeShippingThreshold != null ? doc.freeShippingThreshold : null,
  };
}

export async function updateShippingSettings(data) {
  const col = getCollection();
  await col.updateOne(
    { key: SHIPPING_KEY },
    {
      $set: {
        freeShippingThreshold: data.freeShippingThreshold,
        key: SHIPPING_KEY,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return data;
}
