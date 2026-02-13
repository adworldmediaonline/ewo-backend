import Product from '../model/Products.js';

/**
 * Get products with filters, pagination, and sorting
 * Supports filtering by category, subcategory, price range, and availability
 */
export const getFilteredProductsService = async (filters = {}) => {
  const {
    category,
    subcategory,
    minPrice,
    maxPrice,
    status,
    inStock,
    quickShop,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  // Build query object
  const query = {};

  // Category filter (parent category)
  if (category) {
    query.parent = category;
  }

  // Subcategory filter (children category)
  if (subcategory) {
    query.children = subcategory;
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      query.price.$lte = Number(maxPrice);
    }
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Availability filters
  if (inStock === 'true' || inStock === true) {
    // Use regex to handle variations like 'in-stock', 'in-stock/', etc.
    query.status = { $regex: /^in-stock/i };
    query.quantity = { $gt: 0 };
  }

  // Build sort object
  const sort = {};
  const validSortFields = [
    'createdAt',
    'price',
    'title',
    'updatedAt',
    'skuArrangementOrderNo',
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  sort[sortField] = sortDirection;

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute query
  const products = await Product.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .populate('category.id', 'parent children')
    .select('title slug img image imageURLs imageURLsWithMeta price finalPriceDiscount updatedPrice category status quantity shipping sku options productConfigurations videoId badges description faqs')
    .lean();

  // Get total count for pagination
  const total = await Product.countDocuments(query);

  return {
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: skip + Number(limit) < total,
      hasPreviousPage: Number(page) > 1,
    },
  };
};

/**
 * Get products by category and subcategory
 */
export const getProductsByCategoryService = async (category, subcategory) => {
  const query = {};

  if (category) {
    query.parent = category;
  }

  if (subcategory) {
    query.children = subcategory;
  }

  const products = await Product.find(query)
    .populate('category.id', 'parent children')
    .sort({ createdAt: -1 })
    .lean();

  return products;
};

/**
 * Get product count by filters
 */
export const getProductCountService = async (filters = {}) => {
  const { category, subcategory, minPrice, maxPrice, status, inStock } =
    filters;

  const query = {};

  if (category) {
    query.parent = category;
  }

  if (subcategory) {
    query.children = subcategory;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      query.price.$lte = Number(maxPrice);
    }
  }

  if (status) {
    query.status = status;
  }

  if (inStock === 'true' || inStock === true) {
    // Use regex to handle variations like 'in-stock', 'in-stock/', etc.
    query.status = { $regex: /^in-stock/i };
    query.quantity = { $gt: 0 };
  }

  const count = await Product.countDocuments(query);
  return count;
};

