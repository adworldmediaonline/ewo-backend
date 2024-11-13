const contactService = require('../services/contact.service');

exports.submitContact = async (req, res, next) => {
  try {
    const contact = await contactService.createContact(req.body);

    res.status(201).json({
      status: 'success',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllContacts = async (req, res, next) => {
  try {
    const contacts = await contactService.getAllContacts();

    res.status(200).json({
      status: 'success',
      results: contacts.length,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

exports.getContact = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.params.id);

    if (!contact) {
      return next(new AppError('Contact not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateContactStatus = async (req, res, next) => {
  try {
    const contact = await contactService.updateContactStatus(
      req.params.id,
      req.body.status
    );

    if (!contact) {
      return next(new AppError('Contact not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await contactService.deleteContact(req.params.id);

    if (!contact) {
      return next(new AppError('Contact not found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
