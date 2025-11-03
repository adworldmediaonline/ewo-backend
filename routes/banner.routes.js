import express from 'express';
import {
  createBanner,
  getAllBanners,
  getActiveBanners,
  getSingleBanner,
  updateBanner,
  deleteBanner,
} from '../controller/banner.controller.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveBanners);
router.get('/:id', getSingleBanner);

// Admin routes (add authentication middleware as needed)
router.post('/', createBanner);
router.get('/', getAllBanners);
router.patch('/:id', updateBanner);
router.delete('/:id', deleteBanner);

export default router;

