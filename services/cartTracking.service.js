const CartTracking = require('../model/CartTracking');
const User = require('../model/User');
const Product = require('../model/Product');

class CartTrackingService {
  /**
   * Track add to cart event
   * @param {Object} trackingData - The tracking data
   * @returns {Promise<Object>} - Created tracking record
   */
  static async trackAddToCart(trackingData) {
    try {
      // Validate required fields
      if (!trackingData.productId || !trackingData.sessionId) {
        throw new Error('Product ID and Session ID are required');
      }

      // Get product details for enrichment
      const product = await Product.findById(trackingData.productId)
        .select('title sku category brand price shipping status')
        .lean();

      if (!product) {
        throw new Error('Product not found');
      }

      // Get user details if userId provided
      let userDetails = null;
      if (trackingData.userId) {
        userDetails = await User.findById(trackingData.userId)
          .select('email createdAt orderHistory')
          .lean();
      }

      // Detect if first time user
      const isFirstTimeUser = await this.detectFirstTimeUser(
        trackingData.sessionId,
        trackingData.userEmail,
        trackingData.userId
      );

      // Detect returning customer
      const isReturningCustomer = userDetails
        ? await this.detectReturningCustomer(trackingData.userId)
        : false;

      // Parse device information
      const deviceInfo = this.parseDeviceInfo(trackingData.userAgent);

      // Create enriched tracking data
      const enrichedData = {
        // User Information
        userId: trackingData.userId || null,
        sessionId: trackingData.sessionId,
        userEmail: trackingData.userEmail || userDetails?.email,

        // Product Information
        productId: product._id,
        productTitle: product.title,
        productSku: product.sku,
        productCategory: product.category?.name || 'Unknown',
        productBrand: product.brand,

        // Pricing Information
        originalPrice: trackingData.originalPrice || product.price,
        markedUpPrice: trackingData.markedUpPrice || product.price * 1.2,
        finalPrice: trackingData.finalPrice || product.price,
        discountPercentage: trackingData.discountPercentage || 0,

        // Cart Context
        quantity: trackingData.quantity || 1,
        selectedOption: trackingData.selectedOption,
        cartItemsCount: trackingData.cartItemsCount || 0,
        cartTotalValue: trackingData.cartTotalValue || 0,

        // User Behavior
        timeOnProductPage: trackingData.timeOnProductPage,
        source: trackingData.source || 'product-page',
        referrer: trackingData.referrer,

        // Technical Information
        device: {
          type: deviceInfo.type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          screenResolution: trackingData.screenResolution,
        },
        location: trackingData.location || {},
        ipAddress: this.anonymizeIP(trackingData.ipAddress),

        // Conversion Tracking
        isFirstTimeUser,
        isReturningCustomer,
        previousPurchases: userDetails?.orderHistory?.length || 0,

        // A/B Testing
        experiments: trackingData.experiments || [],

        // Event Type
        eventType: 'add_to_cart',
        conversionPath: trackingData.conversionPath || ['add_to_cart'],

        // Campaign Information
        campaignSource: trackingData.campaignSource,
        campaignMedium: trackingData.campaignMedium,
        campaignName: trackingData.campaignName,
        utmParams: trackingData.utmParams || {},
      };

      // Save tracking record
      const trackingRecord = new CartTracking(enrichedData);
      await trackingRecord.save();

      // Fire and forget analytics processing
      this.processAnalyticsAsync(trackingRecord._id).catch(console.error);

      return {
        success: true,
        data: trackingRecord,
        message: 'Cart tracking recorded successfully',
      };
    } catch (error) {
      console.error('Error tracking add to cart:', error);
      throw error;
    }
  }

