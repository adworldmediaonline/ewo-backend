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
    email,
    cart,
    subTotal,
    shippingCost,
    discount,
    totalAmount,
    paymentMethod,
    firstTimeDiscount,
    appliedCoupons = [], // Enhanced: Multiple coupons support
    appliedCoupon, // Legacy: Single coupon support for backward compatibility
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

  // Handle multiple coupon discounts
  let couponDiscountHtml = '';

  // Check for multiple coupons first (enhanced)
  if (appliedCoupons && appliedCoupons.length > 0) {
    const totalCouponDiscount = appliedCoupons.reduce(
      (sum, coupon) => sum + (coupon.discount || coupon.discountAmount || 0),
      0
    );

    if (appliedCoupons.length === 1) {
      // Single coupon display
      const coupon = appliedCoupons[0];
      const discountText =
        coupon.discountType === 'percentage'
          ? `${coupon.originalDiscount}% off`
          : `$${coupon.originalDiscount} off`;

      couponDiscountHtml = `
        <tr>
          <td style="padding: 12px; text-align: right;">
            🎫 Coupon Applied: <strong>${coupon.couponCode}</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
              coupon.title
            } (${discountText})</div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(coupon.discount || coupon.discountAmount)}
          </td>
        </tr>
      `;
    } else {
      // Multiple coupons display
      couponDiscountHtml = `
        <tr>
          <td style="padding: 12px; text-align: right;">
            🎫 <strong>${appliedCoupons.length} Coupons Applied</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">
              ${appliedCoupons
                .map(c => `${c.couponCode} (${c.title})`)
                .join(', ')}
            </div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(totalCouponDiscount)}
          </td>
        </tr>
      `;
    }
  } else if (
    appliedCoupon &&
    (appliedCoupon.discount > 0 || appliedCoupon.discountAmount > 0)
  ) {
    // Legacy single coupon support
    const discountText =
      appliedCoupon.discountType === 'percentage'
        ? `${appliedCoupon.originalDiscount}% off`
        : `$${appliedCoupon.originalDiscount} off`;

    couponDiscountHtml = `
      <tr>
        <td style="padding: 12px; text-align: right;">
          🎫 Coupon Applied: <strong>${appliedCoupon.couponCode}</strong>
          <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
            appliedCoupon.title
          } (${discountText})</div>
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(
            appliedCoupon.discount || appliedCoupon.discountAmount
          )}
        </td>
      </tr>
    `;
  } else if (discount > 0) {
    // Fallback to legacy coupon display
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

  // Add coupon success message for multiple or single coupons
  let couponSuccessMessage = '';

  // Handle multiple coupons
  if (appliedCoupons && appliedCoupons.length > 0) {
    const totalSavings = appliedCoupons.reduce(
      (sum, coupon) => sum + (coupon.discount || coupon.discountAmount || 0),
      0
    );

    if (appliedCoupons.length === 1) {
      const coupon = appliedCoupons[0];
      couponSuccessMessage = `
      <!-- Single Coupon Success Message -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
        <h4 style="color: #0c4a6e; margin-top: 0; margin-bottom: 10px;">🎫 Coupon Applied Successfully!</h4>
        <p style="color: #075985; margin: 0; line-height: 1.6;">
          <strong>${coupon.couponCode}</strong> - ${coupon.title}<br>
          <span style="font-size: 14px;">You saved ${formatPrice(
            coupon.discount || coupon.discountAmount
          )} on this order!</span>
        </p>
      </div>
      `;
    } else {
      const couponList = appliedCoupons
        .map(c => `<strong>${c.couponCode}</strong> (${c.title})`)
        .join('<br>');
      couponSuccessMessage = `
      <!-- Multiple Coupons Success Message -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
        <h4 style="color: #0c4a6e; margin-top: 0; margin-bottom: 10px;">🎫 ${
          appliedCoupons.length
        } Coupons Applied Successfully!</h4>
        <div style="color: #075985; margin: 0; line-height: 1.6;">
          ${couponList}<br>
          <span style="font-size: 14px; font-weight: bold; margin-top: 10px; display: block;">Total savings: ${formatPrice(
            totalSavings
          )}!</span>
        </div>
      </div>
      `;
    }
  } else if (
    appliedCoupon &&
    (appliedCoupon.discount > 0 || appliedCoupon.discountAmount > 0)
  ) {
    // Legacy single coupon support
    couponSuccessMessage = `
    <!-- Coupon Success Message -->
    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
      <h4 style="color: #0c4a6e; margin-top: 0; margin-bottom: 10px;">🎫 Coupon Applied Successfully!</h4>
      <p style="color: #075985; margin: 0; line-height: 1.6;">
        <strong>${appliedCoupon.couponCode}</strong> - ${
      appliedCoupon.title
    }<br>
        <span style="font-size: 14px;">You saved ${formatPrice(
          appliedCoupon.discount || appliedCoupon.discountAmount
        )} on this order!</span>
      </p>
    </div>
    `;
  }

  // Create the main content
  const content = `
    <div style="background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Your Order is Confirmed!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Thank you for your order with East West Off Road!</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">Thank you for your order with East West Off Road! We're excited to let you know that your order has been successfully confirmed.</p>

    ${couponSuccessMessage}

    <!-- Order Details -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #4299e1;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 50%;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #4299e1; font-family: 'Courier New', monospace; font-weight: bold;">--- ${_id} ---</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Order Date & Time:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: #48bb78; font-weight: bold;">--- ${formatDate()} ---</td>
        </tr>
      </table>
    </div>

    <!-- Order Items -->
    <h3 style="color: #2d3748; border-bottom: 2px solid #4299e1; padding-bottom: 10px; margin-top: 40px; font-size: 18px;">Order Summary:</h3>
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
      <p style="color: #4a5568; line-height: 1.6; margin: 0;">We'll notify you again as soon as your order is shipped. Meanwhile, you can track or view your order anytime by clicking the link below:</p>
    </div>

    <!-- Action Buttons -->
    <div style="margin: 40px 0; text-align: center; padding: 30px; background-color: #f8f9fa; border-radius: 8px;">
      <a href="${clientUrl}/order/${_id}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">👉 View Your Order</a>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Thank you once again for choosing us! We truly appreciate your business.</p>

    <div style="text-align: center; margin-top: 40px;">
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Best regards,</p>
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Team East West Off Road</p>
      <p style="font-size: 14px; color: #718096;">${supportEmail} | [Phone Number]</p>
    </div>
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
    appliedCoupons = [], // Enhanced: Multiple coupons support
    appliedCoupon, // Legacy: Single coupon support for backward compatibility
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

  // Handle multiple coupon discounts for shipping email
  let couponDiscountHtml = '';

  // Check for multiple coupons first (enhanced)
  if (appliedCoupons && appliedCoupons.length > 0) {
    const totalCouponDiscount = appliedCoupons.reduce(
      (sum, coupon) => sum + (coupon.discountAmount || 0),
      0
    );

    if (appliedCoupons.length === 1) {
      // Single coupon display
      const coupon = appliedCoupons[0];
      const discountText =
        coupon.discountType === 'percentage'
          ? `${coupon.originalDiscount}% off`
          : `$${coupon.originalDiscount} off`;

      couponDiscountHtml = `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;">
            🎫 Coupon Applied: <strong>${coupon.couponCode}</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
              coupon.title
            } (${discountText})</div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(coupon.discountAmount)}
          </td>
        </tr>
      `;
    } else {
      // Multiple coupons display
      couponDiscountHtml = `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;">
            🎫 <strong>${appliedCoupons.length} Coupons Applied</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">
              ${appliedCoupons
                .map(c => `${c.couponCode} (${c.title})`)
                .join(', ')}
            </div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(totalCouponDiscount)}
          </td>
        </tr>
      `;
    }
  } else if (appliedCoupon && appliedCoupon.discountAmount > 0) {
    // Legacy single coupon support
    const discountText =
      appliedCoupon.discountType === 'percentage'
        ? `${appliedCoupon.originalDiscount}% off`
        : `$${appliedCoupon.originalDiscount} off`;

    couponDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          🎫 Coupon Applied: <strong>${appliedCoupon.couponCode}</strong>
          <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
            appliedCoupon.title
          } (${discountText})</div>
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(appliedCoupon.discountAmount)}
        </td>
      </tr>
    `;
  } else if (discount > 0) {
    // Fallback to legacy coupon display
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
    appliedCoupons = [], // Enhanced: Multiple coupons support
    appliedCoupon, // Legacy: Single coupon support for backward compatibility
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

  // Handle multiple coupon discounts for delivery email
  let couponDiscountHtml = '';

  // Check for multiple coupons first (enhanced)
  if (appliedCoupons && appliedCoupons.length > 0) {
    const totalCouponDiscount = appliedCoupons.reduce(
      (sum, coupon) => sum + (coupon.discountAmount || 0),
      0
    );

    if (appliedCoupons.length === 1) {
      // Single coupon display
      const coupon = appliedCoupons[0];
      const discountText =
        coupon.discountType === 'percentage'
          ? `${coupon.originalDiscount}% off`
          : `$${coupon.originalDiscount} off`;

      couponDiscountHtml = `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;">
            🎫 Coupon Applied: <strong>${coupon.couponCode}</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
              coupon.title
            } (${discountText})</div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(coupon.discountAmount)}
          </td>
        </tr>
      `;
    } else {
      // Multiple coupons display
      couponDiscountHtml = `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right;">
            🎫 <strong>${appliedCoupons.length} Coupons Applied</strong>
            <div style="font-size: 12px; color: #718096; margin-top: 2px;">
              ${appliedCoupons
                .map(c => `${c.couponCode} (${c.title})`)
                .join(', ')}
            </div>
          </td>
          <td style="padding: 12px; text-align: right; color: #48bb78;">
            -${formatPrice(totalCouponDiscount)}
          </td>
        </tr>
      `;
    }
  } else if (appliedCoupon && appliedCoupon.discountAmount > 0) {
    // Legacy single coupon support
    const discountText =
      appliedCoupon.discountType === 'percentage'
        ? `${appliedCoupon.originalDiscount}% off`
        : `$${appliedCoupon.originalDiscount} off`;

    couponDiscountHtml = `
      <tr>
        <td colspan="2" style="padding: 12px; text-align: right;">
          🎫 Coupon Applied: <strong>${appliedCoupon.couponCode}</strong>
          <div style="font-size: 12px; color: #718096; margin-top: 2px;">${
            appliedCoupon.title
          } (${discountText})</div>
        </td>
        <td style="padding: 12px; text-align: right; color: #48bb78;">
          -${formatPrice(appliedCoupon.discountAmount)}
        </td>
      </tr>
    `;
  } else if (discount > 0) {
    // Fallback to legacy coupon display
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

/**
 * Order cancellation email template
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @returns {string} - Complete HTML template
 */
const orderCancellationTemplate = (order, config) => {
  const {
    _id,
    orderId,
    name,
    email,
    cart,
    subTotal,
    shippingCost,
    discount,
    totalAmount,
    paymentMethod,
    firstTimeDiscount,
    appliedCoupons = [],
    appliedCoupon,
    createdAt,
    cancelledAt = new Date(),
  } = order;

  const { storeName, supportEmail, clientUrl } = config;

  // Format cancellation date
  const formatCancelledDate = () => {
    const date = new Date(cancelledAt);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Generate order summary with items
  const orderSummaryHtml =
    cart && Array.isArray(cart) && cart.length > 0
      ? cart
          .map(
            (item, index) => `
        <div style="padding: 8px 0; border-bottom: 1px solid #eee; ${
          index === cart.length - 1 ? 'border-bottom: none;' : ''
        }">
          <strong>${item?.title || 'Product'}</strong> x ${
              item?.orderQuantity || item?.quantity || 1
            }
        </div>
      `
          )
          .join('')
      : '<div style="padding: 8px 0;">Order items not available</div>';

  const content = `
    <div style="background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Order Cancelled</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your order has been successfully cancelled</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${
      name || 'Valued Customer'
    }</strong>,</p>

    <p style="font-size: 16px; line-height: 1.6;">We wanted to let you know that your order placed with <strong>${storeName}</strong> has been successfully cancelled.</p>

    <!-- Order Summary -->
    <div style="background-color: #fff5f5; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f56565;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">📋 Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 50%;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0; text-align: right;">#${
            orderId || _id || 'N/A'
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Order Total:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatPrice(
            totalAmount
          )}</td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <h4 style="color: #2d3748; margin-bottom: 10px; font-size: 16px;">Items Cancelled:</h4>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #fed7d7;">
          ${orderSummaryHtml}
        </div>
      </div>
    </div>

    <!-- Cancellation Details -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 18px;">🕒 Order Cancelled On</h3>
      <p style="font-size: 16px; font-weight: bold; color: #e53e3e; margin: 0;">
        ${formatCancelledDate()}
      </p>
    </div>

    ${
      paymentMethod === 'Card'
        ? `
    <!-- Refund Information -->
    <div style="background-color: #f0fff4; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #48bb78;">
      <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 15px; font-size: 18px;">💰 Refund Information</h3>
      <p style="margin: 0; color: #4a5568; line-height: 1.6;">
        Since you paid by card, a full refund of <strong>${formatPrice(
          totalAmount
        )}</strong> has been processed and will appear on your original payment method within 5-10 business days.
      </p>
    </div>
    `
        : ''
    }

    <!-- Call to Action -->
    <div style="text-align: center; margin: 40px 0;">
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        If this was a mistake or you'd like to place a new order, you can always visit us again:
      </p>
      <a href="${clientUrl}" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        👉 Shop Again Now
      </a>
    </div>

    <!-- Customer Support -->
    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <h4 style="color: #2d3748; margin-top: 0; margin-bottom: 15px;">💬 Need Help?</h4>
      <p style="margin: 0 0 15px 0; color: #4a5568; line-height: 1.6;">
        We're here to help if you have any questions or need further assistance.
      </p>
      <p style="margin: 0; color: #4a5568; line-height: 1.6;">
        <strong>Email:</strong> <a href="mailto:${supportEmail}" style="color: #4299e1; text-decoration: none;">${supportEmail}</a>
      </p>
    </div>

    <p style="text-align: center; color: #718096; font-size: 16px; margin-top: 40px; line-height: 1.6;">
      Thank you for checking us out. We hope to serve you again soon!<br>
      <strong>Warm regards,</strong><br>
      <strong>Team ${storeName}</strong>
    </p>
  `;

  return baseTemplate({
    content,
    storeName,
    supportEmail,
  });
};

/**
 * Feedback email template with embedded review form
 * @param {Object} order - Order data
 * @param {Object} config - Configuration
 * @param {string} reviewToken - Secure token for review submission
 * @returns {string} - Complete HTML template
 */
const feedbackEmailTemplate = (order, config, reviewToken) => {
  const {
    _id,
    orderId,
    name,
    email,
    cart = [],
    totalAmount = 0,
    shippingDetails = {},
  } = order || {};

  const {
    storeName = 'EWO Store',
    supportEmail = 'support@example.com',
    clientUrl = 'https://example.com',
  } = config;

  // Format delivery date
  const formatDeliveredDate = () => {
    const date = shippingDetails.deliveredDate
      ? new Date(shippingDetails.deliveredDate)
      : new Date();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate product list
  const productList = cart
    .map(
      item => `
    <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
      <img src="${item.img || '/placeholder.png'}" alt="${item.title}"
           style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
      <div>
        <h4 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">${
          item.title
        }</h4>
        <p style="margin: 0; color: #666; font-size: 14px;">Quantity: ${
          item.quantity
        }</p>
        <p style="margin: 0; color: #007bff; font-size: 14px; font-weight: bold;">$${
          item.price
        }</p>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>How was your order? - ${storeName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .container { max-width: 500px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 40px 30px; text-align: center; color: white; }
        .content { padding: 40px 30px; }
        .review-section { background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .star-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 25px 0; max-width: 450px; margin-left: auto; margin-right: auto; }
        .star-button { background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%); color: white; border: none; padding: 20px 10px; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: bold; text-decoration: none; display: block; transition: all 0.2s; box-shadow: 0 3px 6px rgba(0,0,0,0.15); text-align: center; }
        .star-button:hover { transform: translateY(-2px); box-shadow: 0 5px 12px rgba(0,0,0,0.25); background: linear-gradient(135deg, #ffb300 0%, #ffa000 100%); }
        .star-button:active { transform: translateY(0px); }
        .rating-text { font-size: 18px; margin-bottom: 20px; color: #333; font-weight: bold; }
        .instruction { font-size: 14px; color: #666; margin-bottom: 20px; }
        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; color: #666; font-size: 14px; }
        @media (max-width: 600px) {
          .container { margin: 10px; }
          .header, .content { padding: 25px 15px; }
          .star-buttons { grid-template-columns: 1fr; gap: 10px; max-width: 300px; }
          .star-button { padding: 18px 12px; font-size: 14px; }
          .review-section { padding: 20px 15px; }
          .rating-text { font-size: 16px; }
          .instruction { font-size: 13px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⭐ How was your order?</h1>
          <p style="margin-top: 15px; opacity: 0.9; font-size: 16px;">We'd love to hear about your experience</p>
        </div>

        <div class="content">
          <div class="review-section">
            <div class="rating-text">Please rate your experience:</div>
            <div class="instruction">Click the button below to rate and review your order</div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="http://localhost:8000/api/review/unified-feedback?token=${reviewToken}"
                 style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 8px rgba(0,123,255,0.3);">
                ⭐ Rate & Review Your Order
              </a>
            </div>

            <div style="margin-top: 15px; text-align: center;">
              <p style="font-size: 12px; color: #666; margin: 0;">
                Takes less than 2 minutes • Help other customers
              </p>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing ${storeName}!</p>
          <p style="margin-top: 10px;">Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #007bff; text-decoration: none;">${supportEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  orderConfirmationTemplate,
  shippingConfirmationTemplate,
  deliveryConfirmationTemplate,
  orderCancellationTemplate,
  feedbackEmailTemplate,
};
