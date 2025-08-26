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

//* cors middleware
//
const allowedOrigins = [
  'http://localhost:3000', // Frontend local development
  'http://localhost:4000', // Admin panel local development
  'http://localhost:8090', // Backend local development
  'https://ewo-admin.vercel.app', // Admin panel production
  'https://www.eastwestoffroad.com/', // Frontend production (if you have one)
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the origin
    } else {
      callback(new Error('Not allowed by CORS')); // Disallow the origin
    }
  },
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true, // Credentials are supported
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// / Mount Better Auth routes BEFORE express.json() middleware
app.all('/api/auth/*', toNodeHandler(auth));

app.get('/api/auth/ok', (req, res) => {
  res.json({ status: 'Better Auth is running' });
});

app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    console.log('session', session);
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

// root route
app.get('/', (req, res) => res.send('Apps worked successfully'));

app.listen(PORT, () => console.log(`server running on port ${PORT}`));

// global error handler
app.use(globalErrorHandler);
//* handle not found
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
