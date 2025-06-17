# Cart Tracking API Documentation

## Base URL: `/api/cart-tracking`

## Public Endpoints

### 1. Track Add to Cart
`POST /track/add-to-cart`

**Required:** productId, sessionId
**Optional:** userId, email, source, pageUrl, referrer, cartTotalValue, cartItemsCount

### 2. Track Cart Actions
`POST /track/cart-action`

**Actions:** remove_from_cart, update_quantity, clear_cart
**Required:** action, sessionId

### 3. Bulk Track Events
`POST /track/bulk-events`

Track multiple events in one request.

### 4. Mark Conversion
`POST /track/conversion`

Mark cart items as converted when order is placed.

## Admin Endpoints (Auth Required)

### 5. Analytics
`GET /analytics` - Get cart tracking analytics

### 6. Conversion Funnel
`GET /conversion-funnel` - Get conversion statistics

### 7. Popular Products
`GET /popular-products` - Get most added to cart products

### 8. Dashboard Stats
`GET /stats` - Get summary statistics

## User Journey Endpoints

### 9. User Journey
`GET /journey/user/:userId`
`GET /journey/email/:email`
`GET /journey/session/:sessionId`

Get complete cart journey for a user.

## Frontend Integration

```javascript
// Track add to cart
const sessionId = localStorage.getItem('sessionId') || generateSessionId();

await fetch('/api/cart-tracking/track/add-to-cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: product._id,
    quantity: 1,
    sessionId: sessionId,
    userId: user?.id,
    email: user?.email,
    source: 'product_page',
    pageUrl: window.location.href,
    cartTotalValue: getTotalCartValue(),
    cartItemsCount: getCartItemsCount()
  })
});
```
