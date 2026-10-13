const crypto = require('node:crypto');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const KEY_LENGTH = 64;

// Returns an error message, or null when the password is acceptable.
function validatePassword(password) {
  if (typeof password !== 'string' || password === '') {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}

// Stored as "salt:key", both hex encoded.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${key}`;
}

function verifyPassword(password, stored) {
  const [salt, key] = String(stored).split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { validatePassword, hashPassword, verifyPassword, MIN_PASSWORD_LENGTH };
