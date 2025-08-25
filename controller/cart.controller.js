import Cart from '../model/Cart.js';

// Save guest cart
export const saveGuestCart = async (req, res, next) => {
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
export const getGuestCart = async (req, res, next) => {
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
export const deleteGuestCart = async (req, res, next) => {
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
export const updateGuestCart = async (req, res, next) => {
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

// Admin: Get all carts
export const getAllCarts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = '',
    } = req.query;

    // Build query filters
    const filters = {};

    if (search) {
      filters.email = { $regex: search, $options: 'i' };
    }

    if (isActive !== '') {
      filters.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get carts with pagination
    const carts = await Cart.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCarts = await Cart.countDocuments(filters);

    // Calculate cart statistics
    const cartStats = carts.map(cart => {
      const totalItems = cart.cartItems.reduce(
        (sum, item) => sum + item.orderQuantity,
        0
      );
      const totalValue = cart.cartItems.reduce(
        (sum, item) => sum + item.price * item.orderQuantity,
        0
      );

      return {
        ...cart,
        totalItems,
        totalValue: parseFloat(totalValue.toFixed(2)),
      };
    });

    res.status(200).json({
      success: true,
      data: cartStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCarts / parseInt(limit)),
        totalCarts,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching carts:', error);
    next(error);
  }
};

// Admin: Delete cart by ID
export const deleteCart = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findByIdAndDelete(id);

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
    console.error('Error deleting cart:', error);
    next(error);
  }
};
