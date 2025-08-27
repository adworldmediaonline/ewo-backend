import mongoose from 'mongoose';
import ApiError from '../errors/api-error.js';
import Product from '../model/Products.js';
import {
  addAllProductService,
  createProductService,
  getAllProductsService,
  getOfferTimerProductService,
  getPaginatedProductsService,
  getRelatedProductService,
  getReviewsProducts,
  getStockOutProducts,
  getTopRatedProductService,
  updateProductService,
} from '../services/product.service.js';

// add product
export const addProduct = async (req, res, next) => {
  try {
    const result = await createProductService({
      ...req.body,
      imageURLs: Array.isArray(req.body.imageURLs)
        ? req.body.imageURLs
        : [req.body.img],
    });

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Product created successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all product
export const addAllProducts = async (req, res, next) => {
  try {
    const result = await addAllProductService(req.body);
    res.json({
      message: 'Products added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get paginated products with filters and search
export const getPaginatedProducts = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 8,
      search: req.query.search || '',
      category: req.query.category || '',
      subcategory: req.query.subcategory || req.query.subCategory || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
      sortBy: req.query.sortBy || 'skuArrangementOrderNo',
      sortOrder: req.query.sortOrder || 'asc',
    };

    const result = await getPaginatedProductsService(filters);

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// get all products
export const getAllProducts = async (req, res, next) => {
  try {
    const result = await getAllProductsService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get offer product controller
export const getOfferTimerProducts = async (req, res, next) => {
  try {
    const result = await getOfferTimerProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get top rated Products
export const getTopRatedProducts = async (req, res, next) => {
  try {
    const result = await getTopRatedProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// getSingleProduct
export const getSingleProduct = async (req, res, next) => {
  try {
    const idOrSlug = req.params.id;
    let product;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      product = await Product.findById(idOrSlug).populate({
        path: 'reviews',
        options: { sort: { createdAt: -1 } },
      });
    } else {
      product = await Product.findOne({ slug: idOrSlug }).populate({
        path: 'reviews',
        options: { sort: { createdAt: -1 } },
      });
    }

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    res.status(200).json(product);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(500, 'Error fetching product'));
    }
  }
};

// get Related Product
export const getRelatedProducts = async (req, res, next) => {
  try {
    const products = await getRelatedProductService(req.params.id);
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
export const updateProduct = async (req, res, next) => {
  try {
    const product = await updateProductService(req.params.id, req.body);
    res.send({ data: product, message: 'Product updated successfully!' });
  } catch (error) {
    next(error);
  }
};

// update product
export const reviewProducts = async (req, res, next) => {
  try {
    const products = await getReviewsProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
export const stockOutProducts = async (req, res, next) => {
  try {
    const products = await getStockOutProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
export const deleteProduct = async (req, res, next) => {
  try {
    await productServices.deleteProduct(req.params.id);
    res.status(200).json({
      message: 'Product delete successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get product suggestions
export const getProductSuggestions = async (req, res) => {
  const { term } = req.query;

  if (!term || term.length < 2) {
    return res.status(200).json({
      success: true,
      message: 'No products found',
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
          img: {
            $cond: {
              if: { $isArray: '$imageURLs' },
              then: { $first: '$imageURLs' },
              else: {
                $cond: {
                  if: '$img',
                  then: '$img',
                  else: { $first: '$images' },
                },
              },
            },
          },
          price: 1,
          finalPriceDiscount: 1,
          sku: 1,
          _id: 0,
        },
      },
      { $limit: 10 },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      message: suggestions.length > 0 ? 'Products found' : 'No products found',
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching product suggestions',
      error: error.message,
    });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const {
      q: search,
      category,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { sku: searchRegex },
        { 'category.name': searchRegex },
      ];
    }

    if (category) {
      query['category.name'] = new RegExp(category, 'i');
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const sortQuery = {};
    sortQuery[sort] = sort === 'price' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .select('title slug images price description category'),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message,
    });
  }
};
