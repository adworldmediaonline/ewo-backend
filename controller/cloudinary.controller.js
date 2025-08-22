import { cloudinaryServices } from '../services/cloudinary.service.js';

// add image
const saveImageCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const result = await cloudinaryServices.cloudinaryImageUpload(
      req.file.buffer
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: {
        url: result.secure_url,
        id: result.public_id,
        format: result.format,
        size: result.bytes,
        original_filename: result.original_filename,
      },
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    next(err);
  }
};

// add multiple images
const addMultipleImageCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const results = await cloudinaryServices.cloudinaryMultipleImageUpload(
      req.files
    );

    res.status(200).json({
      success: true,
      message: 'Images uploaded and optimized successfully',
      data: results.map(result => ({
        url: result.secure_url,
        id: result.public_id,
        format: result.format,
        size: result.bytes,
        original_filename: result.original_filename,
      })),
    });
  } catch (err) {
    console.error('Error uploading multiple images:', err);
    next(err);
  }
};

// cloudinary ImageDelete
const cloudinaryDeleteController = async (req, res) => {
  try {
    const { folder_name, id } = req.query;
    if (!folder_name || !id) {
      return res.status(400).json({
        success: false,
        message: 'Missing folder_name or id parameter',
      });
    }

    const public_id = `${folder_name}/${id}`;
    const result = await cloudinaryServices.cloudinaryImageDelete(public_id);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: err.message,
    });
  }
};

export const cloudinaryController = {
  cloudinaryDeleteController,
  saveImageCloudinary,
  addMultipleImageCloudinary,
};
