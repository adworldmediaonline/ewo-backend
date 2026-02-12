import {
  getAllPageMetadataService,
  getPageMetadataBySlugService,
  upsertPageMetadataService,
} from '../services/page-metadata.service.js';

/**
 * Get all page metadata (admin) - known pages merged with DB data
 */
export const getAllPageMetadata = async (req, res, next) => {
  try {
    const pages = await getAllPageMetadataService();
    res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get page metadata by slug (public - for frontend)
 */
export const getPageMetadataBySlug = async (req, res, next) => {
  try {
    const metadata = await getPageMetadataBySlugService(req.params.slug);
    if (!metadata) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upsert page metadata by slug (admin)
 */
export const upsertPageMetadata = async (req, res, next) => {
  try {
    const metadata = await upsertPageMetadataService(req.params.slug, req.body);
    res.status(200).json({
      success: true,
      message: 'Page metadata updated successfully',
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
};
