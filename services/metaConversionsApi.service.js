const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');

// Initialize Facebook Business SDK
const Content = bizSdk.Content;
const CustomData = bizSdk.CustomData;
const DeliveryCategory = bizSdk.DeliveryCategory;
const EventRequest = bizSdk.EventRequest;
const UserData = bizSdk.UserData;
const ServerEvent = bizSdk.ServerEvent;
const FacebookAdsApi = bizSdk.FacebookAdsApi;

class MetaConversionsApiService {
  constructor() {
    this.pixelId = process.env.META_PIXEL_ID;
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.apiVersion = process.env.META_API_VERSION || 'v23.0';
    
    this.isConfigured = !!(this.pixelId && this.accessToken);
    
    if (this.isConfigured) {
      try {
        // Initialize Facebook Business SDK v23.0 (no getInstance method)
        this.api = bizSdk.FacebookAdsApi.init(this.accessToken);
        console.log('✅ Meta Conversions API initialized successfully');
      } catch (error) {
        console.error('❌ Meta Conversions API initialization failed:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Meta Conversions API not configured - missing environment variables');
    }
  }

  /**
   * Hash data using SHA256 (2025 Meta requirements)
   * @param {string} data - Data to hash
   * @returns {string} - SHA256 hash
   */
  hashData(data) {
    if (data === null || data === undefined) return null;
    
    try {
      // Convert to string and handle different types
      let stringData;
      
      if (typeof data === 'string') {
        stringData = data;
      } else if (typeof data === 'number') {
        stringData = data.toString();
      } else if (typeof data === 'boolean') {
        stringData = data.toString();
      } else if (Array.isArray(data)) {
        stringData = data.join('');
      } else if (typeof data === 'object' && data !== null) {
        stringData = JSON.stringify(data);
      } else {
        // Fallback to String constructor
        stringData = String(data);
      }
      
      // Final validation that we have a string
      if (typeof stringData !== 'string' || stringData === 'null' || stringData === 'undefined') {
        console.warn('hashData: Unable to convert to valid string:', typeof data, data);
        return null;
      }
      
      // Clean and hash the string
      const cleanedData = stringData.toLowerCase().trim();
      if (cleanedData === '') {
        return null;
      }
      
      return crypto.createHash('sha256').update(cleanedData).digest('hex');
    } catch (error) {
      console.error('hashData error:', error.message, 'for data:', typeof data, data);
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format (2025 Meta requirements)
   * @param {string} phone - Phone number
   * @returns {string|null} - Normalized phone number
   */
  normalizePhone(phone) {
    if (!phone) return null;
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing (assuming US for now)
    if (cleaned.length === 10) {
      return `1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned;
    }
    
    return cleaned.length >= 10 ? cleaned : null;
  }

  /**
   * Validate customer data sufficiency (2025 Meta requirements)
   * @param {Object} userData - User data object
   * @returns {Object} - Validation result
   */
  validateCustomerData(userData) {
    const validation = {
      isValid: false,
      hasStrongIdentifier: false,
      hasContextualData: false,
      identifierCount: 0,
      missingFields: [],
      recommendations: []
    };

    // Check for strong identifiers (required for good matching)
    const hasEmail = !!(userData.email || userData.em);
    const hasPhone = !!(userData.phone || userData.ph);
    
    if (hasEmail || hasPhone) {
      validation.hasStrongIdentifier = true;
      validation.identifierCount++;
    } else {
      validation.missingFields.push('email', 'phone');
      validation.recommendations.push('Add email or phone number for better event matching');
    }

    // Check for contextual data
    const hasName = !!(userData.firstName || userData.lastName || userData.fn || userData.ln);
    const hasLocation = !!(userData.city || userData.state || userData.zipCode || userData.country);
    const hasClientInfo = !!(userData.clientIpAddress || userData.clientUserAgent);
    
    if (hasName || hasLocation || hasClientInfo) {
      validation.hasContextualData = true;
    }

    // Check for client information (required for website events in v23.0)
    if (!userData.clientIpAddress) {
      validation.missingFields.push('clientIpAddress');
      validation.recommendations.push('Include client IP address for website events');
    }
    
    if (!userData.clientUserAgent) {
      validation.missingFields.push('clientUserAgent');
      validation.recommendations.push('Include client user agent for website events');
    }

    // Overall validation
    validation.isValid = validation.hasStrongIdentifier && validation.hasContextualData && 
                       userData.clientIpAddress && userData.clientUserAgent;

    return validation;
  }

  /**
   * Create UserData object with v23.0 compliant methods
   * @param {Object} userData - Raw user data
   * @returns {UserData} - Meta UserData object
   */
  createUserData(userData, clientInfo = {}) {
    try {
      const user = new UserData();
      
      // Email (required for strong matching)
      if (userData.email) {
        const hashedEmail = this.hashData(userData.email);
        if (hashedEmail) {
          try {
            user.setEmails([hashedEmail]);
          } catch (e) {
            // Fallback to older method name
            try {
              user.setEmail(hashedEmail);
            } catch (e2) {
              console.warn('Could not set email:', e2.message);
            }
          }
        }
      }
      
      // Phone (required for strong matching)
      if (userData.phone) {
        const hashedPhone = this.hashData(userData.phone);
        if (hashedPhone) {
          try {
            user.setPhones([hashedPhone]);
          } catch (e) {
            // Fallback to older method name
            try {
              user.setPhone(hashedPhone);
            } catch (e2) {
              console.warn('Could not set phone:', e2.message);
            }
          }
        }
      }
      
      // Name fields
      if (userData.firstName) {
        const hashedFirstName = this.hashData(userData.firstName);
        if (hashedFirstName) {
          try {
            user.setFirstNames([hashedFirstName]);
          } catch (e) {
            try {
              user.setFirstName(hashedFirstName);
            } catch (e2) {
              console.warn('Could not set firstName:', e2.message);
            }
          }
        }
      }
      
      if (userData.lastName) {
        const hashedLastName = this.hashData(userData.lastName);
        if (hashedLastName) {
          try {
            user.setLastNames([hashedLastName]);
          } catch (e) {
            try {
              user.setLastName(hashedLastName);
            } catch (e2) {
              console.warn('Could not set lastName:', e2.message);
            }
          }
        }
      }
      
      // Location fields
      if (userData.city) {
        const hashedCity = this.hashData(userData.city);
        if (hashedCity) {
          try {
            user.setCities([hashedCity]);
          } catch (e) {
            try {
              user.setCity(hashedCity);
            } catch (e2) {
              console.warn('Could not set city:', e2.message);
            }
          }
        }
      }
      
      if (userData.state) {
        const hashedState = this.hashData(userData.state);
        if (hashedState) {
          try {
            user.setStates([hashedState]);
          } catch (e) {
            try {
              user.setState(hashedState);
            } catch (e2) {
              console.warn('Could not set state:', e2.message);
            }
          }
        }
      }
      
      if (userData.zipCode) {
        const hashedZip = this.hashData(userData.zipCode);
        if (hashedZip) {
          try {
            user.setZipCodes([hashedZip]);
          } catch (e) {
            try {
              user.setZipCode(hashedZip);
            } catch (e2) {
              console.warn('Could not set zipCode:', e2.message);
            }
          }
        }
      }
      
      // Country
      if (userData.country) {
        const hashedCountry = this.hashData(userData.country);
        if (hashedCountry) {
          try {
            user.setCountryCodes([hashedCountry]);
          } catch (e) {
            try {
              user.setCountryCode(hashedCountry);
            } catch (e2) {
              try {
                user.setCountry(hashedCountry);
              } catch (e3) {
                console.warn('Could not set country:', e3.message);
              }
            }
          }
        }
      }
      
      // External ID (for logged-in users)
      if (userData.externalId) {
        const hashedExternalId = this.hashData(userData.externalId);
        if (hashedExternalId) {
          try {
            user.setExternalIds([hashedExternalId]);
          } catch (e) {
            try {
              user.setExternalId(hashedExternalId);
            } catch (e2) {
              console.warn('Could not set externalId:', e2.message);
            }
          }
        }
      }
      
      // Browser identifiers (not hashed)
      if (userData.fbp) {
        try {
          user.setFbp(userData.fbp);
        } catch (e) {
          console.warn('Could not set fbp:', e.message);
        }
      }
      
      if (userData.fbc) {
        try {
          user.setFbc(userData.fbc);
        } catch (e) {
          console.warn('Could not set fbc:', e.message);
        }
      }
      
      // Client information (required for website events in v23.0)
      if (clientInfo.ip || userData.clientIpAddress) {
        try {
          user.setClientIpAddress(clientInfo.ip || userData.clientIpAddress);
        } catch (e) {
          console.warn('Could not set clientIpAddress:', e.message);
        }
      }
      
      if (clientInfo.userAgent || userData.clientUserAgent) {
        try {
          user.setClientUserAgent(clientInfo.userAgent || userData.clientUserAgent);
        } catch (e) {
          console.warn('Could not set clientUserAgent:', e.message);
        }
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error creating UserData:', error.message);
      throw error;
    }
  }

  /**
   * Create CustomData object
   * @param {Object} customData - Custom event data
   * @returns {CustomData} - Meta CustomData object
   */
  createCustomData(customData = {}) {
    try {
      const custom = new CustomData();
      
      if (customData.currency) custom.setCurrency(customData.currency);
      if (customData.value) custom.setValue(customData.value);
      if (customData.contentIds) custom.setContentIds(customData.contentIds);
      if (customData.contentType) custom.setContentType(customData.contentType);
      if (customData.contents) custom.setContents(customData.contents);
      if (customData.contentName) custom.setContentName(customData.contentName);
      if (customData.contentCategory) custom.setContentCategory(customData.contentCategory);
      if (customData.numItems) custom.setNumItems(customData.numItems);
      if (customData.orderId) custom.setOrderId(customData.orderId);
      
      return custom;
    } catch (error) {
      console.error('❌ Error creating CustomData:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced method to send events with better error handling and guest user support
   * Following official Facebook Business SDK v23.0 structure
   * @param {string} eventName - Standard Meta event name
   * @param {Object} userData - User data
   * @param {Object} customData - Custom event data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async sendEvent(eventName, userData = {}, customData = {}, clientInfo = {}) {
    if (!this.isConfigured) {
      console.log('⚠️ Meta Conversions API not configured, skipping event');
      return { success: false, error: 'Not configured' };
    }

    try {
      // Enhance userData with fallback strategies for guest users
      const enhancedUserData = this.enhanceUserData(userData, clientInfo);
      
      // Validate customer data quality
      const validation = this.validateCustomerData(enhancedUserData);
      
      if (!validation.isValid) {
        console.log(`Meta Conversions API: Event ${eventName} may have poor matching due to insufficient customer data`, validation);
      }

      // Get current timestamp (as per official example)
      let current_timestamp = Math.floor(new Date() / 1000);

      // Create UserData object (following official example structure)
      const user = new UserData();
      
      // Set emails and phones as arrays (official v23.0 structure)
      if (enhancedUserData.email) {
        const hashedEmail = this.hashData(enhancedUserData.email);
        if (hashedEmail) {
          user.setEmails([hashedEmail]);
        }
      }
      
      if (enhancedUserData.phone) {
        const hashedPhone = this.hashData(enhancedUserData.phone);
        if (hashedPhone) {
          user.setPhones([hashedPhone]);
        }
      }

      // Set client IP and User Agent (recommended for Conversions API Events)
      if (clientInfo.ip || enhancedUserData.clientIpAddress) {
        user.setClientIpAddress(clientInfo.ip || enhancedUserData.clientIpAddress);
      }
      
      if (clientInfo.userAgent || enhancedUserData.clientUserAgent) {
        user.setClientUserAgent(clientInfo.userAgent || enhancedUserData.clientUserAgent);
      }

      // Set Facebook browser identifiers if available
      if (enhancedUserData.fbp) {
        user.setFbp(enhancedUserData.fbp);
      }
      
      if (enhancedUserData.fbc) {
        user.setFbc(enhancedUserData.fbc);
      }

      // Set additional user data with fallback handling
      if (enhancedUserData.firstName) {
        const hashedFirstName = this.hashData(enhancedUserData.firstName);
        if (hashedFirstName) {
          try {
            user.setFirstNames([hashedFirstName]);
          } catch (e) {
            // Fallback for older SDK versions
            user.setFirstName && user.setFirstName(hashedFirstName);
          }
        }
      }

      if (enhancedUserData.lastName) {
        const hashedLastName = this.hashData(enhancedUserData.lastName);
        if (hashedLastName) {
          try {
            user.setLastNames([hashedLastName]);
          } catch (e) {
            // Fallback for older SDK versions
            user.setLastName && user.setLastName(hashedLastName);
          }
        }
      }

      if (enhancedUserData.externalId) {
        const hashedExternalId = this.hashData(enhancedUserData.externalId);
        if (hashedExternalId) {
          try {
            user.setExternalIds([hashedExternalId]);
          } catch (e) {
            user.setExternalId && user.setExternalId(hashedExternalId);
          }
        }
      }

      // Create Content object for product data (following official example)
      let contents = [];
      if (customData.contentIds && customData.contentIds.length > 0) {
        const content = new Content()
          .setId(customData.contentIds[0])
          .setQuantity(customData.numItems || 1);
          
        if (customData.deliveryCategory) {
          content.setDeliveryCategory(customData.deliveryCategory);
        }
        
        contents = [content];
      }

      // Create CustomData object (following official example structure)
      const custom = new CustomData();
      
      if (contents.length > 0) {
        custom.setContents(contents);
      }
      
      if (customData.currency) {
        custom.setCurrency(customData.currency.toLowerCase()); // Currency should be lowercase
      }
      
      if (customData.value) {
        custom.setValue(parseFloat(customData.value));
      }

      // Set additional custom data fields
      if (customData.contentType) custom.setContentType(customData.contentType);
      if (customData.contentName) custom.setContentName(customData.contentName);
      if (customData.contentCategory) custom.setContentCategory(customData.contentCategory);
      if (customData.orderId) custom.setOrderId(customData.orderId);

      // Create ServerEvent (following official example structure)
      const serverEvent = new ServerEvent()
        .setEventName(eventName)
        .setEventTime(current_timestamp)
        .setUserData(user)
        .setCustomData(custom)
        .setActionSource('website');

      // Set event source URL if available
      if (clientInfo.eventSourceUrl) {
        serverEvent.setEventSourceUrl(clientInfo.eventSourceUrl);
      }

      // Create and execute EventRequest (following official example structure)
      const eventsData = [serverEvent];
      const eventRequest = new EventRequest(this.accessToken, this.pixelId)
        .setEvents(eventsData);

      const response = await eventRequest.execute();
      
      console.log(`✅ Meta ${eventName} sent for ${enhancedUserData.externalId || 'guest'}:`, { 
        success: true, 
        validation: validation.isValid ? 'GOOD' : 'POOR',
        identifierCount: validation.identifierCount 
      });
      
      return { 
        success: true, 
        response: response,
        validation: validation.isValid ? 'GOOD' : 'POOR',
        identifierCount: validation.identifierCount
      };

    } catch (error) {
      console.error(`❌ Meta Conversions API Error:`, {
        eventName,
        error: error.message,
        userData: Object.keys(userData || {})
      });
      
      return { success: false, error: error.message };
    }
  }

  // Enhanced user data with fallback strategies for guest users
  enhanceUserData(userData, clientInfo) {
    const enhanced = { ...userData };
    
    // Add client information
    if (clientInfo.ip) enhanced.clientIpAddress = clientInfo.ip;
    if (clientInfo.userAgent) enhanced.clientUserAgent = clientInfo.userAgent;
    
    // For guest users without email/phone, use session-based identifiers
    if (!enhanced.email && !enhanced.phone) {
      // Use session ID or generate a temporary identifier
      if (clientInfo.sessionId) {
        enhanced.externalId = `session_${clientInfo.sessionId}`;
      } else if (clientInfo.ip && clientInfo.userAgent) {
        // Create a temporary identifier from IP + UserAgent (for same session tracking)
        const tempId = crypto.createHash('md5').update(`${clientInfo.ip}_${clientInfo.userAgent}`).digest('hex');
        enhanced.externalId = `temp_${tempId}`;
      }
      
      console.log('Meta Conversions API: No email or phone found, using fallback identifiers');
    }
    
    // Add default country if missing
    if (!enhanced.country) {
      enhanced.country = 'US'; // Default fallback
    }
    
    return enhanced;
  }

  /**
   * Track Add to Cart event
   * @param {Object} userData - User data
   * @param {Object} productData - Product data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackAddToCart(userData, productData, clientInfo = {}) {
    const customData = {
      currency: productData.currency || 'USD',
      value: productData.value || productData.price || 0,
      contentType: 'product',
      contentIds: [productData.productId || productData.id]
    };

    return await this.sendEvent('AddToCart', userData, customData, clientInfo);
  }

  /**
   * Track Purchase event
   * @param {Object} userData - User data
   * @param {Object} orderData - Order data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackPurchase(userData, orderData, clientInfo = {}) {
    const customData = {
      currency: orderData.currency || 'USD',
      value: orderData.value || orderData.total || 0,
      contentType: 'product',
      contentIds: orderData.productIds || []
    };

    return await this.sendEvent('Purchase', userData, customData, clientInfo);
  }

  /**
   * Track View Content event
   * @param {Object} userData - User data
   * @param {Object} contentData - Content data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackViewContent(userData, contentData, clientInfo = {}) {
    const customData = {
      contentType: contentData.contentType || 'product',
      contentIds: [contentData.contentId || contentData.id]
    };

    return await this.sendEvent('ViewContent', userData, customData, clientInfo);
  }

  /**
   * Track Page View event
   * @param {Object} userData - User data
   * @param {Object} pageData - Page data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackPageView(userData, pageData, clientInfo = {}) {
    return await this.sendEvent('PageView', userData, {}, clientInfo);
  }

  /**
   * Track Lead event
   * @param {Object} userData - User data
   * @param {Object} leadData - Lead data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackLead(userData, leadData, clientInfo = {}) {
    const customData = {
      currency: leadData.currency || 'USD',
      value: leadData.value || 0
    };

    return await this.sendEvent('Lead', userData, customData, clientInfo);
  }

  /**
   * Track Initiate Checkout event
   * @param {Object} userData - User data
   * @param {Object} checkoutData - Checkout data
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} - API response
   */
  async trackInitiateCheckout(userData, checkoutData, clientInfo = {}) {
    const customData = {
      currency: checkoutData.currency || 'USD',
      value: checkoutData.value || checkoutData.total || 0,
      contentType: 'product',
      contentIds: checkoutData.productIds || []
    };

    return await this.sendEvent('InitiateCheckout', userData, customData, clientInfo);
  }

  /**
   * Send multiple events in batch
   * @param {Array} events - Array of event objects
   * @returns {Promise<Object>} - Batch response
   */
  async sendBatch(events) {
    const results = [];
    
    for (const event of events) {
      const result = await this.sendEvent(event.eventName, event.userData, event.customData, event.clientInfo);
      results.push(result);
    }

    return {
      success: results.every(r => r.success),
      results: results,
      successCount: results.filter(r => r.success).length,
      totalCount: results.length
    };
  }

  /**
   * Validate Meta Conversions API configuration
   * @returns {Object} - Configuration status
   */
  validateConfiguration() {
    return {
      pixelId: !!this.pixelId,
      accessToken: !!this.accessToken,
      apiVersion: this.apiVersion,
      configured: !!(this.pixelId && this.accessToken)
    };
  }

  // Test event with configuration validation
  async testEvent() {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Meta Conversions API not configured. Please set META_PIXEL_ID and META_ACCESS_TOKEN environment variables.' 
      };
    }

    try {
      const testUserData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        clientIpAddress: '127.0.0.1',
        clientUserAgent: 'Test User Agent'
      };

      const validation = this.validateCustomerData(testUserData);
      
      return { 
        success: true, 
        message: 'Meta Conversions API is properly configured',
        validation: validation,
        config: {
          pixelId: this.pixelId,
          apiVersion: this.apiVersion,
          hasAccessToken: !!this.accessToken
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get configuration status
  getStatus() {
    return {
      configured: this.isConfigured,
      pixelId: this.pixelId,
      apiVersion: this.apiVersion,
      hasAccessToken: !!this.accessToken
    };
  }

  // Specific event methods with enhanced guest support
  async sendPurchase(userData, orderData, clientInfo = {}) {
    const customData = {
      currency: orderData.currency || 'USD',
      value: orderData.value || orderData.total || 0,
      contentType: 'product',
      contentIds: orderData.productIds || []
    };

    return this.sendEvent('Purchase', userData, customData, clientInfo);
  }

  async sendAddToCart(userData, productData, clientInfo = {}) {
    const customData = {
      currency: productData.currency || 'USD',
      value: productData.value || productData.price || 0,
      contentType: 'product',
      contentIds: [productData.productId || productData.id]
    };

    return this.sendEvent('AddToCart', userData, customData, clientInfo);
  }

  async sendViewContent(userData, contentData, clientInfo = {}) {
    const customData = {
      contentType: contentData.contentType || 'product',
      contentIds: [contentData.contentId || contentData.id]
    };

    return this.sendEvent('ViewContent', userData, customData, clientInfo);
  }

  async sendPageView(userData, pageData, clientInfo = {}) {
    return this.sendEvent('PageView', userData, {}, clientInfo);
  }

  async sendLead(userData, leadData, clientInfo = {}) {
    const customData = {
      currency: leadData.currency || 'USD',
      value: leadData.value || 0
    };

    return this.sendEvent('Lead', userData, customData, clientInfo);
  }

  async sendInitiateCheckout(userData, checkoutData, clientInfo = {}) {
    const customData = {
      currency: checkoutData.currency || 'USD',
      value: checkoutData.value || checkoutData.total || 0,
      contentType: 'product',
      contentIds: checkoutData.productIds || []
    };

    return this.sendEvent('InitiateCheckout', userData, customData, clientInfo);
  }

  // Batch event sending
  async sendEvents(events) {
    if (!this.isConfigured) {
      console.log('⚠️ Meta Conversions API not configured, skipping batch events');
      return { success: false, error: 'Not configured' };
    }

    try {
      const serverEvents = events.map(event => {
        const user = this.createUserData(event.userData, event.clientInfo);
        
        const custom = new bizSdk.CustomData();
        if (event.customData) {
          Object.keys(event.customData).forEach(key => {
            if (custom[`set${key.charAt(0).toUpperCase() + key.slice(1)}`]) {
              custom[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](event.customData[key]);
            }
          });
        }

        const serverEvent = new bizSdk.ServerEvent();
        serverEvent.setEventName(event.eventName);
        serverEvent.setEventTime(event.eventTime || Math.floor(Date.now() / 1000));
        serverEvent.setUserData(user);
        serverEvent.setCustomData(custom);
        serverEvent.setActionSource('website');

        return serverEvent;
      });

      const eventRequest = new bizSdk.EventRequest(this.accessToken, this.pixelId);
      eventRequest.setEvents(serverEvents);

      const response = await eventRequest.execute();
      
      console.log(`✅ Meta batch events sent: ${events.length} events`);
      return { success: true, response: response };

    } catch (error) {
      console.error('❌ Meta Conversions API Batch Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Legacy method names for backward compatibility
  async trackAddToCart(userData, productData, clientInfo = {}) {
    return this.sendAddToCart(userData, productData, clientInfo);
  }

  async trackPurchase(userData, orderData, clientInfo = {}) {
    return this.sendPurchase(userData, orderData, clientInfo);
  }

  async trackViewContent(userData, contentData, clientInfo = {}) {
    return this.sendViewContent(userData, contentData, clientInfo);
  }

  async trackPageView(userData, pageData, clientInfo = {}) {
    return this.sendPageView(userData, pageData, clientInfo);
  }

  async trackLead(userData, leadData, clientInfo = {}) {
    return this.sendLead(userData, leadData, clientInfo);
  }

  async trackInitiateCheckout(userData, checkoutData, clientInfo = {}) {
    return this.sendInitiateCheckout(userData, checkoutData, clientInfo);
  }
}

module.exports = new MetaConversionsApiService(); 