const productServices = require('../services/product.service');
const Product = require('../model/Products');
const ApiError = require('../errors/api-error');
const mongoose = require('mongoose');

// add product
exports.addProduct = async (req, res, next) => {
  try {
    const result = await productServices.createProductService({
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
module.exports.addAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.addAllProductService(req.body);
    res.json({
      message: 'Products added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get paginated products with filters and search
exports.getPaginatedProducts = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 15,
      search: req.query.search || '',
      category: req.query.category || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await productServices.getPaginatedProductsService(filters);

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
exports.getAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.getAllProductsService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get offer product controller
module.exports.getOfferTimerProducts = async (req, res, next) => {
  try {
    const result = await productServices.getOfferTimerProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get top rated Products
module.exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const result = await productServices.getTopRatedProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// getSingleProduct
exports.getSingleProduct = async (req, res, next) => {
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
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const products = await productServices.getRelatedProductService(
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productServices.updateProductService(
      req.params.id,
      req.body
    );
    res.send({ data: product, message: 'Product updated successfully!' });
  } catch (error) {
    next(error);
  }
};

// update product
exports.reviewProducts = async (req, res, next) => {
  try {
    const products = await productServices.getReviewsProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
exports.stockOutProducts = async (req, res, next) => {
  try {
    const products = await productServices.getStockOutProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// update product
exports.deleteProduct = async (req, res, next) => {
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
exports.getProductSuggestions = async (req, res) => {
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
    console.error('Suggestion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product suggestions',
      error: error.message,
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
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
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message,
    });
  }
};
