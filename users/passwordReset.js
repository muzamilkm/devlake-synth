const crypto = require('node:crypto');
const express = require('express');
const { validatePassword, hashPassword } = require('./password');

const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

// Only a digest of each token is kept, so a leaked token map cannot be replayed.
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');

function createPasswordResetRouter(userStore, { ttlMs = DEFAULT_TOKEN_TTL_MS, now = Date.now } = {}) {
  const router = express.Router();
  router.use(express.json());

  // token digest -> { email, expiresAt }
  const tokens = new Map();

  const revokeTokensFor = (email) => {
    for (const [key, entry] of tokens) {
      if (entry.email === email) tokens.delete(key);
    }
  };

  // No email is sent yet, so the token is returned directly to the caller.
  router.post('/request', (req, res) => {
    const { email } = req.body || {};
    if (!isNonEmptyString(email)) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = userStore.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Issuing a new token invalidates any earlier one for the same user.
    revokeTokensFor(user.email);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = now() + ttlMs;
    tokens.set(digest(token), { email: user.email, expiresAt });
    res.status(201).json({ token, expiresAt: new Date(expiresAt).toISOString() });
  });

  router.post('/confirm', (req, res) => {
    const { token, password } = req.body || {};
    if (!isNonEmptyString(token)) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const error = validatePassword(password);
    if (error) return res.status(400).json({ error });

    const key = digest(token);
    const entry = tokens.get(key);
    if (!entry || entry.expiresAt <= now()) {
      tokens.delete(key);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Tokens are single use: consume before updating so a retry cannot reuse it.
    tokens.delete(key);
    if (!userStore.setPasswordHash(entry.email, hashPassword(password))) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    res.json({ message: 'Password updated' });
  });

  return router;
}

module.exports = { createPasswordResetRouter, DEFAULT_TOKEN_TTL_MS };
