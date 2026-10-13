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

    createMany(list) {
      return list.map((data) => this.create(data));
    },

    get(id) {
      const item = items.get(id);
      return item ? { ...item } : null;
    },

    // Filters (all optional): case-insensitive name substring and an inclusive
    // price range. Items without a price never match a price filter.
    // sort is { field, direction }; missing values go last, ties fall back to id order in the sort direction.
    list({ offset = 0, limit, name, minPrice, maxPrice, sort } = {}) {
      const needle = name === undefined ? undefined : name.toLowerCase();
      const matches = (item) =>
        (needle === undefined || item.name.toLowerCase().includes(needle)) &&
        (minPrice === undefined || (item.price !== undefined && item.price >= minPrice)) &&
        (maxPrice === undefined || (item.price !== undefined && item.price <= maxPrice));
      const all = [];
      for (const item of items.values()) if (matches(item)) all.push({ ...item });
      if (sort) {
        const dir = sort.direction === 'desc' ? -1 : 1;
        all.sort((a, b) => {
          const av = a[sort.field];
          const bv = b[sort.field];
          if (av === undefined && bv === undefined) return a.id - b.id;
          if (av === undefined) return 1;
          if (bv === undefined) return -1;
          if (av === bv) return (a.id - b.id) * dir;
          return (av < bv ? -1 : 1) * dir;
        });
      }
      return {
        total: all.length,
        items: limit === undefined ? all.slice(offset) : all.slice(offset, offset + limit),
      };
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
