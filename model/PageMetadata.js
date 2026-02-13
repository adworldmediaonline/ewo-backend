import mongoose from 'mongoose';
import validator from 'validator';

const pageMetadataSchema = mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, 'Page slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxLength: [100, 'Display name cannot exceed 100 characters'],
    },
    metaTitle: {
      type: String,
      trim: true,
      maxLength: [70, 'Meta title should not exceed 70 characters for optimal SEO'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxLength: [320, 'Meta description should not exceed 320 characters for optimal SEO'],
    },
    metaKeywords: {
      type: String,
      trim: true,
      maxLength: [500, 'Meta keywords cannot exceed 500 characters'],
    },
    canonicalUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return validator.isURL(v, { require_protocol: true });
        },
        message: 'Please provide a valid canonical URL',
      },
    },
    ogImage: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return validator.isURL(v, { require_protocol: true });
        },
        message: 'Please provide a valid OG image URL',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pageMetadataSchema.index({ slug: 1 });

const PageMetadata = mongoose.model('PageMetadata', pageMetadataSchema);

export default PageMetadata;
