import dotenv from 'dotenv';
import cloudinaryModule from 'cloudinary';
import { secret } from '../config/secret.js';

dotenv.config();
const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: secret.cloudinary_name,
  api_key: secret.cloudinary_api_key,
  api_secret: secret.cloudinary_api_secret,
});

export default cloudinary;
