import mongoose from 'mongoose';
import ApiError from '../errors/api-error.js';
import Category from '../model/Category.js';
import Product from '../model/Products.js';
import {
  generateCacheKey,
  getFromCache,
  setInCache,
} from '../lib/redis-cache.js';

// create product service
export const createProductService = async data => {
  // Calculate updated pricing fields
  // if (data.price) {
  //   data.updatedPrice = Math.round(data.price * 1.2 * 100) / 100;
  //   data.finalPriceDiscount = Math.round(data.updatedPrice * 0.85 * 100) / 100;
  // }

  // data.updatedPrice = data.price;
  // data.finalPriceDiscount = data.price;

  const product = await Product.create(data);
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

  // Build query
  const query = {};

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

  // Subcategory filter
  if (subcategory) {
    // Convert slug back to readable format for better matching
    // Handle cases where special characters like "/" were removed during slugification
    // e.g., "1-14-rod-end-parts" should match "1 1/4" Rod End Parts" in database
    // Also handle "1-14" which might be "1 1/4" that got slugified incorrectly

    // Build pattern parts array to handle number sequences separately
    const parts = subcategory.split('-');
    const patternParts = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isNumber = /^\d+$/.test(part);

      if (isNumber) {
        // Check if next part is also a number
        const nextIsNumber = i + 1 < parts.length && /^\d+$/.test(parts[i + 1]);

        if (nextIsNumber) {
          // We have consecutive numbers - collect them
          let numberSequence = [part];
          let j = i + 1;

          // Collect consecutive numbers
          while (j < parts.length && /^\d+$/.test(parts[j])) {
            numberSequence.push(parts[j]);
            j++;
          }

          if (numberSequence.length > 1) {
            // Special case: if we have "1-14", it might be "1 1/4" that got slugified incorrectly
            // Check if the second number is two digits and could be split
            if (numberSequence.length === 2 && numberSequence[0].length === 1 && numberSequence[1].length === 2) {
              const firstNum = numberSequence[0];
              const secondNum = numberSequence[1];
              // Split "14" into "1" and "4" to match "1 1/4"
              patternParts.push(`__NUMSEQ_${firstNum}-${secondNum[0]}-${secondNum[1]}__`);
            } else {
              // Normal case: create flexible pattern for number sequence
              patternParts.push(`__NUMSEQ_${numberSequence.join('-')}__`);
            }
            i = j - 1; // Skip processed parts
          } else {
            // Single number, just add it
            patternParts.push(part);
          }
        } else {
          // Single number, just add it
          patternParts.push(part);
        }
      } else {
        // Not a number, add as-is
        patternParts.push(part);
      }
    }

    // Build the final pattern by processing each part
    const placeholder = '___FLEX_SEP___';
    const finalPatternParts = [];

    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];

      // Check if this is a number sequence placeholder
      if (part.startsWith('__NUMSEQ_') && part.endsWith('__')) {
        // Extract numbers from placeholder
        const numMatch = part.match(/__NUMSEQ_(\d+)-(\d+)-(\d+)__/);
        if (numMatch) {
          const [, n1, n2, n3] = numMatch;
          // Match: "n1 n2/n3" (like "1 1/4") or "n1-n2-n3" or "n1 n2 n3"
          const escapedN1 = n1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedN2 = n2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedN3 = n3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          finalPatternParts.push(`${escapedN1}[\\s/\\-]+${escapedN2}[\\s/\\-]+${escapedN3}`);
        } else {
          const numMatch2 = part.match(/__NUMSEQ_(\d+)-(\d+)__/);
          if (numMatch2) {
            const [, n1, n2] = numMatch2;
            const escapedN1 = n1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedN2 = n2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Special case: if n1 is single digit and n2 is two digits, it might be a fraction
            // e.g., "1-14" should match "1 1/4" where 14 = 1/4
            // BUT: we need to be careful - "1-14" should NOT match "1-1/4" (different subcategory)
            if (n1.length === 1 && n2.length === 2) {
              const n2First = n2[0];
              const n2Second = n2[1];
              // Match variations:
              // - "n1 n2First/n2Second" (like "1 1/4") - space before fraction
              // - "n1 n2" (like "1 14") - space between numbers
              // - "n1-n2" (like "1-14") - hyphen between numbers
              // BUT NOT: "n1-n2First/n2Second" (like "1-1/4") - hyphen before fraction is different subcategory
              // The pattern ensures fraction only matches with space, not hyphen
              finalPatternParts.push(`${escapedN1}([\\s]+${n2First}\\/${n2Second}|[\\s\\-]+${n2})`);
            } else {
              // Normal case: match "n1 n2" or "n1-n2" or "n1/n2"
              finalPatternParts.push(`${escapedN1}[\\s/\\-]+${escapedN2}`);
            }
          }
        }
      } else {
        // Regular text part - handle "and" specially before escaping
        let processedPart = part;
        // Handle "and" -> allow both & and 'and' (case insensitive)
        if (processedPart.toLowerCase() === 'and') {
          processedPart = '(&|and)';
        } else {
          // Escape special regex characters
          processedPart = processedPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        finalPatternParts.push(processedPart);
      }
    }

    // Join all parts with flexible separator pattern
    // Include quotes in the separator pattern since they might appear in database values
    // e.g., "1 1/4" Rod End Parts" has quotes around the fraction
    let finalPattern = finalPatternParts.join('[\\s/\\-"\']+');

    // Make quotes optional at the start and end
    finalPattern = '["\']?' + finalPattern + '["\']?';

    // Direct filtering: Find products that have the subcategory in their children field
    // Add anchors ^ and $ for exact matching to prevent partial matches
    query.children = new RegExp(`^${finalPattern}$`, 'i');
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

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
        'title slug img imageURLs price finalPriceDiscount updatedPrice category status quantity shipping sku options productConfigurations videoId badges'
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
  const { page = 1, limit = 10, search = '', status = '' } = params;
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

  // Add status filter if provided
  if (status) {
    query.status = status;
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

// get product data
export const getRelatedProductService = async productId => {
  const currentProduct = await Product.findById(productId);

  const relatedProducts = await Product.find({
    'category.name': currentProduct.category.name,
    _id: { $ne: productId }, // Exclude the current product ID
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
    product.slug = currProduct.slug;
    product.imageURLs = Array.isArray(currProduct.imageURLs)
      ? currProduct.imageURLs.map(url =>
        typeof url === 'string' ? url : url.img || ''
      )
      : [];
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
    product.description = currProduct.description;
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
  return result;
};
