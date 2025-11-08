import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import initRedisClient, { closeRedisConnection } from './config/redis.js';
import { secret } from './config/secret.js';

import categoryRoutes from './routes/category.routes.js';
import contactRoutes from './routes/contact.routes.js';
import userRoutes from './routes/user.routes.js';

import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';

import { auth } from './lib/auth.js';
import adminRoutes from './routes/admin.routes.js';
import bannerRoutes from './routes/banner.routes.js';
import brandRoutes from './routes/brand.routes.js';
import cartRoutes from './routes/cart.routes.js';
import cartTrackingRoutes from './routes/cartTracking.routes.js';
import cloudinaryRoutes from './routes/cloudinary.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import metaConversionsRoutes from './routes/metaConversions.routes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js';
import productsRoutes from './routes/products.routes.js';
import protectedRoutes from './routes/protected.route.js';
import reviewRoutes from './routes/review.routes.js';
import shippingRoutes from './routes/shipping.routes.js';
import userOrderRoutes from './routes/user.order.routes.js';

dotenv.config();

const app = express();
const PORT = secret.port || 8090;

// Better-auth
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'https://www.eastwestoffroad.com',
      'http://localhost:4000',
      'https://admin.eastwestoffroad.com',
      'https://ewo-admin.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    maxAge: 86400,
  })
);

// Enable CORS for /api/auth/* with custom options

app.use(
  '/api/auth/*',
  cors({
    origin: [
      'http://localhost:3000',
      'https://www.eastwestoffroad.com',
      'http://localhost:4000',
      'https://admin.eastwestoffroad.com',
      'https://ewo-admin.vercel.app',
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['POST', 'GET', 'OPTIONS'],
    exposedHeaders: ['Content-Length'],
    credentials: true,
    maxAge: 86400,
  })
);

// Enable CORS for /api/product/* with custom options

app.all('/api/auth/*', toNodeHandler(auth));

app.get('/api/auth/ok', (req, res) => {
  res.json({
    status: 'Better Auth is running',
    environment: process.env.NODE_ENV,
    baseURL: process.env.API_BASE_URL || 'http://localhost:8090',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active session found',
        message: 'Please sign in to access this endpoint',
        debug: {
          hasCookie: !!req.headers.cookie,
          cookieValue: req.headers.cookie
            ? req.headers.cookie.substring(0, 50) + '...'
            : 'none',
          origin: req.headers.origin,
        },
      });
    }

    return res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Better Auth end

// ES module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// connect database
connectDB();

// initialize Redis
initRedisClient()
  .then(() => {
    console.log('Redis initialization attempted');
  })
  .catch((err) => {
    console.log('Redis unavailable, continuing without cache:', err.message);
  });

// Protected routes
app.use('/api/protected', protectedRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/user', userRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/product', productRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/user-order', userOrderRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/cart-tracking', cartTrackingRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/meta-conversions', metaConversionsRoutes);
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => res.send('Apps worked successfully'));

app.listen(PORT, () => console.log(`server running on port ${PORT}`));

export default app;
