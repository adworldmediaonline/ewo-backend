const ApiError = require('../errors/api-error');
const BlogCategory = require('../model/BlogCategory');
const Products = require('../model/Products');

// create blogCategory service
exports.createBlogCategoryService = async data => {
  const blogCategory = await BlogCategory.create(data);
  return blogCategory;
};

// create all blogCategory service
exports.addAllBlogCategoryService = async data => {
  await BlogCategory.deleteMany();
  const blogCategory = await BlogCategory.insertMany(data);
  return blogCategory;
};

// get all show blogCategory service
exports.getShowBlogCategoryServices = async () => {
  const blogCategory = await BlogCategory.find({ status: 'Show' }).populate(
    'products'
  );
  return blogCategory;
};

// get all blogCategory
exports.getAllBlogCategoryServices = async () => {
  const blogCategory = await BlogCategory.find({});
  return blogCategory;
};

// get type of blogCategory service
exports.getBlogCategoryTypeService = async param => {
  const categories = await BlogCategory.find({ productType: param }).populate(
    'products'
  );
  return categories;
};

// get type of blogCategory service
exports.deleteBlogCategoryService = async id => {
  const result = await BlogCategory.findByIdAndDelete(id);
  return result;
};

// update blogCategory
exports.updateBlogCategoryService = async (id, payload) => {
  const isExist = await BlogCategory.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, 'BlogCategory not found !');
  }

  const result = await BlogCategory.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// get single blogCategory
exports.getSingleBlogCategoryService = async id => {
  const result = await BlogCategory.findById(id);
  return result;
};
