import Announcement from '../model/Announcement.js';
import ApiError from '../errors/api-error.js';

// Create announcement
export const createAnnouncementService = async data => {
  const announcement = await Announcement.create(data);
  return announcement;
};

// Get all announcements (admin)
export const getAllAnnouncementsService = async () => {
  const announcements = await Announcement.find({}).sort({
    displayOrder: 1,
    createdAt: -1,
  });
  return announcements;
};

// Get active announcements (public) - only shows announcements within date range
export const getActiveAnnouncementsService = async () => {
  const now = new Date();
  const announcements = await Announcement.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).sort({ displayOrder: 1, priority: -1, createdAt: -1 });
  return announcements;
};

// Get single announcement
export const getSingleAnnouncementService = async id => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }
  return announcement;
};

// Update announcement
export const updateAnnouncementService = async (id, data) => {
  const announcement = await Announcement.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  return announcement;
};

// Toggle announcement status
export const toggleAnnouncementStatusService = async id => {
  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  announcement.isActive = !announcement.isActive;
  await announcement.save();

  return announcement;
};

// Delete announcement
export const deleteAnnouncementService = async id => {
  const announcement = await Announcement.findByIdAndDelete(id);

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  return announcement;
};

