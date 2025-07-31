const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved', 'closed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ isRead: 1 });

// Virtual for formatted date
contactSchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});
//
// Pre-save middleware to capture additional info
contactSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set default priority based on keywords in subject/message
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately'];
    const content = `${this.subject} ${this.message}`.toLowerCase();

    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      this.priority = 'high';
    }
  }
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
