import express from 'express';
import pageMetadataRoutes from './page-metadata.routes.js';

const router = express.Router();

router.use('/page-metadata', pageMetadataRoutes);

export default router;
