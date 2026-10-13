const test = require('node:test');
const assert = require('node:assert');
const { buildSummary } = require('./summary');
const { normalizeItem, normalizeItems, round2, UNCATEGORIZED } = require('./normalize');
const { inventory, expectedSummary, messyInventory } = require('./fixtures');

test('buildSummary computes totals for the fixture inventory', () => {
  assert.deepStrictEqual(buildSummary(inventory), expectedSummary);
});

test('buildSummary on an empty inventory returns zeros and null extremes', () => {
  assert.deepStrictEqual(buildSummary([]), {
    totalItems: 0,
    totalUnits: 0,
    totalValue: 0,
    outOfStock: 0,
    categoryCount: 0,
    averagePrice: 0,
    minPrice: null,
    maxPrice: null,
  });
});

test('buildSummary treats missing and invalid numbers as 0', () => {
  const s = buildSummary(messyInventory);
  assert.strictEqual(s.totalItems, 3);
  assert.strictEqual(s.totalUnits, 0);
  assert.strictEqual(s.totalValue, 0);
  assert.strictEqual(s.outOfStock, 3);
  assert.strictEqual(s.categoryCount, 1);
  assert.strictEqual(s.minPrice, null);
  assert.strictEqual(s.maxPrice, null);
});

test('buildSummary does not count unpriced items in the average', () => {
  const s = buildSummary([
    { name: 'a', price: 10, quantity: 1 },
    { name: 'b', quantity: 1 },
  ]);
  assert.strictEqual(s.averagePrice, 10);
  assert.strictEqual(s.minPrice, 10);
});

test('buildSummary rounds value to cents', () => {
  const s = buildSummary([
    { name: 'a', price: 0.1, quantity: 1 },
    { name: 'b', price: 0.2, quantity: 1 },
  ]);
  assert.strictEqual(s.totalValue, 0.3);
});

test('buildSummary does not mutate its input', () => {
  const copy = JSON.parse(JSON.stringify(inventory));
  buildSummary(inventory);
  assert.deepStrictEqual(inventory, copy);
});

test('buildSummary rejects non-array input', () => {
  assert.throws(() => buildSummary(null), TypeError);
  assert.throws(() => buildSummary({}), TypeError);
});

test('normalizeItem lowercases and trims categories', () => {
  assert.strictEqual(normalizeItem({ name: 'x', category: '  Hardware ' }).category, 'hardware');
});

test('normalizeItem defaults blank and non-string categories', () => {
  assert.strictEqual(normalizeItem({ name: 'x' }).category, UNCATEGORIZED);
  assert.strictEqual(normalizeItem({ name: 'x', category: '  ' }).category, UNCATEGORIZED);
  assert.strictEqual(normalizeItem({ name: 'x', category: 7 }).category, UNCATEGORIZED);
});

test('normalizeItem keeps a valid reorderLevel and drops invalid ones', () => {
  assert.strictEqual(normalizeItem({ name: 'x', reorderLevel: 0 }).reorderLevel, 0);
  assert.strictEqual(normalizeItem({ name: 'x', reorderLevel: 4 }).reorderLevel, 4);
  assert.strictEqual(normalizeItem({ name: 'x', reorderLevel: -1 }).reorderLevel, undefined);
  assert.strictEqual(normalizeItem({ name: 'x', reorderLevel: '4' }).reorderLevel, undefined);
});

test('normalizeItems maps every element', () => {
  assert.strictEqual(normalizeItems(inventory).length, inventory.length);
});

test('round2 rounds half up at the cent', () => {
  assert.strictEqual(round2(1.005), 1.01);
  assert.strictEqual(round2(2.344), 2.34);
});
