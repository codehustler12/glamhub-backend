/**
 * Normalize phone to digits only for comparison.
 */
const toPhoneDigits = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
};

/**
 * Check if a phone number is already used by another user/artist.
 * Compares digit-only forms so +971501234567 and 0501234567 match when appropriate.
 *
 * @param {String} phone
 * @param {String} [countryCode]
 * @param {String|null} [excludeUserId]
 * @returns {Promise<Boolean>}
 */
const isPhoneAlreadyRegistered = async (phone, countryCode = '+971', excludeUserId = null) => {
  const User = require('../models/User');
  const { formatPhoneNumber } = require('../services/smsService');

  if (!phone || !String(phone).trim()) {
    return false;
  }

  let formatted = String(phone).trim();
  try {
    formatted = formatPhoneNumber(phone, countryCode || '+971');
  } catch (_) {
    // keep trimmed phone
  }

  const incomingDigits = toPhoneDigits(formatted);
  if (incomingDigits.length < 10) {
    return false;
  }

  const filter = {
    phone: { $exists: true, $nin: [null, ''] }
  };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  const users = await User.find(filter).select('phone').lean();

  return users.some((user) => {
    const existingDigits = toPhoneDigits(user.phone);
    if (!existingDigits) return false;
    return existingDigits === incomingDigits;
  });
};

module.exports = {
  toPhoneDigits,
  isPhoneAlreadyRegistered
};
