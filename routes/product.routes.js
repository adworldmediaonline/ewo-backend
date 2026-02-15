import express from 'express';
import {
  addAllProducts,
  addProduct,
  deleteProduct,
  getAllProducts,
  getOfferTimerProducts,
  getPaginatedProducts,
  getProductsForReorder,
  getProductSuggestions,
  getRelatedProducts,
  getSingleProduct,
  getTopRatedProducts,
  reorderProduct,
  reviewProducts,
  searchProducts,
  stockOutProducts,
  updateProduct,
  updateProductPublishStatus,
} from '../controller/product.controller.js';
const router = express.Router();

// search routes
router.get('/suggestions', getProductSuggestions);
router.get('/search', searchProducts);

// add a product
router.post('/add', addProduct);
// add all product
router.post('/add-all', addAllProducts);
// get all products
router.get('/all', getAllProducts);
// get paginated products with filters
router.get('/paginated', getPaginatedProducts);
// get products for reorder UI (admin)
router.get('/for-reorder', getProductsForReorder);
// get offer timer product
router.get('/offer', getOfferTimerProducts);
// top rated products
router.get('/top-rated', getTopRatedProducts);
// reviews products
router.get('/review-product', reviewProducts);
// get Related Products
router.get('/related-product/:id', getRelatedProducts);
// get Single Product
router.get('/single-product/:id', getSingleProduct);
// stock Product
router.get('/stock-out', stockOutProducts);
// get Single Product
router.patch('/edit-product/:id', updateProduct);
// reorder product (fractional indexing)
router.patch('/reorder', reorderProduct);
// update product publish status only
router.patch('/:id/publish-status', updateProductPublishStatus);
// delete product
router.delete('/:id', deleteProduct);

export default router;
