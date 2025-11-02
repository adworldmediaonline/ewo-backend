import express from 'express';
const router = express.Router();

import {
  getFilteredProducts,
  getProductsByCategory,
  getProductCount,
} from '../controller/products.controller.js';

/**
 * GET /api/products/filtered
 * Get products with filters, pagination, and sorting
 * Query params: category, subcategory, minPrice, maxPrice, status, inStock, quickShop, page, limit, sortBy, sortOrder
 */
router.get('/filtered', getFilteredProducts);

/**
 * GET /api/products/by-category
 * Get products by category and optional subcategory
 * Query params: category (required), subcategory (optional)
 */
router.get('/by-category', getProductsByCategory);

/**
 * GET /api/products/count
 * Get product count based on filters
 * Query params: category, subcategory, minPrice, maxPrice, status, inStock
 */
router.get('/count', getProductCount);

export default router;

