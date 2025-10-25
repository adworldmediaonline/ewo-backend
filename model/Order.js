import mongoose from 'mongoose';

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
    // Enhanced multiple coupon information
    appliedCoupons: [
      {
        couponId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Coupon',
          required: false,
        },
        couponCode: {
          type: String,
          required: false,
        },
        title: {
          type: String,
          required: false,
        },
        discountType: {
          type: String,
          enum: ['percentage', 'fixed'],
          required: false,
        },
        originalDiscount: {
          type: Number,
          required: false,
        },
        discountAmount: {
          type: Number,
          required: false,
        },
        discount: {
          type: Number,
          required: false,
        },
        applicableType: {
          type: String,
          enum: ['all', 'product', 'category', 'brand'],
          required: false,
        },
        applicableProductNames: [
          {
            type: String,
            required: false,
          },
        ],
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Legacy single coupon support (keeping for backward compatibility)
    appliedCoupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: false,
      },
      couponCode: {
        type: String,
        required: false,
      },
      title: {
        type: String,
        required: false,
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: false,
      },
      originalDiscount: {
        type: Number,
        required: false,
      },
      discountAmount: {
        type: Number,
        required: false,
      },
      appliedAt: {
        type: Date,
        default: Date.now,
      },
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
    // Enhanced Stripe payment data structure
    paymentIntent: {
      // Payment Intent details
      id: {
        type: String,
        required: false,
      },
      clientSecret: {
        type: String,
        required: false,
      },
      amount: {
        type: Number,
        required: false,
      },
      currency: {
        type: String,
        required: false,
        default: 'usd',
      },
      status: {
        type: String,
        required: false,
      },
      // Charge information (needed for refunds)
      chargeId: {
        type: String,
        required: false,
      },
      paymentMethodId: {
        type: String,
        required: false,
      },
      // Customer information
      customerId: {
        type: String,
        required: false,
      },
      // Receipt and transaction details
      receiptUrl: {
        type: String,
        required: false,
      },
      receiptNumber: {
        type: String,
        required: false,
      },
      // Payment method details (safe, non-sensitive info)
      paymentMethodDetails: {
        type: {
          type: String,
          required: false,
        },
        cardBrand: {
          type: String,
          required: false,
        },
        cardLast4: {
          type: String,
          required: false,
        },
        cardExpMonth: {
          type: Number,
          required: false,
        },
        cardExpYear: {
          type: Number,
          required: false,
        },
        cardCountry: {
          type: String,
          required: false,
        },
        cardFunding: {
          type: String,
          required: false,
        },
      },
      // Transaction fees and net amount
      applicationFeeAmount: {
        type: Number,
        required: false,
      },
      stripeFee: {
        type: Number,
        required: false,
      },
      netAmount: {
        type: Number,
        required: false,
      },
      // Timestamps
      createdAt: {
        type: Date,
        required: false,
      },
      paidAt: {
        type: Date,
        required: false,
      },
      // Refund information
      refunds: [
        {
          refundId: {
            type: String,
            required: false,
          },
          amount: {
            type: Number,
            required: false,
          },
          reason: {
            type: String,
            required: false,
          },
          status: {
            type: String,
            required: false,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          receiptNumber: {
            type: String,
            required: false,
          },
        },
      ],
      // Legacy support (keeping for backward compatibility)
      legacyData: {
        type: Object,
        required: false,
      },
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
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancel'],
      default: 'pending',
      lowercase: true,
    },

    emailSent: {
      type: Boolean,
      default: false,
    },
    shippingNotificationSent: {
      type: Boolean,
      default: false,
    },
    deliveryNotificationSent: {
      type: Boolean,
      default: false,
    },
    feedbackEmailSent: {
      type: Boolean,
      default: false,
    },
    feedbackEmailScheduledAt: {
      type: Date,
      required: false,
    },
    feedbackEmailSentAt: {
      type: Date,
      required: false,
    },
    feedbackEmailProcessed: {
      type: Boolean,
      default: false,
    },
    feedbackSubmittedAt: {
      type: Date,
      required: false,
    },
    feedbackSubmissionIP: {
      type: String,
      required: false,
    },
    feedbackSubmissionUserAgent: {
      type: String,
      required: false,
    },
    shippingDetails: {
      trackingNumber: {
        type: String,
        required: false,
      },
      carrier: {
        type: String,
        required: false,
      },
      trackingUrl: {
        type: String,
        required: false,
      },
      estimatedDelivery: {
        type: Date,
        required: false,
      },
      shippedDate: {
        type: Date,
        required: false,
      },
    },
    firstTimeShippingDiscount: {
      type: Boolean,
      default: false,
    },
    firstTimeShippingDiscountAmount: {
      type: Number,
      default: 0,
    },
    firstTimeDiscount: {
      isApplied: {
        type: Boolean,
        default: false,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to handle negative totals and ensure data integrity
orderSchema.pre('save', function (next) {
  // Ensure totalAmount doesn't go negative for free orders
  if (this.totalAmount < 0) {

    this.totalAmount = 0;

    // Update payment method if it's a free order
    if (this.paymentMethod === 'Card' && this.totalAmount === 0) {
      this.paymentMethod = 'Free Order (100% Discount)';
    }
  }

  // Ensure discount amounts are not negative
  if (this.discount < 0) {
    this.discount = 0;
  }

  if (this.firstTimeDiscount && this.firstTimeDiscount.amount < 0) {
    this.firstTimeDiscount.amount = 0;
  }

  if (this.appliedCoupon && this.appliedCoupon.discountAmount < 0) {
    this.appliedCoupon.discountAmount = 0;
  }

  next();
});

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
export default Order;
