# Meta Conversions API Integration Documentation - 2025 v23.0

## 🚀 **Overview**

This integration implements the **Meta Conversions API v23.0 (2025)** to send server-side tracking events directly from your e-commerce backend to Meta's servers. This ensures more reliable tracking and better attribution for your Meta advertising campaigns.

## ✨ **New Features (2025 v23.0)**

- **Enhanced Customer Data Validation**: Automatic validation of customer information sufficiency
- **Improved Error Handling**: Better error messages and recommendations
- **Advanced Matching Support**: Full support for Meta's 2025 matching requirements
- **Client Information Tracking**: Required IP address and user agent collection
- **Better Privacy Compliance**: Enhanced data handling for global privacy regulations

## 🔧 **Prerequisites**

### **Required Environment Variables**

Create a `.env` file with the following variables:

```env
# Meta Conversions API Configuration (2025 v23.0)
META_PIXEL_ID=your-meta-pixel-id-here
META_ACCESS_TOKEN=your-system-user-access-token-here
META_API_VERSION=v23.0

# Other configurations...
PORT=8000
NODE_ENV=development
```

### **How to Get Meta Credentials**

1. **Meta Pixel ID**: Found in Meta Events Manager → Data Sources → Your Pixel
2. **Access Token**: Create a System User in Meta Business Manager with Conversions API access
3. **API Version**: Use `v23.0` for 2025 compatibility

## ⚡ **Key Improvements for 2025**

### **1. Customer Data Requirements**

Meta v23.0 (2025) requires **sufficient customer information** for event matching:

**Required (At least 1):**
- ✅ Email address
- ✅ Phone number

**Recommended (Improves matching):**
- ✅ First & Last name
- ✅ City, State, Zip code, Country
- ✅ Client IP address (required for website events)
- ✅ Client User Agent (required for website events)

### **2. Error Resolution**

The error you encountered:
```
"You haven't added sufficient customer information parameter data for this event"
```

**Has been fixed by:**
- Enhanced user data collection in cart tracking
- Automatic client information extraction
- Fallback strategies for guest users
- Data validation before sending to Meta

### **3. Validation System**

Our implementation now includes:

```javascript
// Automatic validation before sending events
const validation = service.validateCustomerData(userData);
console.log('Customer Data Quality:', validation.isValid ? 'GOOD' : 'POOR');
```

**Validation Results:**
- ✅ **GOOD**: Has email/phone + additional context
- ⚠️ **POOR**: Missing key identifiers (will still send but with warnings)

## 📊 **API Endpoints**

### **Manual Event Tracking**

All endpoints require authentication and proper customer data:

#### **Track Add to Cart**
```bash
POST /api/meta-conversions/track/add-to-cart
Content-Type: application/json

{
  "userData": {
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "city": "New York",
    "clientIpAddress": "192.168.1.1",
    "clientUserAgent": "Mozilla/5.0..."
  },
  "customData": {
    "value": 29.99,
    "currency": "USD",
    "contentName": "Product Name",
    "contentIds": ["PROD123"],
    "contents": [{
      "id": "PROD123",
      "quantity": 1,
      "price": 29.99
    }]
  },
  "eventSourceUrl": "https://yourstore.com/product/123"
}
```

#### **Track Purchase**
```bash
POST /api/meta-conversions/track/purchase
Content-Type: application/json

{
  "userData": {
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "city": "New York",
    "zipCode": "10001",
    "country": "US",
    "clientIpAddress": "192.168.1.1",
    "clientUserAgent": "Mozilla/5.0..."
  },
  "customData": {
    "value": 159.97,
    "currency": "USD",
    "orderId": "ORDER_12345",
    "numItems": 3,
    "contents": [
      {
        "id": "PROD123",
        "quantity": 2,
        "price": 29.99
      },
      {
        "id": "PROD456",
        "quantity": 1,
        "price": 99.99
      }
    ]
  },
  "eventSourceUrl": "https://yourstore.com/checkout/success"
}
```

## 🔄 **Automatic Integration**

Your system now automatically sends Meta events for:

### **Cart Events**
```javascript
// When user adds to cart
CartTrackingService.sendToMetaAsync(trackingRecord, 'AddToCart', {
  clientIpAddress: req.ip,
  clientUserAgent: req.headers['user-agent'],
  eventSourceUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
});
```

### **Purchase Events**
```javascript
// When order is completed
CartTrackingService.sendPurchaseToMeta(orderData, {
  clientIpAddress: req.ip,
  clientUserAgent: req.headers['user-agent'],
  eventSourceUrl: 'https://yourstore.com/checkout/success'
});
```

