const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
// schema design
const validator = require('validator');

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
        default: 0,
        validate: {
          validator: function (value) {
            return value >= 0;
          },
          message: 'Shipping price cannot be negative',
        },
      },
      description: {
        type: String,
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
  },
  {
    timestamps: true,
  }
);

const Products = mongoose.model('Products', productsSchema);

module.exports = Products;
