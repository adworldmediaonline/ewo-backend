const ApiError = require('../errors/api-error');
const Category = require('../model/Category');
const Products = require('../model/Products');

// create category service
exports.createCategoryService = async data => {
  const category = await Category.create(data);
  return category;
};

// create all category service
exports.addAllCategoryService = async data => {
  await Category.deleteMany();
  const category = await Category.insertMany(data);
  return category;
};

// get all show category service
exports.getShowCategoryServices = async () => {
  const category = await Category.find({ status: 'Show' })
    .populate('products')
    .sort({ updatedAt: -1 });
  return category;
};

// get all category
exports.getAllCategoryServices = async () => {
  const category = await Category.find({});
  return category;
};

// get type of category service
exports.getCategoryTypeService = async param => {
  const categories = await Category.find({ productType: param }).populate(
    'products'
  );
  return categories;
};

// get type of category service
exports.deleteCategoryService = async id => {
  const result = await Category.findByIdAndDelete(id);
  return result;
};

// update category
exports.updateCategoryService = async (id, payload) => {
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
exports.getSingleCategoryService = async id => {
  const result = await Category.findById(id);
  return result;
};
