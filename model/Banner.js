import mongoose from 'mongoose';
import validator from 'validator';

const bannerSchema = mongoose.Schema(
  {
    desktopImg: {
      type: String,
      required: [true, 'Desktop image is required'],
      validate: [validator.isURL, 'Please provide a valid desktop image URL'],
    },
    mobileImg: {
      type: String,
      required: [true, 'Mobile image is required'],
      validate: [validator.isURL, 'Please provide a valid mobile image URL'],
    },
    heading: {
      type: String,
      required: [true, 'Heading is required'],
      trim: true,
      maxLength: [100, 'Heading cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxLength: [500, 'Description cannot exceed 500 characters'],
    },
    smallSubDescription: {
      type: String,
      trim: true,
      maxLength: [200, 'Small sub-description cannot exceed 200 characters'],
    },
    cta: {
      text: {
        type: String,
        required: [true, 'CTA text is required'],
        trim: true,
        maxLength: [50, 'CTA text cannot exceed 50 characters'],
      },
      link: {
        type: String,
        required: [true, 'CTA link is required'],
        trim: true,
      },
    },
    includeCaption: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for sorting
bannerSchema.index({ order: 1, createdAt: -1 });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;

