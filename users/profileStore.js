// Minimal in-memory profile store, keyed by user id (the JWT "sub" claim).
function createProfileStore() {
  const profiles = new Map();

  const blank = (id) => ({ id, displayName: null, bio: null, updatedAt: null });

  return {
    get(id) {
      return { ...(profiles.get(id) || blank(id)) };
    },

    // Merges the given fields into the profile, creating it on first use.
    update(id, fields) {
      const next = { ...(profiles.get(id) || blank(id)), ...fields, updatedAt: new Date().toISOString() };
      profiles.set(id, next);
      return { ...next };
    },

    clear() {
      profiles.clear();
    },
  };
}

module.exports = { createProfileStore };
