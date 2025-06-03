const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    isGuestOrder: {
      type: Boolean,
      default: false,
    },
    cart: [{}],
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    subTotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingOption: {
      type: String,
      required: false,
    },
    cardInfo: {
      type: Object,
      required: false,
    },
    paymentIntent: {
      type: Object,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    orderNote: {
      type: String,
      required: false,
    },
    invoice: {
      type: Number,
      unique: true,
    },
    orderId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'delivered', 'cancel'],
      default: 'pending',
      lowercase: true,
    },

    emailSent: {
      type: Boolean,
      default: false,
    },
    firstTimeShippingDiscount: {
      type: Boolean,
      default: false,
    },
    firstTimeShippingDiscountAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Function to generate unique order ID in format ORD-YYYYMMDD-XXXXXX
const generateOrderId = async () => {
  try {
    const { customAlphabet } = await import('nanoid');
    const createOrderId = customAlphabet(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      6
    );

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Generate a 6-character unique alphanumeric code using nanoid
    const uniqueCode = createOrderId();

    return `ORD-${dateStr}-${uniqueCode}`;
  } catch (error) {
    console.error('Error generating order ID:', error);
    // Fallback to a simple timestamp-based ID if nanoid fails
    const timestamp = Date.now().toString(36).toUpperCase();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    return `ORD-${dateStr}-${timestamp}`;
  }
};

// define pre-save middleware to generate the invoice number and order ID
orderSchema.pre('save', async function (next) {
  const order = this;

  try {
    // Generate unique order ID if not already set
    if (!order.orderId) {
      let orderId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      // Keep generating until we get a unique ID (very unlikely to need more than 1 try)
      while (!isUnique && attempts < maxAttempts) {
        orderId = await generateOrderId();
        const existingOrder = await mongoose
          .model('Order')
          .findOne({ orderId });
        if (!existingOrder) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error(
          'Failed to generate unique order ID after maximum attempts'
        );
      }

      order.orderId = orderId;
      console.log('Generated order ID:', orderId);
    }

    // Generate invoice number if not already set (keeping for backward compatibility)
    if (!order.invoice) {
      // find the highest invoice number in the orders collection
      const highestInvoice = await mongoose
        .model('Order')
        .find({})
        .sort({ invoice: 'desc' })
        .limit(1)
        .select({ invoice: 1 });
      // if there are no orders in the collection, start at 1000
      const startingInvoice =
        highestInvoice.length === 0 ? 1000 : highestInvoice[0].invoice + 1;
      // set the invoice number for the new order
      order.invoice = startingInvoice;
    }

    next();
  } catch (error) {
    console.error('Error in order pre-save middleware:', error);
    next(error);
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
