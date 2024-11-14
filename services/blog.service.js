const Brand = require('../model/Brand');
const BlogCategory = require('../model/BlogCategory');
const Blog = require('../model/Blogs');

// create blog service
exports.createBlogService = async data => {
  const blog = await Blog.create(data);
  const { _id: blogId, category } = blog;

  //Category Brand
  await BlogCategory.updateOne(
    { _id: category.id },
    { $push: { blogs: blogId } }
  );
  return blog;
};

// create all blog service
exports.addAllBlogService = async data => {
  await Blog.deleteMany();
  const blogs = await Blog.insertMany(data);
  for (const blog of blogs) {
    await Brand.findByIdAndUpdate(blog.brand.id, {
      $push: { blogs: blog._id },
    });
    await Category.findByIdAndUpdate(blog.category.id, {
      $push: { blogs: blog._id },
    });
  }
  return blogs;
};

// get blog data
exports.getAllBlogsService = async () => {
  const blogs = await Blog.find({}).populate('reviews');
  return blogs;
};

// get type of blog service
exports.getBlogTypeService = async req => {
  const type = req.params.type;
  const query = req.query;
  let blogs;
  if (query.new === 'true') {
    blogs = await Blog.find({ blogType: type })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('reviews');
  } else if (query.featured === 'true') {
    blogs = await Blog.find({
      blogType: type,
      featured: true,
    }).populate('reviews');
  } else if (query.topSellers === 'true') {
    blogs = await Blog.find({ blogType: type })
      .sort({ sellCount: -1 })
      .limit(8)
      .populate('reviews');
  } else {
    blogs = await Blog.find({ blogType: type }).populate('reviews');
  }
  return blogs;
};

// get offer blog service
exports.getOfferTimerBlogService = async query => {
  const blogs = await Blog.find({
    blogType: query,
    'offerDate.endDate': { $gt: new Date() },
  }).populate('reviews');
  return blogs;
};

// get popular blog service by type
exports.getPopularBlogServiceByType = async type => {
  const blogs = await Blog.find({ blogType: type })
    .sort({ 'reviews.length': -1 })
    .limit(8)
    .populate('reviews');
  return blogs;
};

exports.getTopRatedBlogService = async () => {
  const blogs = await Blog.find({
    reviews: { $exists: true, $ne: [] },
  }).populate('reviews');

  const topRatedBlogs = blogs.map(blog => {
    const totalRating = blog.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / blog.reviews.length;

    return {
      ...blog.toObject(),
      rating: averageRating,
    };
  });

  topRatedBlogs.sort((a, b) => b.rating - a.rating);

  return topRatedBlogs;
};

// get blog data
exports.getBlogService = async id => {
  const blog = await Blog.findById(id).populate({
    path: 'reviews',
    populate: { path: 'userId', select: 'name email imageURL' },
  });
  return blog;
};

// get blog data
exports.getRelatedBlogService = async blogId => {
  const currentBlog = await Blog.findById(blogId);

  const relatedBlogs = await Blog.find({
    'category.name': currentBlog.category.name,
    _id: { $ne: blogId }, // Exclude the current blog ID
  });
  return relatedBlogs;
};

// update a blog
exports.updateBlogService = async (id, currBlog) => {
  // console.log('currBlog',currBlog)
  const blog = await Blog.findById(id);
  if (blog) {
    blog.title = currBlog.title;

    blog.category.name = currBlog.category.name;
    blog.category.id = currBlog.category.id;

    blog.img = currBlog.img;
    blog.slug = currBlog.slug;

    // blog.imageURLs = currBlog.imageURLs;
    blog.tags = currBlog.tags;
    blog.parent = currBlog.parent;

    blog.status = currBlog.status;

    blog.description = currBlog.description;
    blog.additionalInformation = currBlog.additionalInformation;

    await blog.save();
  }

  return blog;
};

// get Reviews Blogs
exports.getReviewsBlogs = async () => {
  const result = await Blog.find({
    reviews: { $exists: true, $ne: [] },
  }).populate({
    path: 'reviews',
    populate: { path: 'userId', select: 'name email imageURL' },
  });

  const blogs = result.filter(p => p.reviews.length > 0);

  return blogs;
};

// get Reviews Blogs
exports.getStockOutBlogs = async () => {
  const result = await Blog.find({ status: 'out-of-stock' }).sort({
    createdAt: -1,
  });
  return result;
};

// get Reviews Blogs
exports.deleteBlog = async id => {
  const result = await Blog.findByIdAndDelete(id);
  return result;
};
