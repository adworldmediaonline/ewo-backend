const multer = require('multer');
const path = require('path');

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const supportedImage = /\.(png|jpg|jpeg|webp)$/i;
    const extension = path.extname(file.originalname);

    if (supportedImage.test(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Must be a png/jpg/jpeg/webp image'));
    }
  },
  limits: {
    fileSize: 4000000, // 4MB
  },
});

module.exports = uploader;
