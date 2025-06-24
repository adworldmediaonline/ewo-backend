const { secret } = require('../config/secret');
const metaService = require('../services/metaConversionsApi.service');

// Track Add to Cart event
exports.trackMetaAddToCart = async (req, res, next) => {
  try {
    const {
      productId,
      productTitle,
      productCategory,
      productBrand,
      quantity,
      price,
      value,
      currency,
      userId,
      userEmail,
      eventId,
      userData,
      productData: requestProductData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Extract product ID from multiple possible sources
    const extractedProductId = productId || requestProductData?.id || requestProductData?.productId;

    // Validation
    if (!extractedProductId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required for Meta Add to Cart tracking'
      });
    }

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare product data
    const productData = {
      productId: extractedProductId,
      id: extractedProductId,
      title: productTitle || requestProductData?.title,
      category: productCategory || requestProductData?.category,
      brand: productBrand || requestProductData?.brand,
      price: parseFloat(price || requestProductData?.price) || 0,
      value: parseFloat(value || requestProductData?.value || price || requestProductData?.price) || 0,
      currency: currency || requestProductData?.currency || 'USD'
    };

    const result = await metaService.sendAddToCart(userDataObj, productData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta Add to Cart event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta Add to Cart event:', error);
    next(error);
  }
};

// Track Purchase event
exports.trackMetaPurchase = async (req, res, next) => {
  try {
    const {
      orderId,
      value,
      currency,
      numItems,
      contents,
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Validation
    if (!orderId || !value) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and value are required for Meta Purchase tracking'
      });
    }

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare order data
    const orderData = {
      orderId,
      value: parseFloat(value),
      total: parseFloat(value),
      currency: currency || 'USD',
      numItems: parseInt(numItems) || 1,
      productIds: contents?.map(item => item.id || item.productId) || []
    };

    const result = await metaService.sendPurchase(userDataObj, orderData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta Purchase event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta Purchase event:', error);
    next(error);
  }
};

// Track View Content event
exports.trackMetaViewContent = async (req, res, next) => {
  try {
    const {
      contentName,
      contentCategory,
      contentIds,
      contentType,
      value,
      currency,
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare content data
    const contentData = {
      contentId: Array.isArray(contentIds) ? contentIds[0] : contentIds,
      id: Array.isArray(contentIds) ? contentIds[0] : contentIds,
      contentType: contentType || 'product',
      name: contentName,
      category: contentCategory,
      value: value ? parseFloat(value) : undefined,
      currency: currency || 'USD'
    };

    const result = await metaService.sendViewContent(userDataObj, contentData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta View Content event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta View Content event:', error);
    next(error);
  }
};

// Track Page View event
exports.trackMetaPageView = async (req, res, next) => {
  try {
    const {
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare page data (empty for page view)
    const pageData = {};

    const result = await metaService.sendPageView(userDataObj, pageData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta Page View event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta Page View event:', error);
    next(error);
  }
};

// Track Initiate Checkout event
exports.trackMetaInitiateCheckout = async (req, res, next) => {
  try {
    const {
      value,
      currency,
      numItems,
      contents,
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Validation
    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Value is required for Meta Initiate Checkout tracking'
      });
    }

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare checkout data
    const checkoutData = {
      value: parseFloat(value),
      total: parseFloat(value),
      currency: currency || 'USD',
      numItems: parseInt(numItems) || 1,
      productIds: contents?.map(item => item.id || item.productId) || []
    };

    const result = await metaService.sendInitiateCheckout(userDataObj, checkoutData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta Initiate Checkout event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta Initiate Checkout event:', error);
    next(error);
  }
};

// Track Lead event
exports.trackMetaLead = async (req, res, next) => {
  try {
    const {
      contentName,
      value,
      currency,
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    // Prepare lead data
    const leadData = {
      contentName,
      value: value ? parseFloat(value) : 0,
      currency: currency || 'USD'
    };

    const result = await metaService.sendLead(userDataObj, leadData, clientInfo);

    res.status(200).json({
      success: true,
      message: 'Meta Lead event tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking Meta Lead event:', error);
    next(error);
  }
};

// Send custom Meta event
exports.trackMetaCustomEvent = async (req, res, next) => {
  try {
    const {
      eventName,
      customData,
      userId,
      userEmail,
      eventId,
      userData,
      eventSourceUrl,
      testEventCode
    } = req.body;

    // Validation
    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required for custom Meta event tracking'
      });
    }

    // Extract client information from request
    const clientInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      eventSourceUrl: eventSourceUrl || req.headers['referer'] || req.headers['origin'] || secret.store_name,
      sessionId: req.sessionID || req.session?.id
    };

    // Prepare user data
    const userDataObj = {
      email: userEmail,
      externalId: userId,
      ...userData
    };

    const result = await metaService.sendEvent(eventName, userDataObj, customData || {}, clientInfo);

    res.status(200).json({
      success: true,
      message: `Meta ${eventName} event tracked successfully`,
      data: result
    });

  } catch (error) {
    console.error(`Error tracking Meta ${eventName} event:`, error);
    next(error);
  }
};

// Send batch Meta events
exports.trackMetaBatchEvents = async (req, res, next) => {
  try {
    const { events } = req.body;

    // Validation
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array is required for batch Meta event tracking'
      });
    }

    const results = await metaService.sendBatch(events);

    res.status(200).json({
      success: true,
      message: 'Meta batch events tracked successfully',
      data: results
    });

  } catch (error) {
    console.error('Error tracking Meta batch events:', error);
    next(error);
  }
};

// Get Meta configuration status
exports.getMetaConfigStatus = async (req, res, next) => {
  try {
    const config = metaService.getStatus();

    res.status(200).json({
      success: true,
      message: 'Meta Conversions API configuration status',
      data: config
    });

  } catch (error) {
    console.error('Error getting Meta config status:', error);
    next(error);
  }
};

// Test Meta event (for debugging)
exports.testMetaEvent = async (req, res, next) => {
  try {
    const result = await metaService.testEvent();

    res.status(200).json({
      success: true,
      message: 'Meta Conversions API test completed',
      data: result
    });

  } catch (error) {
    console.error('Error testing Meta event:', error);
    next(error);
  }
}; 