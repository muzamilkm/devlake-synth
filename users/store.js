// Public view of a user record; never exposes the password hash.
function toPublicUser(user) {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

function createUserStore() {
  const usersById = new Map();
  const idsByEmail = new Map();
  let nextId = 1;

  return {
    // Emails are expected to be normalized by the caller. Returns null if the
    // email is already taken; the check and insert happen synchronously so two
    // concurrent registrations cannot both succeed.
    create({ email, passwordHash }) {
      if (idsByEmail.has(email)) return null;
      const user = { id: nextId++, email, passwordHash, createdAt: new Date().toISOString() };
      usersById.set(user.id, user);
      idsByEmail.set(email, user.id);
      return toPublicUser(user);
    },

    get(id) {
      const user = usersById.get(id);
      return user ? toPublicUser(user) : null;
    },

    // Includes the password hash; for credential checks only.
    findByEmail(email) {
      const id = idsByEmail.get(email);
      return id === undefined ? null : { ...usersById.get(id) };
    },

    has(email) {
      return idsByEmail.has(email);
    },

    count() {
      return usersById.size;
    },

    clear() {
      usersById.clear();
      idsByEmail.clear();
      nextId = 1;
    },
  };
}

module.exports = { createUserStore, toPublicUser };
