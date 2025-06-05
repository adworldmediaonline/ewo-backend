const express = require('express');
const {
  saveGuestCart,
  getGuestCart,
  deleteGuestCart,
  updateGuestCart,
  getAllCarts,
  deleteCart,
} = require('../controller/cart.controller');

const router = express.Router();

// Guest cart routes
router.post('/guest', saveGuestCart);
router.get('/guest/:email', getGuestCart);
router.put('/guest/:email', updateGuestCart);
router.delete('/guest/:email', deleteGuestCart);

// Admin cart routes
router.get('/admin/all', getAllCarts);
router.delete('/admin/:id', deleteCart);

module.exports = router;
