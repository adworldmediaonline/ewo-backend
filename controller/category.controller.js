import {
  addAllCategoryService,
  createCategoryService,
  deleteCategoryService,
  getAllCategoryServices,
  getCategoryTypeService,
  getShowCategoryServices,
  getSingleCategoryService,
  updateCategoryService,
} from '../services/category.service.js';

// add category
export const addCategory = async (req, res, next) => {
  try {
    const result = await createCategoryService(req.body);
    res.status(200).json({
      status: 'success',
      message: 'Category created successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all category
export const addAllCategory = async (req, res, next) => {
  try {
    const result = await addAllCategoryService(req.body);
    res.json({
      message: 'Category added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// add all category
export const getShowCategory = async (req, res, next) => {
  try {
    const result = await getShowCategoryServices();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// add all category
export const getAllCategory = async (req, res, next) => {
  try {
    const result = await getAllCategoryServices();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// add all category
export const getProductTypeCategory = async (req, res, next) => {
  try {
    const result = await getCategoryTypeService(req.params.type);
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// delete category
export const deleteCategory = async (req, res, next) => {
  try {
    const result = await deleteCategoryService(req.params.id);
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// update category
export const updateCategory = async (req, res, next) => {
  try {
    const result = await updateCategoryService(req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Category update successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get single category
export const getSingleCategory = async (req, res, next) => {
  try {
    const result = await getSingleCategoryService(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
