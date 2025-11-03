import Banner from '../model/Banner.js';
import ApiError from '../errors/api-error.js';

// Create banner
export const createBannerService = async data => {
  const banner = await Banner.create(data);
  return banner;
};

// Get all banners
export const getAllBannersService = async () => {
  const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
  return banners;
};

// Get active banners only
export const getActiveBannersService = async () => {
  const banners = await Banner.find({ status: 'active' }).sort({
    order: 1,
    createdAt: -1,
  });
  return banners;
};

// Get single banner
export const getSingleBannerService = async id => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }
  return banner;
};

// Update banner
export const updateBannerService = async (id, data) => {
  const banner = await Banner.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  return banner;
};

// Delete banner
export const deleteBannerService = async id => {
  const banner = await Banner.findByIdAndDelete(id);

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  return banner;
};

