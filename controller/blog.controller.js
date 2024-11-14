const Brand = require('../model/Brand');
const blogServices = require('../services/blog.service');
const Blog = require('../model/Blogs');

// add blog
exports.addBlog = async (req, res, next) => {
  console.log('blog--->', req.body);
  try {
    //
    const firstItem = {
      color: {
        name: '',
        clrCode: '',
      },
      img: req.body.img,
    };
    const imageURLs = [firstItem];
    const result = await blogServices.createBlogService({
      ...req.body,
      imageURLs: imageURLs,
    });

    console.log('blog-result', result);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Blogs created successfully!',
      data: result,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// add all blog
module.exports.addAllBlogs = async (req, res, next) => {
  try {
    const result = await blogServices.addAllBlogService(req.body);
    res.json({
      message: 'Blogs added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get all blogs
exports.getAllBlogs = async (req, res, next) => {
  try {
    const result = await blogServices.getAllBlogsService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get all blogs by type
module.exports.getBlogsByType = async (req, res, next) => {
  try {
    const result = await blogServices.getBlogTypeService(req);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get offer blog controller
module.exports.getOfferTimerBlogs = async (req, res, next) => {
  try {
    const result = await blogServices.getOfferTimerBlogService(req.query.type);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get Popular Blog By Type
module.exports.getPopularBlogByType = async (req, res, next) => {
  try {
    const result = await blogServices.getPopularBlogServiceByType(
      req.params.type
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get top rated Blogs
module.exports.getTopRatedBlogs = async (req, res, next) => {
  try {
    const result = await blogServices.getTopRatedBlogService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// getSingleBlog
exports.getSingleBlog = async (req, res, next) => {
  try {
    const blog = await blogServices.getBlogService(req.params.id);
    res.json(blog);
  } catch (error) {
    next(error);
  }
};

// get Related Blog
exports.getRelatedBlogs = async (req, res, next) => {
  try {
    const blogs = await blogServices.getRelatedBlogService(req.params.id);
    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    next(error);
  }
};

// update blog
exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await blogServices.updateBlogService(req.params.id, req.body);
    res.send({ data: blog, message: 'Blog updated successfully!' });
  } catch (error) {
    next(error);
  }
};

// update blog
exports.reviewBlogs = async (req, res, next) => {
  try {
    const blogs = await blogServices.getReviewsBlogs();
    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    next(error);
  }
};

// update blog
exports.stockOutBlogs = async (req, res, next) => {
  try {
    const blogs = await blogServices.getStockOutBlogs();
    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    next(error);
  }
};

// update blog
exports.deleteBlog = async (req, res, next) => {
  try {
    await blogServices.deleteBlog(req.params.id);
    res.status(200).json({
      message: 'Blog delete successfully',
    });
  } catch (error) {
    next(error);
  }
};
