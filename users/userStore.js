const { hashPassword } = require('./password');

const normalizeEmail = (email) => email.trim().toLowerCase();

// In-memory users keyed by normalized email; only password hashes are kept.
function createUserStore() {
  const users = new Map();

  return {
    add(email, password) {
      const user = { email: normalizeEmail(email), passwordHash: hashPassword(password) };
      users.set(user.email, user);
      return { email: user.email };
    },

    findByEmail(email) {
      const user = users.get(normalizeEmail(email));
      return user ? { ...user } : null;
    },

    setPasswordHash(email, passwordHash) {
      const user = users.get(normalizeEmail(email));
      if (!user) return false;
      user.passwordHash = passwordHash;
      return true;
    },

    clear() {
      users.clear();
    },
  };
}

module.exports = { createUserStore, normalizeEmail };
