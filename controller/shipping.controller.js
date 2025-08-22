import ShippingService from '../services/shippingService.js';
import Order from '../model/Order.js';

export const shipOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id; // Order ID from URL parameter
    const { trackingNumber, carrier, estimatedDelivery } = req.body; // Admin provides tracking info

    // Validate required data
    if (!carrier) {
      return res.status(400).json({
        success: false,
        message: 'Carrier is required',
      });
    }

    // Prepare shipping data
    const shippingData = {
      trackingNumber: trackingNumber || null, // Tracking number from carrier (separate from order ID)
      carrier,
      estimatedDelivery: estimatedDelivery || null,
      sendEmailNotification: true,
    };

    // Auto-generate tracking URL if tracking number is provided
    if (trackingNumber && carrier) {
      shippingData.trackingUrl = ShippingService.generateTrackingUrl(
        carrier,
        trackingNumber
      );
    }

    const result = await ShippingService.processShipment(orderId, shippingData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in shipOrder controller:', error);
    next(error);
  }
};

export const updateTracking = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const trackingData = req.body;

    const result = await ShippingService.updateTracking(orderId, trackingData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in updateTracking controller:', error);
    next(error);
  }
};

export const getShippingStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const result = await ShippingService.getShippingStatus(orderId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error in getShippingStatus controller:', error);
    next(error);
  }
};

export const getShippableOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: { $in: ['pending', 'processing'] },
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .select(
        '_id orderId name email address city state totalAmount status createdAt cart'
      );

    const shippableOrders = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.name,
      customerEmail: order.email,
      shippingAddress: {
        address: order.address,
        city: order.city,
        state: order.state,
      },
      totalAmount: order.totalAmount,
      status: order.status,
      orderDate: order.createdAt,
      itemCount: order.cart ? order.cart.length : 0,
    }));

    res.status(200).json({
      success: true,
      data: shippableOrders,
      count: shippableOrders.length,
    });
  } catch (error) {
    console.error('Error in getShippableOrders controller:', error);
    next(error);
  }
};

export const getShippedOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ status: 'shipped' })
      .populate('user', 'name email')
      .sort({ 'shippingDetails.shippedDate': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        '_id orderId name email shippingDetails totalAmount createdAt shippingNotificationSent'
      );

    const totalShipped = await Order.countDocuments({ status: 'shipped' });

    const shippedOrders = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.name,
      customerEmail: order.email,
      totalAmount: order.totalAmount,
      orderDate: order.createdAt,
      shippingDetails: order.shippingDetails || {},
      notificationSent: order.shippingNotificationSent || false,
    }));

    res.status(200).json({
      success: true,
      data: shippedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalShipped / limit),
        totalItems: totalShipped,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getShippedOrders controller:', error);
    next(error);
  }
};

export const bulkShipOrders = async (req, res, next) => {
  try {
    const { orderIds, shippingData } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required',
      });
    }

    const validation = ShippingService.validateShippingData(shippingData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping data',
        errors: validation.errors,
      });
    }

    const results = [];
    for (const orderId of orderIds) {
      try {
        const result = await ShippingService.processShipment(orderId, {
          ...shippingData,
          trackingNumber: `${
            shippingData.trackingNumber || 'BULK'
          }-${orderId.slice(-6)}`,
        });
        results.push({
          orderId,
          ...result,
        });
      } catch (error) {
        results.push({
          orderId,
          success: false,
          message: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Bulk shipping completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Error in bulkShipOrders controller:', error);
    next(error);
  }
};
