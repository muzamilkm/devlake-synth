const test = require('node:test');
const assert = require('node:assert');
const { buildCategoryBreakdown } = require('./categories');
const { inventory, messyInventory } = require('./fixtures');

test('breakdown groups case-insensitively and sorts by value', () => {
  const rows = buildCategoryBreakdown(inventory);
  assert.deepStrictEqual(rows.map((r) => r.category), ['hardware', 'electronics', 'uncategorized', 'promo']);
});

test('breakdown computes per-category totals', () => {
  const rows = buildCategoryBreakdown(inventory);
  const hardware = rows.find((r) => r.category === 'hardware');
  assert.deepStrictEqual(hardware, {
    category: 'hardware',
    itemCount: 2,
    totalUnits: 105,
    totalValue: 300,
    outOfStock: 0,
    valueShare: 64.75, // 300 / 463.3
  });
  const electronics = rows.find((r) => r.category === 'electronics');
  assert.strictEqual(electronics.itemCount, 2);
  assert.strictEqual(electronics.outOfStock, 1);
  assert.strictEqual(electronics.totalValue, 160);
});

test('valueShare across categories sums to roughly 100', () => {
  const total = buildCategoryBreakdown(inventory).reduce((s, r) => s + r.valueShare, 0);
  assert.ok(Math.abs(total - 100) < 0.05, 'got ' + total);
});

test('zero-value categories sort after valuable ones and have share 0', () => {
  const rows = buildCategoryBreakdown(inventory);
  const promo = rows[rows.length - 1];
  assert.strictEqual(promo.category, 'promo');
  assert.strictEqual(promo.totalValue, 0);
  assert.strictEqual(promo.valueShare, 0);
});

test('equal values tie-break alphabetically by category', () => {
  const rows = buildCategoryBreakdown([
    { name: 'a', category: 'zeta', price: 1, quantity: 1 },
    { name: 'b', category: 'alpha', price: 1, quantity: 1 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.category), ['alpha', 'zeta']);
});

test('an inventory worth nothing yields 0 shares, not NaN', () => {
  const rows = buildCategoryBreakdown(messyInventory);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].category, 'uncategorized');
  assert.strictEqual(rows[0].itemCount, 3);
  assert.strictEqual(rows[0].valueShare, 0);
});

test('empty inventory yields no rows', () => {
  assert.deepStrictEqual(buildCategoryBreakdown([]), []);
});

test('non-array input is rejected', () => {
  assert.throws(() => buildCategoryBreakdown('nope'), TypeError);
});
