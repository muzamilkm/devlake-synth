function createStore() {
  const items = new Map();
  let nextId = 1;

  return {
    create(data) {
      const now = new Date().toISOString();
      const item = { id: nextId++, ...data, createdAt: now, updatedAt: now };
      items.set(item.id, item);
      return { ...item };
    },

    get(id) {
      const item = items.get(id);
      return item ? { ...item } : null;
    },

    list({ offset = 0, limit } = {}) {
      const all = Array.from(items.values(), (item) => ({ ...item }));
      return {
        total: all.length,
        items: limit === undefined ? all.slice(offset) : all.slice(offset, offset + limit),
      };
    },

    // Distinct, sorted categories of all items; items without a category are skipped.
    categories() {
      const distinct = new Set();
      for (const item of items.values()) {
        if (item.category !== undefined) distinct.add(item.category);
      }
      return Array.from(distinct).sort();
    },

    // Replaces the mutable fields; id and createdAt are preserved.
    replace(id, data) {
      const existing = items.get(id);
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
      const existing = items.get(id);
      if (!existing) return null;
      const item = { ...existing, ...changes, id, updatedAt: new Date().toISOString() };
      items.set(id, item);
      return { ...item };
    },

    remove(id) {
      return items.delete(id);
    },

    clear() {
      items.clear();
      nextId = 1;
    },
  };
}

module.exports = { createStore };
