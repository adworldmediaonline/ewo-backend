import express from 'express';
import {
  createContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats,
} from '../controller/contact.controller.js';
import { contactSubmission } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes - no authentication required
router.post('/', contactSubmission, createContact);
router.get('/', getAllContacts);
router.get('/stats', getContactStats);
router.get('/:id', getContact);
router.patch('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
