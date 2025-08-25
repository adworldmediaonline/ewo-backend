import express from 'express';
import {
  saveGuestCart,
  getGuestCart,
  deleteGuestCart,
  updateGuestCart,
  getAllCarts,
  deleteCart,
} from '../controller/cart.controller.js';

const router = express.Router();

// Guest cart routes
router.post('/guest', saveGuestCart);
router.get('/guest/:email', getGuestCart);
router.put('/guest/:email', updateGuestCart);
router.delete('/guest/:email', deleteGuestCart);

// Admin cart routes
router.get('/admin/all', getAllCarts);
router.delete('/admin/:id', deleteCart);

export default router;
