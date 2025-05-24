const mongoose = require('mongoose');

const usedAddressesSchema = new mongoose.Schema(
  {
    addressKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    address: {
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
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const UsedAddresses = mongoose.model('UsedAddresses', usedAddressesSchema);

module.exports = UsedAddresses;
