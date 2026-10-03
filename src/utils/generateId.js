import crypto from 'crypto';

/**
 * Generates a clean, unique debate ID (e.g. "deb_a8f1e29c3b")
 * @returns {string} Unique identifier
 */
export function generateId(prefix = 'deb') {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${randomPart}`;
}
