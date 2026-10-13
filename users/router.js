const express = require('express');
const { normalizeEmail, validateRegistration } = require('./validate');
const { hashPassword } = require('./password');

const DUPLICATE_EMAIL = { error: 'Email is already registered' };

function createUsersRouter(store) {
  const router = express.Router();
  router.use(express.json());

  router.post('/register', async (req, res, next) => {
    const errors = validateRegistration(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const email = normalizeEmail(req.body.email);
    // Cheap early exit; store.create re-checks after the async hash.
    if (store.has(email)) return res.status(409).json(DUPLICATE_EMAIL);

    try {
      const passwordHash = await hashPassword(req.body.password);
      const user = store.create({ email, passwordHash });
      if (!user) return res.status(409).json(DUPLICATE_EMAIL);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createUsersRouter };
