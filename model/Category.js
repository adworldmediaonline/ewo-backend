import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const CategorySchema = mongoose.Schema(
  {
    img: {
      type: String,
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

const Category = mongoose.model('Category', CategorySchema);
export default Category;
