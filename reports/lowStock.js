const { normalizeItems } = require('./normalize');

const DEFAULT_THRESHOLD = 10;

// Items at or below their reorder level are "low". An item's own reorderLevel
// wins over the report-wide threshold. Worst first: fewest units, then name.
function buildLowStockReport(items, { threshold = DEFAULT_THRESHOLD, category } = {}) {
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) {
    throw new RangeError('threshold must be a non-negative number');
  }
  const wanted = typeof category === 'string' ? category.trim().toLowerCase() : undefined;

  return normalizeItems(items)
    .filter((row) => wanted === undefined || row.category === wanted)
    .map((row) => {
      const level = row.reorderLevel === undefined ? threshold : row.reorderLevel;
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        quantity: row.quantity,
        reorderLevel: level,
        shortfall: level - row.quantity,
      };
    })
    .filter((row) => row.quantity <= row.reorderLevel)
    .sort((a, b) => a.quantity - b.quantity || String(a.name).localeCompare(String(b.name)));
}

module.exports = { buildLowStockReport, DEFAULT_THRESHOLD };
