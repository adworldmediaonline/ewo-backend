import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
// schema design
import validator from 'validator';

const productsSchema = mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
    },
    skuArrangementOrderNo: String,
    img: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return validator.isURL(value);
        },
        message: 'Invalid image URL',
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [150, 'Title cannot be more than 150 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    imageURLs: [
      {
        type: String,
        required: true,
      },
    ],
    parent: {
      type: String,
      required: true,
    },
    children: String,
    price: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Price cannot be negative',
      },
    },
    increasePriceWithInPercent: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Price increase percentage cannot be negative',
      },
    },
    discountOnPrice: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Price discount cannot be negative',
      },
    },
    discount: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Discount cannot be negative',
      },
    },
    shipping: {
      price: {
        type: Number,
        required: false,
        validate: {
          validator: function (value) {
            // Only validate if value is provided
            return value === undefined || value === null || value >= 0;
          },
          message: 'Shipping price cannot be negative',
        },
      },
      description: {
        type: String,
        required: false,
        default: '',
      },
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Quantity cannot be negative',
      },
    },
    category: {
      id: {
        type: ObjectId,
        ref: 'Category',
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['in-stock', 'out-of-stock', 'discontinued'],
      default: 'in-stock',
    },
    reviews: [
      {
        type: ObjectId,
        ref: 'Reviews',
      },
    ],
    description: {
      type: String,
      required: true,
    },
    videoId: String,
    additionalInformation: [
      {
        key: String,
        value: String,
      },
    ],
    tags: [String],
    badges: {
      type: [String],
      default: [],
    },
    offerDate: {
      startDate: Date,
      endDate: Date,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    sellCount: {
      type: Number,
      default: 0,
    },
    options: [
      {
        title: {
          type: String,
          required: [
            function () {
              return this.options && this.options.length > 0;
            },
            'Option title is required',
          ],
        },
        price: {
          type: Number,
          required: [
            function () {
              return this.options && this.options.length > 0;
            },
            'Option price is required',
          ],
          min: [0, 'Option price cannot be negative'],
        },
      },
    ],
    productConfigurations: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        options: [
          {
            name: {
              type: String,
              required: false,
              trim: true,
              default: '',
            },
            price: {
              type: Number,
              required: false,
              default: 0,
              min: [0, 'Option price cannot be negative'],
            },
            priceType: {
              type: String,
              enum: ['fixed', 'percentage'],
              default: 'fixed',
            },
            percentage: {
              type: Number,
              required: false,
              min: [0, 'Percentage cannot be negative'],
              max: [100, 'Percentage cannot exceed 100'],
            },
            isPercentageIncrease: {
              type: Boolean,
              default: true,
            },
            isSelected: {
              type: Boolean,
              default: false,
            },
            image: {
              type: String,
              required: false,
              trim: true,
              default: '',
            },
          },
        ],
        enableCustomNote: {
          type: Boolean,
          default: false,
        },
        customNotePlaceholder: {
          type: String,
          default: 'Specify Rod Ends preference (All left, All right, mixed, or custom).',
          trim: true,
        },
      },
    ],
    // this twoo field is based on the client pricing instruction 20% increase and 15% discount
    updatedPrice: {
      type: Number,
      default: 0,
    },
    finalPriceDiscount: {
      type: Number,
      default: 0,
    },
    // SEO metadata fields
    seo: {
      metaTitle: {
        type: String,
        trim: true,
      },
      metaDescription: {
        type: String,
        trim: true,
      },
      metaKeywords: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
productsSchema.index({ createdAt: -1 }); // Index for sorting by creation date
productsSchema.index({ skuArrangementOrderNo: 1 }); // Index for default sorting
productsSchema.index({ title: 1 }); // Index for title searches
productsSchema.index({ sku: 1 }); // Index for SKU searches
productsSchema.index({ status: 1, createdAt: -1 }); // Compound index for status filtering and sorting
productsSchema.index({ 'category.name': 1 }); // Index for category searches
productsSchema.index({ reviews: 1 }); // Index for reviews queries
productsSchema.index({ updatedAt: -1 }); // Index for last updated sorting

const Products = mongoose.model('Products', productsSchema);

export default Products;
