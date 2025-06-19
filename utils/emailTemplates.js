/**
 * Email Templates System
 * Provides reusable email templates for different types of emails
 */

const { secret } = require('../config/secret');

// Format currency helper function
const formatPrice = amount => `$${parseFloat(amount || 0).toFixed(2)}`;

// Generate formatted date
const formatDate = (date = new Date()) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Base email template with common header and footer
 * @param {Object} options - Template options
 * @param {string} options.content - Main content HTML
 * @param {string} options.storeName - Store name for branding
 * @param {string} options.supportEmail - Support email address
 * @returns {string} - Complete HTML template
 */
const baseTemplate = ({ content, storeName, supportEmail }) => {
  const year = new Date().getFullYear();

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Email Notification</title>
  </head>
  <body style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; background-color: #ffffff; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <!-- Header -->
      <tr>
        <td style="padding: 20px 0; text-align: center; background-color: #f8f9fa; border-radius: 6px 6px 0 0;">
          <h1 style="color: #4a5568; margin: 0; font-size: 24px;">${storeName}</h1>
        </td>
      </tr>

      <!-- Main Content -->
      <tr>
        <td style="padding: 30px 20px; background-color: #ffffff; border-left: 1px solid #eee; border-right: 1px solid #eee;">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px; text-align: center; background-color: #f8f9fa; color: #718096; border-radius: 0 0 6px 6px; font-size: 14px; border-left: 1px solid #eee; border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
          <p style="margin-bottom: 10px;">If you have any questions, please contact our customer service at <a href="mailto:${supportEmail}" style="color: #4299e1;">${supportEmail}</a></p>
          <p style="margin-top: 20px; margin-bottom: 0;">&copy; ${year} ${storeName}. All rights reserved.</p>
        </td>
      </tr>
    </table>
    <!-- Anti-spam footer -->
    <div style="font-size: 11px; color: #999; margin-top: 20px; text-align: center;">
      <p>This email was sent to you as a registered user of ${storeName}. To update your preferences or unsubscribe, visit your account settings.</p>
    </div>
  </body>
  </html>
  `;
};

/**
 * Order confirmation email template
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @returns {string} - Complete HTML template
 */
const orderConfirmationTemplate = (order, config) => {
  const {
    _id,
    name,
    cart = [],
    totalAmount = 0,
    subTotal = 0,
    shippingCost = 0,
    discount = 0,
    paymentMethod = 'Card',
    firstTimeDiscount,
  } = order;

  // Handle first-time discount display
  let firstTimeDiscountAmount = 0;
  let firstTimeDiscountHtml = '';

  if (firstTimeDiscount?.isApplied && firstTimeDiscount?.amount > 0) {
    firstTimeDiscountAmount = firstTimeDiscount.amount;
    firstTimeDiscountHtml = `
      <tr>
        <td style="padding: 12px; text-align: right;">
          🎉 First-time order discount (-${
            firstTimeDiscount?.percentage || 10
          }%)
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(firstTimeDiscountAmount)}
        </td>
      </tr>
    `;
  }

  // Handle regular coupon discount
  let couponDiscountHtml = '';
  if (discount > 0) {
    couponDiscountHtml = `
      <tr>
        <td style="padding: 12px; text-align: right;">
          💰 Coupon discount
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(discount)}
        </td>
      </tr>
    `;
  }

  const {
    storeName = secret.store_name,
    supportEmail = secret.support_email,
    clientUrl = secret.client_url,
  } = config;

  // Generate items HTML
  const itemsHtml =
    cart && cart.length > 0
      ? cart
          .map(
            item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${
          item.title || 'Product'
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${
          item.orderQuantity || 1
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
          item.price
        )}</td>
      </tr>
    `
          )
          .join('')
      : `<tr><td style="padding: 12px; border-bottom: 1px solid #eee;" colspan="3">Order items not available</td></tr>`;

  // Create the main content
  const content = `
    <div style="background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Thank You for Your Order!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your order has been received and is being processed</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">Thank you for choosing us! Your order has been successfully received and is now being prepared for shipment. Here's a complete summary of your purchase:</p>

    <!-- Order Details -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #4299e1;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">📋 Order Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 50%;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #4299e1; font-family: 'Courier New', monospace; font-weight: bold;">#${_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Order Date:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #48bb78; font-weight: bold;">${formatDate()}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Order Status:</strong></td>
          <td style="padding: 8px 0; text-align: right;">
            <span style="background-color: #ffd93d; color: #744210; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
              ⏳ Processing
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Order Items -->
    <h3 style="color: #2d3748; border-bottom: 2px solid #4299e1; padding-bottom: 10px; margin-top: 40px; font-size: 18px;">🛍️ Your Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #4299e1 0%, #667eea 100%);">
          <th style="padding: 15px 12px; text-align: left; color: white; font-weight: bold;">Item</th>
          <th style="padding: 15px 12px; text-align: center; color: white; font-weight: bold;">Quantity</th>
          <th style="padding: 15px 12px; text-align: right; color: white; font-weight: bold;">Price</th>
        </tr>
      </thead>
      <tbody style="background-color: white;">
        ${itemsHtml}
      </tbody>
      <tfoot style="background-color: #f8f9fa;">
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;"><strong>Subtotal:</strong></td>
          <td style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;">${formatPrice(
            subTotal
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
          <td style="padding: 12px; text-align: right;">${formatPrice(
            shippingCost
          )}</td>
        </tr>
        ${firstTimeDiscountHtml}
        ${couponDiscountHtml}
        <tr>
          <td colspan="2" style="padding: 15px 12px; text-align: right; border-top: 2px solid #4299e1; background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); color: white;"><strong>Total:</strong></td>
          <td style="padding: 15px 12px; text-align: right; border-top: 2px solid #4299e1; font-weight: bold; font-size: 18px; background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); color: white;">${formatPrice(
            totalAmount
          )}</td>
        </tr>
      </tfoot>
    </table>

    <!-- What's Next Section -->
    <div style="background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #38b2ac;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 15px;">⏰ What Happens Next?</h4>
      <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">📦 <strong>Order Processing:</strong> We're preparing your items for shipment</li>
        <li style="margin-bottom: 8px;">📧 <strong>Shipping Notification:</strong> You'll receive an email with tracking details once shipped</li>
        <li style="margin-bottom: 8px;">🚚 <strong>Delivery:</strong> Your order will arrive within 3-7 business days</li>
        <li style="margin-bottom: 8px;">💬 <strong>Questions?</strong> Contact our support team anytime</li>
      </ul>
    </div>

    <!-- Action Buttons -->
    <div style="margin: 40px 0; text-align: center; padding: 30px; background-color: #f8f9fa; border-radius: 8px;">
      <p style="margin-bottom: 20px; font-size: 16px; color: #4a5568;">Manage your order and track its progress:</p>
      <a href="${clientUrl}/order/${_id}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin-right: 15px;">View Order Details</a>
      <a href="${clientUrl}/profile" style="background-color: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">My Account</a>
    </div>

    <!-- Order Processing Timeline -->
    <div style="background-color: #f0f8ff; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #4299e1;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 15px;">📋 Order Processing Timeline</h4>
      <div style="position: relative;">
        <div style="display: flex; align-items: center; margin-bottom: 12px; color: #48bb78;">
          <span style="width: 20px; height: 20px; background-color: #48bb78; border-radius: 50%; display: inline-block; margin-right: 12px; color: white; text-align: center; font-size: 12px; line-height: 20px;">✓</span>
          <span style="font-weight: bold;">Order Received</span>
          <span style="margin-left: auto; font-size: 12px; color: #718096;">${formatDate()}</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px; color: #ffd93d;">
          <span style="width: 20px; height: 20px; background-color: #ffd93d; border-radius: 50%; display: inline-block; margin-right: 12px; color: #744210; text-align: center; font-size: 12px; line-height: 20px;">⏳</span>
          <span style="font-weight: bold;">Processing</span>
          <span style="margin-left: auto; font-size: 12px; color: #718096;">Current Status</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px; color: #a0aec0;">
          <span style="width: 20px; height: 20px; background-color: #e2e8f0; border-radius: 50%; display: inline-block; margin-right: 12px; color: #718096; text-align: center; font-size: 12px; line-height: 20px;">📦</span>
          <span>Shipped</span>
          <span style="margin-left: auto; font-size: 12px; color: #718096;">Pending</span>
        </div>
        <div style="display: flex; align-items: center; color: #a0aec0;">
          <span style="width: 20px; height: 20px; background-color: #e2e8f0; border-radius: 50%; display: inline-block; margin-right: 12px; color: #718096; text-align: center; font-size: 12px; line-height: 20px;">🎉</span>
          <span>Delivered</span>
          <span style="margin-left: auto; font-size: 12px; color: #718096;">Pending</span>
        </div>
      </div>
    </div>

    <p style="text-align: center; color: #718096; font-size: 14px; margin-top: 40px;">
      Thank you for your business! We're excited to get your order to you as quickly as possible.
    </p>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

/**
 * Enhanced shipping confirmation email template
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @returns {string} - Complete HTML template
 */
const shippingConfirmationTemplate = (order, config) => {
  const {
    _id,
    orderId,
    name,
    address,
    city,
    state,
    zipCode,
    country,
    cart = [],
    totalAmount = 0,
    subTotal = 0,
    shippingCost = 0,
    discount = 0,
    shippingDetails = {},
    firstTimeDiscount,
  } = order || {};

  // Safety check for required fields
  if (!_id || !name || !address) {
    console.error('Missing required order fields for email template:', {
      _id,
      name,
      address,
    });
    console.error('Full order object:', order);
  }

  const {
    trackingNumber,
    carrier = 'Standard Shipping',
    trackingUrl,
    estimatedDelivery,
    shippedDate = new Date(),
  } = shippingDetails;

  const {
    storeName = secret.store_name || 'EWO Store',
    supportEmail = secret.support_email || 'support@example.com',
    clientUrl = secret.client_url || 'https://example.com',
  } = config;

  // Format dates
  const formatShippedDate = () => {
    const date =
      shippedDate instanceof Date ? shippedDate : new Date(shippedDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEstimatedDelivery = () => {
    if (!estimatedDelivery) return 'Within 3-7 business days';
    const date =
      estimatedDelivery instanceof Date
        ? estimatedDelivery
        : new Date(estimatedDelivery);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate items HTML with safety checks
  const itemsHtml =
    cart && Array.isArray(cart) && cart.length > 0
      ? cart
          .map((item, index) => {
            console.log(`Cart item ${index}:`, item);
            return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold; color: #2d3748;">${
            item?.title || 'Product'
          }</div>
          ${
            item?.variant
              ? `<div style="font-size: 12px; color: #718096; margin-top: 4px;">${item.variant}</div>`
              : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${
          item?.orderQuantity || item?.quantity || 1
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
          item?.price || 0
        )}</td>
      </tr>
    `;
          })
          .join('')
      : `<tr><td style="padding: 12px; border-bottom: 1px solid #eee;" colspan="3">Order items not available</td></tr>`;

  // Handle first-time discount display for shipping email
  let firstTimeDiscountHtml = '';
  if (firstTimeDiscount?.isApplied && firstTimeDiscount?.amount > 0) {
    firstTimeDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          🎉 First-time order discount (-${
            firstTimeDiscount?.percentage || 10
          }%)
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(firstTimeDiscount.amount)}
        </td>
      </tr>
    `;
  }

  // Handle regular coupon discount for shipping email
  let couponDiscountHtml = '';
  if (discount > 0) {
    couponDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          💰 Coupon discount
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(discount)}
        </td>
      </tr>
    `;
  }

  // Create tracking button HTML
  const trackingButtonHtml =
    trackingUrl && trackingNumber
      ? `<a href="${trackingUrl}" style="background-color: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin-right: 15px;">Track Package</a>`
      : '';

  const content = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📦 Your Order Has Shipped!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your package is on its way to you</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${
      name || 'Valued Customer'
    }</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">Exciting news! Your order has been shipped and is now on its way to you. Here are all the details:</p>

    <!-- Order & Shipping Information -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">📋 Order & Shipping Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 50%;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0; text-align: right;">#${
            orderId || _id || 'N/A'
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Shipped Date:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${formatShippedDate()}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Carrier:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${
            carrier || 'Standard Shipping'
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Tracking Number:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-family: 'Courier New', monospace; font-weight: bold; color: #4299e1;">
            ${trackingNumber || 'Will be provided when available'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Estimated Delivery:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #48bb78; font-weight: bold;">${formatEstimatedDelivery()}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping Address -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">🏠 Shipping Address</h3>
      <div style="font-size: 15px; line-height: 1.6; color: #4a5568;">
        <strong>${name || 'Customer'}</strong><br>
        ${address || 'Address not provided'}<br>
        ${[city, state, zipCode].filter(Boolean).join(', ')}<br>
        ${country || ''}
      </div>
    </div>

    <!-- Order Items -->
    <h3 style="color: #2d3748; border-bottom: 2px solid #4299e1; padding-bottom: 10px; margin-top: 40px; font-size: 18px;">🛍️ Items in Your Order</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #4299e1 0%, #667eea 100%);">
          <th style="padding: 15px 12px; text-align: left; color: white; font-weight: bold;">Item</th>
          <th style="padding: 15px 12px; text-align: center; color: white; font-weight: bold;">Quantity</th>
          <th style="padding: 15px 12px; text-align: right; color: white; font-weight: bold;">Price</th>
        </tr>
      </thead>
      <tbody style="background-color: white;">
        ${itemsHtml}
      </tbody>
      <tfoot style="background-color: #f8f9fa;">
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;"><strong>Subtotal:</strong></td>
          <td style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;">${formatPrice(
            subTotal
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
          <td style="padding: 12px; text-align: right;">${formatPrice(
            shippingCost
          )}</td>
        </tr>
        ${firstTimeDiscountHtml}
        ${couponDiscountHtml}
        <tr>
          <td colspan="2" style="padding: 15px 12px; text-align: right; border-top: 2px solid #4299e1; background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); color: white;"><strong>Total Paid:</strong></td>
          <td style="padding: 15px 12px; text-align: right; border-top: 2px solid #4299e1; font-weight: bold; font-size: 18px; background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); color: white;">${formatPrice(
            totalAmount
          )}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Action Buttons -->
    <div style="margin: 40px 0; text-align: center; padding: 30px; background-color: #f8f9fa; border-radius: 8px;">
      <p style="margin-bottom: 20px; font-size: 16px; color: #4a5568;">Keep track of your package and manage your order:</p>
      ${trackingButtonHtml}
      <a href="${clientUrl}/order/${_id}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Order Details</a>
    </div>

    <!-- Delivery Information -->
    <div style="background-color: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 10px;">📅 Important Delivery Information</h4>
      <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
        <li style="margin-bottom: 8px;">Your package will be delivered to the address provided above</li>
        <li style="margin-bottom: 8px;">Please ensure someone is available to receive the package</li>
        <li style="margin-bottom: 8px;">If you're not available, the carrier will leave a delivery notice</li>
        ${
          trackingUrl
            ? '<li style="margin-bottom: 8px;">Track your package in real-time using the tracking button above</li>'
            : ''
        }
      </ul>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Thank you for choosing <strong>${storeName}</strong>! We hope you love your purchase. If you have any questions about your order or delivery, please don't hesitate to contact our customer service team.</p>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

// Export all templates
/**
 * Enhanced delivery confirmation email template
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @returns {string} - Complete HTML template
 */
const deliveryConfirmationTemplate = (order, config) => {
  const {
    _id,
    orderId,
    name,
    address,
    city,
    state,
    zipCode,
    country,
    cart = [],
    totalAmount = 0,
    subTotal = 0,
    shippingCost = 0,
    discount = 0,
    shippingDetails = {},
    firstTimeDiscount,
  } = order || {};

  // Safety check for required fields
  if (!_id || !name || !address) {
    console.error(
      'Missing required order fields for delivery email template:',
      {
        _id,
        name,
        address,
      }
    );
  }

  const {
    trackingNumber,
    carrier = 'Standard Shipping',
    trackingUrl,
    deliveredDate = new Date(),
  } = shippingDetails;

  const {
    storeName = secret.store_name || 'EWO Store',
    supportEmail = secret.support_email || 'support@example.com',
    clientUrl = secret.client_url || 'https://example.com',
  } = config;

  // Format delivery date
  const formatDeliveredDate = () => {
    const date =
      deliveredDate instanceof Date ? deliveredDate : new Date(deliveredDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle first-time discount display for delivery email
  let firstTimeDiscountHtml = '';
  if (firstTimeDiscount?.isApplied && firstTimeDiscount?.amount > 0) {
    firstTimeDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          🎉 First-time order discount (-${
            firstTimeDiscount?.percentage || 10
          }%)
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(firstTimeDiscount.amount)}
        </td>
      </tr>
    `;
  }

  // Handle regular coupon discount for delivery email
  let couponDiscountHtml = '';
  if (discount > 0) {
    couponDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          💰 Coupon discount
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(discount)}
        </td>
      </tr>
    `;
  }

  // Generate items HTML with safety checks
  const itemsHtml =
    cart && Array.isArray(cart) && cart.length > 0
      ? cart
          .map((item, index) => {
            return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold; color: #2d3748;">${
            item?.title || 'Product'
          }</div>
          ${
            item?.variant
              ? `<div style="font-size: 12px; color: #718096; margin-top: 4px;">${item.variant}</div>`
              : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${
          item?.orderQuantity || item?.quantity || 1
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
          item?.price || 0
        )}</td>
      </tr>
    `;
          })
          .join('')
      : `<tr><td style="padding: 12px; border-bottom: 1px solid #eee;" colspan="3">Order items not available</td></tr>`;

  const content = `
    <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Your Order Has Been Delivered!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your package has arrived safely</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${
      name || 'Valued Customer'
    }</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">Great news! Your order has been successfully delivered. We hope you love your purchase!</p>

    <!-- Order & Delivery Information -->
    <div style="background-color: #f0fff4; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #48bb78;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">✅ Delivery Confirmation</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 50%;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0; text-align: right;">#${
            orderId || _id || 'N/A'
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Delivered Date:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #48bb78; font-weight: bold;">${formatDeliveredDate()}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Delivered By:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${
            carrier || 'Standard Shipping'
          }</td>
        </tr>
        ${
          trackingNumber
            ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Tracking Number:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-family: 'Courier New', monospace; font-weight: bold; color: #4299e1;">
            ${trackingNumber}
          </td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <!-- Delivery Address -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">🏠 Delivery Address</h3>
      <div style="font-size: 15px; line-height: 1.6; color: #4a5568;">
        <strong>${name || 'Customer'}</strong><br>
        ${address || 'Address not provided'}<br>
        ${[city, state, zipCode].filter(Boolean).join(', ')}<br>
        ${country || ''}
      </div>
    </div>

    <!-- Order Items -->
    <h3 style="color: #2d3748; border-bottom: 2px solid #48bb78; padding-bottom: 10px; margin-top: 40px; font-size: 18px;">📦 Items Delivered</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
          <th style="padding: 15px 12px; text-align: left; color: white; font-weight: bold;">Item</th>
          <th style="padding: 15px 12px; text-align: center; color: white; font-weight: bold;">Quantity</th>
          <th style="padding: 15px 12px; text-align: right; color: white; font-weight: bold;">Price</th>
        </tr>
      </thead>
      <tbody style="background-color: white;">
        ${itemsHtml}
      </tbody>
      <tfoot style="background-color: #f8f9fa;">
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;"><strong>Subtotal:</strong></td>
          <td style="padding: 12px; text-align: right; border-top: 1px solid #e2e8f0;">${formatPrice(
            subTotal
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
          <td style="padding: 12px; text-align: right;">${formatPrice(
            shippingCost
          )}</td>
        </tr>
        ${firstTimeDiscountHtml}
        ${couponDiscountHtml}
        <tr style="background-color: #f0fff4;">
          <td colspan="2" style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #2d3748;"><strong>Total Paid:</strong></td>
          <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #48bb78;">${formatPrice(
            totalAmount
          )}</td>
        </tr>
      </tfoot>
    </table>

    <!-- What's Next Section -->
    <div style="background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 15px;">🌟 What's Next?</h4>
      <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Enjoy your new purchase!</li>
        <li style="margin-bottom: 8px;">Need to return something? Check our <a href="${clientUrl}/returns" style="color: #4299e1; text-decoration: none;">return policy</a></li>
        <li style="margin-bottom: 8px;">Leave a review to help other customers</li>
        <li style="margin-bottom: 8px;">Follow us for exclusive deals and new arrivals</li>
      </ul>
    </div>

    <!-- Customer Support -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 15px;">💬 Need Help?</h4>
      <p style="margin: 0; color: #4a5568; line-height: 1.6;">
        If you have any questions about your order or need assistance, our customer service team is here to help!
      </p>
      <p style="margin: 15px 0 0 0;">
        <a href="mailto:${supportEmail}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Contact Support</a>
      </p>
    </div>

    <p style="text-align: center; color: #718096; font-size: 14px; margin-top: 40px;">
      Thank you for choosing <strong>${storeName}</strong>! We appreciate your business and look forward to serving you again.
    </p>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

module.exports = {
  orderConfirmationTemplate,
  shippingConfirmationTemplate,
  deliveryConfirmationTemplate,
};
