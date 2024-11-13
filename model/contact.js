const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minLength: [2, 'Name must be at least 2 characters'],
    maxLength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    minLength: [5, 'Subject must be at least 5 characters'],
    maxLength: [200, 'Subject cannot exceed 200 characters'],
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minLength: [10, 'Message must be at least 10 characters'],
    maxLength: [1000, 'Message cannot exceed 1000 characters'],
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'responded'],
    default: 'unread',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Contact = mongoose.model('Contact', contactSchema);
module.exports = Contact;
