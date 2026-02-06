import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { secret } from '../config/secret.js';
import {
  deliveryConfirmationTemplate,
  feedbackEmailTemplate,
  orderCancellationTemplate,
  orderConfirmationTemplate,
  shippingConfirmationTemplate,
} from '../utils/emailTemplates.js';

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

// Verify transporter configuration
const verifyEmailConfig = async () => {
  try {

    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
};

// Verify email config on startup
verifyEmailConfig();

// Configuration for email templates
const emailConfig = {
  storeName: secret.store_name || 'EWO Store',
  supportEmail: secret.support_email || 'support@eastwestoffroad.com',
  clientUrl: secret.client_url || 'http://localhost:3000',
};

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async ({ to, subject, html }) => {
  try {


    const result = await transporter.sendMail({
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

    return true;
  } catch (error) {


    // Log specific error types for debugging
    if (error.code === 'EAUTH') {
      console.error('❌ Authentication failed - check email credentials');
    } else if (error.code === 'ECONNECTION') {
      console.error('❌ Connection failed - check network/firewall settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Connection timeout - check server connectivity');
    }

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


    // Generate email HTML from template
    const html = orderConfirmationTemplate(order, emailConfig);

    // Send the email
    return await sendEmail({
      to: order.email,
      subject: `Order Confirmation - ${emailConfig.storeName}`,
      html,
    });
  } catch (error) {
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



    // Combine order and shipping info, preserving carriers array from order
    // shippingInfo takes precedence for individual fields, but preserve carriers array
    const orderWithShipping = {
      ...cleanOrderData,
      shippingDetails: {
        ...cleanOrderData.shippingDetails,
        ...shippingInfo,
        // Preserve carriers array - prefer from order, then from shippingInfo
        carriers: cleanOrderData.shippingDetails?.carriers && Array.isArray(cleanOrderData.shippingDetails.carriers) && cleanOrderData.shippingDetails.carriers.length > 0
          ? cleanOrderData.shippingDetails.carriers
          : shippingInfo.carriers && Array.isArray(shippingInfo.carriers) && shippingInfo.carriers.length > 0
            ? shippingInfo.carriers
            : [],
      },
    };


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
    const Order = (await import('../model/Order.js')).default;

    // Find the order and populate user if available
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.email) {
      throw new Error('Order has no email address');
    }

    // IMPORTANT: Do NOT update shippingDetails here - it was already saved correctly by shippingService
    // The shippingService.save() already saved the shippingDetails with carriers array
    // We should only update the shippingNotificationSent flag

    // Get fresh order data (which should already have correct shippingDetails with carriers)
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // Prepare shipping details for email template from the already-saved order data
    // This preserves the carriers array that was saved by shippingService
    const shippingDetails = {
      // Use carriers from the order (already saved correctly)
      carriers: currentOrder.shippingDetails?.carriers && Array.isArray(currentOrder.shippingDetails.carriers) && currentOrder.shippingDetails.carriers.length > 0
        ? currentOrder.shippingDetails.carriers
        : shippingData.carriers && Array.isArray(shippingData.carriers) && shippingData.carriers.length > 0
          ? shippingData.carriers
          : [],
      // Legacy fields from order or shippingData
      trackingNumber: currentOrder.shippingDetails?.trackingNumber || shippingData.trackingNumber || 'Processing',
      carrier: currentOrder.shippingDetails?.carrier || shippingData.carrier || 'Standard Shipping',
      trackingUrl: currentOrder.shippingDetails?.trackingUrl || shippingData.trackingUrl || null,
      estimatedDelivery: currentOrder.shippingDetails?.estimatedDelivery
        ? new Date(currentOrder.shippingDetails.estimatedDelivery)
        : shippingData.estimatedDelivery
          ? new Date(shippingData.estimatedDelivery)
          : null,
      shippedDate: currentOrder.shippingDetails?.shippedDate
        ? new Date(currentOrder.shippingDetails.shippedDate)
        : shippingData.shippedDate
          ? new Date(shippingData.shippedDate)
          : new Date(),
    };

    // If carriers array is empty but we have legacy carrier data, convert to array format
    if (shippingDetails.carriers.length === 0 && shippingDetails.carrier) {
      shippingDetails.carriers = [{
        carrier: shippingDetails.carrier,
        trackingNumber: shippingDetails.trackingNumber,
        trackingUrl: shippingDetails.trackingUrl,
      }];
    }

    console.log('📧 Email service - using carriers from saved order:', JSON.stringify(shippingDetails.carriers, null, 2));

    // ONLY update shippingNotificationSent flag - DO NOT touch shippingDetails
    // The shippingDetails was already saved correctly by shippingService with carriers array
    await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          shippingNotificationSent: true,
        },
      },
      { runValidators: false }
    );

    // Get the updated order with clean data for email (should have carriers array)
    const updatedOrderForEmail = await Order.findById(orderId).populate('user');

    // Send the shipping confirmation email
    // Pass shippingDetails with carriers array - the order's shippingDetails should already have it
    // Use the order's shippingDetails as the source of truth (it was saved correctly by shippingService)
    const orderShippingDetails = updatedOrderForEmail.shippingDetails || {};
    const emailShippingDetails = {
      carriers: orderShippingDetails.carriers && Array.isArray(orderShippingDetails.carriers) && orderShippingDetails.carriers.length > 0
        ? orderShippingDetails.carriers
        : shippingDetails.carriers,
      trackingNumber: orderShippingDetails.trackingNumber || shippingDetails.trackingNumber,
      carrier: orderShippingDetails.carrier || shippingDetails.carrier,
      trackingUrl: orderShippingDetails.trackingUrl || shippingDetails.trackingUrl,
      estimatedDelivery: orderShippingDetails.estimatedDelivery || shippingDetails.estimatedDelivery,
      shippedDate: orderShippingDetails.shippedDate || shippingDetails.shippedDate,
    };

    console.log('📧 Email - final shippingDetails with carriers:', JSON.stringify(emailShippingDetails.carriers, null, 2));

    const emailSent = await sendShippingConfirmation(
      updatedOrderForEmail,
      emailShippingDetails
    );

    if (!emailSent) {
      // Rollback the shippingNotificationSent flag if email failed
      await Order.findByIdAndUpdate(orderId, {
        shippingNotificationSent: false,
      });
      throw new Error('Failed to send shipping notification email');
    }


    return {
      success: true,
      message: 'Shipping notification sent successfully',
      trackingNumber: shippingDetails.trackingNumber,
      carrier: shippingDetails.carrier,
    };
  } catch (error) {
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



    // Combine order and delivery info - preserve carriers array from order
    // The carriers array should already be in cleanOrderData.shippingDetails from the saved order
    const orderWithDelivery = {
      ...cleanOrderData,
      shippingDetails: {
        ...cleanOrderData.shippingDetails, // This includes carriers array if it exists
        ...deliveryInfo,
        deliveredDate: deliveryInfo.deliveredDate || new Date(),
        // Explicitly preserve carriers array from order (don't let deliveryInfo overwrite it)
        carriers: cleanOrderData.shippingDetails?.carriers && Array.isArray(cleanOrderData.shippingDetails.carriers) && cleanOrderData.shippingDetails.carriers.length > 0
          ? cleanOrderData.shippingDetails.carriers
          : deliveryInfo.carriers || cleanOrderData.shippingDetails?.carriers,
      },
    };


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
    const Order = (await import('../model/Order.js')).default;

    // Find the order
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.email) {
      throw new Error('Order has no email address');
    }

    // Prepare delivery details - preserve carriers array from order
    const deliveryDetails = {
      // Preserve carriers array if it exists
      carriers: order.shippingDetails?.carriers && Array.isArray(order.shippingDetails.carriers) && order.shippingDetails.carriers.length > 0
        ? order.shippingDetails.carriers
        : null, // Will be filtered out if null
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

    // Build shippingDetails object, preserving carriers array
    const updatedShippingDetails = {
      ...order.shippingDetails,
      ...deliveryDetails,
    };

    // Remove null carriers to avoid overwriting with null
    if (updatedShippingDetails.carriers === null) {
      delete updatedShippingDetails.carriers;
    }

    // Update order with delivery status
    const updateData = {
      status: 'delivered',
      shippingDetails: updatedShippingDetails,
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


    // Automatically schedule feedback email after 15 seconds

    setTimeout(async () => {
      try {
        await sendFeedbackEmailAfterDelay(orderId);
      } catch (error) {
      }
    }, 3 * 60 * 1000); // 3 minutes in milliseconds

    return {
      success: true,
      message: 'Delivery notification sent successfully',
      deliveredDate: deliveryDetails.deliveredDate,
      trackingNumber: deliveryDetails.trackingNumber,
    };
  } catch (error) {
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
    return false;
  }
};

