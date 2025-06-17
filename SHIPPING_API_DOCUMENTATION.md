# Shipping Email Notification API Documentation

## Overview
This feature allows admins to send professional email notifications to customers when orders are marked as shipped. The system includes comprehensive order details, tracking information, and a mobile-responsive email design.

## Features
- ✅ Automatic email notifications when order status changes to "shipped"
- ✅ Professional, mobile-responsive email templates
- ✅ Comprehensive order details including items, pricing, and shipping address
- ✅ Tracking number and carrier information
- ✅ Estimated delivery dates
- ✅ Bulk shipping operations
- ✅ Full email client compatibility

## API Endpoints

### Order Management

#### 1. Update Order Status (Enhanced)
```
PATCH /api/order/update-status/:id
```
**Description**: Updates order status and automatically sends shipping notification if status is changed to "shipped"

**Request Body**:
```json
{
  "status": "shipped"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Status updated successfully",
  "emailSent": true,
  "emailMessage": "Shipping notification sent successfully"
}
```

#### 2. Send Shipping Notification
```
POST /api/order/send-shipping-notification/:id
```
**Description**: Manually send shipping notification with tracking details

**Request Body**:
```json
{
  "trackingNumber": "1Z9999999999999999",
  "carrier": "UPS",
  "trackingUrl": "https://www.ups.com/track?tracknum=1Z9999999999999999",
  "estimatedDelivery": "2024-12-15T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shipping notification sent successfully",
  "data": {
    "trackingNumber": "1Z9999999999999999",
    "carrier": "UPS"
  }
}
```

#### 3. Update Shipping Details
```
PATCH /api/order/update-shipping/:id
```
**Description**: Update shipping details and optionally send notification

**Request Body**:
```json
{
  "trackingNumber": "1Z9999999999999999",
  "carrier": "UPS",
  "trackingUrl": "https://www.ups.com/track?tracknum=1Z9999999999999999",
  "estimatedDelivery": "2024-12-15T00:00:00Z",
  "sendEmail": true
}
```

### Shipping Management

#### 4. Ship Order
```
POST /api/shipping/ship/:id
```
**Description**: Process order shipment with full tracking details

**Request Body**:
```json
{
  "trackingNumber": "1Z9999999999999999",
  "carrier": "UPS",
  "estimatedDelivery": "2024-12-15T00:00:00Z",
  "sendEmailNotification": true
}
```

#### 5. Get Shippable Orders
```
GET /api/shipping/shippable-orders
```
**Description**: Get all orders ready for shipping (pending/processing status)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-20241201-ABC123",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "shippingAddress": {
        "address": "123 Main St",
        "city": "New York",
        "state": "NY"
      },
      "totalAmount": 99.99,
      "status": "processing",
      "orderDate": "2024-12-01T10:00:00Z",
      "itemCount": 2
    }
  ],
  "count": 1
}
```

#### 6. Get Shipped Orders
```
GET /api/shipping/shipped-orders?page=1&limit=20
```
**Description**: Get paginated list of shipped orders

#### 7. Get Shipping Status
```
GET /api/shipping/status/:id
```
**Description**: Get shipping status and tracking details for an order

#### 8. Update Tracking Information
```
PATCH /api/shipping/tracking/:id
```
**Description**: Update tracking information for shipped order

**Request Body**:
```json
{
  "trackingNumber": "1Z9999999999999999",
  "carrier": "UPS",
  "trackingUrl": "https://www.ups.com/track?tracknum=1Z9999999999999999",
  "estimatedDelivery": "2024-12-15T00:00:00Z"
}
```

#### 9. Bulk Ship Orders
```
POST /api/shipping/bulk-ship
```
**Description**: Ship multiple orders at once

**Request Body**:
```json
{
  "orderIds": ["order_id_1", "order_id_2", "order_id_3"],
  "shippingData": {
    "carrier": "UPS",
    "estimatedDelivery": "2024-12-15T00:00:00Z",
    "sendEmailNotification": true
  }
}
```

## Email Template Features

### Professional Design
- Modern, clean layout with gradient headers
- Mobile-responsive design
- Professional color scheme
- Consistent branding

### Comprehensive Information
- Complete order details with items and pricing
- Full shipping address
- Tracking information with direct links
- Estimated delivery dates
- Order summary with totals

### Email Client Compatibility
- Works across all major email clients (Gmail, Outlook, Apple Mail, etc.)
- Mobile-responsive for smartphones and tablets
- Proper fallbacks for older email clients
- Anti-spam compliant

## Order Model Updates

The Order model now includes:

```javascript
{
  // ... existing fields
  shippingNotificationSent: Boolean,
  shippingDetails: {
    trackingNumber: String,
    carrier: String,
    trackingUrl: String,
    estimatedDelivery: Date,
    shippedDate: Date
  }
}
```

## Environment Variables Required

Ensure these are set in your `.env` file:

```
# Email Configuration
SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
HOST=smtp.gmail.com
EMAIL_PORT=587

# Store Information
STORE_NAME=Your Store Name
SUPPORT_EMAIL=support@yourstore.com
STORE_URL=https://yourstore.com
```

## Usage Examples

### Basic Shipping Notification
```javascript
// When order status changes to 'shipped'
const response = await fetch('/api/order/update-status/ORDER_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'shipped' })
});
```

### Advanced Shipping with Tracking
```javascript
// Ship order with full tracking details
const response = await fetch('/api/shipping/ship/ORDER_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackingNumber: '1Z9999999999999999',
    carrier: 'UPS',
    estimatedDelivery: '2024-12-15T00:00:00Z',
    sendEmailNotification: true
  })
});
```

### Bulk Shipping
```javascript
// Ship multiple orders at once
const response = await fetch('/api/shipping/bulk-ship', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderIds: ['order1', 'order2', 'order3'],
    shippingData: {
      carrier: 'UPS',
      estimatedDelivery: '2024-12-15T00:00:00Z',
      sendEmailNotification: true
    }
  })
});
```

## Error Handling

All endpoints include comprehensive error handling:

- **400 Bad Request**: Invalid data or missing required fields
- **404 Not Found**: Order not found
- **500 Internal Server Error**: Server or email sending errors

Example error response:
```json
{
  "success": false,
  "message": "Invalid shipping data",
  "errors": ["Either tracking number or carrier is required"]
}
```

## Security Considerations

- All shipping operations should be admin-only (implement proper authentication)
- Email rate limiting is built-in to prevent spam
- Input validation on all shipping data
- Secure email configuration with proper authentication

## Testing

To test the email functionality:

1. Ensure email configuration is properly set
2. Create a test order
3. Use the shipping endpoints to mark as shipped
4. Check that emails are received and properly formatted
5. Verify email appearance in different clients (Gmail, Outlook, mobile)

## Support

For issues or questions about the shipping notification system:
- Check error logs for email sending failures
- Verify email configuration settings
- Ensure orders have valid email addresses
- Test email templates in different clients
