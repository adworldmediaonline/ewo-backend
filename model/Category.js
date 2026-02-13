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
    /** Category banner for shop page – same structure as image */
    banner: {
      type: imageWithMetaSchema,
      required: false,
    },
    /**
     * Banner display scope: 'all' (default) | 'parent_only' | 'children_only' | 'parent_and_children'
     * - all: banner shows for parent and all children
     * - parent_only: banner shows only when parent category is selected (no subcategory)
     * - children_only: banner shows only for selected children (bannerDisplayChildren)
     * - parent_and_children: banner shows for parent and selected children
     */
    bannerDisplayScope: {
      type: String,
      enum: ['all', 'parent_only', 'children_only', 'parent_and_children'],
      default: 'all',
    },
    /** Child slugs where banner should display when scope is children_only or parent_and_children */
    bannerDisplayChildren: [{ type: String }],
    /** When true, show bannerTitle above and bannerDescription below the banner image */
    bannerContentActive: { type: Boolean, default: false },
    /**
     * Banner content display scope: where title/description are visible
     * Same options as bannerDisplayScope
     */
    bannerContentDisplayScope: {
      type: String,
      enum: ['all', 'parent_only', 'children_only', 'parent_and_children'],
      default: 'all',
    },
    /** Child slugs where banner content shows when scope is children_only or parent_and_children */
    bannerContentDisplayChildren: [{ type: String }],
    /** Banner title (e.g. auto-filled: "Category Name (24 products)") */
    bannerTitle: { type: String, default: '' },
    /** Banner description (manual) */
    bannerDescription: { type: String, default: '' },
    /** Custom Tailwind classes for banner title (default fallback when no scope override) */
    bannerTitleClasses: { type: String, default: 'text-center' },
    /** Custom Tailwind classes for banner description (default fallback when no scope override) */
    bannerDescriptionClasses: { type: String, default: 'text-center' },
    /**
     * Per-scope Tailwind classes: parent and children can have different styling.
     * Structure: { parent?: { titleClasses?, descriptionClasses? }, children?: { [childSlug]: { titleClasses?, descriptionClasses? } } }
     */
    bannerContentClassesByScope: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ parent: null, children: {} }),
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
