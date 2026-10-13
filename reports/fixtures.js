// Shared inventory used by the reports tests. Values are chosen so totals are
// easy to verify by hand (see comments on the derived numbers).
const inventory = [
  { id: 1, name: 'Widget', category: 'Hardware', price: 2.5, quantity: 100, reorderLevel: 20 },
  { id: 2, name: 'Gadget', category: 'hardware', price: 10, quantity: 5, reorderLevel: 10 },
  { id: 3, name: 'Gizmo', category: 'Electronics', price: 49.99, quantity: 0 },
  { id: 4, name: 'Doohickey', category: 'Electronics', price: 20, quantity: 8 },
  { id: 5, name: 'Thingamajig', price: 1.1, quantity: 3 },
  { id: 6, name: 'Freebie', category: 'Promo', price: 0, quantity: 50 },
];

// Expected derived values for `inventory`:
//   totalUnits = 100 + 5 + 0 + 8 + 3 + 50 = 166
//   totalValue = 250 + 50 + 0 + 160 + 3.3 + 0 = 463.3
const expectedSummary = {
  totalItems: 6,
  totalUnits: 166,
  totalValue: 463.3,
  outOfStock: 1,
  categoryCount: 4,
  averagePrice: 16.72, // (2.5 + 10 + 49.99 + 20 + 1.1) / 5 = 16.718
  minPrice: 1.1,
  maxPrice: 49.99,
};

// Items with missing or junk fields, to exercise normalization.
const messyInventory = [
  { id: 10, name: 'No fields' },
  { id: 11, name: 'Bad numbers', price: -5, quantity: 'many', category: '   ' },
  { id: 12, name: 'NaN price', price: NaN, quantity: Infinity, category: 42 },
];

module.exports = { inventory, expectedSummary, messyInventory };
