import {
  createBannerService,
  getAllBannersService,
  getActiveBannersService,
  getSingleBannerService,
  updateBannerService,
  deleteBannerService,
} from '../services/banner.service.js';

// Create banner
export const createBanner = async (req, res, next) => {
  try {
    const banner = await createBannerService(req.body);
    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// Get all banners
export const getAllBanners = async (req, res, next) => {
  try {
    const banners = await getAllBannersService();
    res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// Get active banners only
export const getActiveBanners = async (req, res, next) => {
  try {
    const banners = await getActiveBannersService();
    res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// Get single banner
export const getSingleBanner = async (req, res, next) => {
  try {
    const banner = await getSingleBannerService(req.params.id);
    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// Update banner
export const updateBanner = async (req, res, next) => {
  try {
    const banner = await updateBannerService(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// Delete banner
export const deleteBanner = async (req, res, next) => {
  try {
    await deleteBannerService(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

