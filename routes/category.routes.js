import express from 'express';
const router = express.Router();
// internal
import {
  getSingleCategory,
  addCategory,
  addAllCategory,
  getAllCategory,
  getProductTypeCategory,
  getShowCategory,
  deleteCategory,
  updateCategory,
} from '../controller/category.controller.js';

// get
router.get('/get/:id', getSingleCategory);
// add
router.post('/add', addCategory);
// add All Category
router.post('/add-all', addAllCategory);
// get all Category
router.get('/all', getAllCategory);
// get Product Type Category
router.get('/show/:type', getProductTypeCategory);
// get Show Category
router.get('/show', getShowCategory);
// delete category
router.delete('/delete/:id', deleteCategory);
// delete product
router.patch('/edit/:id', updateCategory);

export default router;
