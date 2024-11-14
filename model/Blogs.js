const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
// schema design
const validator = require('validator');

const blogsSchema = mongoose.Schema(
  {
    img: {
      type: String,
      required: true,
      validate: [validator.isURL, 'Please provide valid url(s)'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a name for this product.'],
      trim: true,
      minLength: [3, 'Name must be at least 3 characters.'],
      maxLength: [200, 'Name is too large'],
    },
    slug: {
      type: String,
      trim: true,
      required: false,
    },

    parent: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      name: {
        type: String,
        required: true,
      },

      id: {
        type: ObjectId,
        ref: 'BlogCategory',
        required: true,
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['draft', 'published'],
        message: "status can't be {VALUE} ",
      },
      default: 'draft',
    },
    // reviews: [{ type: ObjectId, ref: 'Reviews' }],

    description: {
      type: String,
      required: true,
    },

    additionalInformation: [{}],

    tags: [String],

    featured: {
      type: Boolean,
      default: false,
    },

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Blogs = mongoose.model('Blogs', blogsSchema);

module.exports = Blogs;
