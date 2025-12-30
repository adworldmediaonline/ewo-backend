import { sendShippingNotificationWithTracking } from './emailService.js';
import Order from '../model/Order.js';

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
        carriers,
        trackingNumber,
        carrier,
        trackingUrl,
        estimatedDelivery,
        sendEmailNotification = true,
      } = shippingData;

      // Validate order exists and fetch it
      const order = await Order.findById(orderId).populate('user');
      if (!order) {
        throw new Error('Order not found');
      }

      // Prepare shipping details - support both new (multiple carriers) and legacy (single carrier) formats
      let shippingDetails = {
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery)
          : null,
        shippedDate: new Date(),
      };

      if (carriers && Array.isArray(carriers) && carriers.length > 0) {
        // New format: multiple carriers
        // Ensure all carrier objects have the correct structure
        shippingDetails.carriers = carriers.map(c => ({
          carrier: c.carrier || null,
          trackingNumber: c.trackingNumber || null,
          trackingUrl: c.trackingUrl || null,
        }));
        // Also set legacy fields for backward compatibility (use first carrier)
        shippingDetails.carrier = carriers[0].carrier;
        shippingDetails.trackingNumber = carriers[0].trackingNumber || null;
        shippingDetails.trackingUrl = carriers[0].trackingUrl || null;

        console.log('📦 Saving multiple carriers:', JSON.stringify(shippingDetails.carriers, null, 2));
      } else {
        // Legacy format: single carrier
        shippingDetails.trackingNumber = trackingNumber || null;
        shippingDetails.carrier = carrier || 'Standard Shipping';
        shippingDetails.trackingUrl = trackingUrl || null;
        // Convert to new format for consistency
        shippingDetails.carriers = [{
          carrier: shippingDetails.carrier,
          trackingNumber: shippingDetails.trackingNumber,
          trackingUrl: shippingDetails.trackingUrl,
        }];
      }

      // Update order status and shipping details
      // Ensure carriers array is properly formatted before saving
      console.log('💾 Saving shippingDetails:', JSON.stringify(shippingDetails, null, 2));
      console.log('📦 Carriers array length:', shippingDetails.carriers?.length || 0);
      console.log('📦 Carriers array content:', JSON.stringify(shippingDetails.carriers, null, 2));

      // Ensure carriers is always an array (even if empty)
      if (!shippingDetails.carriers || !Array.isArray(shippingDetails.carriers)) {
        shippingDetails.carriers = [];
      }

      // Use save() method instead of findByIdAndUpdate to ensure Mongoose properly handles subdocument arrays
      // This is more reliable for nested arrays in subdocuments

      // Set shipping details directly on the order object
      order.status = 'shipped';
      order.shippingDetails = shippingDetails;

      // Explicitly mark the carriers array as modified to ensure Mongoose saves it
      order.markModified('shippingDetails.carriers');

      console.log('🔧 Order object before save:', JSON.stringify({
        status: order.status,
        shippingDetails: order.shippingDetails,
        carriersCount: order.shippingDetails?.carriers?.length || 0,
      }, null, 2));

      // Save the order - this ensures Mongoose properly handles the subdocument
      const updatedOrder = await order.save();

      // Verify what was actually saved by querying fresh from DB
      const savedOrder = await Order.findById(orderId).lean();
      console.log('✅ Saved shippingDetails (from DB):', JSON.stringify(savedOrder.shippingDetails, null, 2));
      console.log('📦 Saved carriers count:', savedOrder.shippingDetails?.carriers?.length || 0);
      console.log('📦 Saved carriers:', JSON.stringify(savedOrder.shippingDetails?.carriers, null, 2));

      // Use savedOrder for return value to ensure we return what's actually in DB
      const finalShippingDetails = savedOrder.shippingDetails || updatedOrder.shippingDetails;

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
          shippingDetails: finalShippingDetails,
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
      usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      // Removed FedEx and DHL as per requirements - only UPS and USPS are allowed
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

export default ShippingService;
