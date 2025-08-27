const productSearchService = require('../services/productSearch.service');
const ApiError = require('../errors/api-error');
const Product = require('../model/Product');

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
exports.getProductSuggestions = async (req, res) => {
  const { term } = req.query;

  if (!term || term.length < 2) {
    return res.status(200).json({
      success: true,
      suggestions: [],
    });
  }

  try {
    const searchRegex = new RegExp(term, 'i');

    const suggestions = await Product.aggregate([
      {
        $match: {
          $or: [
            { title: searchRegex },
            { sku: searchRegex },
            { 'category.name': searchRegex },
            { description: searchRegex },
          ],
        },
      },
      {
        $project: {
          title: 1,
          slug: 1,
          img: { $first: '$images' },
          price: 1,
          sku: 1,
          _id: 0,
        },
      },
      { $limit: 5 },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Suggestion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product suggestions',
      error: error.message,
    });
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
