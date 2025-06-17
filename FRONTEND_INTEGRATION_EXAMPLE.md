# Frontend Integration Example for Cart Tracking

## Basic Setup

### 1. Generate Session ID
```javascript
// Generate a unique session ID for tracking
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Store session ID in localStorage
const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_tracking_session');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('cart_tracking_session', sessionId);
  }
  return sessionId;
};
```

### 2. Track Add to Cart Event
```javascript
const trackAddToCart = async (product, quantity = 1, source = 'product-page') => {
  try {
    const sessionId = getSessionId();
    const userId = getCurrentUserId(); // Your user ID function
    const userEmail = getCurrentUserEmail(); // Your user email function

    const trackingData = {
      productId: product._id,
      quantity: quantity,
      sessionId: sessionId,
      userId: userId,
      userEmail: userEmail,
      source: source,
      cartTotalValue: getCartTotalValue(),
      cartItemsCount: getCartItemsCount(),
      timeOnProductPage: getTimeOnPage() // Time spent on product page
    };

    const response = await fetch('/api/cart-tracking/track/add-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData)
    });

    const result = await response.json();
    console.log('Cart tracking successful:', result);

    return result;
  } catch (error) {
    console.error('Cart tracking failed:', error);
    // Don't let tracking errors break the user experience
  }
};
```

### 3. Integration with Add to Cart Button
```javascript
// In your product component
const handleAddToCart = async (product, quantity) => {
  try {
    // First add to cart (your existing logic)
    await addProductToCart(product, quantity);

    // Then track the event
    await trackAddToCart(product, quantity, 'product-page');

    // Show success message
    showNotification('Product added to cart successfully!');
  } catch (error) {
    console.error('Add to cart failed:', error);
    showNotification('Failed to add product to cart', 'error');
  }
};
```

## React Hook Example

```javascript
// Custom hook for cart tracking
import { useState, useEffect } from 'react';

const useCartTracking = () => {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const trackAddToCart = async (product, quantity = 1, source = 'product-page') => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/cart-tracking/track/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product._id,
          quantity,
          sessionId,
          source,
          cartTotalValue: getCartTotalValue(),
          cartItemsCount: getCartItemsCount(),
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Cart tracking failed:', error);
    }
  };

  const trackCartAction = async (action, data = {}) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/cart-tracking/track/cart-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          sessionId,
          ...data
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Cart action tracking failed:', error);
    }
  };

  return {
    trackAddToCart,
    trackCartAction,
    sessionId
  };
};

// Usage in component
const ProductPage = ({ product }) => {
  const { trackAddToCart } = useCartTracking();

  const handleAddToCart = async () => {
    // Add to cart logic
    await addToCart(product);

    // Track the event
    await trackAddToCart(product, 1, 'product-page');
  };

  return (
    <div>
      <h1>{product.title}</h1>
      <p>${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
};
```

## Redux Integration Example

```javascript
// Redux action
export const addToCartWithTracking = (product, quantity) => async (dispatch, getState) => {
  try {
    // Add to cart in Redux store
    dispatch(addToCart(product, quantity));

    // Track the event
    const state = getState();
    const sessionId = getSessionId();

    await fetch('/api/cart-tracking/track/add-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product._id,
        quantity,
        sessionId,
        source: 'product-page',
        cartTotalValue: state.cart.totalValue,
        cartItemsCount: state.cart.items.length,
      })
    });

  } catch (error) {
    console.error('Failed to add to cart:', error);
  }
};
```

## Utility Functions

```javascript
// Helper functions you'll need to implement
const getCurrentUserId = () => {
  // Return current user ID if logged in
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || null;
};

const getCurrentUserEmail = () => {
  // Return current user email if logged in
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.email || null;
};

const getCartTotalValue = () => {
  // Return current cart total value
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};

const getCartItemsCount = () => {
  // Return current cart items count
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  return cart.reduce((count, item) => count + item.quantity, 0);
};

const getTimeOnPage = () => {
  // Track time spent on page (implement based on your needs)
  if (window.pageStartTime) {
    return Math.floor((Date.now() - window.pageStartTime) / 1000);
  }
  return 0;
};

// Set page start time when page loads
window.pageStartTime = Date.now();
```

## Different Source Types

```javascript
// Track from different sources
await trackAddToCart(product, 1, 'product-page');    // From product detail page
await trackAddToCart(product, 1, 'quick-view');      // From quick view modal
await trackAddToCart(product, 1, 'search-results');  // From search results
await trackAddToCart(product, 1, 'category-page');   // From category page
await trackAddToCart(product, 1, 'recommendations'); // From recommended products
await trackAddToCart(product, 1, 'wishlist');        // From wishlist
```

## Error Handling

```javascript
const trackAddToCartSafely = async (product, quantity, source) => {
  try {
    return await trackAddToCart(product, quantity, source);
  } catch (error) {
    // Log error but don't interrupt user flow
    console.warn('Cart tracking failed:', error);

    // Optionally send to error reporting service
    if (window.errorReporting) {
      window.errorReporting.captureException(error);
    }

    return null;
  }
};
```

## Testing

```javascript
// Test the tracking in console
const testTracking = async () => {
  const testProduct = {
    _id: '64abc123def456789012345',
    title: 'Test Product',
    price: 29.99
  };

  const result = await trackAddToCart(testProduct, 1, 'product-page');
  console.log('Tracking result:', result);
};

// Run in browser console
testTracking();
```
