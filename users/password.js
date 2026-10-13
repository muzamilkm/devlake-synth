const crypto = require('node:crypto');

const SALT_BYTES = 16;
const KEY_BYTES = 64;
// scrypt cost parameters (N, r, p); stored with each hash so they can be raised later.
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function scrypt(password, salt, keylen, options) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// Returns "scrypt$N$r$p$<salt base64>$<hash base64>".
async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const options = { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION };
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_BYTES, options);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64'), key.toString('base64')].join('$');
}

// Constant-time comparison; malformed stored hashes simply fail verification.
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  let actual;
  try {
    actual = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p });
  } catch {
    return false;
  }
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
