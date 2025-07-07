const nodemailer = require('nodemailer');
const { secret } = require('../config/secret');
const {
  orderConfirmationTemplate,
  shippingConfirmationTemplate,
  deliveryConfirmationTemplate,
  orderCancellationTemplate,
} = require('../utils/emailTemplates');

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: secret.email_service,
  host: secret.email_host,
  port: secret.email_port,
  secure: true,
  auth: {
    user: secret.email_user,
    pass: secret.email_pass,
  },
  // Add DKIM if available
  ...(secret.dkim_private_key && {
    dkim: {
      domainName: secret.email_domain || secret.email_user.split('@')[1],
      keySelector: 'default',
      privateKey: secret.dkim_private_key,
    },
  }),
  tls: {
    rejectUnauthorized: false,
  },
});

// Configuration for email templates
const emailConfig = {
  storeName: secret.store_name || 'EWO Store',
  supportEmail: secret.support_email || 'support@example.com',
  clientUrl: secret.client_url || 'http://localhost:3000',
};

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"${emailConfig.storeName}" <${secret.email_user}>`,
      to,
      subject,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'High',
        'X-Mailer': 'EWO Mailer',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Send order confirmation email
 * @param {Object} order - Order data
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderConfirmation = async order => {
  if (!order || !order.email) {
    console.error('Missing required order data for email');
    return false;
  }

  try {
    // Log order data being sent to email template
    console.log('📧 Order data for email template:', {
      _id: order._id,
      subTotal: order.subTotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      firstTimeDiscount: order.firstTimeDiscount,
      totalAmount: order.totalAmount,
    });

    // Generate email HTML from template
    const html = orderConfirmationTemplate(order, emailConfig);

    // Send the email
    return await sendEmail({
      to: order.email,
      subject: `Order Confirmation - ${emailConfig.storeName}`,
      html,
    });
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

/**
 * Send enhanced shipping confirmation email
 * @param {Object} order - Order data
 * @param {Object} shippingInfo - Optional additional shipping information
 * @returns {Promise<boolean>} - Success status
 */
const sendShippingConfirmation = async (order, shippingInfo = {}) => {
  if (!order || !order.email) {
    console.error('Missing required order data for email');
    return false;
  }

  try {
    // Extract clean order data from Mongoose document
    const cleanOrderData = order.toObject ? order.toObject() : order;

    console.log('📧 Shipping email order data:', {
      _id: cleanOrderData._id,
      subTotal: cleanOrderData.subTotal,
      shippingCost: cleanOrderData.shippingCost,
      discount: cleanOrderData.discount,
      firstTimeDiscount: cleanOrderData.firstTimeDiscount,
      totalAmount: cleanOrderData.totalAmount,
    });

    // Combine order and shipping info, with shippingInfo taking precedence
    const orderWithShipping = {
      ...cleanOrderData,
      shippingDetails: {
        ...cleanOrderData.shippingDetails,
        ...shippingInfo,
      },
    };

    console.log('Order with shipping for email:', orderWithShipping);

    // Generate email HTML from template
    const html = shippingConfirmationTemplate(orderWithShipping, emailConfig);

    // Create subject line with order ID for better tracking
    const orderNumber = cleanOrderData.orderId || cleanOrderData._id;
    const subject = `📦 Your Order #${orderNumber} Has Shipped! - ${emailConfig.storeName}`;

    // Send the email
    return await sendEmail({
      to: cleanOrderData.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending shipping confirmation email:', error);
    return false;
  }
};

/**
 * Send shipping notification with detailed tracking information
 * @param {string} orderId - Order ID
 * @param {Object} shippingData - Detailed shipping information
 * @returns {Promise<Object>} - Result with success status and message
 */
const sendShippingNotificationWithTracking = async (orderId, shippingData) => {
  try {
    // Import Order model here to avoid circular dependency
    const Order = require('../model/Order');

    // Find the order and populate user if available
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.email) {
      throw new Error('Order has no email address');
    }

    // Prepare shipping details with validation
    const shippingDetails = {
      trackingNumber: shippingData.trackingNumber || 'Processing',
      carrier: shippingData.carrier || 'Standard Shipping',
      trackingUrl: shippingData.trackingUrl || null,
      estimatedDelivery: shippingData.estimatedDelivery
        ? new Date(shippingData.estimatedDelivery)
        : null,
      shippedDate: shippingData.shippedDate
        ? new Date(shippingData.shippedDate)
        : new Date(),
    };

    // Update order with shipping details and set shipped status
    const updateData = {
      status: 'shipped',
      shippingDetails: shippingDetails,
      shippingNotificationSent: true,
    };

    await Order.findByIdAndUpdate(orderId, updateData);

    // Get the updated order with clean data for email
    const updatedOrderForEmail = await Order.findById(orderId).populate('user');

    // Send the shipping confirmation email
    const emailSent = await sendShippingConfirmation(
      updatedOrderForEmail,
      shippingDetails
    );

    if (!emailSent) {
      // Rollback the shippingNotificationSent flag if email failed
      await Order.findByIdAndUpdate(orderId, {
        shippingNotificationSent: false,
      });
      throw new Error('Failed to send shipping notification email');
    }

    console.log(`Shipping notification sent successfully for order ${orderId}`);

    return {
      success: true,
      message: 'Shipping notification sent successfully',
      trackingNumber: shippingDetails.trackingNumber,
      carrier: shippingDetails.carrier,
    };
  } catch (error) {
    console.error('Error sending shipping notification with tracking:', error);
    return {
      success: false,
      message: error.message || 'Failed to send shipping notification',
    };
  }
};

