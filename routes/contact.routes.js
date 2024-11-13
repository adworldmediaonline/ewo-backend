const express = require('express');
const router = express.Router();
const contactController = require('../controller/contact.controller');

// Public routes
router.post('/submit', contactController.submitContact);

router.get('/', contactController.getAllContacts);
router.get('/:id', contactController.getContact);
router.patch('/:id/status', contactController.updateContactStatus);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
