import express from 'express';
import pageMetadataRoutes from './page-metadata.routes.js';
import pageSectionRoutes from './page-section.routes.js';

const router = express.Router();

router.use('/page-metadata', pageMetadataRoutes);
router.use('/page-sections', pageSectionRoutes);

export default router;
