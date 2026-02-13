import ApiError from '../errors/api-error.js';
import Category from '../model/Category.js';
import Products from '../model/Products.js';

// create category service
export const createCategoryService = async data => {
  const category = await Category.create(data);
  return category;
};

// create all category service
export const addAllCategoryService = async data => {
  await Category.deleteMany();
  const category = await Category.insertMany(data);
  return category;
};

// get all show category service – returns full documents including image metadata (fileName, title, altText)
export const getShowCategoryServices = async () => {
  const category = await Category.find({ status: 'Show' })
    .populate('products')
    .sort({ description: 1 })
    .lean();
  return category;
};

// get all category - Optimized with pagination and search
export const getAllCategoryServices = async (params = {}) => {
  const { page = 1, limit = 10, search = '', status = '' } = params;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};

  // Add search filter if provided
  if (search) {
    query.parent = { $regex: search, $options: 'i' };
  }

  // Add status filter if provided
  if (status) {
    query.status = status;
  }

  // Get total count for pagination
  const total = await Category.countDocuments(query);

  // Fetch categories with pagination
  const category = await Category.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance

  return {
    data: category,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// get type of category service
export const getCategoryTypeService = async param => {
  const categories = await Category.find({ productType: param }).populate(
    'products'
  );
  return categories;
};

// get type of category service
export const deleteCategoryService = async id => {
  const result = await Category.findByIdAndDelete(id);
  return result;
};

// update category
export const updateCategoryService = async (id, payload) => {
  const isExist = await Category.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, 'Category not found !');
  }

  const result = await Category.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  // If category name has changed, update all products with this category

  const parent = payload.parent.toLowerCase();
  const isParent = isExist.parent.toLowerCase();

  if (parent && isParent !== parent) {
    console.log('yes');
    // const products = await Products.find({ 'category.id': id });
    // console.log(products);
    await Products.updateMany(
      { 'category.id': id },
      {
        'category.name': payload.parent,
        parent: payload.parent,
      }
    );
  }
  console.log('end');

  return result;
};

// get single category
export const getSingleCategoryService = async id => {
  const result = await Category.findById(id);
  return result;
};
