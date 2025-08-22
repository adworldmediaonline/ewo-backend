import { secret } from '../config/secret.js';
import cloudinary from '../utils/cloudinary.js';
import { Readable } from 'stream';

// cloudinary Image Upload
// const cloudinaryImageUpload = async (image) => {
//   console.log('image service',image)
//   const uploadRes = await cloudinary.uploader.upload(image, {
//     upload_preset: secret.cloudinary_upload_preset,
//   });
//   return uploadRes;
// };

const cloudinaryImageUpload = imageBuffer => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        upload_preset: secret.cloudinary_upload_preset,
        transformation: [
          {
            quality: 'auto',
            fetch_format: 'webp',
            format: 'webp',
            flags: 'lossy',
          },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    bufferStream.pipe(uploadStream);
  });
};

// Handle multiple image uploads
const cloudinaryMultipleImageUpload = async files => {
  try {
    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            upload_preset: secret.cloudinary_upload_preset,
            transformation: [
              {
                quality: 'auto',
                fetch_format: 'webp',
                format: 'webp',
                flags: 'lossy',
              },
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        bufferStream.pipe(uploadStream);
      });
    });

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

// cloudinaryImageDelete
const cloudinaryImageDelete = async public_id => {
  const deletionResult = await cloudinary.uploader.destroy(public_id);
  return deletionResult;
};

export const cloudinaryServices = {
  cloudinaryImageDelete,
  cloudinaryImageUpload,
  cloudinaryMultipleImageUpload,
};
