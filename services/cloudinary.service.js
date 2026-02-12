import { secret } from '../config/secret.js';
import cloudinary from '../utils/cloudinary.js';
import { Readable } from 'stream';

/**
 * Sanitize filename for Cloudinary public_id (alphanumeric, underscore, hyphen only)
 */
const sanitizePublicId = (fileName) => {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const sanitized = withoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return sanitized || `img-${Date.now()}`;
};

const cloudinaryImageUpload = (imageBuffer, options = {}) => {
  const { customFileName, folder = 'ewo-assets' } = options;

  const uploadOptions = {
    upload_preset: secret.cloudinary_upload_preset,
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'webp',
        format: 'webp',
        flags: 'lossy',
      },
    ],
  };

  if (customFileName) {
    const baseId = sanitizePublicId(customFileName);
    uploadOptions.public_id = `${folder}/${baseId}-${Date.now()}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        } else {
          const fileName = customFileName || result?.original_filename || '';
          resolve({ ...result, fileName });
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    bufferStream.pipe(uploadStream);
  });
};

// Handle multiple image uploads with optional per-file meta
const cloudinaryMultipleImageUpload = async (files, metaArray = []) => {
  try {
    const uploadPromises = files.map((file, i) => {
      const meta = metaArray[i] || {};
      const { customFileName, folder = 'ewo-assets' } = meta;

      const uploadOptions = {
        upload_preset: secret.cloudinary_upload_preset,
        transformation: [
          {
            quality: 'auto',
            fetch_format: 'webp',
            format: 'webp',
            flags: 'lossy',
          },
        ],
      };

      if (customFileName) {
        const baseId = sanitizePublicId(customFileName);
        uploadOptions.public_id = `${folder}/${baseId}-${Date.now()}-${i}`;
      }

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              const fileName = customFileName || result?.original_filename || '';
              resolve({ ...result, fileName });
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
