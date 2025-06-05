const express = require('express');
const {
  saveGuestCart,
  getGuestCart,
  deleteGuestCart,
  updateGuestCart,
} = require('../controller/cart.controller');

const router = express.Router();

// Guest cart routes
router.post('/guest', saveGuestCart);
router.get('/guest/:email', getGuestCart);
router.put('/guest/:email', updateGuestCart);
router.delete('/guest/:email', deleteGuestCart);

module.exports = router;
