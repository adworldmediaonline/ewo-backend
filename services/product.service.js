const Category = require('../model/Category');
const Product = require('../model/Products');
const ApiError = require('../errors/api-error');
const mongoose = require('mongoose');

// create product service
exports.createProductService = async data => {
  // Calculate updated pricing fields
  if (data.price) {
    data.updatedPrice = Math.round(data.price * 1.2 * 100) / 100;
    data.finalPriceDiscount = Math.round(data.updatedPrice * 0.85 * 100) / 100;
  }

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
exports.addAllProductService = async data => {
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
exports.getPaginatedProductsService = async (filters = {}) => {
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
    // Handle both old format (crossover-high-steer-kits) and new format (crossover-and-high-steer-kits)
    // Also handle cases where "and" is naturally part of the category name
    let categoryPattern = category
      .replace(/-/g, ' ')
      .replace(/\band\b/g, '&') // Convert 'and' back to '&' for matching
      .replace(/\b\w/g, l => l.toUpperCase());

    // Create a more flexible pattern that can match both versions
    const flexiblePattern = category
      .replace(/-/g, ' ')
      .replace(/\band\b/g, '(&|and)') // Allow both & and 'and' in the pattern
      .replace(/\b\w/g, l => l.toUpperCase());

    console.log('Category filter:', {
      original: category,
      pattern: categoryPattern,
      flexiblePattern: flexiblePattern,
    });

    // Use a more flexible regex that can match both & and 'and'
    query['category.name'] = new RegExp(flexiblePattern, 'i');
  }

  // Subcategory filter
  if (subcategory) {
    // Convert slug back to readable format for better matching
    // Handle both old format (dana-60) and new format (dana-60)
    const subcategoryPattern = subcategory
      .replace(/-/g, ' ')
      .replace(/\band\b/g, '&') // Convert 'and' back to '&' for matching
      .replace(/\b\w/g, l => l.toUpperCase());
    console.log('Subcategory filter:', {
      original: subcategory,
      pattern: subcategoryPattern,
    });

    try {
      // Step 1: Find the Category document that matches our parent + children criteria
      let categoryQuery = {};

      if (category) {
        // If we have a main category, find categories where parent matches it
        // Handle both old format (crossover-high-steer-kits) and new format (crossover-and-high-steer-kits)
        // Also handle cases where "and" is naturally part of the category name
        const categoryPattern = category
          .replace(/-/g, ' ')
          .replace(/\band\b/g, '(&|and)') // Allow both & and 'and' in the pattern
          .replace(/\b\w/g, l => l.toUpperCase());
        categoryQuery.parent = new RegExp(categoryPattern, 'i');
      }

      // Add children filter
      categoryQuery.children = new RegExp(subcategoryPattern, 'i');

      console.log(
        'Category query for subcategory:',
        JSON.stringify(categoryQuery, null, 2)
      );

      // Find the matching category
      const matchingCategory = await Category.findOne(categoryQuery);

      if (matchingCategory) {
        console.log('Found matching category:', {
          id: matchingCategory._id,
          name: matchingCategory.name,
          parent: matchingCategory.parent,
          children: matchingCategory.children,
        });

        // Step 2: Filter products by this category ID
        // Clear any existing category filters and use the found category ID
        delete query['category.name'];
        query['category.id'] = matchingCategory._id;

        console.log('Updated query after subcategory filter:', {
          removedCategoryName: true,
          addedCategoryId: matchingCategory._id,
          newQuery: JSON.stringify(query, null, 2),
        });
      } else {
        console.log('No matching category found for subcategory filter');
        console.log(
          'Category query used:',
          JSON.stringify(categoryQuery, null, 2)
        );
        // If no category found, return no results
        query._id = null; // This will ensure no products are returned
      }
    } catch (error) {
      console.error('Error in subcategory filtering:', error);
      // If there's an error, return no results
      query._id = null;
    }
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

  // Log the final query for debugging
  console.log('Final query:', JSON.stringify(query, null, 2));
  console.log('Sort query:', JSON.stringify(sortQuery, null, 2));
  console.log('Query explanation:', {
    hasCategory: !!category,
    hasSubcategory: !!subcategory,
    categoryPattern: category
      ? category
          .replace(/-/g, ' ')
          .replace(/\band\b/g, '(&|and)')
          .replace(/\b\w/g, l => l.toUpperCase())
      : null,
    subcategoryPattern: subcategory
      ? subcategory
          .replace(/-/g, ' ')
          .replace(/\band\b/g, '(&|and)')
          .replace(/\b\w/g, l => l.toUpperCase())
      : null,
    queryType: subcategory
      ? 'Subcategory filtering with Category lookup'
      : 'Direct category filtering',
    patternConversion: {
      originalCategory: category,
      originalSubcategory: subcategory,
      convertedCategory: category
        ? category
            .replace(/-/g, ' ')
            .replace(/\band\b/g, '(&|and)')
            .replace(/\b\w/g, l => l.toUpperCase())
        : null,
      convertedSubcategory: subcategory
        ? subcategory
            .replace(/-/g, ' ')
            .replace(/\band\b/g, '(&|and)')
            .replace(/\b\w/g, l => l.toUpperCase())
        : null,
      flexiblePattern: category
        ? category
            .replace(/-/g, ' ')
            .replace(/\band\b/g, '(&|and)')
            .replace(/\b\w/g, l => l.toUpperCase())
        : null,
    },
  });

  // Check if query is invalid (e.g., _id: null from subcategory filtering)
  if (query._id === null) {
    console.log('Query is invalid, returning empty results');
    return {
      products: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 0,
        totalProducts: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  // Calculate skip value
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with pagination
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('reviews')
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        'title slug img imageURLs price finalPriceDiscount updatedPrice category status quantity'
      ),
    Product.countDocuments(query),
  ]);

  return {
    products,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalProducts: total,
      hasNextPage: skip + products.length < total,
      hasPrevPage: parseInt(page) > 1,
    },
  };
};

