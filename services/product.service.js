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

// get product data
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
