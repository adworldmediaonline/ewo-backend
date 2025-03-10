const express = require('express');
const router = express.Router();
const {
  searchProducts,
  getProductSuggestions,
  getFeaturedProducts,
} = require('../controller/product.search.controller');

// Search products with filters and pagination
router.get('/search', searchProducts);

// Get product suggestions
router.get('/suggestions', getProductSuggestions);

// Get featured products
router.get('/featured', getFeaturedProducts);

module.exports = router;
