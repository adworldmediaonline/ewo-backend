const express = require('express');
const router = express.Router();
// internal
const blogController = require('../controller/blog.controller');

// add a blog
router.post('/add', blogController.addBlog);
// add all blog
router.post('/add-all', blogController.addAllBlogs);
// get all blogs
router.get('/all', blogController.getAllBlogs);
// get offer timer blog
router.get('/offer', blogController.getOfferTimerBlogs);
// top rated blogs
router.get('/top-rated', blogController.getTopRatedBlogs);
// reviews blogs
router.get('/review-blog', blogController.reviewBlogs);
// get popular blogs by type
router.get('/popular/:type', blogController.getPopularBlogByType);
// get Related Blogs
router.get('/related-blog/:id', blogController.getRelatedBlogs);
// get Single Blog
router.get('/single-blog/:id', blogController.getSingleBlog);
// stock Blog
router.get('/stock-out', blogController.stockOutBlogs);
// get Single Blog
router.patch('/edit-blog/:id', blogController.updateBlog);
// get Blogs ByType
router.get('/:type', blogController.getBlogsByType);
// get Blogs ByType
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
