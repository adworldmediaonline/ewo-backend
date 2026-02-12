import PageMetadata from '../model/PageMetadata.js';
import ApiError from '../errors/api-error.js';

/** Known pages that can have metadata - used for admin list and defaults */
export const KNOWN_PAGES = [
  { slug: 'home', displayName: 'Home' },
  { slug: 'contact', displayName: 'Contact' },
  { slug: 'about', displayName: 'About Us' },
  { slug: 'shop', displayName: 'Shop' },
  { slug: 'terms', displayName: 'Terms & Conditions' },
  { slug: 'returns', displayName: 'Returns Policy' },
  { slug: 'shipping', displayName: 'Shipping Policy' },
  { slug: 'history', displayName: 'Company History' },
  { slug: 'cart', displayName: 'Cart' },
  { slug: 'checkout', displayName: 'Checkout' },
  { slug: 'wishlist', displayName: 'Wishlist' },
];

/**
 * Get all page metadata - returns known pages merged with DB data.
 * Pages not in DB appear with null metadata (using defaults).
 */
export const getAllPageMetadataService = async () => {
  const dbRecords = await PageMetadata.find({}).lean();
  const bySlug = Object.fromEntries(dbRecords.map((r) => [r.slug, r]));

  return KNOWN_PAGES.map((page) => {
    const existing = bySlug[page.slug];
    return existing
      ? { ...existing, displayName: existing.displayName || page.displayName }
      : { ...page, _id: null, metaTitle: null, metaDescription: null, metaKeywords: null, canonicalUrl: null, ogImage: null, isActive: true, createdAt: null, updatedAt: null };
  });
};

/**
 * Get page metadata by slug (public - for frontend).
 * Returns null if not found or inactive.
 */
export const getPageMetadataBySlugService = async (slug) => {
  const normalizedSlug = slug?.toLowerCase?.()?.trim?.();
  if (!normalizedSlug) return null;

  const record = await PageMetadata.findOne({ slug: normalizedSlug, isActive: true }).lean();
  return record;
};

/**
 * Upsert page metadata by slug.
 * Creates if not exists, updates if exists.
 */
export const upsertPageMetadataService = async (slug, data) => {
  const normalizedSlug = slug?.toLowerCase?.()?.trim?.();
  if (!normalizedSlug) {
    throw new ApiError(400, 'Invalid slug');
  }

  const updateData = {
    displayName: data.displayName,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    metaKeywords: data.metaKeywords,
    canonicalUrl: data.canonicalUrl || undefined,
    ogImage: data.ogImage || undefined,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined || updateData[key] === null) delete updateData[key];
  });

  const record = await PageMetadata.findOneAndUpdate(
    { slug: normalizedSlug },
    { $set: { ...updateData, slug: normalizedSlug } },
    { new: true, runValidators: true, upsert: true }
  );

  return record;
};
