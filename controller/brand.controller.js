import Brand from '../model/Brand.js';
import {
  addAllBrandService,
  getBrandsService,
  deleteBrandsService,
  updateBrandService,
  getSingleBrandService,
} from '../services/brand.service.js';

// add a brand
export const addBrand = async (req, res, next) => {
  try {
    const result = await addAllBrandService(req.body);
    res.status(200).json({
      status: 'success',
      message: 'Brand created successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all Brand
export const addAllBrand = async (req, res, next) => {
  try {
    const result = await addAllBrandService(req.body);
    res.json({
      message: 'Brands added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active Brand
export const getAllBrands = async (req, res, next) => {
  try {
    const result = await Brand.find(
      {},
      { name: 1, email: 1, logo: 1, website: 1, location: 1 }
    );
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active Brand
export const getActiveBrands = async (req, res, next) => {
  try {
    const result = await getBrandsService();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// delete Brand
export const deleteBrand = async (req, res, next) => {
  try {
    await deleteBrandsService(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Brand delete successfully',
    });
  } catch (error) {
    next(error);
  }
};

// update category
export const updateBrand = async (req, res, next) => {
  try {
    const result = await updateBrandService(req.params.id, req.body);
    res.status(200).json({
      status: true,
      message: 'Brand update successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get single category
export const getSingleBrand = async (req, res, next) => {
  try {
    const result = await getSingleBrandService(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