/**
 * Send delivery confirmation email
 * @param {Object} order - Order data
 * @param {Object} deliveryInfo - Optional additional delivery information
 * @returns {Promise<boolean>} - Success status
 */
const sendDeliveryConfirmation = async (order, deliveryInfo = {}) => {
  if (!order || !order.email) {
    console.error('Missing required order data for delivery email');
    return false;
  }

  try {
    // Extract clean order data from Mongoose document
    const cleanOrderData = order.toObject ? order.toObject() : order;

    console.log('📧 Delivery email order data:', {
      _id: cleanOrderData._id,
      subTotal: cleanOrderData.subTotal,
      shippingCost: cleanOrderData.shippingCost,
      discount: cleanOrderData.discount,
      firstTimeDiscount: cleanOrderData.firstTimeDiscount,
      totalAmount: cleanOrderData.totalAmount,
    });

    // Combine order and delivery info
    const orderWithDelivery = {
      ...cleanOrderData,
      shippingDetails: {
        ...cleanOrderData.shippingDetails,
        ...deliveryInfo,
        deliveredDate: deliveryInfo.deliveredDate || new Date(),
      },
    };

    console.log('Order with delivery info for email:', orderWithDelivery);

    // Generate email HTML from template
    const html = deliveryConfirmationTemplate(orderWithDelivery, emailConfig);

    // Create subject line with order ID for better tracking
    const orderNumber = cleanOrderData.orderId || cleanOrderData._id;
    const subject = `🎉 Your Order #${orderNumber} Has Been Delivered! - ${emailConfig.storeName}`;

    // Send the email
    return await sendEmail({
      to: cleanOrderData.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending delivery confirmation email:', error);
    return false;
  }
};

/**
 * Send delivery notification with detailed information
 * @param {string} orderId - Order ID
 * @param {Object} deliveryData - Optional delivery information
 * @returns {Promise<Object>} - Result with success status and message
 */
const sendDeliveryNotificationWithTracking = async (
  orderId,
  deliveryData = {}
) => {
  try {
    // Import Order model here to avoid circular dependency
    const Order = require('../model/Order');

    // Find the order
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.email) {
      throw new Error('Order has no email address');
    }

    // Prepare delivery details
    const deliveryDetails = {
      deliveredDate: deliveryData.deliveredDate || new Date(),
      trackingNumber:
        order.shippingDetails?.trackingNumber || deliveryData.trackingNumber,
      carrier:
        order.shippingDetails?.carrier ||
        deliveryData.carrier ||
        'Standard Shipping',
      trackingUrl:
        order.shippingDetails?.trackingUrl || deliveryData.trackingUrl,
    };

    // Update order with delivery status
    const updateData = {
      status: 'delivered',
      shippingDetails: {
        ...order.shippingDetails,
        ...deliveryDetails,
      },
      deliveryNotificationSent: true,
    };

    await Order.findByIdAndUpdate(orderId, updateData);

    // Get the updated order for email
    const updatedOrderForEmail = await Order.findById(orderId).populate('user');

    // Send the delivery confirmation email
    const emailSent = await sendDeliveryConfirmation(
      updatedOrderForEmail,
      deliveryDetails
    );

    if (!emailSent) {
      // Rollback the deliveryNotificationSent flag if email failed
      await Order.findByIdAndUpdate(orderId, {
        deliveryNotificationSent: false,
      });
      throw new Error('Failed to send delivery notification email');
    }

    console.log(`Delivery notification sent successfully for order ${orderId}`);

    return {
      success: true,
      message: 'Delivery notification sent successfully',
      deliveredDate: deliveryDetails.deliveredDate,
      trackingNumber: deliveryDetails.trackingNumber,
    };
  } catch (error) {
    console.error('Error sending delivery notification with tracking:', error);
    return {
      success: false,
      message: error.message || 'Failed to send delivery notification',
    };
  }
};

/**
 * Send order cancellation email
 * @param {Object} order - Order data
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderCancellation = async order => {
  if (!order || !order.email) {
    console.error('Missing required order data for cancellation email');
    return false;
  }

  try {
    // Extract clean order data from Mongoose document
    const cleanOrderData = order.toObject ? order.toObject() : order;

    console.log('📧 Cancellation email order data:', {
      _id: cleanOrderData._id,
      orderId: cleanOrderData.orderId,
      totalAmount: cleanOrderData.totalAmount,
      paymentMethod: cleanOrderData.paymentMethod,
    });

    // Add cancellation timestamp
    const orderWithCancellation = {
      ...cleanOrderData,
      cancelledAt: new Date(),
    };

    // Generate email HTML from template
    const html = orderCancellationTemplate(orderWithCancellation, emailConfig);

    // Create subject line with order ID for better tracking
    const orderNumber = cleanOrderData.orderId || cleanOrderData._id;
    const subject = `Your Order Has Been Cancelled - ${emailConfig.storeName}`;

    // Send the email
    return await sendEmail({
      to: cleanOrderData.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmation,
  sendShippingConfirmation,
  sendShippingNotificationWithTracking,
  sendDeliveryConfirmation,
  sendDeliveryNotificationWithTracking,
  sendOrderCancellation,
};
