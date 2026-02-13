import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';
import {
  getSectionsByPage,
  getActiveSectionsByPage,
  upsertSection,
  deleteSection,
} from '../controller/page-section.controller.js';

const router = express.Router();

// Public - get active sections for frontend (must be before /page/:pageSlug)
router.get('/page/:pageSlug/active', getActiveSectionsByPage);

// Admin - get all sections (including inactive)
router.get(
  '/page/:pageSlug',
  requireAuth,
  roleAuth('super-admin', 'admin'),
  getSectionsByPage
);
router.patch(
  '/page/:pageSlug/section/:sectionKey',
  requireAuth,
  roleAuth('super-admin', 'admin'),
  upsertSection
);
router.delete(
  '/page/:pageSlug/section/:sectionKey',
  requireAuth,
  roleAuth('super-admin', 'admin'),
  deleteSection
);

export default router;
