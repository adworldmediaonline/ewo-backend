const productSearchService = require('../services/productSearch.service');
const ApiError = require('../errors/api-error');

/**
 * Search products with filters and pagination
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const {
      search,
      sku,
      parent,
      children,
      minPrice,
      maxPrice,
      status,
      tags,
      minRating,
      featured,
      trending,
      inStock,
      onSale,
      sort,
      page,
      limit,
    } = req.query;

    const filters = {
      search,
      sku,
      parent,
      children,
      minPrice,
      maxPrice,
      status,
      tags,
      minRating,
      featured,
      trending,
      inStock,
      onSale,
    };

    const result = await productSearchService.searchProducts(
      filters,
      sort,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product suggestions based on search term
 */
exports.getProductSuggestions = async (req, res, next) => {
  try {
    const { term, limit } = req.query;

    if (!term) {
      throw new ApiError(400, 'Search term is required');
    }

    const suggestions = await productSearchService.getProductSuggestions(
      term,
      limit
    );

    res.status(200).json({
      success: true,
      message: 'Product suggestions retrieved successfully',
      suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured products
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const products = await productSearchService.getFeaturedProducts(limit);

    res.status(200).json({
      success: true,
      message: 'Featured products retrieved successfully',
      products,
    });
  } catch (error) {
    next(error);
  }
};