// get all product data
exports.getAllProductsService = async () => {
  const products = await Product.find({})
    .populate('reviews')
    .sort({ skuArrangementOrderNo: 1 });
  return products;
};

// get offer product service
exports.getOfferTimerProductService = async () => {
  const products = await Product.find({
    'offerDate.endDate': { $gt: new Date() },
  }).populate('reviews');
  return products;
};

exports.getTopRatedProductService = async () => {
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
exports.getProductService = async idOrSlug => {
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
exports.getRelatedProductService = async productId => {
  const currentProduct = await Product.findById(productId);

  const relatedProducts = await Product.find({
    'category.name': currentProduct.category.name,
    _id: { $ne: productId }, // Exclude the current product ID
  });
  return relatedProducts;
};

// update a product
exports.updateProductService = async (id, currProduct) => {
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
    product.options = currProduct.options;
    product.shipping.price = currProduct.shipping.price;
    product.shipping.description = currProduct.shipping.description;
    product.seo.metaTitle = currProduct.seo.metaTitle;
    product.seo.metaDescription = currProduct.seo.metaDescription;
    product.seo.metaKeywords = currProduct.seo.metaKeywords;

    // Calculate updated pricing fields when price is updated
    if (currProduct.price) {
      product.updatedPrice = Math.round(currProduct.price * 1.2 * 100) / 100;
      product.finalPriceDiscount =
        Math.round(product.updatedPrice * 0.85 * 100) / 100;
    }

    console.log('product.options', product.options);
    console.log(typeof product.options);
    console.log('product.sku', product.sku);
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

// get Reviews Products
exports.getReviewsProducts = async () => {
  const result = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate({
    path: 'reviews',
    populate: { path: 'userId', select: 'name email imageURL' },
  });

  const products = result.filter(p => p.reviews.length > 0);

  return products;
};

// get Reviews Products
exports.getStockOutProducts = async () => {
  const result = await Product.find({ status: 'out-of-stock' }).sort({
    createdAt: -1,
  });
  return result;
};

// get Reviews Products
exports.deleteProduct = async id => {
  const result = await Product.findByIdAndDelete(id);
  return result;
};
