import express from 'express';
import {
  createAnnouncement,
  getAllAnnouncements,
  getActiveAnnouncements,
  getSingleAnnouncement,
  updateAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
} from '../controller/announcement.controller.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveAnnouncements);
router.get('/:id', getSingleAnnouncement);

// Admin routes (add authentication middleware as needed)
router.post('/', createAnnouncement);
router.get('/', getAllAnnouncements);
router.patch('/:id', updateAnnouncement);
router.patch('/:id/toggle-status', toggleAnnouncementStatus);
router.delete('/:id', deleteAnnouncement);

export default router;

