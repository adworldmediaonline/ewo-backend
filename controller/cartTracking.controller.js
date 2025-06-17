const CartTrackingService = require('../services/cartTracking.service');

// Track add to cart event
exports.trackAddToCart = async (req, res, next) => {
  try {
    const {
      productId,
      quantity,
      sessionId,
      userId,
      email,
      source,
      pageUrl,
      referrer,
      cartTotalValue,
      cartItemsCount,
      timeOnProductPage,
    } = req.body;

    // Validation
    if (!productId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and Session ID are required',
      });
    }

    // Extract tracking metadata from request
    const trackingData = {
      productId,
      quantity: quantity || 1,
      sessionId,
      userId: userId || null,
      userEmail: email || null,
      source: source || 'product-page',
      referrer: referrer || req.get('Referer'),
      userAgent: req.get('User-Agent'),
      ipAddress:
        req.ip ||
        req.connection.remoteAddress ||
        req.headers['x-forwarded-for'],
      cartTotalValue,
      cartItemsCount,
      timeOnProductPage,
    };

    const trackingResult = await CartTrackingService.trackAddToCart(
      trackingData
    );

    res.status(201).json({
      success: true,
      message: 'Add to cart tracked successfully',
      data: trackingResult,
    });
  } catch (error) {
    console.error('Error tracking add to cart:', error);
    next(error);
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
    console.error('Error tracking cart action:', error);
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
    console.error('Error getting cart analytics:', error);
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
    console.error('Error getting cart conversion funnel:', error);
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
    console.error('Error getting popular products:', error);
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
      .populate('productId', 'title price category brand')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'User cart journey retrieved successfully',
      data: journey,
    });
  } catch (error) {
    console.error('Error getting user cart journey:', error);
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
    console.error('Error marking as converted:', error);
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
    console.error('Error getting cart tracking stats:', error);
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
    console.error('Error in bulk tracking:', error);
    next(error);
  }
};
