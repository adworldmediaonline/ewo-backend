import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';
import {
  getAllPageMetadata,
  getPageMetadataBySlug,
  upsertPageMetadata,
} from '../controller/page-metadata.controller.js';

const router = express.Router();

// Admin route - must be before /:slug to avoid matching
router.get('/', requireAuth, roleAuth('super-admin', 'admin'), getAllPageMetadata);

// Public route - for frontend to fetch metadata by slug
router.get('/:slug', getPageMetadataBySlug);

// Admin route - upsert metadata by slug
router.patch('/:slug', requireAuth, roleAuth('super-admin', 'admin'), upsertPageMetadata);

export default router;
