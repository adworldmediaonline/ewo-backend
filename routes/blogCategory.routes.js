const express = require('express');
const router = express.Router();
// internal
const blogCategoryController = require('../controller/blogCategory.controller');

// get
router.get('/get/:id', blogCategoryController.getSingleCategory);
// add
router.post('/add', blogCategoryController.addCategory);
// add All Category
router.post('/add-all', blogCategoryController.addAllCategory);
// get all Category
router.get('/all', blogCategoryController.getAllCategory);
// get Product Type Category
router.get('/show/:type', blogCategoryController.getProductTypeCategory);
// get Show Category
router.get('/show', blogCategoryController.getShowCategory);
// delete category
router.delete('/delete/:id', blogCategoryController.deleteCategory);
// delete product
router.patch('/edit/:id', blogCategoryController.updateCategory);

module.exports = router;