## 🛠 **Product Model Integration**

Your Products model supports rich event data:

```javascript
// Enhanced product data for Meta events
const productData = {
  id: product.sku,              // From Products.sku
  title: product.title,         // From Products.title
  category: product.category.name, // From Products.category.name
  brand: product.brand,         // Custom field if available
  price: product.updatedPrice || product.price,
  description: product.description
};
```

## 📈 **Event Quality Monitoring**

Monitor your event quality in the console:

```bash
✅ Meta AddToCart sent for 6858f8cb00b89d72fbde3ae6:
  success: true
  validation: GOOD
  identifierCount: 7

⚠️ Meta Conversions API: Event AddToCart may have poor matching
  validation: POOR
  recommendations: ['Add email or phone number for better event matching']
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. "Insufficient customer information" Error**
**Solution**: Ensure you're passing at least email OR phone + additional context:

```javascript
const userData = {
  email: 'customer@example.com',     // ✅ Strong identifier
  firstName: 'John',                 // ✅ Context
  lastName: 'Doe',                   // ✅ Context
  city: 'New York',                  // ✅ Context
  clientIpAddress: req.ip,           // ✅ Required for web events
  clientUserAgent: req.headers['user-agent'] // ✅ Required for web events
};
```

#### **2. Low Event Match Quality**
**Solution**: Add more customer data fields:

```javascript
// Good customer data for 2025
const enhancedUserData = {
  email: 'customer@example.com',
  phone: '+1234567890',
  firstName: 'John',
  lastName: 'Doe',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'US',
  clientIpAddress: req.ip,
  clientUserAgent: req.headers['user-agent'],
  fbp: 'fb.1.1558571054389.1098115397', // From Meta Pixel
  fbc: 'fb.1.1554763741205.AbCdEfGhIj'  // From Meta Pixel
};
```

#### **3. API Rate Limits**
**Solution**: Our implementation includes automatic batching and error handling.

## 🎯 **Best Practices for 2025**

### **1. Data Collection Strategy**
```javascript
// Collect customer data at multiple touchpoints
const customerData = {
  // At registration/login
  email: user.email,
  phone: user.contactNumber,
  
  // From user profile
  firstName: user.name.split(' ')[0],
  lastName: user.name.split(' ').slice(1).join(' '),
  
  // From shipping address
  city: order.shipping_address.city,
  state: order.shipping_address.state,
  zipCode: order.shipping_address.zipCode,
  country: order.shipping_address.country,
  
  // From browser (automatically collected)
  clientIpAddress: req.ip,
  clientUserAgent: req.headers['user-agent']
};
```

### **2. Event Deduplication**
```javascript
// Always include unique event IDs
const eventData = {
  eventId: `addtocart_${productId}_${userId}_${timestamp}`,
  eventTime: Math.floor(Date.now() / 1000),
  // ... other data
};
```

### **3. Error Handling**
```javascript
// Graceful degradation for Meta failures
try {
  const result = await metaService.trackPurchase(eventData);
  if (!result.success) {
    console.warn('Meta tracking failed:', result.error);
    // Continue with order processing
  }
} catch (error) {
  // Never let Meta failures break your main business logic
  console.error('Meta error (non-blocking):', error);
}
```

## 📋 **Configuration Checklist**

### **Environment Setup**
- [ ] `META_PIXEL_ID` set in `.env`
- [ ] `META_ACCESS_TOKEN` set in `.env`
- [ ] `META_API_VERSION=v23.0` set in `.env`

### **Data Collection**
- [ ] Email collection implemented
- [ ] Phone number collection implemented
- [ ] Address collection implemented
- [ ] Client IP extraction working
- [ ] User Agent extraction working

### **Testing**
- [ ] Test events visible in Meta Events Manager
- [ ] Event match quality showing as "Good"
- [ ] No "insufficient customer data" errors
- [ ] Purchase events tracking correctly

## 🚀 **Next Steps**

1. **Set up your Meta credentials** in the `.env` file
2. **Test with real customer data** to ensure good match quality
3. **Monitor Events Manager** for successful event delivery
4. **Check Event Match Quality** in Meta Ads Manager
5. **Create Custom Audiences** using your server-side events

## 📞 **Support**

If you encounter issues:

1. Check the console logs for validation warnings
2. Verify your Meta credentials are correct
3. Ensure customer data includes email or phone
4. Test with the Meta Test Events tool

Your implementation is now fully compliant with **Meta Conversions API v23.0 (2025)** requirements! 🎉 