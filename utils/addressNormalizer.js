/**
 * Normalizes an address for consistent comparison
 * @param {Object} addressData - The address data to normalize
 * @returns {String} - Normalized address string for comparison
 */
const normalizeAddress = addressData => {
  if (!addressData) return '';

  // Extract address components
  const {
    address = '',
    city = '',
    state = '',
    zipCode = '',
    country = '',
  } = addressData;

  // Create a combined address string and normalize it
  let normalizedAddress = `${address} ${city} ${state} ${zipCode} ${country}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    // Common abbreviation standardization
    .replace(/\bst\b\.?/g, 'street')
    .replace(/\bave\b\.?/g, 'avenue')
    .replace(/\brd\b\.?/g, 'road')
    .replace(/\bapt\b\.?/g, 'apartment')
    .replace(/\bste\b\.?/g, 'suite')
    // Remove punctuation except for necessary characters
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizedAddress;
};

module.exports = { normalizeAddress };
