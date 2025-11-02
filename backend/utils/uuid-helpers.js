const crypto = require('crypto');

/**
 * Convert a Google OAuth ID to a deterministic UUID v4
 * This ensures the same Google ID always generates the same UUID
 */
function googleIdToUuid(googleId) {
  // Create a deterministic hash from the Google ID
  const hash = crypto.createHash('md5').update(`google-oauth-${googleId}`).digest('hex');
  
  // Format as UUID v4 (with proper dashes and version/variant bits)
  const uuid = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16), // Version 4
    ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20), // Variant bits
    hash.substring(20, 32)
  ].join('-');
  
  return uuid;
}

/**
 * Validate if a string is a proper UUID format
 */
function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

module.exports = {
  googleIdToUuid,
  isValidUuid
};