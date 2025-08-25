import express from 'express';
const router = express.Router();
// internal
import uploader from '../middleware/uploder.js';
import { cloudinaryController } from '../controller/cloudinary.controller.js';
import multer from 'multer';

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

export default router;