  /**
   * Track multiple cart events (bulk tracking)
   * @param {Array} trackingDataArray - Array of tracking data
   * @returns {Promise<Object>} - Bulk insert result
   */
  static async bulkTrackEvents(trackingDataArray) {
    try {
      if (!Array.isArray(trackingDataArray) || trackingDataArray.length === 0) {
        throw new Error('Invalid tracking data array');
      }

      const enrichedDataArray = [];

      for (const trackingData of trackingDataArray) {
        try {
          const enrichedData = await this.enrichTrackingData(trackingData);
          enrichedDataArray.push(enrichedData);
        } catch (error) {
          console.error('Error enriching tracking data:', error);
          // Continue with other records
        }
      }

      if (enrichedDataArray.length === 0) {
        throw new Error('No valid tracking data to insert');
      }

      const result = await CartTracking.insertMany(enrichedDataArray, {
        ordered: false, // Continue on error
      });

      return {
        success: true,
        data: result,
        message: `${result.length} tracking records created successfully`,
      };
    } catch (error) {
      console.error('Error bulk tracking events:', error);
      throw error;
    }
  }

  /**
   * Get cart analytics
   * @param {Object} filters - Analytics filters
   * @returns {Promise<Object>} - Analytics data
   */
  static async getCartAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        productId,
        userId,
        source,
        deviceType,
        limit = 100,
      } = filters;

      // Build match conditions
      const matchCondition = {
        createdAt: { $gte: startDate, $lte: endDate },
        eventType: 'add_to_cart',
      };

      if (productId) matchCondition.productId = productId;
      if (userId) matchCondition.userId = userId;
      if (source) matchCondition.source = source;
      if (deviceType) matchCondition['device.type'] = deviceType;

      // Get basic analytics
      const [
        totalEvents,
        uniqueUsers,
        topProducts,
        sourceBreakdown,
        deviceBreakdown,
        hourlyBreakdown,
      ] = await Promise.all([
        this.getTotalEvents(matchCondition),
        this.getUniqueUsers(matchCondition),
        this.getTopProducts(matchCondition, limit),
        this.getSourceBreakdown(matchCondition),
        this.getDeviceBreakdown(matchCondition),
        this.getHourlyBreakdown(matchCondition),
      ]);

      return {
        success: true,
        data: {
          totalEvents,
          uniqueUsers,
          topProducts,
          sourceBreakdown,
          deviceBreakdown,
          hourlyBreakdown,
          dateRange: { startDate, endDate },
        },
      };
    } catch (error) {
      console.error('Error getting cart analytics:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel analytics
   * @param {Object} filters - Analytics filters
   * @returns {Promise<Object>} - Funnel data
   */
  static async getConversionFunnel(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
      } = filters;

      const funnelData = await CartTracking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$sessionId' },
          },
        },
        {
          $project: {
            eventType: '$_id',
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        {
          $sort: { eventType: 1 },
        },
      ]);

      // Calculate conversion rates
      const addToCartEvents = funnelData.find(
        d => d.eventType === 'add_to_cart'
      );
      const purchaseEvents = funnelData.find(
        d => d.eventType === 'purchase_completed'
      );

      const conversionRate =
        addToCartEvents && purchaseEvents
          ? ((purchaseEvents.count / addToCartEvents.count) * 100).toFixed(2)
          : 0;

      return {
        success: true,
        data: {
          funnelData,
          conversionRate: parseFloat(conversionRate),
          dateRange: { startDate, endDate },
        },
      };
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Detect if user is first time
   */
  static async detectFirstTimeUser(sessionId, userEmail, userId) {
    try {
      const query = {
        $or: [
          { sessionId },
          ...(userEmail ? [{ userEmail }] : []),
          ...(userId ? [{ userId }] : []),
        ],
      };

      const existingRecord = await CartTracking.findOne(query)
        .select('_id')
        .lean();

      return !existingRecord;
    } catch (error) {
      console.error('Error detecting first time user:', error);
      return false;
    }
  }

  /**
   * Detect if user is returning customer
   */
  static async detectReturningCustomer(userId) {
    try {
      if (!userId) return false;

      const user = await User.findById(userId).select('orderHistory').lean();

      return user && user.orderHistory && user.orderHistory.length > 0;
    } catch (error) {
      console.error('Error detecting returning customer:', error);
      return false;
    }
  }

  /**
   * Parse device information from user agent
   */
  static parseDeviceInfo(userAgent) {
    if (!userAgent) {
      return { type: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    let type = 'desktop';
    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      type = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      type = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (ua.includes('chrome')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari')) browser = 'safari';
    else if (ua.includes('edge')) browser = 'edge';
    else if (ua.includes('opera')) browser = 'opera';

    // Detect OS
    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
      os = 'ios';

    return { type, browser, os };
  }

  /**
   * Anonymize IP address for privacy
   */
  static anonymizeIP(ipAddress) {
    if (!ipAddress) return null;

    // For IPv4, mask last octet
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }

    // For IPv6, mask last 64 bits
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      return parts.slice(0, 4).join(':') + '::xxxx';
    }

    return 'anonymized';
  }

  /**
   * Process analytics asynchronously
   */
  static async processAnalyticsAsync(trackingId) {
    try {
      // Mark as processed after any background analytics processing
      await CartTracking.findByIdAndUpdate(trackingId, {
        isProcessed: true,
      });
    } catch (error) {
      console.error('Error processing analytics:', error);

      // Log processing error
      await CartTracking.findByIdAndUpdate(trackingId, {
        $push: { processingErrors: error.message },
      });
    }
  }

  /**
   * Enrich tracking data with additional information
   */
  static async enrichTrackingData(trackingData) {
    // This is a simplified version of trackAddToCart logic
    // for bulk operations where we want minimal enrichment
    const product = await Product.findById(trackingData.productId)
      .select('title sku category brand price')
      .lean();

    if (!product) {
      throw new Error(`Product not found: ${trackingData.productId}`);
    }

    return {
      ...trackingData,
      productTitle: product.title,
      productSku: product.sku,
      productCategory: product.category,
      productBrand: product.brand,
      originalPrice: trackingData.originalPrice || product.price,
      device: this.parseDeviceInfo(trackingData.userAgent),
      ipAddress: this.anonymizeIP(trackingData.ipAddress),
    };
  }

  // Analytics helper methods
  static async getTotalEvents(matchCondition) {
    return await CartTracking.countDocuments(matchCondition);
  }

  static async getUniqueUsers(matchCondition) {
    const result = await CartTracking.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, uniqueUsers: { $addToSet: '$sessionId' } } },
      { $project: { count: { $size: '$uniqueUsers' } } },
    ]);
    return result[0]?.count || 0;
  }

  static async getTopProducts(matchCondition, limit) {
    return await CartTracking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$productId',
          productTitle: { $first: '$productTitle' },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$finalPrice' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  static async getSourceBreakdown(matchCondition) {
    return await CartTracking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          percentage: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  static async getDeviceBreakdown(matchCondition) {
    return await CartTracking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$device.type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  static async getHourlyBreakdown(matchCondition) {
    return await CartTracking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  // Additional helper methods for controller
  static async getSessionRecords(sessionId, limit, skip) {
    return await CartTracking.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  static async getSessionRecordsCount(sessionId) {
    return await CartTracking.countDocuments({ sessionId });
  }

  static async getUserRecords(filters, limit, skip) {
    return await CartTracking.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  static async getUserRecordsCount(filters) {
    return await CartTracking.countDocuments(filters);
  }

  static async getTopProductsDetailed(filters) {
    const { limit, startDate, endDate, category, brand } = filters;

    const matchCondition = {
      eventType: 'add_to_cart',
      ...(startDate &&
        endDate && { createdAt: { $gte: startDate, $lte: endDate } }),
      ...(category && { productCategory: category }),
      ...(brand && { productBrand: brand }),
    };

    return await CartTracking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$productId',
          productTitle: { $first: '$productTitle' },
          productSku: { $first: '$productSku' },
          productCategory: { $first: '$productCategory' },
          productBrand: { $first: '$productBrand' },
          totalAdds: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$finalPrice' },
          uniqueUsers: { $addToSet: '$sessionId' },
          firstAdded: { $min: '$createdAt' },
          lastAdded: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          productTitle: 1,
          productSku: 1,
          productCategory: 1,
          productBrand: 1,
          totalAdds: 1,
          totalQuantity: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          uniqueUsers: { $size: '$uniqueUsers' },
          firstAdded: 1,
          lastAdded: 1,
        },
      },
      { $sort: { totalAdds: -1 } },
      { $limit: limit },
    ]);
  }

  static async getLatestRecord() {
    return await CartTracking.findOne()
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();
  }
}

module.exports = CartTrackingService;
