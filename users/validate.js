const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;
// Upper bound keeps hashing cost predictable for very large inputs.
const MAX_PASSWORD_LENGTH = 128;

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD = /^[A-Za-z]{2,63}$/;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Pragmatic subset of RFC 5321/5322: dot-atom local part, a hostname with at
// least two labels and an alphabetic TLD. Quoted local parts and IP literals
// are intentionally not accepted.
function validateEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return 'Email is required and must be a non-empty string';
  }

  const value = email.trim();
  if (value.length > MAX_EMAIL_LENGTH) {
    return `Email must be at most ${MAX_EMAIL_LENGTH} characters`;
  }

  const at = value.lastIndexOf('@');
  if (at <= 0 || value.indexOf('@') !== at) {
    return 'Email must be a valid email address';
  }

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > MAX_LOCAL_PART_LENGTH || !LOCAL_PART.test(local)) {
    return 'Email must be a valid email address';
  }

  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL.test(label))) {
    return 'Email must be a valid email address';
  }
  if (!TLD.test(labels[labels.length - 1])) {
    return 'Email must be a valid email address';
  }

  return null;
}

// Returns every unmet rule so the client can show them all at once.
function validatePassword(password) {
  if (typeof password !== 'string' || password === '') {
    return ['Password is required and must be a non-empty string'];
  }

  const errors = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  if (/^\s|\s$/.test(password)) {
    errors.push('Password must not start or end with whitespace');
  }
  return errors;
}

// Validates a registration body; returns a list of { field, message } (empty when valid).
function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  const errors = [];
  const emailError = validateEmail(body.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  for (const message of validatePassword(body.password)) {
    errors.push({ field: 'password', message });
  }

  if (
    !emailError &&
    typeof body.password === 'string' &&
    body.password.toLowerCase().includes(normalizeEmail(body.email))
  ) {
    errors.push({ field: 'password', message: 'Password must not contain the email address' });
  }

  return errors;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateRegistration,
};
