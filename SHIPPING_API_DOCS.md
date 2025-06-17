# Shipping Email Notification API

## Overview
Professional order shipment email notifications with tracking information.

## Key Features
- Automatic emails when order status changes to "shipped"
- Mobile-responsive email templates
- Comprehensive order details and tracking information
- Bulk shipping operations
- Full email client compatibility

## API Endpoints

### Update Order Status (Enhanced)
```
PATCH /api/order/update-status/:id
Body: { "status": "shipped" }
```

### Send Shipping Notification
```
POST /api/order/send-shipping-notification/{orderId}
Body: {
  "trackingNumber": "1Z9999999999999999",  // Tracking number from carrier
  "carrier": "UPS",                        // Required
  "estimatedDelivery": "2024-12-15T00:00:00Z"
}
```

### Ship Order with Tracking
```
POST /api/shipping/ship/{orderId}
Body: {
  "trackingNumber": "1Z9999999999999999",  // Optional tracking number from carrier
  "carrier": "UPS",                        // Required carrier name
  "estimatedDelivery": "2024-12-15T00:00:00Z"
}
```

### Get Shippable Orders
```
GET /api/shipping/shippable-orders
```

### Bulk Ship Orders
```
POST /api/shipping/bulk-ship
Body: {
  "orderIds": ["id1", "id2"],
  "shippingData": {
    "carrier": "UPS",
    "estimatedDelivery": "2024-12-15T00:00:00Z"
  }
}
```

## Email Template Features
- Professional design with gradients and modern styling
- Complete order information including items and pricing
- Shipping address and tracking details
- Mobile-responsive layout
- Compatible with all major email clients

## Setup Required
Add to your .env file:
```
SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
STORE_NAME=Your Store Name
SUPPORT_EMAIL=support@yourstore.com
```

## Usage Example
When admin ships an order, they provide both Order ID and Tracking Number:

```javascript
// Admin ships order with Order ID: "6123456789abcdef12345678"
// and Tracking Number from UPS: "1Z9999999999999999"

const response = await fetch('/api/shipping/ship/6123456789abcdef12345678', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackingNumber: '1Z9999999999999999',  // From UPS (separate from order ID)
    carrier: 'UPS',
    estimatedDelivery: '2024-12-15T00:00:00Z'
  })
});
```

This will:
1. Update the order status to "shipped"
2. Store the tracking number separately from the order ID
3. Send a professional email to the customer with all order details
