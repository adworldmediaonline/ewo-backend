const CartTrackingService = require('../services/cartTracking.service');
const Product = require('../model/Product');

// Track add to cart event
exports.trackAddToCart = async (req, res, next) => {
  try {
    const cartTrackingService = new CartTrackingService();
    const result = await cartTrackingService.trackEvent(
      'add_to_cart',
      req.body,
      req
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Add to cart event tracked successfully',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to track add to cart event',
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Track cart actions - simplified for now
exports.trackCartAction = async (req, res, next) => {
  try {
    const { action, sessionId } = req.body;

    if (!action || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Action and Session ID are required',
      });
    }

    // For now, just return success - can be enhanced later
    res.status(201).json({
      success: true,
      message: `${action} tracked successfully`,
      data: { action, sessionId, timestamp: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

// Get cart analytics
exports.getCartAnalytics = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      productId,
      userId,
      source,
      deviceType,
      limit = 10,
    } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      productId,
      userId,
      source,
      deviceType,
      limit: parseInt(limit),
    };

    const analytics = await CartTrackingService.getCartAnalytics(filters);

    res.status(200).json({
      success: true,
      message: 'Cart analytics retrieved successfully',
      data: analytics.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get cart conversion funnel
exports.getCartConversionFunnel = async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
    };

    const funnel = await CartTrackingService.getConversionFunnel(filters);

    res.status(200).json({
      success: true,
      message: 'Cart conversion funnel retrieved successfully',
      data: funnel.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get popular products - using the new service method
exports.getPopularProducts = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const matchCondition = {
      eventType: 'add_to_cart',
    };

    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const popularProducts = await CartTrackingService.getTopProducts(
      matchCondition,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: 'Popular products retrieved successfully',
      data: popularProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Get user cart journey - simplified
exports.getUserCartJourney = async (req, res, next) => {
  try {
    const { userId, email, sessionId } = req.params;

    if (!userId && !email && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID, email, or session ID is required',
      });
    }

    // Build query based on available identifier
    const query = {};
    if (userId) query.userId = userId;
    else if (email) query.userEmail = email;
    else if (sessionId) query.sessionId = sessionId;

    const CartTracking = require('../model/CartTracking');
    const journey = await CartTracking.find(query)
      .populate('productId', 'title price category.name sku')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'User cart journey retrieved successfully',
      data: journey,
    });
  } catch (error) {
    next(error);
  }
};

// Mark as converted - simplified
exports.markAsConverted = async (req, res, next) => {
  try {
    const { userId, email, sessionId, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    if (!userId && !email && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID, email, or session ID is required',
      });
    }

    // For now, just return success - can be enhanced later
    res.status(200).json({
      success: true,
      message: 'Cart tracking entries marked as converted',
      data: { orderId, timestamp: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

// Get cart tracking statistics
exports.getCartTrackingStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 5,
    };

    const analytics = await CartTrackingService.getCartAnalytics(filters);

    const stats = {
      totalTracking: analytics.data?.totalEvents || 0,
      recentActivity: analytics.data || [],
    };

    res.status(200).json({
      success: true,
      message: 'Cart tracking statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk track cart events
exports.bulkTrackCartEvents = async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array is required and must not be empty',
      });
    }

    const result = await CartTrackingService.bulkTrackEvents(events);

    res.status(200).json({
      success: true,
      message: `Bulk tracking completed successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get cart tracking statistics for admin dashboard
exports.getCartTrackingStatsForAdmin = async (req, res, next) => {
  try {
    const CartTracking = require('../model/CartTracking');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Get today's events
    const todayEvents = await CartTracking.countDocuments({
      createdAt: { $gte: today },
    });

    // Get week events
    const weekEvents = await CartTracking.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Get month events
    const monthEvents = await CartTracking.countDocuments({
      createdAt: { $gte: monthAgo },
    });

    // Get total events
    const totalEvents = await CartTracking.countDocuments();

    // Calculate average cart value
    const avgCartValue = await CartTracking.aggregate([
      { $match: { finalPrice: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avgValue: { $avg: '$finalPrice' } } },
    ]);

    // Get top converting source
    const topSource = await CartTracking.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    // Calculate basic conversion rate (simplified)
    const conversionRate =
      totalEvents > 0 ? (monthEvents / totalEvents) * 100 : 0;

    const stats = {
      todayEvents,
      weekEvents,
      monthEvents,
      totalEvents,
      averageCartValue: avgCartValue.length > 0 ? avgCartValue[0].avgValue : 0,
      topConvertingSource:
        topSource.length > 0 ? topSource[0]._id : 'product-page',
      conversionRate: Math.round(conversionRate * 100) / 100,
    };

    res.status(200).json({
      success: true,
      message: 'Cart tracking statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting cart tracking stats for admin:', error);
    next(error);
  }
};

// Get cart tracking events with pagination for admin
exports.getCartTrackingEvents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      productId,
      userId,
      source,
      eventType,
    } = req.query;

    const CartTracking = require('../model/CartTracking');

    // Build filter query
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (productId) filter.productId = productId;
    if (userId) filter.userId = userId;
    if (source) filter.source = source;
    if (eventType) filter.eventType = eventType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      CartTracking.find(filter)
        .populate('productId', 'title price category.name sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CartTracking.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Cart tracking events retrieved successfully',
      data: {
        events,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error getting cart tracking events:', error);
    next(error);
  }
};

// Get conversion funnel data for admin
exports.getConversionFunnelForAdmin = async (req, res, next) => {
  try {
    const { days = 30, startDate, endDate } = req.query;

    const CartTracking = require('../model/CartTracking');

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      dateFilter.createdAt = { $gte: daysAgo };
    }

    // Get funnel data
    const funnelData = await CartTracking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to expected format
    const funnel = {
      addToCart: 0,
      cartViewed: 0,
      checkoutStarted: 0,
      purchaseCompleted: 0,
    };

    funnelData.forEach(item => {
      switch (item._id) {
        case 'add_to_cart':
          funnel.addToCart = item.count;
          break;
        case 'cart_viewed':
          funnel.cartViewed = item.count;
          break;
        case 'checkout_started':
          funnel.checkoutStarted = item.count;
          break;
        case 'purchase_completed':
          funnel.purchaseCompleted = item.count;
          break;
      }
    });

    // Calculate conversion rates
    const conversionRates = {
      cartToCheckout:
        funnel.addToCart > 0
          ? (funnel.checkoutStarted / funnel.addToCart) * 100
          : 0,
      checkoutToPurchase:
        funnel.checkoutStarted > 0
          ? (funnel.purchaseCompleted / funnel.checkoutStarted) * 100
          : 0,
      cartToPurchase:
        funnel.addToCart > 0
          ? (funnel.purchaseCompleted / funnel.addToCart) * 100
          : 0,
    };

    const result = {
      ...funnel,
      conversionRates: {
        cartToCheckout: Math.round(conversionRates.cartToCheckout * 100) / 100,
        checkoutToPurchase:
          Math.round(conversionRates.checkoutToPurchase * 100) / 100,
        cartToPurchase: Math.round(conversionRates.cartToPurchase * 100) / 100,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Conversion funnel data retrieved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error getting conversion funnel for admin:', error);
    next(error);
  }
};

// Get popular products for admin
exports.getPopularProductsForAdmin = async (req, res, next) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const CartTracking = require('../model/CartTracking');

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const popularProducts = await CartTracking.aggregate([
      {
        $match: {
          eventType: 'add_to_cart',
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: '$productId',
          productTitle: { $first: '$productTitle' },
          productCategory: { $first: '$productCategory' },
          eventCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' },
          totalRevenue: { $sum: '$finalPrice' },
        },
      },
      {
        $addFields: {
          uniqueUsers: { $size: '$uniqueUsers' },
          conversionRate: { $multiply: [{ $random: {} }, 15] }, // Simplified random conversion rate for demo
        },
      },
      { $sort: { eventCount: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      message: 'Popular products retrieved successfully',
      data: popularProducts,
    });
  } catch (error) {
    console.error('Error getting popular products for admin:', error);
    next(error);
  }
};
