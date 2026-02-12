import PageSection from '../model/PageSection.js';
import ApiError from '../errors/api-error.js';

/** Hero variant: image_only | image_content | content_only */
const HERO_VARIANTS = ['image_only', 'image_content', 'content_only'];

/**
 * Get all sections for a page (admin)
 */
export const getSectionsByPageSlugService = async (pageSlug) => {
  const normalized = pageSlug?.toLowerCase?.()?.trim?.();
  if (!normalized) return [];

  const sections = await PageSection.find({ pageSlug: normalized }).sort({
    order: 1,
    createdAt: 1,
  });

  return sections;
};

/**
 * Get active sections for a page (public - for frontend)
 */
export const getActiveSectionsByPageSlugService = async (pageSlug) => {
  const normalized = pageSlug?.toLowerCase?.()?.trim?.();
  if (!normalized) return [];

  const sections = await PageSection.find({
    pageSlug: normalized,
    isActive: true,
  }).sort({ order: 1, createdAt: 1 });

  return sections;
};

/**
 * Upsert a section
 */
export const upsertSectionService = async (pageSlug, sectionKey, data) => {
  const normalizedSlug = pageSlug?.toLowerCase?.()?.trim?.();
  const normalizedKey = sectionKey?.trim?.();
  if (!normalizedSlug || !normalizedKey) {
    throw new ApiError(400, 'Invalid pageSlug or sectionKey');
  }

  const updateData = {
    pageSlug: normalizedSlug,
    sectionKey: normalizedKey,
    sectionType: data.sectionType,
    config: data.config ?? {},
    content: data.content ?? {},
    order: data.order ?? 0,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  const section = await PageSection.findOneAndUpdate(
    { pageSlug: normalizedSlug, sectionKey: normalizedKey },
    { $set: updateData },
    { new: true, runValidators: true, upsert: true }
  );

  return section;
};

/**
 * Delete a section
 */
export const deleteSectionService = async (pageSlug, sectionKey) => {
  const normalizedSlug = pageSlug?.toLowerCase?.()?.trim?.();
  const normalizedKey = sectionKey?.trim?.();
  if (!normalizedSlug || !normalizedKey) {
    throw new ApiError(400, 'Invalid pageSlug or sectionKey');
  }

  const section = await PageSection.findOneAndDelete({
    pageSlug: normalizedSlug,
    sectionKey: normalizedKey,
  });

  if (!section) {
    throw new ApiError(404, 'Section not found');
  }

  return section;
};

export { HERO_VARIANTS };
