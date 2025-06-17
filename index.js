require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const { secret } = require('./config/secret');
const PORT = secret.port || 7000;
const morgan = require('morgan');
// error handler
const globalErrorHandler = require('./middleware/global-error-handler');
// routes
const contactRoutes = require('./routes/contact.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const blogCategoryRoutes = require('./routes/blogCategory.routes');
const blogRoutes = require('./routes/blog.routes');
const brandRoutes = require('./routes/brand.routes');
const userOrderRoutes = require('./routes/user.order.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const couponRoutes = require('./routes/coupon.routes');
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes');
const cloudinaryRoutes = require('./routes/cloudinary.routes');
const cartRoutes = require('./routes/cart.routes');
const cartTrackingRoutes = require('./routes/cartTracking.routes');
const shippingRoutes = require('./routes/shipping.routes');
const { handleStripeWebhook } = require('./controller/order.controller');

// IMPORTANT: Stripe webhook route must be defined before other middleware
// that parses the request body
app.post(
  '/api/order/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// connect database
connectDB();

app.use('/api/contact', contactRoutes);
app.use('/api/user', userRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/blog-category', blogCategoryRoutes);
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

module.exports = app;
