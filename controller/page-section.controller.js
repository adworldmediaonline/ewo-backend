import {
  getSectionsByPageSlugService,
  getActiveSectionsByPageSlugService,
  upsertSectionService,
  deleteSectionService,
} from '../services/page-section.service.js';

export const getSectionsByPage = async (req, res, next) => {
  try {
    const sections = await getSectionsByPageSlugService(req.params.pageSlug);
    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSectionsByPage = async (req, res, next) => {
  try {
    const sections = await getActiveSectionsByPageSlugService(req.params.pageSlug);
    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

export const upsertSection = async (req, res, next) => {
  try {
    const { pageSlug, sectionKey } = req.params;
    const section = await upsertSectionService(pageSlug, sectionKey, req.body);
    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const { pageSlug, sectionKey } = req.params;
    await deleteSectionService(pageSlug, sectionKey);
    res.status(200).json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
