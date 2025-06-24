# Enhanced Coupon Management System API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Role-Based Access Control](#role-based-access-control)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

The Enhanced Coupon Management System provides comprehensive functionality for creating, managing, and tracking promotional coupons with advanced features including:

- Multiple discount types (percentage, fixed amount, buy X get Y, free shipping)
- Advanced usage restrictions and limits
- Product/category/brand-specific targeting
- User restrictions and eligibility
- Comprehensive analytics and reporting
- Bulk operations and coupon duplication

## Role-Based Access Control

### Security Implementation

The coupon management system is secured with role-based access control (RBAC) to ensure only authorized personnel can access coupon management features.

#### Backend Protection

All coupon management API endpoints are protected with authentication and role-based authorization:

```javascript
// Only Admin role can access coupon management endpoints
router.post('/add', verifyToken, roleAuth('Admin'), addCoupon);
router.get('/', verifyToken, roleAuth('Admin'), getAllCoupons);
router.patch('/:id', verifyToken, roleAuth('Admin'), updateCoupon);
router.delete('/:id', verifyToken, roleAuth('Admin'), deleteCoupon);
```

#### Frontend Protection

The admin panel implements multiple layers of protection:

1. **Page-Level Protection**: The coupon page checks user permissions before rendering
2. **Component-Level Protection**: Individual components verify user roles
3. **Menu-Level Protection**: Sidebar menu items are filtered based on permissions
4. **Route Guard**: Automatic redirection for unauthorized access attempts

#### Role Permissions

| Role | Can View Coupons | Can Manage Coupons | Can View Analytics |
|------|------------------|--------------------|--------------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| Super Admin | ❌ No | ❌ No | ❌ No |
| Manager | ❌ No | ❌ No | ❌ No |
| CEO | ❌ No | ❌ No | ❌ No |

#### Public Endpoints

These endpoints remain publicly accessible for customer-facing functionality:

- `POST /api/coupon/validate` - Validate coupon codes during checkout
- `POST /api/coupon/apply` - Apply coupons to orders (internal use)
- `GET /api/coupon/valid/list` - Get valid coupons for customers
- `POST /api/coupon/products/applicable` - Get applicable coupons for products

#### Error Handling

Unauthorized access attempts return appropriate HTTP status codes:

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Valid authentication but insufficient role permissions

Example error response:
```json
{
  "success": false,
  "message": "Access denied. Required roles: Admin"
}
```

## Models

### Coupon Model

```javascript
{
  // Basic Information
  title: String,                    // Coupon title (required)
  description: String,              // Coupon description (optional)
  logo: String,                     // Coupon logo URL (optional)
  couponCode: String,               // Unique coupon code (required, auto-uppercase)
  startTime: Date,                  // Start date/time (default: now)
  endTime: Date,                    // End date/time (required)
  
  // Discount Configuration
  discountType: String,             // 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping'
  discountPercentage: Number,       // Percentage discount (0-100, required for percentage type)
  discountAmount: Number,           // Fixed discount amount (required for fixed_amount type)
  buyQuantity: Number,              // Buy quantity (required for buy_x_get_y type)
  getQuantity: Number,              // Get quantity (required for buy_x_get_y type)
  
  // Usage Restrictions
  minimumAmount: Number,            // Minimum order amount (required)
  maximumAmount: Number,            // Maximum order amount (optional)
  usageLimit: Number,               // Total usage limit (optional)
  usageLimitPerUser: Number,        // Per-user usage limit (optional)
  usageCount: Number,               // Current usage count (auto-managed)
  
  // Product/Category Restrictions
  applicableType: String,           // 'all' | 'category' | 'product' | 'brand'
  productType: String,              // Legacy category field (for backward compatibility)
  applicableProducts: [ObjectId],   // Specific product IDs
  applicableCategories: [String],   // Category names
  applicableBrands: [String],       // Brand names
  excludedProducts: [ObjectId],     // Excluded product IDs
  
  // User Restrictions
  userRestrictions: {
    newUsersOnly: Boolean,          // Restrict to new users only
    allowedUsers: [ObjectId],       // Specific allowed users
    excludedUsers: [ObjectId]       // Specific excluded users
  },
  
  // Advanced Settings
  stackable: Boolean,               // Can be combined with other coupons
  priority: Number,                 // Priority for coupon application
  
  // Status and Metadata
  status: String,                   // 'active' | 'inactive' | 'expired' | 'exhausted'
  isPublic: Boolean,                // Publicly visible coupon
  createdBy: ObjectId,              // Admin who created the coupon
  
  // Analytics
  analytics: {
    totalUsage: Number,             // Total times used
    totalDiscount: Number,          // Total discount amount given
    totalRevenue: Number,           // Total revenue generated
    lastUsed: Date                  // Last usage date
  }
}
```

