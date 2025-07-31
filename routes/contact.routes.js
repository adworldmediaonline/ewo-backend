const express = require('express');
const router = express.Router();
const {
  createContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats,
} = require('../controller/contact.controller');
const rateLimiter = require('../middleware/rateLimiter');

// Public routes - no authentication required
router.post('/', rateLimiter.contactSubmission, createContact);
router.get('/', getAllContacts);
router.get('/stats', getContactStats);
router.get('/:id', getContact);
router.patch('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
