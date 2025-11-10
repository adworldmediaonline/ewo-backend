import {
  createAnnouncementService,
  getAllAnnouncementsService,
  getActiveAnnouncementsService,
  getSingleAnnouncementService,
  updateAnnouncementService,
  deleteAnnouncementService,
  toggleAnnouncementStatusService,
} from '../services/announcement.service.js';

// Create announcement
export const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await createAnnouncementService(req.body);
    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// Get all announcements (admin)
export const getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await getAllAnnouncementsService();
    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};

// Get active announcements (public)
export const getActiveAnnouncements = async (req, res, next) => {
  try {
    const announcements = await getActiveAnnouncementsService();
    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};

// Get single announcement
export const getSingleAnnouncement = async (req, res, next) => {
  try {
    const announcement = await getSingleAnnouncementService(req.params.id);
    res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// Update announcement
export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await updateAnnouncementService(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle announcement status
export const toggleAnnouncementStatus = async (req, res, next) => {
  try {
    const announcement = await toggleAnnouncementStatusService(req.params.id);
    res.status(200).json({
      success: true,
      message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res, next) => {
  try {
    await deleteAnnouncementService(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