### CouponUsage Model

```javascript
{
  couponId: ObjectId,               // Reference to coupon (required)
  userId: ObjectId,                 // User who used the coupon
  orderId: ObjectId,                // Order where coupon was used (required)
  sessionId: String,                // Session ID for guest users
  discountAmount: Number,           // Discount amount applied (required)
  orderTotal: Number,               // Total order amount (required)
  applicableItems: Number,          // Number of applicable items
  userAgent: String,                // User agent string
  ipAddress: String,                // IP address
  source: String                    // 'web' | 'mobile' | 'admin' | 'api'
}
```

## API Endpoints

### Basic CRUD Operations

#### Create Coupon
```http
POST /api/coupon/add
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Summer Sale 2024",
  "description": "Get 20% off on all summer items",
  "logo": "https://example.com/logo.jpg",
  "couponCode": "SUMMER20",
  "discountType": "percentage",
  "discountPercentage": 20,
  "minimumAmount": 50,
  "endTime": "2024-08-31T23:59:59Z",
  "applicableType": "category",
  "applicableCategories": ["summer", "clothing"]
}
```

#### Get All Coupons
```http
GET /api/coupon
```

#### Get Coupon by ID
```http
GET /api/coupon/:id
```

#### Update Coupon
```http
PATCH /api/coupon/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "discountPercentage": 25
}
```

#### Delete Coupon
```http
DELETE /api/coupon/:id
Authorization: Bearer <admin_token>
```

### Enhanced Coupon Operations

#### Validate Coupon
```http
POST /api/coupon/validate
Content-Type: application/json

{
  "couponCode": "SUMMER20",
  "cartItems": [
    {
      "productId": "product_id_1",
      "price": 29.99,
      "quantity": 2,
      "category": "summer",
      "brand": "BrandName"
    }
  ],
  "cartTotal": 59.98,
  "userId": "user_id_optional"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "couponId": "coupon_id",
    "couponCode": "SUMMER20",
    "discountType": "percentage",
    "discount": 11.99,
    "applicableItems": 1,
    "title": "Summer Sale 2024",
    "description": "Get 20% off on all summer items"
  }
}
```

#### Apply Coupon to Order
```http
POST /api/coupon/apply
Content-Type: application/json

{
  "couponId": "coupon_id",
  "orderId": "order_id",
  "userId": "user_id_optional",
  "discountAmount": 11.99,
  "orderTotal": 59.98,
  "sessionId": "session_id_optional"
}
```

#### Get Valid Coupons for User
```http
GET /api/coupon/valid/list?userId=user_id_optional
```

#### Get Coupons for Specific Products
```http
POST /api/coupon/products/applicable
Content-Type: application/json

{
  "productIds": ["product_id_1", "product_id_2"]
}
```

### Analytics and Reporting

#### Get Coupon Analytics
```http
GET /api/coupon/:id/analytics?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coupon": {
      "_id": "coupon_id",
      "title": "Summer Sale 2024",
      "couponCode": "SUMMER20",
      "status": "active",
      "usageCount": 150,
      "usageLimit": 1000
    },
    "analytics": {
      "totalUsage": 150,
      "totalDiscount": 2998.50,
      "totalRevenue": 14992.50,
      "avgOrderValue": 99.95,
      "avgDiscount": 19.99,
      "uniqueUsers": 120
    }
  }
}
```

