const fs = require('fs');
const { cloudinaryServices } = require('../services/cloudinary.service');

// add image
const saveImageCloudinary = async (req, res, next) => {
  // console.log(req.file)
  try {
    const result = await cloudinaryServices.cloudinaryImageUpload(
      req.file.buffer
    );
    res.status(200).json({
      success: true,
      message: 'image uploaded successfully',
      data: { url: result.secure_url, id: result.public_id },
    });
  } catch (err) {
    console.log(err);
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
      message: 'Images uploaded successfully',
      data: results.map(result => ({
        url: result.secure_url,
        id: result.public_id,
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
    const public_id = `${folder_name}/${id}`;
    const result = await cloudinaryServices.cloudinaryImageDelete(public_id);
    res.status(200).json({
      success: true,
      message: 'delete image successfully',
      data: result,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: 'Failed to delete image',
    });
  }
};

exports.cloudinaryController = {
  cloudinaryDeleteController,
  saveImageCloudinary,
  addMultipleImageCloudinary,
};
