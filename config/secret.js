dotenv.config({ path: path.join(process.cwd(), '.env') });
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const secret = {
  port: process.env.PORT,
  env: process.env.NODE_ENV,
  db_url: process.env.MONGO_URI,
  token_secret: process.env.TOKEN_SECRET,
  jwt_secret_for_verify: process.env.JWT_SECRET_FOR_VERIFY,

  email_service: process.env.SERVICE,
  email_user: process.env.EMAIL_USER,
  email_pass: process.env.EMAIL_PASS,
  email_host: process.env.HOST,
  email_port: process.env.EMAIL_PORT,

  cloudinary_name: process.env.CLOUDINARY_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  cloudinary_upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,

  stripe_key: process.env.STRIPE_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  client_url: process.env.STORE_URL,
  admin_url: process.env.ADMIN_URL,

  store_name: process.env.STORE_NAME,
  support_email: process.env.SUPPORT_EMAIL,
  api_base_url: process.env.API_BASE_URL,

  // betterAuth
  backend_url_prod: process.env.BACKEND_URL_PROD,
  backend_url_local: process.env.BACKEND_URL_LOCAL,
  frontend_url_prod: process.env.FRONTEND_URL_PROD,
  frontend_url_local: process.env.FRONTEND_URL_LOCAL,

  // google cloud
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
};
