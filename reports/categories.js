const { round2, normalizeItems } = require('./normalize');

// One row per (normalized) category, biggest stock value first, then name.
// valueShare is the category's percentage of total inventory value (0 when the
// whole inventory is worth nothing).
function buildCategoryBreakdown(items) {
  const groups = new Map();
  for (const row of normalizeItems(items)) {
    let g = groups.get(row.category);
    if (!g) {
      g = { category: row.category, itemCount: 0, totalUnits: 0, totalValue: 0, outOfStock: 0 };
      groups.set(row.category, g);
    }
    g.itemCount++;
    g.totalUnits += row.quantity;
    g.totalValue += row.price * row.quantity;
    if (row.quantity === 0) g.outOfStock++;
  }

  const rows = [...groups.values()];
  const grandTotal = rows.reduce((sum, g) => sum + g.totalValue, 0);

  return rows
    .map((g) => ({
      ...g,
      totalValue: round2(g.totalValue),
      valueShare: grandTotal > 0 ? round2((g.totalValue / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue || a.category.localeCompare(b.category));
}

module.exports = { buildCategoryBreakdown };
