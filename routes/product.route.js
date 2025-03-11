const express = require('express');
const router = express.Router();
const {
  getProductSuggestions,
  searchProducts,
} = require('../controller/product.controller');

// Product search and suggestions routes
router.get('/suggestions', getProductSuggestions);
router.get('/search', searchProducts);

module.exports = router;
