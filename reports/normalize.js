const UNCATEGORIZED = 'uncategorized';

function toNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

// Rounds to cents so float noise (0.1 + 0.2) never leaks into reports.
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Items come from the store with optional inventory fields. Reports treat a
// missing or invalid price/quantity as 0 and a missing category as 'uncategorized'.
function normalizeItem(item) {
  const category =
    typeof item.category === 'string' && item.category.trim() !== ''
      ? item.category.trim().toLowerCase()
      : UNCATEGORIZED;
  const reorderLevel =
    typeof item.reorderLevel === 'number' && Number.isFinite(item.reorderLevel) && item.reorderLevel >= 0
      ? item.reorderLevel
      : undefined;
  return {
    id: item.id,
    name: item.name,
    category,
    price: toNonNegativeNumber(item.price),
    quantity: toNonNegativeNumber(item.quantity),
    reorderLevel,
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  return items.map(normalizeItem);
}

module.exports = { UNCATEGORIZED, round2, normalizeItem, normalizeItems };
