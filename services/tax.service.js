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
    // According to Stripe Tax docs: https://docs.stripe.com/tax/custom
    // Minimum required: postal_code
    // Recommended: full address (line1, city, state, postal_code) for accuracy
    if (!customerAddress.postal_code && !customerAddress.zipCode) {
      return {
        success: false,
        message: 'Postal code is required for tax calculation',
        taxAmount: 0,
        amountTotal: 0,
        calculationId: null,
      };
    }

    // For best accuracy, recommend state and city, but let Stripe validate
    // Stripe will return customer_tax_location_invalid if address is insufficient

    // Prepare line items for Stripe Tax
    // According to Stripe Tax docs: https://docs.stripe.com/tax/custom
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

    // Calculate subtotal (before tax) - only from line items, shipping is separate
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Prepare customer details for Stripe Tax
    // According to Stripe Tax docs: https://docs.stripe.com/tax/custom
    // For US: minimum required is postal_code, but full address recommended for accuracy
    const customerDetails = {
      address: {
        line1: customerAddress.line1 || customerAddress.address || '',
        city: customerAddress.city || '',
        state: customerAddress.state || '', // Pass state as-is, Stripe handles validation
        postal_code: customerAddress.postal_code || customerAddress.zipCode || '',
        country: customerAddress.country || 'US',
      },
      address_source: 'shipping', // Tax calculated on shipping address
    };

    // Prepare shipping cost parameter (not a line item)
    // According to Stripe Tax docs: https://docs.stripe.com/tax/custom#optional-calculate-tax-on-shipping-costs
    const calculationParams = {
      currency: 'usd',
      line_items: lineItems,
      customer_details: customerDetails,
    };

    // Add shipping_cost parameter if shipping cost > 0
    // This is the correct way per Stripe Tax documentation
    if (shippingCost > 0) {
      calculationParams.shipping_cost = {
        amount: Math.round(shippingCost * 100), // Convert to cents
        tax_code: 'txcd_92010001', // Shipping tax code per Stripe docs
      };
    }

    // Call Stripe Tax API
    const calculation = await stripe.tax.calculations.create(calculationParams);

    // Extract tax information
    // Use tax_amount_exclusive directly from Stripe (this is the tax amount added on top)
    // Note: All Stripe amounts are in cents
    const taxAmountExclusive = calculation.tax_amount_exclusive || 0;
    const amountTotal = calculation.amount_total || subtotal;
    // Use tax_amount_exclusive directly instead of calculating difference
    // This is more accurate as Stripe provides the exact tax amount
    const taxAmount = taxAmountExclusive; // Tax amount in cents (already from Stripe)

    // Log for debugging
    console.log('📊 [TAX SERVICE] Stripe calculation response:', {
      tax_amount_exclusive_cents: taxAmountExclusive,
      amount_total_cents: amountTotal,
      subtotal_cents: subtotal,
      tax_breakdown_count: calculation.tax_breakdown?.length || 0,
      tax_breakdown_raw: calculation.tax_breakdown,
    });

    // Check if tax is being collected
    const taxBreakdownArray = calculation.tax_breakdown || [];

    // ============================================
    // VALIDATION: Ensure state matches zip code
    // Stripe infers jurisdiction from zip code (e.g., 98012 -> WA)
    // We must verify the user actually intended that state
    // ============================================
    if (customerAddress.state && taxBreakdownArray.length > 0) {
      // Find the state-level breakdown
      const stateBreakdown = taxBreakdownArray.find(b =>
        b.jurisdiction?.level === 'state' ||
        (b.tax_rate_details && b.tax_rate_details.state)
      );

      if (stateBreakdown) {
        const resolvedState = stateBreakdown.jurisdiction?.state || stateBreakdown.tax_rate_details?.state;
        const userState = customerAddress.state.trim().toUpperCase();

        // Map full names to abbreviations if needed (basic mapping)
        // This is a simple protection against "asdasd" vs "WA"
        // Ideally use a proper state validation library, but this catches the obvious garbage
        if (resolvedState && userState.length < 3 && resolvedState !== userState) {
          console.log(`⚠️ [TAX SERVICE] State mismatch detected: User '${userState}' vs Resolved '${resolvedState}'`);
          return {
            success: false,
            error: 'address_mismatch',
            message: `The provided state (${customerAddress.state}) does not match the zip code (${customerAddress.postal_code || customerAddress.zipCode}). Expected: ${resolvedState}`,
            taxAmount: 0,
            amountTotal: 0,
            calculationId: null,
          };
        }
      }
    }

    // Check if tax is being collected - use tax_amount_exclusive > 0 as primary indicator
    // Breakdown items might have 0 amount if tax is calculated at a different level
    const isCollectingTax = taxAmountExclusive > 0 && taxBreakdownArray.some(
      breakdown => breakdown.taxability_reason !== 'not_collecting'
    );
    const taxabilityReason = taxBreakdownArray[0]?.taxability_reason || null;

    // Build tax breakdown
    // Note: breakdown.tax_amount is in cents from Stripe, convert to dollars
    // If breakdown.tax_amount is 0 but we have total tax, distribute it proportionally
    const totalTaxInCents = taxAmountExclusive;
    const totalBreakdownTaxInCents = taxBreakdownArray.reduce((sum, b) => sum + (b.tax_amount || 0), 0);

    const taxBreakdown = taxBreakdownArray.map((breakdown, index) => {
      let taxAmountInCents = breakdown.tax_amount || 0;

      // If breakdown amount is 0 but we have total tax, and this is the only breakdown item,
      // assign the total tax to this breakdown
      if (taxAmountInCents === 0 && totalTaxInCents > 0 && taxBreakdownArray.length === 1) {
        taxAmountInCents = totalTaxInCents;
      }
      // If breakdown amounts don't sum to total, distribute proportionally
      else if (totalBreakdownTaxInCents === 0 && totalTaxInCents > 0 && taxBreakdownArray.length > 0) {
        // Distribute total tax equally among breakdown items
        taxAmountInCents = Math.round(totalTaxInCents / taxBreakdownArray.length);
      }

      const taxAmountInDollars = taxAmountInCents / 100;

      return {
        jurisdiction: breakdown.jurisdiction?.level || breakdown.tax_rate_details?.state ? 'state' : 'unknown',
        rate: breakdown.tax_rate_details?.percentage_decimal || 0,
        amount: taxAmountInDollars, // Convert from cents to dollars
        country: breakdown.jurisdiction?.country || breakdown.tax_rate_details?.country || 'US',
        state: breakdown.jurisdiction?.state || breakdown.tax_rate_details?.state || null,
        taxability_reason: breakdown.taxability_reason || null,
        tax_type: breakdown.tax_rate_details?.tax_type || null,
      };
    });

    // Calculate subtotal including shipping (before tax)
    const subtotalWithShipping = subtotal + (shippingCost > 0 ? Math.round(shippingCost * 100) : 0);

    return {
      success: true,
      calculationId: calculation.id,
      taxAmount: taxAmount / 100, // Convert to dollars
      taxAmountExclusive: taxAmountExclusive / 100, // Convert to dollars
      amountTotal: amountTotal / 100, // Convert to dollars (includes line items + shipping + tax)
      subtotal: subtotal / 100, // Convert to dollars (line items only, before shipping and tax)
      subtotalWithShipping: subtotalWithShipping / 100, // Convert to dollars (line items + shipping, before tax)
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

/**
 * Create a tax transaction from a calculation (call after payment succeeds)
 * This records the tax collected for Stripe Tax reporting
 *
 * Per Stripe docs: https://docs.stripe.com/tax/custom#tax-transaction
 * "Creating a tax transaction records the tax you've collected from your customer,
 * so that later you can download exports and generate reports to help with filing your taxes."
 *
 * @param {string} calculationId - The tax calculation ID from calculateTaxService
 * @param {string} reference - Unique reference (typically PaymentIntent ID)
 * @returns {Object} Tax transaction result
 */
export const createTaxTransactionService = async (calculationId, reference) => {
  try {
    if (!calculationId) {
      console.log('⚠️ [TAX SERVICE] No calculation ID provided, skipping transaction creation');
      return {
        success: false,
        message: 'No calculation ID provided',
        transactionId: null,
      };
    }

    if (!reference) {
      console.log('⚠️ [TAX SERVICE] No reference provided, skipping transaction creation');
      return {
        success: false,
        message: 'Reference is required for tax transaction',
        transactionId: null,
      };
    }

    console.log('📝 [TAX SERVICE] Creating tax transaction:', {
      calculationId,
      reference,
    });

    // Create tax transaction from calculation
    // Per Stripe docs: The transaction is considered effective on the date when createFromCalculation is called
    const transaction = await stripe.tax.transactions.createFromCalculation({
      calculation: calculationId,
      reference: reference,
      expand: ['line_items'],
    });

    console.log('✅ [TAX SERVICE] Tax transaction created:', {
      transactionId: transaction.id,
      type: transaction.type,
      currency: transaction.currency,
      lineItemsCount: transaction.line_items?.data?.length || 0,
    });

    return {
      success: true,
      transactionId: transaction.id,
      type: transaction.type,
      reference: transaction.reference,
      currency: transaction.currency,
      transaction: transaction, // Full transaction object for reference
    };
  } catch (error) {
    console.error('❌ [TAX SERVICE] Error creating tax transaction:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        return {
          success: false,
          error: 'calculation_expired',
          message: 'Tax calculation has expired. Calculations are valid for 90 days.',
          transactionId: null,
        };
      }
      if (error.code === 'idempotency_error') {
        // Transaction already exists with this reference - this is OK
        console.log('ℹ️ [TAX SERVICE] Tax transaction already exists for this reference');
        return {
          success: true,
          message: 'Tax transaction already exists',
          transactionId: null, // We don't have the ID but it exists
        };
      }
    }

    return {
      success: false,
      error: error.type || 'tax_transaction_error',
      message: error.message || 'Failed to create tax transaction',
      transactionId: null,
    };
  }
};

