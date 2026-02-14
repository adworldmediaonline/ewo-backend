import mongoose from 'mongoose';
import ApiError from '../errors/api-error.js';
import Category from '../model/Category.js';
import Product from '../model/Products.js';
import {
  deleteCachePattern,
  generateCacheKey,
  getFromCache,
  setInCache,
} from '../lib/redis-cache.js';
import { buildSubcategoryRegex } from '../utils/subcategory-regex.js';

// create product service
export const createProductService = async data => {
  // Calculate updated pricing fields
  // if (data.price) {
  //   data.updatedPrice = Math.round(data.price * 1.2 * 100) / 100;
  //   data.finalPriceDiscount = Math.round(data.updatedPrice * 0.85 * 100) / 100;
  // }

  // data.updatedPrice = data.price;
  // data.finalPriceDiscount = data.price;

  // Default publishStatus to draft for new products; allow explicit override
  const productData = { ...data, publishStatus: data.publishStatus ?? 'draft' };
  const product = await Product.create(productData);
  const { _id: productId, category } = product;

  // update category with product
  await Category.findByIdAndUpdate(
    category.id,
    {
      $push: { products: productId },
    },
    { new: true }
  );

  return product;
};

// add all product service
export const addAllProductService = async data => {
  await Product.deleteMany({});
  const products = await Product.insertMany(data);

  // Update categories with product IDs
  for (const product of products) {
    const { _id: productId, category } = product;
    await Category.findByIdAndUpdate(
      category.id,
      {
        $push: { products: productId },
      },
      { new: true }
    );
  }

  return products;
};

// get product data with pagination, filtering, and search
export const getPaginatedProductsService = async (filters = {}) => {
  const {
    page = 1,
    limit = 8,
    search = '',
    category = '',
    subcategory = '',
    minPrice = '',
    maxPrice = '',
    sortBy = 'skuArrangementOrderNo',
    sortOrder = 'asc',
  } = filters;

  // Generate cache key based on filters
  const cacheKey = generateCacheKey('products:paginated', filters);

  // Try to get from cache first
  const cachedData = await getFromCache(cacheKey);
  if (cachedData) {
    console.log('Cache HIT - Returning cached products');
    return cachedData;
  }

  console.log('Cache MISS - Fetching from database');

  // Build query - storefront only shows published products (exclude draft)
  const query = {
    $and: [
      {
        $or: [
          { publishStatus: 'published' },
          { publishStatus: { $exists: false } },
        ],
      },
    ],
  };

  // Search functionality
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { sku: searchRegex },
      { 'category.name': searchRegex },
    ];
  }

  // Category filter
  if (category) {
    // Convert slug back to readable format for better matching
    // Handle special characters like "/" that might have been removed during slugification
    // e.g., "rod-ends-heim-joints" should match "Rod Ends/ Heim Joints" in database

    // Split by hyphens
    const words = category.split('-');

    // Build pattern parts - handle "and" specially before escaping
    const processedWords = words.map(word => {
      // Handle "and" -> allow both & and 'and'
      if (word.toLowerCase() === 'and') {
        return '(&|and)';
      }
      // Escape special regex characters
      return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });

    // Join with flexible separator pattern (space, slash, or hyphen)
    // This allows "rod-ends-heim-joints" to match "Rod Ends/ Heim Joints"
    const flexiblePattern = processedWords.join('[\\s/\\-]+');

    // Create regex pattern (case insensitive) with anchors for exact matching
    // ^ and $ ensure the pattern matches the entire field value, not just a prefix
    const categoryRegex = new RegExp(`^${flexiblePattern}$`, 'i');

    // Match against both category.name and parent fields
    // If there's already a $or from search, combine them with $and
    if (query.$or) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'category.name': categoryRegex },
          { parent: categoryRegex }
        ]
      });
    } else {
      query.$or = [
        { 'category.name': categoryRegex },
        { parent: categoryRegex }
      ];
    }
  }

  // Subcategory filter – supports comma-separated slugs for grouped cards (e.g. "dana-44,10-bolt")
  if (subcategory) {
    const slugs = subcategory.split(',').map((s) => s.trim()).filter(Boolean);
    const regexes = slugs.map((s) => buildSubcategoryRegex(s)).filter(Boolean);

    if (regexes.length === 1) {
      query.children = regexes[0];
    } else if (regexes.length > 1) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: regexes.map((re) => ({ children: re })),
      });
    }
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Storefront: only show published products (exclude draft; treat missing field as published)
  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { publishStatus: 'published' },
      { publishStatus: { $exists: false } },
    ],
  });

  // Build sort object
  const sortQuery = {};
  sortQuery[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate skip value
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with pagination
  // NOTE: Removed .populate('reviews') for performance - reviews not needed for product listing
  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        'title slug img image imageURLs imageURLsWithMeta price finalPriceDiscount updatedPrice category status quantity shipping sku options productConfigurations videoId badges description faqs'
      ),
    // .select(
    //   'title slug img finalPriceDiscount updatedPrice shipping options'
    // ),
    Product.countDocuments(query),
  ]);

  const result = {
    products,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalProducts: total,
      hasNextPage: skip + products.length < total,
      hasPrevPage: parseInt(page) > 1,
    },
  };

  // Store in cache with 5 minute TTL (300 seconds)
  await setInCache(cacheKey, result, 300);

  return result;
};

