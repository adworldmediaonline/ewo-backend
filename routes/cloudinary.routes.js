const express = require('express');
const router = express.Router();
// internal
const uploader = require('../middleware/uploder');
const { cloudinaryController } = require('../controller/cloudinary.controller');
const multer = require('multer');

const upload = multer();
//add image
router.post(
  '/add-img',
  uploader.single('image'),
  cloudinaryController.saveImageCloudinary
);

//add image
router.post(
  '/add-multiple-img',
  uploader.array('images', 10), // Allow up to 10 images
  cloudinaryController.addMultipleImageCloudinary
);

//delete image
router.delete('/img-delete', cloudinaryController.cloudinaryDeleteController);

// upload single image
router.post(
  '/upload',
  uploader.single('image'),
  cloudinaryController.saveImageCloudinary
);

// upload multiple images
router.post(
  '/upload-multiple',
  uploader.array('images', 10), // Allow up to 10 images
  cloudinaryController.addMultipleImageCloudinary
);

// delete image
router.delete('/delete', cloudinaryController.cloudinaryDeleteController);

module.exports = router;
