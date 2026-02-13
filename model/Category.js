import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const imageWithMetaSchema = mongoose.Schema(
  {
    url: { type: String, required: true },
    fileName: { type: String, default: '' },
    title: { type: String, default: '' },
    altText: { type: String, default: '' },
    link: { type: String, default: null },
  },
  { _id: false }
);

const CategorySchema = mongoose.Schema(
  {
    img: {
      type: String,
      required: false,
    },
    /** Image with metadata (fileName, title, altText) – preferred over img */
    image: {
      type: imageWithMetaSchema,
      required: false,
    },
    parent: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    children: [{ type: String }],
    description: {
      type: String,
      required: false,
    },
    products: [
      {
        type: ObjectId,
        ref: 'Products',
      },
    ],
    status: {
      type: String,
      enum: ['Show', 'Hide'],
      default: 'Show',
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
CategorySchema.index({ createdAt: -1 }); // Index for sorting by creation date
CategorySchema.index({ parent: 1 }); // Index for parent name searches
CategorySchema.index({ status: 1, createdAt: -1 }); // Compound index for status filtering and sorting

const Category = mongoose.model('Category', CategorySchema);
export default Category;
