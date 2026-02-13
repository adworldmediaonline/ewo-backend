import multer from 'multer';
import path from 'path';

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const supportedImage = /\.(png|jpg|jpeg|webp|avif)$/i;
    const extension = path.extname(file.originalname);

    if (supportedImage.test(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Must be a png/jpg/jpeg/webp/avif image'));
    }
  },
  limits: {
    fileSize: 4000000, // 4MB
  },
});

export default uploader;
