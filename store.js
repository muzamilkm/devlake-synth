function createStore() {
  const items = new Map();
  let nextId = 1;

  // Soft-deleted items stay in the map with a deletedAt timestamp and are invisible to normal reads.
  const live = (id) => {
    const item = items.get(id);
    return item && !item.deletedAt ? item : null;
  };

  return {
    create(data) {
      const now = new Date().toISOString();
      const item = { id: nextId++, ...data, createdAt: now, updatedAt: now };
      items.set(item.id, item);
      return { ...item };
    },

    get(id, { includeDeleted = false } = {}) {
      const item = includeDeleted ? items.get(id) : live(id);
      return item ? { ...item } : null;
    },

    list({ offset = 0, limit } = {}) {
      const all = Array.from(items.values())
        .filter((item) => !item.deletedAt)
        .map((item) => ({ ...item }));
      return {
        total: all.length,
        items: limit === undefined ? all.slice(offset) : all.slice(offset, offset + limit),
      };
    },

    // Replaces the mutable fields; id and createdAt are preserved.
    replace(id, data) {
      const existing = live(id);
      if (!existing) return null;
      const item = {
        ...data,
        id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      items.set(id, item);
      return { ...item };
    },

    update(id, changes) {
      const existing = live(id);
      if (!existing) return null;
      const item = { ...existing, ...changes, id, updatedAt: new Date().toISOString() };
      items.set(id, item);
      return { ...item };
    },

    // Soft delete: marks the item deleted; false if it is missing or already deleted.
    remove(id) {
      const existing = live(id);
      if (!existing) return false;
      const now = new Date().toISOString();
      items.set(id, { ...existing, deletedAt: now, updatedAt: now });
      return true;
    },

    // Undoes a soft delete; null if the item is missing or not deleted.
    restore(id) {
      const existing = items.get(id);
      if (!existing || !existing.deletedAt) return null;
      const { deletedAt, ...rest } = existing;
      const item = { ...rest, updatedAt: new Date().toISOString() };
      items.set(id, item);
      return { ...item };
    },

    clear() {
      items.clear();
      nextId = 1;
    },
  };
}

module.exports = { createStore };
