const Cart = require('../model/Cart');

// Save guest cart
exports.saveGuestCart = async (req, res, next) => {
  try {
    const { email, cartItems } = req.body;

    // Validation
    if (!email || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: 'Email and cart items are required',
      });
    }

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart cannot be empty',
      });
    }

    // Check if guest cart already exists for this email
    const existingCart = await Cart.findOne({ email, isActive: true });

    if (existingCart) {
      // Update existing cart
      existingCart.cartItems = cartItems;
      existingCart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset expiry to 7 days
      await existingCart.save();

      return res.status(200).json({
        success: true,
        message: 'Guest cart updated successfully',
        data: existingCart,
      });
    } else {
      // Create new cart
      const newCart = await Cart.create({
        email,
        cartItems,
      });

      return res.status(201).json({
        success: true,
        message: 'Guest cart saved successfully',
        data: newCart,
      });
    }
  } catch (error) {
    console.error('Error saving guest cart:', error);
    next(error);
  }
};

// Get guest cart by email
exports.getGuestCart = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const cart = await Cart.findOne({ email, isActive: true }).sort({
      createdAt: -1,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('Error fetching guest cart:', error);
    next(error);
  }
};

// Delete guest cart
exports.deleteGuestCart = async (req, res, next) => {
  try {
    const { email } = req.params;

    const cart = await Cart.findOneAndUpdate(
      { email, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting guest cart:', error);
    next(error);
  }
};

// Update guest cart items
exports.updateGuestCart = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { cartItems } = req.body;

    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required',
      });
    }

    const cart = await Cart.findOneAndUpdate(
      { email, isActive: true },
      {
        cartItems,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Reset expiry
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: cart,
    });
  } catch (error) {
    console.error('Error updating guest cart:', error);
    next(error);
  }
};
