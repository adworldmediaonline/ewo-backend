import { calculateTaxService } from '../services/tax.service.js';

/**
 * Calculate tax for an order
 * POST /api/tax/calculate
 */
export const calculateTax = async (req, res, next) => {
  try {
    const { cart, shippingCost, address } = req.body;

    // Validate required fields
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required',
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Customer address is required',
      });
    }

    // Default shipping cost to 0 if not provided
    const shipping = Number(shippingCost) || 0;

    // Call tax calculation service
    const result = await calculateTaxService(cart, shipping, address);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.message || 'Tax calculation failed',
        error: result.error,
        taxAmount: 0,
        amountTotal: 0,
        calculationId: null,
      });
    }

    // Return successful tax calculation
    const response = {
      success: true,
      calculationId: result.calculationId,
      taxAmount: result.taxAmount,
      taxAmountExclusive: result.taxAmountExclusive,
      amountTotal: result.amountTotal,
      subtotal: result.subtotal,
      taxBreakdown: result.taxBreakdown,
      isCollectingTax: result.isCollectingTax,
      taxabilityReason: result.taxabilityReason,
    };

    console.log('📤 [TAX CONTROLLER] Sending response:', JSON.stringify(response, null, 2));

    res.status(200).json(response);
  } catch (error) {
    console.error('Tax calculation controller error:', error);
    next(error);
  }
};
