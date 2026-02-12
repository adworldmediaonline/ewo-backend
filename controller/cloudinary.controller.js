import { cloudinaryServices } from '../services/cloudinary.service.js';

// add image (supports optional fileName, title, altText for CMS)
const saveImageCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const customFileName = req.body?.fileName?.trim?.();
    const title = req.body?.title?.trim?.() ?? '';
    const altText = req.body?.altText?.trim?.() ?? '';

    const result = await cloudinaryServices.cloudinaryImageUpload(
      req.file.buffer,
      {
        customFileName: customFileName || req.file.originalname,
        folder: req.body?.folder?.trim?.() || 'ewo-assets',
      }
    );

    const fileName = result.fileName || result.original_filename || '';

    res.status(200).json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: {
        url: result.secure_url,
        id: result.public_id,
        format: result.format,
        size: result.bytes,
        original_filename: result.original_filename,
        fileName,
        title,
        altText: altText || title || fileName,
      },
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    next(err);
  }
};

// add multiple images (supports per-file meta via body: fileName_0, title_0, altText_0, etc.)
const addMultipleImageCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const metaArray = req.files.map((file, i) => ({
      customFileName: req.body?.[`fileName_${i}`]?.trim?.() || file.originalname,
      title: req.body?.[`title_${i}`]?.trim?.() ?? '',
      altText: req.body?.[`altText_${i}`]?.trim?.() ?? '',
      folder: req.body?.folder?.trim?.() || 'ewo-assets',
    }));

    const results = await cloudinaryServices.cloudinaryMultipleImageUpload(
      req.files,
      metaArray
    );

    res.status(200).json({
      success: true,
      message: 'Images uploaded and optimized successfully',
      data: results.map((r, i) => ({
        url: r.secure_url,
        id: r.public_id,
        format: r.format,
        size: r.bytes,
        original_filename: r.original_filename,
        fileName: r.fileName || r.original_filename || '',
        title: metaArray[i]?.title ?? '',
        altText: metaArray[i]?.altText || metaArray[i]?.title || r.fileName || '',
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