// get all product data - Optimized with pagination and search
export const getAllProductsService = async (params = {}) => {
  const { page = 1, limit = 10, search = '', status = '', publishStatus = '' } = params;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};

  // Add search filter if provided
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  // Add inventory status filter if provided
  if (status) {
    query.status = status;
  }

  // Add publish status filter if provided (draft | published)
  if (publishStatus) {
    query.publishStatus = publishStatus;
  }

  // Get total count for pagination
  const total = await Product.countDocuments(query);

  // Fetch products with pagination
  // NOTE: Removed .populate('reviews') for performance - reviews not needed for product listing
  const products = await Product.find(query)
    .sort({ skuArrangementOrderNo: 1 })
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// get offer product service
export const getOfferTimerProductService = async () => {
  // NOTE: Removed .populate('reviews') for performance - reviews not needed for product listing
  const products = await Product.find({
    'offerDate.endDate': { $gt: new Date() },
  });
  return products;
};

export const getTopRatedProductService = async () => {
  const products = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate('reviews');

  const topRatedProducts = products.map(product => {
    const totalRating = product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / product.reviews.length;

    return {
      ...product.toObject(),
      rating: averageRating,
    };
  });

  topRatedProducts.sort((a, b) => b.rating - a.rating);

  return topRatedProducts;
};

// get product data
export const getProductService = async idOrSlug => {
  try {
    let product;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      product = await Product.findById(idOrSlug).populate({
        path: 'reviews',
        populate: { path: 'userId', select: 'name email imageURL' },
      });
    } else {
      product = await Product.findOne({ slug: idOrSlug }).populate({
        path: 'reviews',
        populate: { path: 'userId', select: 'name email imageURL' },
      });
    }

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return {
      success: true,
      message: 'Product fetched successfully',
      data: product,
    };
  } catch (error) {
    throw error;
  }
};

// get product data - related products (storefront: only published)
export const getRelatedProductService = async productId => {
  const currentProduct = await Product.findById(productId);
  if (!currentProduct) return [];

  const relatedProducts = await Product.find({
    'category.name': currentProduct.category.name,
    _id: { $ne: productId }, // Exclude the current product ID
    $or: [
      { publishStatus: 'published' },
      { publishStatus: { $exists: false } },
    ],
  });
  return relatedProducts;
};

