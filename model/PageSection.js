import mongoose from 'mongoose';

const imageWithMetaSchema = mongoose.Schema(
  {
    url: { type: String, required: true },
    fileName: { type: String, default: '' },
    title: { type: String, default: '' },
    altText: { type: String, default: '' },
  },
  { _id: false }
);

const pageSectionSchema = mongoose.Schema(
  {
    pageSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sectionKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sectionType: {
      type: String,
      required: true,
      enum: ['hero', 'category_showcase', 'text_block', 'features', 'cta', 'gallery', 'custom'],
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    order: {
      type: Number,
      default: 0,
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

pageSectionSchema.index({ pageSlug: 1, sectionKey: 1 }, { unique: true });
pageSectionSchema.index({ pageSlug: 1, order: 1 });

const PageSection = mongoose.model('PageSection', pageSectionSchema);

export default PageSection;
