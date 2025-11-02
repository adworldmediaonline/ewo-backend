import ApiError from '../errors/api-error.js';
import {
  getFilteredProductsService,
  getProductsByCategoryService,
  getProductCountService,
} from '../services/products.service.js';

/**
 * Get products with filters, pagination, and sorting
 * Query params:
 * - category: string (parent category name)
 * - subcategory: string (child category name)
 * - minPrice: number
 * - maxPrice: number
 * - status: string ('in-stock', 'out-of-stock', 'discontinued')
 * - inStock: boolean or string 'true'/'false'
 * - quickShop: boolean or string 'true'/'false'
 * - page: number (default: 1)
 * - limit: number (default: 12)
 * - sortBy: string ('createdAt', 'price', 'title', 'rating', 'updatedAt')
 * - sortOrder: string ('asc' or 'desc', default: 'desc')
 */
export const getFilteredProducts = async (req, res, next) => {
  try {
    const {
      category,
      subcategory,
      minPrice,
      maxPrice,
      status,
      inStock,
      quickShop,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filters = {
      category,
      subcategory,
      minPrice,
      maxPrice,
      status,
      inStock,
      quickShop,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await getFilteredProductsService(filters);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Products fetched successfully',
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category and subcategory
 * Query params:
 * - category: string (parent category name)
 * - subcategory: string (child category name, optional)
 */
export const getProductsByCategory = async (req, res, next) => {
  try {
    const { category, subcategory } = req.query;

    if (!category) {
      throw new ApiError(400, 'Category parameter is required');
    }

    const products = await getProductsByCategoryService(category, subcategory);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Products fetched successfully',
      data: products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product count by filters
 * Useful for displaying total count before fetching all products
 */
export const getProductCount = async (req, res, next) => {
  try {
    const { category, subcategory, minPrice, maxPrice, status, inStock } =
      req.query;

    const filters = {
      category,
      subcategory,
      minPrice,
      maxPrice,
      status,
      inStock,
    };

    const count = await getProductCountService(filters);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Product count fetched successfully',
      count,
    });
  } catch (error) {
    next(error);
  }
};