// update a product
export const updateProductService = async (id, currProduct) => {
  const product = await Product.findById(id);
  if (product) {
    // Store the old category ID before updating
    const oldCategoryId = product.category.id;
    const newCategoryId = currProduct.category.id;

    // Update product fields
    product.title = currProduct.title;
    product.category.name = currProduct.category.name;
    product.category.id = currProduct.category.id;
    product.sku = currProduct.sku;
    product.img = currProduct.img;
    // Main product image with metadata (fileName, title, altText)
    if (currProduct.image !== undefined) {
      product.image = currProduct.image ?? null;
    }
    product.slug = currProduct.slug;
    // Handle imageURLs and imageURLsWithMeta (variant gallery)
    if (Array.isArray(currProduct.imageURLsWithMeta) && currProduct.imageURLsWithMeta.length > 0) {
      product.imageURLsWithMeta = currProduct.imageURLsWithMeta;
      product.imageURLs = currProduct.imageURLsWithMeta.map((item) =>
        typeof item === 'object' && item?.url ? item.url : String(item)
      );
    } else if (Array.isArray(currProduct.imageURLs)) {
      product.imageURLs = currProduct.imageURLs.map((url) =>
        typeof url === 'string' ? url : url?.url || url?.img || ''
      );
      product.imageURLsWithMeta = currProduct.imageURLsWithMeta || [];
    } else {
      product.imageURLs = [];
      product.imageURLsWithMeta = currProduct.imageURLsWithMeta || [];
    }
    product.tags = currProduct.tags;
    // Handle optional badges
    if (currProduct.badges !== undefined) {
      if (currProduct.badges === null || currProduct.badges.length === 0) {
        // Clear badges if explicitly set to null or empty array
        product.badges = [];
      } else {
        // Update badges if provided
        product.badges = currProduct.badges;
      }
    }
    product.parent = currProduct.parent;
    product.children = currProduct.children;
    product.price = currProduct.price;
    product.discount = currProduct.discount;
    product.quantity = currProduct.quantity;
    product.status = currProduct.status;
    const publishStatusChanged =
      currProduct.publishStatus !== undefined &&
      product.publishStatus !== currProduct.publishStatus;
    if (currProduct.publishStatus !== undefined) {
      product.publishStatus = currProduct.publishStatus;
    }
    product.description = currProduct.description;
    product.faqs = currProduct.faqs || '';
    product.additionalInformation = currProduct.additionalInformation;
    product.offerDate.startDate = currProduct.offerDate.startDate;
    product.offerDate.endDate = currProduct.offerDate.endDate;
    product.videoId = currProduct.videoId;
    product.options = currProduct.options;
    product.finalPriceDiscount = currProduct.finalPriceDiscount;
    product.updatedPrice = currProduct.updatedPrice;
    // Handle optional productConfigurations
    if (currProduct.productConfigurations !== undefined) {
      if (currProduct.productConfigurations === null || currProduct.productConfigurations.length === 0) {
        // Clear configurations if explicitly set to null or empty array
        product.productConfigurations = [];
      } else {
        // Update configurations if provided
        product.productConfigurations = currProduct.productConfigurations;
      }
    }
    // Handle optional shipping
    if (currProduct.shipping !== undefined) {
      if (currProduct.shipping === null) {
        // Clear shipping if explicitly set to null
        product.shipping = undefined;
      } else {
        // Update shipping fields if provided
        if (currProduct.shipping.price !== undefined && currProduct.shipping.price !== null) {
          product.shipping.price = currProduct.shipping.price;
        } else if (currProduct.shipping.price === null) {
          product.shipping.price = undefined;
        }
        if (currProduct.shipping.description !== undefined && currProduct.shipping.description !== null) {
          product.shipping.description = currProduct.shipping.description;
        } else if (currProduct.shipping.description === null) {
          product.shipping.description = undefined;
        }
      }
    }
    product.seo.metaTitle = currProduct.seo.metaTitle;
    product.seo.metaDescription = currProduct.seo.metaDescription;
    product.seo.metaKeywords = currProduct.seo.metaKeywords;

    // Calculate updated pricing fields when price is updated
    // if (currProduct.price) {
    //   product.updatedPrice = Math.round(currProduct.price * 1.2 * 100) / 100;
    //   product.finalPriceDiscount =
    //     Math.round(product.updatedPrice * 0.85 * 100) / 100;
    // }

    // Save the updated product
    await product.save();

    // Invalidate product caches when publish status changes so frontend reflects immediately
    if (publishStatusChanged) {
      await deleteCachePattern('products:*');
    }

    // If category has changed, update both old and new categories
    if (oldCategoryId.toString() !== newCategoryId.toString()) {
      // Remove product from old category
      await Category.findByIdAndUpdate(
        oldCategoryId,
        {
          $pull: { products: id },
        },
        { new: true }
      );

      // Add product to new category
      await Category.findByIdAndUpdate(
        newCategoryId,
        {
          $push: { products: id },
        },
        { new: true }
      );
    }
  }

  return product;
};

