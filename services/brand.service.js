import ApiError from '../errors/api-error.js';
import Brand from '../model/Brand.js';

// addBrandService
export const addBrandService = async data => {
  const brand = await Brand.create(data);
  return brand;
};

// create all Brands service
export const addAllBrandService = async data => {
  await Brand.deleteMany();
  const brands = await Brand.insertMany(data);
  return brands;
};

// get all Brands service
export const getBrandsService = async () => {
  const brands = await Brand.find({ status: 'active' }).populate('products');
  return brands;
};

// get all Brands service
export const deleteBrandsService = async id => {
  const brands = await Brand.findByIdAndDelete(id);
  return brands;
};

// update category
export const updateBrandService = async (id, payload) => {
  const isExist = await Brand.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, 'Brand not found !');
  }

  const result = await Brand.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// get single category
export const getSingleBrandService = async id => {
  const result = await Brand.findById(id);
  return result;
};
