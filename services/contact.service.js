const Contact = require('../model/contact');

exports.createContact = async contactData => {
  const contact = await Contact.create(contactData);
  return contact;
};

exports.getAllContacts = async (filters = {}) => {
  const contacts = await Contact.find(filters).sort({ createdAt: -1 });
  return contacts;
};

exports.getContactById = async id => {
  const contact = await Contact.findById(id);
  return contact;
};

exports.updateContactStatus = async (id, status) => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );
  return contact;
};

exports.deleteContact = async id => {
  const result = await Contact.findByIdAndDelete(id);
  return result;
};
