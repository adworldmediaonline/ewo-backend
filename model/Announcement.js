import mongoose from 'mongoose';

const announcementSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    linkText: {
      type: String,
      trim: true,
      default: 'Learn More',
      maxlength: [50, 'Link text cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'promotion'],
      default: 'info',
    },
    backgroundColor: {
      type: String,
      default: '#1e40af', // Blue
      trim: true,
    },
    textColor: {
      type: String,
      default: '#ffffff', // White
      trim: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, 'Priority cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    showCloseButton: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
announcementSchema.index({ isActive: 1, displayOrder: 1, startDate: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;