#### Get Overall Analytics
```http
GET /api/coupon/analytics/overview?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

### Bulk Operations

#### Bulk Update Coupons
```http
PATCH /api/coupon/bulk/update
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "couponIds": ["coupon_id_1", "coupon_id_2"],
  "updateData": {
    "status": "inactive"
  }
}
```

#### Duplicate Coupon
```http
POST /api/coupon/:id/duplicate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newCouponCode": "SUMMER20_COPY"
}
```

## Coupon Types and Examples

### 1. Percentage Discount
```json
{
  "discountType": "percentage",
  "discountPercentage": 15,
  "minimumAmount": 100
}
```

### 2. Fixed Amount Discount
```json
{
  "discountType": "fixed_amount",
  "discountAmount": 25,
  "minimumAmount": 150
}
```

### 3. Buy X Get Y
```json
{
  "discountType": "buy_x_get_y",
  "buyQuantity": 3,
  "getQuantity": 1,
  "applicableType": "category",
  "applicableCategories": ["shoes"]
}
```

### 4. Free Shipping
```json
{
  "discountType": "free_shipping",
  "minimumAmount": 50
}
```

## Usage Restrictions Examples

### Category-Specific Coupon
```json
{
  "applicableType": "category",
  "applicableCategories": ["electronics", "gadgets"],
  "excludedProducts": ["product_id_1"]
}
```

### Product-Specific Coupon
```json
{
  "applicableType": "product",
  "applicableProducts": ["product_id_1", "product_id_2"]
}
```

### Brand-Specific Coupon
```json
{
  "applicableType": "brand",
  "applicableBrands": ["Nike", "Adidas"]
}
```

### New Users Only
```json
{
  "userRestrictions": {
    "newUsersOnly": true
  }
}
```

### User-Specific Coupon
```json
{
  "userRestrictions": {
    "allowedUsers": ["user_id_1", "user_id_2"]
  }
}
```

## Frontend Integration

### Validate Coupon in Checkout
```javascript
const validateCoupon = async (couponCode, cartItems, cartTotal, userId) => {
  try {
    const response = await fetch('/api/coupon/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        couponCode,
        cartItems,
        cartTotal,
        userId
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Coupon validation failed:', error);
    return { success: false, message: 'Validation failed' };
  }
};
```

### Apply Coupon After Order Creation
```javascript
const applyCouponToOrder = async (couponId, orderId, discountAmount, orderTotal) => {
  try {
    const response = await fetch('/api/coupon/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        couponId,
        orderId,
        discountAmount,
        orderTotal,
        userId: user?.id,
        sessionId: sessionStorage.getItem('sessionId')
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to apply coupon:', error);
  }
};
```

## Error Handling

### Common Error Responses

#### Invalid Coupon Code
```json
{
  "success": false,
  "message": "Invalid coupon code"
}
```

#### Expired Coupon
```json
{
  "success": false,
  "message": "Coupon is expired or not available"
}
```

#### Usage Limit Exceeded
```json
{
  "success": false,
  "message": "You have reached the usage limit for this coupon"
}
```

#### Minimum Amount Not Met
```json
{
  "success": false,
  "message": "Minimum order amount of $100 required"
}
```

#### No Applicable Items
```json
{
  "success": false,
  "message": "No applicable items in cart"
}
```

## Best Practices

### 1. Coupon Code Generation
- Use clear, memorable codes
- Include expiration hints (e.g., SUMMER2024)
- Avoid confusing characters (0, O, I, l)

### 2. Usage Limits
- Set reasonable total usage limits
- Consider per-user limits for high-value coupons
- Monitor usage patterns

### 3. Product Targeting
- Use category-based targeting for broad campaigns
- Use product-specific targeting for clearance sales
- Exclude sale items when appropriate

### 4. Analytics Monitoring
- Track conversion rates
- Monitor discount-to-revenue ratios
- Analyze user behavior patterns

### 5. Security Considerations
- Validate all coupon applications server-side
- Implement rate limiting for validation attempts
- Log all coupon usage for audit trails

## Migration from Legacy System

### Backward Compatibility
The enhanced system maintains full backward compatibility with existing coupons:

- `productType` field maps to `applicableCategories`
- `discountPercentage` continues to work for percentage coupons
- Existing API endpoints remain functional
- Legacy coupon codes continue to work

### Migration Steps
1. Update backend models (automatic via Mongoose)
2. Deploy new API endpoints
3. Update admin panel components
4. Test legacy coupon functionality
5. Gradually migrate to new features

## Support and Troubleshooting

### Common Issues

1. **Coupon not applying**: Check minimum amount requirements
2. **Invalid coupon error**: Verify coupon code spelling and status
3. **Analytics not showing**: Ensure proper date range selection
4. **Bulk operations failing**: Check admin permissions

### Debugging

Enable detailed logging by setting environment variable:
```bash
DEBUG_COUPONS=true
```

This will log all coupon validation and application attempts for troubleshooting. 