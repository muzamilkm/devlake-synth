const { round2, normalizeItems } = require('./normalize');

// Whole-inventory stats. Empty inventories yield zeros rather than NaN/null,
// except the priced extremes which are null when there is nothing to compare.
function buildSummary(items) {
  const rows = normalizeItems(items);

  let totalUnits = 0;
  let totalValue = 0;
  let outOfStock = 0;
  const categories = new Set();
  for (const row of rows) {
    totalUnits += row.quantity;
    totalValue += row.price * row.quantity;
    if (row.quantity === 0) outOfStock++;
    categories.add(row.category);
  }

  const priced = rows.filter((r) => r.price > 0);
  const prices = priced.map((r) => r.price);

  return {
    totalItems: rows.length,
    totalUnits,
    totalValue: round2(totalValue),
    outOfStock,
    categoryCount: categories.size,
    // Averages over priced items only (price > 0), whereas totalValue above
    // includes every item, so unpriced items are excluded here but not there.
    averagePrice: prices.length ? round2(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

module.exports = { buildSummary };