/**
 * Generate secure token for feedback email review submission
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @returns {string} - JWT token
 */
const generateFeedbackToken = (orderId, email) => {
  return jwt.sign(
    {
      orderId,
      email,
      purpose: 'feedback_review',
      timestamp: Date.now(),
    },
    secret.jwt_secret_for_verify,
    { expiresIn: '7d' } // Token valid for 7 days
  );
};

/**
 * Send feedback email after delay (called automatically after delivery)
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} - Success status
 */
const sendFeedbackEmailAfterDelay = async orderId => {
  try {

    // Import Order model here to avoid circular dependency
    const Order = (await import('../model/Order.js')).default;

    // Find the order
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      return false;
    }

    if (!order.email) {
      return false;
    }

    if (order.status !== 'delivered') {
      return false;
    }

    if (order.feedbackEmailSent) {
      return false;
    }


    // Generate secure token for review submission
    const reviewToken = generateFeedbackToken(orderId, order.email);


    // Generate email HTML from template
    const html = feedbackEmailTemplate(order, emailConfig, reviewToken);

    // Create subject line
    const orderNumber = order.orderId || order._id;
    const subject = `⭐ How was your order? Share your experience - ${emailConfig.storeName}`;

    // Send the email
    const emailSent = await sendEmail({
      to: order.email,
      subject,
      html,
    });

    if (emailSent) {

      // Mark feedback email as sent
      await Order.findByIdAndUpdate(orderId, {
        feedbackEmailSent: true,
        feedbackEmailSentAt: new Date(),
        feedbackEmailProcessed: true,
      });

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * Send feedback email with embedded review form
 * @param {Object} order - Order data
 * @returns {Promise<boolean>} - Success status
 */
const sendFeedbackEmail = async order => {
  if (!order || !order.email) {
    console.error('Missing required order data for feedback email');
    return false;
  }

  try {
    // Extract clean order data from Mongoose document
    const cleanOrderData = order.toObject ? order.toObject() : order;

    // Generate secure token for review submission
    let reviewToken;
    try {
      reviewToken = generateFeedbackToken(
        cleanOrderData._id,
        cleanOrderData.email
      );
    } catch (tokenError) {
      console.error('Error generating feedback token:', tokenError);
      return false;
    }

    // Generate email HTML from template
    let html;
    try {
      html = feedbackEmailTemplate(
        cleanOrderData,
        emailConfig,
        reviewToken
      );
    } catch (templateError) {
      console.error('Error generating email template:', templateError);
      return false;
    }

    // Create subject line with order ID for better tracking
    const orderNumber = cleanOrderData.orderId || cleanOrderData._id;
    const subject = `📝 How was your experience? Order #${orderNumber} - ${emailConfig.storeName}`;

    // Send the email
    return await sendEmail({
      to: cleanOrderData.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error in sendFeedbackEmail:', error);
    return false;
  }
};

/**
 * Schedule feedback email to be sent after 3 minutes
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Result with success status and message
 */
const scheduleFeedbackEmail = async orderId => {
  try {
    // Import Order model here to avoid circular dependency
    const Order = (await import('../model/Order.js')).default;

    // Find the order
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.email) {
      throw new Error('Order has no email address');
    }

    if (order.status !== 'delivered') {
      throw new Error(
        'Order must be delivered before feedback can be requested'
      );
    }

    if (order.feedbackEmailSent) {
      throw new Error('Feedback email has already been sent for this order');
    }

    // Mark feedback email as scheduled
    const scheduledAt = new Date();
    await Order.findByIdAndUpdate(orderId, {
      feedbackEmailScheduledAt: scheduledAt,
    });

    // Schedule email to be sent after 15 seconds
    setTimeout(async () => {
      try {

        // Get fresh order data
        const freshOrder = await Order.findById(orderId).populate('user');

        if (!freshOrder) {
          return;
        }

        if (freshOrder.feedbackEmailSent) {
          return;
        }

        // Send the feedback email
        const emailSent = await sendFeedbackEmail(freshOrder);

        if (emailSent) {
          // Mark feedback email as sent
          await Order.findByIdAndUpdate(orderId, {
            feedbackEmailSent: true,
            feedbackEmailSentAt: new Date(),
          });
        } else {
        }
      } catch (error) {
      }
    }, 3 * 60 * 1000); // 3 minutes in milliseconds

    return {
      success: true,
      message:
        'Feedback email scheduled successfully. It will be sent in 3 minutes.',
      scheduledAt: scheduledAt,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to schedule feedback email',
    };
  }
};

/**
 * Diagnostic function for troubleshooting email issues
 * @param {string} orderId - Order ID to diagnose
 * @returns {Object} - Diagnostic information
 */
const diagnoseFeedbackEmail = async orderId => {
  try {

    const Order = (await import('../model/Order.js')).default;
    const order = await Order.findById(orderId).populate('user');

    const diagnostic = {
      orderId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      emailConfig: {
        service: secret.email_service,
        host: secret.email_host,
        port: secret.email_port,
        user: secret.email_user
          ? secret.email_user.substring(0, 5) + '***'
          : 'undefined',
        hasPassword: !!secret.email_pass,
        storeUrl: secret.client_url,
        storeName: secret.store_name,
      },
      order: null,
      issues: [],
      recommendations: [],
    };

    // Check order existence
    if (!order) {
      diagnostic.issues.push('Order not found in database');
      diagnostic.recommendations.push('Verify order ID is correct');
      return diagnostic;
    }

    diagnostic.order = {
      id: order._id,
      orderId: order.orderId,
      email: order.email,
      status: order.status,
      feedbackEmailSent: order.feedbackEmailSent,
      feedbackEmailSentAt: order.feedbackEmailSentAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
    };

    // Check email configuration
    if (!secret.email_user || !secret.email_pass) {
      diagnostic.issues.push('Email credentials missing');
      diagnostic.recommendations.push(
        'Check EMAIL_USER and EMAIL_PASS environment variables'
      );
    }

    if (!secret.email_service && !secret.email_host) {
      diagnostic.issues.push('Email service/host not configured');
      diagnostic.recommendations.push(
        'Set either SERVICE or HOST environment variable'
      );
    }

    // Check order status
    if (order.status !== 'delivered') {
      diagnostic.issues.push(
        `Order status is '${order.status}', not 'delivered'`
      );
      diagnostic.recommendations.push(
        'Order must be delivered to send feedback email'
      );
    }

    // Check email address
    if (!order.email) {
      diagnostic.issues.push('Order has no email address');
      diagnostic.recommendations.push('Ensure order has valid email address');
    }

    // Check if already sent
    if (order.feedbackEmailSent) {
      diagnostic.issues.push('Feedback email already sent');
      diagnostic.recommendations.push(
        'Email was already sent on ' + order.feedbackEmailSentAt
      );
    }

    // Test email configuration
    try {
      await transporter.verify();
      diagnostic.emailConfigValid = true;
    } catch (error) {
      diagnostic.emailConfigValid = false;
      diagnostic.issues.push(`Email configuration invalid: ${error.message}`);
      diagnostic.recommendations.push(
        'Check email service credentials and settings'
      );
    }

    return diagnostic;
  } catch (error) {
    return {
      orderId,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Send contact notification to admin
const sendContactNotification = async contact => {
  try {
    const mailOptions = {
      from: {
        name: 'EWO Contact Form',
        address: secret.email_user,
      },
      to: secret.admin_email || 'info@eastwestoffroad.com',
      subject: `🔔 New Contact Form Submission - ${contact.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
              <div style="width: 50px; height: 3px; background-color: #3498db; margin: 10px auto;"></div>
            </div>

            <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Contact Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${contact.name
        }</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> <a href="mailto:${contact.email
        }">${contact.email}</a></p>
              ${contact.phone
          ? `<p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> <a href="tel:${contact.phone}">${contact.phone}</a></p>`
          : ''
        }
              <p style="margin: 5px 0; color: #555;"><strong>Priority:</strong> <span style="color: ${contact.priority === 'high'
          ? '#e74c3c'
          : contact.priority === 'medium'
            ? '#f39c12'
            : '#27ae60'
        }; font-weight: bold; text-transform: uppercase;">${contact.priority
        }</span></p>
              <p style="margin: 5px 0; color: #555;"><strong>Submitted:</strong> ${contact.formattedDate
        }</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #2c3e50; margin: 0 0 10px 0;">Subject</h3>
              <p style="color: #555; margin: 0; font-weight: 500;">${contact.subject
        }</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Message</h3>
              <div style="color: #555; line-height: 1.6; white-space: pre-wrap;">${contact.message
        }</div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.ADMIN_URL || 'http://localhost:3001'
        }/contacts/${contact._id}"
                 style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View in Admin Panel
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
              <p>East West Offroad Products LLC | Contact Management System</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    throw error;
  }
};

// Send confirmation email to user
const sendContactConfirmation = async contact => {
  try {
    const mailOptions = {
      from: {
        name: 'East West Offroad',
        address: secret.email_user,
      },
      to: contact.email,
      cc: secret.email_user, // Send copy to our own email
      subject: 'Thank you for contacting East West Offroad',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Thank You for Contacting Us!</h1>
              <div style="width: 50px; height: 3px; background-color: #3498db; margin: 10px auto;"></div>
            </div>

            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Hi <strong>${contact.name}</strong>,
            </p>

            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for reaching out to East West Offroad! We've received your message and our team will review it promptly.
            </p>

            <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Your Message Summary</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${contact.name
        }</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${contact.email
        }</p>
              ${contact.phone
          ? `<p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${contact.phone}</p>`
          : ''
        }
              <p style="margin: 5px 0; color: #555;"><strong>Subject:</strong> ${contact.subject
        }</p>
              <p style="margin: 5px 0; color: #555;"><strong>Submitted:</strong> ${contact.formattedDate
        }</p>
              <p style="margin: 5px 0; color: #555;"><strong>Reference ID:</strong> ${contact._id
        }</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Your Message</h3>
              <div style="color: #555; line-height: 1.6; white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 3px solid #3498db;">${contact.message
        }</div>
            </div>

            <div style="background-color: #e8f5e8; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #2c3e50; font-weight: 500;">
                💡 <strong>What's Next?</strong>
              </p>
              <p style="margin: 10px 0 0 0; color: #555;">
                Our customer service team typically responds within 24-48 hours during business days. For urgent matters, please call us at <strong>1-866-EWO-ROAD (396-7623)</strong>.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #555; margin-bottom: 15px;">Need immediate assistance?</p>
              <a href="tel:1-866-396-7623"
                 style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                📞 Call Us
              </a>
              <a href="mailto:info@eastwestoffroad.com"
                 style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ✉️ Email Us
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
              <p><strong>East West Offroad Products LLC</strong></p>
              <p>Phone: 1-866-EWO-ROAD (396-7623) | Email: info@eastwestoffroad.com</p>
              <p>PO Box 2644, Everett, WA 98213</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Contact confirmation email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send contact confirmation email:', error);
    throw error;
  }
};

export {
  diagnoseFeedbackEmail,
  scheduleFeedbackEmail,
  sendContactConfirmation,
  sendContactNotification,
  sendDeliveryConfirmation,
  sendDeliveryNotificationWithTracking,
  sendEmail,
  sendFeedbackEmail,
  sendFeedbackEmailAfterDelay,
  sendOrderCancellation,
  sendOrderConfirmation,
  sendShippingConfirmation,
  sendShippingNotificationWithTracking,
  verifyEmailConfig,
};
