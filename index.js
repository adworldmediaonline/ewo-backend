import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { secret } from './config/secret.js';

import globalErrorHandler from './middleware/global-error-handler.js';

import categoryRoutes from './routes/category.routes.js';
import contactRoutes from './routes/contact.routes.js';
import userRoutes from './routes/user.routes.js';

import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';

import adminRoutes from './routes/admin.routes.js';
import brandRoutes from './routes/brand.routes.js';
import cartRoutes from './routes/cart.routes.js';
import cartTrackingRoutes from './routes/cartTracking.routes.js';
import cloudinaryRoutes from './routes/cloudinary.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import metaConversionsRoutes from './routes/metaConversions.routes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js';
import reviewRoutes from './routes/review.routes.js';
import shippingRoutes from './routes/shipping.routes.js';
import userOrderRoutes from './routes/user.order.routes.js';

dotenv.config();

const app = express();
const PORT = secret.port || 8090;

app.set('trust proxy', 1);

//* cors middleware

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:8090',
  'https://www.eastwestoffroad.com',
  // 'https://eastwestoffroad.com',
  'https://ewo-admin.vercel.app',
  'https://ewo-staging.vercel.app',
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      const o = origin.replace(/\/$/, '');
      if (allowedOrigins.has(o)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Better-Auth-CSRF',
      'X-Better-Auth-Action',
      'X-Better-Auth-Client',
    ],
  })
);

app.options('*', cors());

app.all('/api/auth/*', toNodeHandler(auth));

app.get('/api/auth/ok', (req, res) => {
  res.json({ status: 'Better Auth is running' });
});

app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    return res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

// ES module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// connect database
connectDB();

app.use('/api/contact', contactRoutes);
app.use('/api/user', userRoutes);
app.use('/api/category', categoryRoutes);

app.use('/api/brand', brandRoutes);
app.use('/api/product', productRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/user-order', userOrderRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/cart-tracking', cartTrackingRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/meta-conversions', metaConversionsRoutes);
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => res.send('Apps worked successfully'));

app.listen(PORT, () => console.log(`server running on port ${PORT}`));

// global error handler
app.use(globalErrorHandler);
//* handle not found

// Final error handler ensures CORS headers also exist on errors
app.use((err, req, res, next) => {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error(err);
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
  next();
});

export default app;
