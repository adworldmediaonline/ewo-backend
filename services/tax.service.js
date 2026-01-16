import Stripe from 'stripe';
import { secret } from '../config/secret.js';

const stripe = new Stripe(secret.stripe_key);

/**
 * Calculate tax using Stripe Tax API
 * @param {Array} cartItems - Array of cart items with price, quantity, etc.
 * @param {Number} shippingCost - Shipping cost amount
 * @param {Object} customerAddress - Customer address object
 * @returns {Object} Tax calculation result
 */
export const calculateTaxService = async (cartItems, shippingCost, customerAddress) => {
  try {
    // Validate address
    if (!customerAddress || !customerAddress.country) {
      throw new Error('Customer address is required');
    }

    // Only calculate tax for US addresses
    if (customerAddress.country !== 'US') {
      return {
        success: false,
        message: 'Tax calculation only available for US addresses',
        taxAmount: 0,
        amountTotal: 0,
        calculationId: null,
      };
    }

    // Validate required US address fields
    if (!customerAddress.state || !customerAddress.city || !customerAddress.postal_code) {
      return {
        success: false,
        message: 'Complete address required for tax calculation (state, city, zip code)',
        taxAmount: 0,
        amountTotal: 0,
        calculationId: null,
      };
    }

    // Prepare line items for Stripe Tax
    const lineItems = cartItems.map((item, index) => {
      const price = Number(item.finalPriceDiscount || item.price || item.updatedPrice || 0);
      const quantity = Number(item.orderQuantity || 1);
      const amount = Math.round(price * quantity * 100); // Convert to cents

      return {
        amount: amount,
        reference: `L${index + 1}`, // Line item reference (L1, L2, etc.)
        tax_code: item.taxCode || 'txcd_99999999', // Default to general merchandise
      };
    });

    // Add shipping as a separate line item if shipping cost > 0
    // Note: 'shipping' is a reserved keyword in Stripe, so we use 'shipping_cost' instead
    if (shippingCost > 0) {
      lineItems.push({
        amount: Math.round(shippingCost * 100), // Convert to cents
        reference: 'shipping_cost', // Changed from 'shipping' (reserved keyword)
        tax_code: 'txcd_99999999', // General merchandise tax code for shipping
      });
    }

    // If no line items, return zero tax
    if (lineItems.length === 0) {
      return {
        success: true,
        taxAmount: 0,
        amountTotal: 0,
        taxAmountExclusive: 0,
        taxBreakdown: [],
        calculationId: null,
      };
    }

    // Calculate subtotal (before tax)
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Prepare customer details for Stripe Tax
    const customerDetails = {
      address: {
        line1: customerAddress.line1 || customerAddress.address || '',
        city: customerAddress.city || '',
        state: customerAddress.state || '',
        postal_code: customerAddress.postal_code || customerAddress.zipCode || '',
        country: customerAddress.country || 'US',
      },
      address_source: 'shipping', // Tax calculated on shipping address
    };

    // Call Stripe Tax API
    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: lineItems,
      customer_details: customerDetails,
    });

    // Extract tax information
    // Use tax_amount_exclusive directly from Stripe (this is the tax amount added on top)
    const taxAmountExclusive = calculation.tax_amount_exclusive || 0;
    const amountTotal = calculation.amount_total || subtotal;
    // Use tax_amount_exclusive directly instead of calculating difference
    // This is more accurate as Stripe provides the exact tax amount
    const taxAmount = taxAmountExclusive; // Tax amount in cents (already from Stripe)

    // Check if tax is being collected
    const taxBreakdownArray = calculation.tax_breakdown || [];
    const isCollectingTax = taxBreakdownArray.some(
      breakdown => breakdown.taxability_reason !== 'not_collecting' && breakdown.tax_amount > 0
    );
    const taxabilityReason = taxBreakdownArray[0]?.taxability_reason || null;

    // Build tax breakdown
    const taxBreakdown = taxBreakdownArray.map(breakdown => ({
      jurisdiction: breakdown.jurisdiction?.level || breakdown.tax_rate_details?.state ? 'state' : 'unknown',
      rate: breakdown.tax_rate_details?.percentage_decimal || 0,
      amount: breakdown.tax_amount || 0,
      country: breakdown.jurisdiction?.country || breakdown.tax_rate_details?.country || 'US',
      state: breakdown.jurisdiction?.state || breakdown.tax_rate_details?.state || null,
      taxability_reason: breakdown.taxability_reason || null,
      tax_type: breakdown.tax_rate_details?.tax_type || null,
    }));

    return {
      success: true,
      calculationId: calculation.id,
      taxAmount: taxAmount / 100, // Convert to dollars
      taxAmountExclusive: taxAmountExclusive / 100, // Convert to dollars
      amountTotal: amountTotal / 100, // Convert to dollars
      subtotal: subtotal / 100, // Convert to dollars
      taxBreakdown: taxBreakdown,
      isCollectingTax: isCollectingTax, // Whether tax is actually being collected
      taxabilityReason: taxabilityReason, // Reason for tax collection status
      calculation: calculation, // Full calculation object for reference
    };
  } catch (error) {
    // Handle Stripe Tax API errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'customer_tax_location_invalid') {
        return {
          success: false,
          error: 'customer_tax_location_invalid',
          message: 'Invalid address. Please check your address and try again.',
          taxAmount: 0,
          amountTotal: 0,
          calculationId: null,
        };
      }
    }

    console.error('Tax calculation error:', error);
    return {
      success: false,
      error: error.type || 'tax_calculation_error',
      message: error.message || 'Failed to calculate tax',
      taxAmount: 0,
      amountTotal: 0,
      calculationId: null,
    };
  }
};
