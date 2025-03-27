const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a product title'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      index: true,
    },
    category: {
      name: {
        type: String,
        required: true,
        index: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    },
    parent: {
      type: String,
      required: true,
      index: true,
    },
    children: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['in-stock', 'out-of-stock', 'discontinued'],
      default: 'in-stock',
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
      index: true,
    },
    unit: String,
    imageURLs: [
      {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            // Basic URL validation
            return /^https?:\/\//.test(v);
          },
          message: 'Invalid image URL',
        },
      },
    ],
    img: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'Please provide a product sku'],
      trim: true,
      index: true,
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },
    offerDate: {
      startDate: Date,
      endDate: Date,
    },
    videoId: String,
    additionalInfo: [
      {
        key: String,
        value: String,
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    rating: {
      type: Number,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    trending: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create text indexes for full-text search with weighted fields
productSchema.index(
  {
    title: 'text',
    description: 'text',
    'category.name': 'text',
    tags: 'text',
    sku: 'text',
  },
  {
    weights: {
      title: 10, // Highest priority
      sku: 8, // High priority
      'category.name': 6, // Medium-high priority
      tags: 4, // Medium priority
      description: 2, // Lower priority
    },
    name: 'product_search_index',
  }
);

// Compound indexes for common query patterns
productSchema.index({ 'category.name': 1, status: 1 });
productSchema.index({ price: 1, status: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ status: 1, quantity: 1 });
productSchema.index({ featured: 1, trending: 1 });

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
  if (!this.discount) return this.price;
  return this.price - (this.price * this.discount) / 100;
});

// Pre-save middleware to ensure slug uniqueness
productSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();

  let slug = this.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  let counter = 0;
  let uniqueSlug = slug;

  while (true) {
    const existingProduct = await this.constructor.findOne({
      slug: uniqueSlug,
    });
    if (!existingProduct || existingProduct._id.equals(this._id)) break;
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  this.slug = uniqueSlug;
  next();
});

// Method to check if product is on sale
productSchema.methods.isOnSale = function () {
  if (!this.offerDate?.startDate || !this.offerDate?.endDate) return false;
  const now = new Date();
  return now >= this.offerDate.startDate && now <= this.offerDate.endDate;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
