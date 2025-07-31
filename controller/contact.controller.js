const Contact = require('../model/Contact');
const ApiError = require('../errors/api-error');
const emailService = require('../services/emailService');
//
// Create new contact submission
const createContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return next(
        new ApiError(
          400,
          'Please fill in all required fields: Name, Email, Subject, and Message.'
        )
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ApiError(400, 'Please enter a valid email address.'));
    }

    // Length validation
    if (name.length > 100) {
      return next(new ApiError(400, 'Name cannot exceed 100 characters.'));
    }
    if (subject.length > 200) {
      return next(new ApiError(400, 'Subject cannot exceed 200 characters.'));
    }
    if (message.length > 2000) {
      return next(new ApiError(400, 'Message cannot exceed 2000 characters.'));
    }

    // Rate limiting check - prevent spam (max 5 submissions per email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSubmissions = await Contact.countDocuments({
      email: email.toLowerCase(),
      createdAt: { $gte: oneHourAgo },
    });

    if (recentSubmissions >= 5) {
      return next(
        new ApiError(
          429,
          'You have reached the submission limit of 5 messages per hour. Please wait before submitting again.'
        )
      );
    }

    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Create contact entry
    const contact = await Contact.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress,
      userAgent,
    });

    // Prepare contact data with formatted date for emails
    const contactForEmail = {
      ...contact.toObject(),
      formattedDate: contact.createdAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    };

    // Send notification email to admin
    try {
      await emailService.sendContactNotification(contactForEmail);
    } catch (emailError) {
      console.error('Failed to send contact notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Send confirmation email to user
    try {
      await emailService.sendContactConfirmation(contactForEmail);
    } catch (emailError) {
      console.error('Failed to send contact confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Contact form submitted successfully',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all contacts (Admin only)
const getAllContacts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      isRead,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('respondedBy', 'name email');

    const total = await Contact.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      results: contacts.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

// Get single contact (Admin only)
const getContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id).populate(
      'respondedBy',
      'name email'
    );

    if (!contact) {
      return next(new ApiError(404, 'Contact not found'));
    }

    // Mark as read when viewed
    if (!contact.isRead) {
      contact.isRead = true;
      await contact.save();
    }

    res.status(200).json({
      status: 'success',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// Update contact status (Admin only)
const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, respondedBy } = req.body;

    const contact = await Contact.findById(id);

    if (!contact) {
      return next(new ApiError(404, 'Contact not found'));
    }

    // Update fields
    if (status) contact.status = status;
    if (priority) contact.priority = priority;
    if (adminNotes) contact.adminNotes = adminNotes;
    if (respondedBy) {
      contact.respondedBy = respondedBy;
      contact.respondedAt = new Date();
    }

    await contact.save();

    res.status(200).json({
      status: 'success',
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// Delete contact (Admin only)
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return next(new ApiError(404, 'Contact not found'));
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get contact statistics (Admin only)
const getContactStats = async (req, res, next) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          highPriority: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] },
          },
        },
      },
    ]);

    const monthlyStats = await Contact.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: stats[0] || {
          total: 0,
          new: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          unread: 0,
          highPriority: 0,
        },
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats,
};
