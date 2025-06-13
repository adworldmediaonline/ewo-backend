const { sendShippingNotificationWithTracking } = require('./emailService');
const Order = require('../model/Order');

/**
 * Shipping service for handling order shipping operations
 */
class ShippingService {
  /**
   * Process order shipment with tracking information
   * @param {string} orderId - Order ID
   * @param {Object} shippingData - Shipping details
   * @returns {Promise<Object>} - Result object
   */
  static async processShipment(orderId, shippingData) {
    try {
      const {
        trackingNumber,
        carrier,
        trackingUrl,
        estimatedDelivery,
        sendEmailNotification = true,
      } = shippingData;

      // Validate order exists
      const order = await Order.findById(orderId).populate('user');
      if (!order) {
        throw new Error('Order not found');
      }

      console.log('Order found for shipping:', {
        id: order._id,
        orderId: order.orderId,
        name: order.name,
        email: order.email,
        status: order.status,
      });

      // Prepare shipping details with separate tracking ID
      const shippingDetails = {
        trackingNumber: trackingNumber || null, // Keep separate from order ID
        carrier: carrier || 'Standard Shipping',
        trackingUrl: trackingUrl || null,
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery)
          : null,
        shippedDate: new Date(),
      };

      // Update order status and shipping details
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          status: 'shipped',
          shippingDetails: shippingDetails,
        },
        { new: true }
      );

      let emailResult = null;

      // Send notification email if requested
      if (sendEmailNotification) {
        emailResult = await sendShippingNotificationWithTracking(
          orderId,
          shippingDetails
        );
      }

      return {
        success: true,
        message: 'Order shipped successfully',
        data: {
          orderId: updatedOrder._id,
          orderNumber: updatedOrder.orderId,
          status: updatedOrder.status,
          shippingDetails: updatedOrder.shippingDetails,
          emailSent: emailResult ? emailResult.success : false,
          emailMessage: emailResult
            ? emailResult.message
            : 'Email notification not requested',
        },
      };
    } catch (error) {
      console.error('Error processing shipment:', error);
      return {
        success: false,
        message: error.message || 'Failed to process shipment',
      };
    }
  }

  /**
   * Update tracking information for an order
   * @param {string} orderId - Order ID
   * @param {Object} trackingData - Updated tracking information
   * @returns {Promise<Object>} - Result object
   */
  static async updateTracking(orderId, trackingData) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedShippingDetails = {
        ...order.shippingDetails,
        ...trackingData,
      };

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { shippingDetails: updatedShippingDetails },
        { new: true }
      );

      return {
        success: true,
        message: 'Tracking information updated successfully',
        data: {
          orderId: updatedOrder._id,
          shippingDetails: updatedOrder.shippingDetails,
        },
      };
    } catch (error) {
      console.error('Error updating tracking:', error);
      return {
        success: false,
        message: error.message || 'Failed to update tracking information',
      };
    }
  }

  /**
   * Get shipping status for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Shipping status
   */
  static async getShippingStatus(orderId) {
    try {
      const order = await Order.findById(orderId).select(
        'status shippingDetails shippingNotificationSent orderId'
      );

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderId,
          status: order.status,
          shippingDetails: order.shippingDetails || {},
          notificationSent: order.shippingNotificationSent || false,
        },
      };
    } catch (error) {
      console.error('Error getting shipping status:', error);
      return {
        success: false,
        message: error.message || 'Failed to get shipping status',
      };
    }
  }

  /**
   * Generate tracking URL for popular carriers
   * @param {string} carrier - Carrier name
   * @param {string} trackingNumber - Tracking number
   * @returns {string} - Tracking URL
   */
  static generateTrackingUrl(carrier, trackingNumber) {
    const carrierUrls = {
      ups: `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`,
      fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      dhl: `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    };

    const normalizedCarrier = carrier.toLowerCase().replace(/\s+/g, '');
    return carrierUrls[normalizedCarrier] || null;
  }

  /**
   * Validate shipping data
   * @param {Object} shippingData - Shipping data to validate
   * @returns {Object} - Validation result
   */
  static validateShippingData(shippingData) {
    const errors = [];

    // Carrier is required, tracking number is optional (can be added later)
    if (!shippingData.carrier) {
      errors.push('Carrier is required');
    }

    if (shippingData.estimatedDelivery) {
      const deliveryDate = new Date(shippingData.estimatedDelivery);
      if (isNaN(deliveryDate.getTime())) {
        errors.push('Invalid estimated delivery date');
      } else if (deliveryDate < new Date()) {
        errors.push('Estimated delivery date cannot be in the past');
      }
    }

    if (
      shippingData.trackingUrl &&
      !this.isValidUrl(shippingData.trackingUrl)
    ) {
      errors.push('Invalid tracking URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ShippingService;
