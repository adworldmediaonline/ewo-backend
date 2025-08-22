import express from 'express';
const router = express.Router();
// internal
import {
  addBrand,
  addAllBrand,
  getAllBrands,
  deleteBrand,
  getActiveBrands,
  getSingleBrand,
  updateBrand,
} from '../controller/brand.controller.js';

// add Brand
router.post('/add', addBrand);
// add All Brand
router.post('/add-all', addAllBrand);
// get Active Brands
router.get('/active', getActiveBrands);
// get all Brands
router.get('/all', getAllBrands);
// delete brand
router.delete('/delete/:id', deleteBrand);
// get single
router.get('/get/:id', getSingleBrand);
// delete product
router.patch('/edit/:id', updateBrand);

export default router;