/**
 * Create a tax reversal for refunds
 * This records the tax reversal for Stripe Tax reporting
 *
 * Per Stripe docs: https://docs.stripe.com/tax/custom#record-refunds
 * "After creating a tax transaction to record a sale to your customer,
 * you might need to record refunds. These are also represented as tax transactions, with type=reversal."
 *
 * @param {string} originalTransactionId - The original tax transaction ID to reverse
 * @param {string} reference - Unique reference for this reversal
 * @param {string} mode - 'full' or 'partial'
 * @param {Array} lineItems - Required for partial reversals: [{original_line_item, reference, amount, amount_tax}]
 * @param {number} flatAmount - For partial reversals: flat amount to refund (distributes proportionally)
 * @returns {Object} Tax reversal result
 */
export const createTaxReversalService = async (originalTransactionId, reference, mode = 'full', lineItems = null, flatAmount = null) => {
  try {
    if (!originalTransactionId) {
      console.log('⚠️ [TAX SERVICE] No original transaction ID provided, skipping reversal');
      return {
        success: false,
        message: 'Original transaction ID is required',
        reversalId: null,
      };
    }

    if (!reference) {
      console.log('⚠️ [TAX SERVICE] No reference provided, skipping reversal');
      return {
        success: false,
        message: 'Reference is required for tax reversal',
        reversalId: null,
      };
    }

    console.log('📝 [TAX SERVICE] Creating tax reversal:', {
      originalTransactionId,
      reference,
      mode,
      lineItemsCount: lineItems?.length || 0,
      flatAmount,
    });

    // Build reversal params based on mode
    const reversalParams = {
      mode: mode,
      original_transaction: originalTransactionId,
      reference: reference,
      expand: ['line_items'],
    };

    // For partial reversals, include line items or flat amount
    if (mode === 'partial') {
      if (flatAmount) {
        // Use flat amount - Stripe distributes proportionally
        reversalParams.flat_amount = Math.round(flatAmount); // Must be negative, in cents
      } else if (lineItems && lineItems.length > 0) {
        // Use specific line items
        reversalParams.line_items = lineItems.map(item => ({
          original_line_item: item.original_line_item,
          reference: item.reference || `refund_${item.original_line_item}`,
          amount: Math.round(item.amount), // Negative amount in cents
          amount_tax: Math.round(item.amount_tax), // Negative tax in cents
        }));
      } else {
        console.error('❌ [TAX SERVICE] Partial reversal requires lineItems or flatAmount');
        return {
          success: false,
          message: 'Partial reversal requires lineItems or flatAmount',
          reversalId: null,
        };
      }
    }

    // Create the reversal
    const reversal = await stripe.tax.transactions.createReversal(reversalParams);

    console.log('✅ [TAX SERVICE] Tax reversal created:', {
      reversalId: reversal.id,
      type: reversal.type,
      originalTransaction: reversal.reversal?.original_transaction,
      lineItemsCount: reversal.line_items?.data?.length || 0,
    });

    return {
      success: true,
      reversalId: reversal.id,
      type: reversal.type,
      reference: reversal.reference,
      originalTransaction: reversal.reversal?.original_transaction,
      reversal: reversal, // Full reversal object for reference
    };
  } catch (error) {
    console.error('❌ [TAX SERVICE] Error creating tax reversal:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        return {
          success: false,
          error: 'transaction_not_found',
          message: 'Original tax transaction not found',
          reversalId: null,
        };
      }
      if (error.message?.includes('exceeds')) {
        return {
          success: false,
          error: 'reversal_exceeds_amount',
          message: 'Reversal amount exceeds original transaction amount',
          reversalId: null,
        };
      }
    }

    return {
      success: false,
      error: error.type || 'tax_reversal_error',
      message: error.message || 'Failed to create tax reversal',
      reversalId: null,
    };
  }
};
