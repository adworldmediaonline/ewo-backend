const Contact = require('../model/Contact');

class ContactService {
  // Get contact by ID
  async getContactById(id) {
    try {
      return await Contact.findById(id).populate('respondedBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  // Create new contact
  async createContact(contactData) {
    try {
      return await Contact.create(contactData);
    } catch (error) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  // Update contact
  async updateContact(id, updateData) {
    try {
      return await Contact.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  // Get contacts with filters
  async getContacts(filters = {}) {
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
      } = filters;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (isRead !== undefined) filter.isRead = isRead;

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

      return {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalResults: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get contacts: ${error.message}`);
    }
  }

  // Mark contact as read
  async markAsRead(id) {
    try {
      return await Contact.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to mark contact as read: ${error.message}`);
    }
  }

  // Get contact statistics
  async getContactStatistics() {
    try {
      const stats = await Contact.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
            highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          },
        },
      ]);

      return stats[0] || {
        total: 0,
        new: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        unread: 0,
        highPriority: 0,
      };
    } catch (error) {
      throw new Error(`Failed to get contact statistics: ${error.message}`);
    }
  }

  // Check for recent submissions (spam prevention)
  async checkRecentSubmissions(email, timeFrame = 60) {
    try {
      const timeAgo = new Date(Date.now() - timeFrame * 60 * 1000);
      return await Contact.countDocuments({
        email: email.toLowerCase(),
        createdAt: { $gte: timeAgo },
      });
    } catch (error) {
      throw new Error(`Failed to check recent submissions: ${error.message}`);
    }
  }

  // Delete contact
  async deleteContact(id) {
    try {
      return await Contact.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  // Get recent contacts
  async getRecentContacts(limit = 5) {
    try {
      return await Contact.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email subject status priority isRead createdAt');
    } catch (error) {
      throw new Error(`Failed to get recent contacts: ${error.message}`);
    }
  }

  // Export contacts data
  async exportContacts(filters = {}) {
    try {
      const filter = {};
      if (filters.status) filter.status = filters.status;
      if (filters.priority) filter.priority = filters.priority;
      if (filters.dateFrom) filter.createdAt = { $gte: new Date(filters.dateFrom) };
      if (filters.dateTo) {
        filter.createdAt = { 
          ...filter.createdAt, 
          $lte: new Date(filters.dateTo) 
        };
      }

      return await Contact.find(filter)
        .sort({ createdAt: -1 })
        .populate('respondedBy', 'name email')
        .lean();
    } catch (error) {
      throw new Error(`Failed to export contacts: ${error.message}`);
    }
  }
}

module.exports = new ContactService();