// get Reviews Products - Optimized with pagination and search
export const getReviewsProducts = async (params = {}) => {
  const { page = 1, limit = 10, search = '', rating = '' } = params;
  const skip = (page - 1) * limit;

  // Build query - only products with reviews
  const query = {
    reviews: { $exists: true, $ne: [] },
  };

  // Add search filter if provided
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  // Use aggregation for rating filter and pagination
  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'reviews',
        localField: 'reviews',
        foreignField: '_id',
        as: 'reviewsData',
      },
    },
    {
      $addFields: {
        averageRating: {
          $cond: {
            if: { $gt: [{ $size: '$reviewsData' }, 0] },
            then: { $avg: '$reviewsData.rating' },
            else: 0,
          },
        },
      },
    },
  ];

  // Add rating filter if provided
  if (rating) {
    const ratingNum = parseInt(rating);
    pipeline.push({
      $match: {
        $expr: {
          $eq: [{ $floor: '$averageRating' }, ratingNum],
        },
      },
    });
  }

  // Add sorting and pagination
  pipeline.push(
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) }
  );

  // Populate reviews with user data using $lookup
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'reviewsData.userId',
      foreignField: '_id',
      as: 'reviewUsers',
    },
  });

  // Map reviewUsers back to reviews structure
  pipeline.push({
    $addFields: {
      reviews: {
        $map: {
          input: '$reviewsData',
          as: 'review',
          in: {
            $mergeObjects: [
              '$$review',
              {
                userId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$reviewUsers',
                        as: 'user',
                        cond: { $eq: ['$$user._id', '$$review.userId'] },
                      },
                    },
                    0,
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // Remove temporary fields
  pipeline.push({
    $unset: ['reviewsData', 'reviewUsers', 'averageRating'],
  });

  // Execute aggregation for products
  const products = await Product.aggregate(pipeline);

  // Get total count (with rating filter if applied)
  const countPipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'reviews',
        localField: 'reviews',
        foreignField: '_id',
        as: 'reviewsData',
      },
    },
    {
      $addFields: {
        averageRating: {
          $cond: {
            if: { $gt: [{ $size: '$reviewsData' }, 0] },
            then: { $avg: '$reviewsData.rating' },
            else: 0,
          },
        },
      },
    },
  ];

  if (rating) {
    countPipeline.push({
      $match: {
        $expr: {
          $eq: [{ $floor: '$averageRating' }, parseInt(rating)],
        },
      },
    });
  }

  countPipeline.push({ $count: 'count' });

  const totalResult = await Product.aggregate(countPipeline);
  const total = totalResult[0]?.count || 0;

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// get Reviews Products
export const getStockOutProducts = async () => {
  const result = await Product.find({ status: 'out-of-stock' }).sort({
    createdAt: -1,
  });
  return result;
};

// delete product service
export const deleteProduct = async id => {
  const result = await Product.findByIdAndDelete(id);
  // Invalidate product caches so frontend reflects deletion immediately
  await deleteCachePattern('products:*');
  return result;
};

// update product publish status only (for quick toggle from admin table)
export const updateProductPublishStatusService = async (id, publishStatus) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { publishStatus },
    { new: true }
  );
  // Invalidate product caches so frontend reflects publish status change immediately
  await deleteCachePattern('products:*');
  return product;
};
