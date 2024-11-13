const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const BlogCategorySchema = mongoose.Schema(
  {
    parent: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    blogs: [
      {
        type: ObjectId,
        ref: 'Blogs',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const BlogCategory = mongoose.model('BlogCategory', BlogCategorySchema);
module.exports = BlogCategory;
