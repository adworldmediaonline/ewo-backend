import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { secret } from './config/secret.js';

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

//* CORS middleware - Following Better Auth official docs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8090',
  'https://www.eastwestoffroad.com',
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      const o = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(o)) return cb(null, true);
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
      'X-Better-Auth-JWT',
    ],
    exposedHeaders: ['set-auth-token', 'set-auth-jwt', 'X-Better-Auth-CSRF'],
  })
);

app.options('*', cors());

// Better Auth endpoints - Following official docs
app.all('/api/auth/*', toNodeHandler(auth));

// Test endpoint to verify Better Auth is working
app.get('/api/auth/ok', (req, res) => {
  res.json({ status: 'Better Auth is running' });
});

// JWT endpoint for getting tokens
app.get('/api/auth/token', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'No valid session' });
    }

    // Get JWT token from session
    const jwtToken = await auth.api.getJWT({
      headers: fromNodeHeaders(req.headers),
    });

    return res.json({ token: jwtToken });
  } catch (error) {
    console.error('Error getting JWT token:', error);
    return res.status(500).json({ error: 'Failed to get JWT token' });
  }
});

// JWKS endpoint for JWT verification
app.get('/api/auth/jwks', async (req, res) => {
  try {
    const jwks = await auth.api.getJWKS();
    return res.json(jwks);
  } catch (error) {
    console.error('Error getting JWKS:', error);
    return res.status(500).json({ error: 'Failed to get JWKS' });
  }
});

// Session endpoint for getting current session
app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'No valid session' });
    }

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

export default app;
