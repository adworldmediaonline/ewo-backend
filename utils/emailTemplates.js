/**
 * Email Templates System
 * Provides reusable email templates for different types of emails
 */

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
    <title>Email Notification</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
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
  } = order;

  const {
    storeName = 'Our Store',
    supportEmail = 'support@example.com',
    clientUrl = 'https://example.com',
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
    <h2 style="color: #2d3748; margin-top: 0; margin-bottom: 20px;">Thank You for Your Order!</h2>
    <p>Hello ${name},</p>
    <p>Your order has been received and is now being processed. Here's a summary of your purchase:</p>

    <!-- Order Details -->
    <table style="width: 100%; margin: 30px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
        <td style="padding: 8px 0; text-align: right;">#${_id}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Order Date:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${formatDate()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${paymentMethod}</td>
      </tr>
    </table>

    <!-- Order Items -->
    <h3 style="color: #4a5568; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; border-top: 1px solid #eee;"><strong>Subtotal:</strong></td>
          <td style="padding: 12px; text-align: right; border-top: 1px solid #eee;">${formatPrice(
            subTotal
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
          <td style="padding: 12px; text-align: right;">${formatPrice(
            shippingCost
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;"><strong>Discount:</strong></td>
          <td style="padding: 12px; text-align: right;">-${formatPrice(
            discount
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #eee;"><strong>Total:</strong></td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #eee; font-weight: bold; font-size: 16px;">${formatPrice(
            totalAmount
          )}</td>
        </tr>
      </tfoot>
    </table>

    <p>We'll notify you when your order has shipped. You can track its status in your account dashboard.</p>

    <div style="margin: 40px 0; text-align: center;">
      <a href="${clientUrl}/order/${_id}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Order Details</a>
    </div>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

/**
 * Shipping confirmation email template
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @returns {string} - Complete HTML template
 */
const shippingConfirmationTemplate = (order, config) => {
  const {
    _id,
    name,
    trackingNumber = 'N/A',
    estimatedDelivery = 'In 3-5 business days',
  } = order;

  const {
    storeName = 'Our Store',
    supportEmail = 'support@example.com',
    clientUrl = 'https://example.com',
  } = config;

  const content = `
    <h2 style="color: #2d3748; margin-top: 0; margin-bottom: 20px;">Your Order Has Shipped!</h2>
    <p>Hello ${name},</p>
    <p>Great news! Your order #${_id} has been shipped and is on its way to you.</p>

    <!-- Shipping Details -->
    <table style="width: 100%; margin: 30px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
        <td style="padding: 8px 0; text-align: right;">#${_id}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Tracking Number:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${trackingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Estimated Delivery:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${estimatedDelivery}</td>
      </tr>
    </table>

    <div style="margin: 40px 0; text-align: center;">
      <a href="${clientUrl}/order/${_id}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Your Order</a>
    </div>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

// Export all templates
module.exports = {
  orderConfirmationTemplate,
  shippingConfirmationTemplate,
};
