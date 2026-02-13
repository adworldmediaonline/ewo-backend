const Product = require('../model/Product');
const ApiError = require('../errors/api-error');

class ProductSearchService {
  constructor() {
    // Default pagination values
    this.DEFAULT_PAGE = 1;
    this.DEFAULT_LIMIT = 10;
    this.MAX_LIMIT = 50;
  }

  /**
   * Build search query based on provided filters
   */
  buildSearchQuery(filters = {}) {
    const query = {};

    // Text search - already case insensitive by default with $text
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // SKU search - case insensitive
    if (filters.sku) {
      query.sku = { $regex: new RegExp('^' + filters.sku.trim() + '$', 'i') };
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    // Category - case-insensitive parent and children
    if (filters.parent) {
      query.parent = {
        $regex: new RegExp('^' + filters.parent.trim() + '$', 'i'),
      };
    }
    if (filters.children) {
      query.children = {
        $regex: new RegExp('^' + filters.children.trim() + '$', 'i'),
      };
    }

    // Status - case insensitive
    if (filters.status) {
      const statusValue = filters.status.trim().toLowerCase();
      // Ensure status matches exact values
      if (['in-stock', 'out-of-stock', 'discontinued'].includes(statusValue)) {
        query.status = statusValue;
      }
    }

    // Tags - case insensitive
    if (filters.tags) {
      const tagArray = Array.isArray(filters.tags)
        ? filters.tags
        : [filters.tags];
      query.tags = {
        $in: tagArray.map(tag => new RegExp('^' + tag.trim() + '$', 'i')),
      };
    }

    // Rating
    if (filters.minRating) {
      query.rating = { $gte: Number(filters.minRating) };
    }

    // Featured/Trending - convert string to boolean
    if (filters.featured) {
      query.featured = String(filters.featured).toLowerCase() === 'true';
    }
    if (filters.trending) {
      query.trending = String(filters.trending).toLowerCase() === 'true';
    }

    // In stock only - convert string to boolean
    if (filters.inStock) {
      if (String(filters.inStock).toLowerCase() === 'true') {
        query.status = 'in-stock';
        query.quantity = { $gt: 0 };
      }
    }

    // On sale - convert string to boolean
    if (filters.onSale) {
      if (String(filters.onSale).toLowerCase() === 'true') {
        const now = new Date();
        query['offerDate.startDate'] = { $lte: now };
        query['offerDate.endDate'] = { $gte: now };
        query.discount = { $gt: 0 };
      }
    }

    return query;
  }

  /**
   * Build sort options based on provided sort parameter
   */
  buildSortOptions(sort = '') {
    const sortOptions = {};

    switch (sort) {
      case 'price_asc':
        sortOptions.price = 1;
        break;
      case 'price_desc':
        sortOptions.price = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'rating':
        sortOptions.rating = -1;
        break;
      case 'relevance':
        if (sort.search) {
          sortOptions.score = { $meta: 'textScore' };
        } else {
          sortOptions.createdAt = -1;
        }
        break;
      default:
        sortOptions.createdAt = -1;
    }

    return sortOptions;
  }

  /**
   * Search products with pagination and filters
   */
  async searchProducts(
    filters = {},
    sort = '',
    page = this.DEFAULT_PAGE,
    limit = this.DEFAULT_LIMIT
  ) {
    try {
      // Validate and sanitize pagination parameters
      page = Math.max(1, parseInt(page));
      limit = Math.min(this.MAX_LIMIT, Math.max(1, parseInt(limit)));
      const skip = (page - 1) * limit;

      // Build query and sort options
      const query = this.buildSearchQuery(filters);
      const sortOptions = this.buildSortOptions(sort);

      // Prepare projection
      const projection = {
        title: 1,
        slug: 1,
        price: 1,
        img: 1,
        image: 1,
        imageURLs: 1,
        imageURLsWithMeta: 1,
        status: 1,
        rating: 1,
        category: 1,
        discount: 1,
        quantity: 1,
      };

      // If text search is used, include score in projection
      if (filters.search) {
        projection.score = { $meta: 'textScore' };
      }

      // Execute search query with pagination
      const [products, total] = await Promise.all([
        Product.find(query, projection)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      };
    } catch (error) {
      throw new ApiError(500, 'Error searching products: ' + error.message);
    }
  }

  /**
   * Get product suggestions based on search term
   */
  async getProductSuggestions(searchTerm, limit = 5) {
    try {
      if (!searchTerm) return [];

      const suggestions = await Product.find(
        {
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { sku: { $regex: searchTerm, $options: 'i' } },
            { 'category.name': { $regex: searchTerm, $options: 'i' } },
          ],
        },
        {
          title: 1,
          slug: 1,
          img: 1,
          price: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return suggestions;
    } catch (error) {
      throw new ApiError(
        500,
        'Error getting product suggestions: ' + error.message
      );
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 8) {
    try {
      const products = await Product.find(
        {
          featured: true,
          status: 'in-stock',
          quantity: { $gt: 0 },
        },
        {
          title: 1,
          slug: 1,
          price: 1,
          img: 1,
          rating: 1,
          discount: 1,
        }
      )
        .sort({ rating: -1 })
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      throw new ApiError(
        500,
        'Error getting featured products: ' + error.message
      );
    }
  }
}

module.exports = new ProductSearchService();
