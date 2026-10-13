const test = require('node:test');
const assert = require('node:assert');
const { buildLowStockReport, DEFAULT_THRESHOLD } = require('./lowStock');
const { inventory } = require('./fixtures');

test('default threshold is 10', () => {
  assert.strictEqual(DEFAULT_THRESHOLD, 10);
});

test('low stock lists items at or below their level, fewest units first', () => {
  const report = buildLowStockReport(inventory);
  assert.deepStrictEqual(
    report.map((r) => r.name),
    ['Gizmo', 'Thingamajig', 'Gadget', 'Doohickey']
  );
});

test('rows carry the effective level and shortfall', () => {
  const report = buildLowStockReport(inventory);
  const gadget = report.find((r) => r.name === 'Gadget');
  assert.deepStrictEqual(gadget, {
    id: 2,
    name: 'Gadget',
    category: 'hardware',
    quantity: 5,
    reorderLevel: 10,
    shortfall: 5,
  });
});

test('an item reorderLevel overrides the report threshold', () => {
  // Widget has 100 units but a level of 20; a threshold of 1 must not hide Gadget (level 10).
  const report = buildLowStockReport(inventory, { threshold: 1 });
  assert.deepStrictEqual(
    report.map((r) => r.name),
    ['Gizmo', 'Gadget']
  );
});

test('quantity equal to the level counts as low', () => {
  const report = buildLowStockReport([{ name: 'edge', quantity: 10 }, { name: 'ok', quantity: 11 }]);
  assert.deepStrictEqual(report.map((r) => r.name), ['edge']);
  assert.strictEqual(report[0].shortfall, 0);
});

test('a higher threshold widens the report', () => {
  const report = buildLowStockReport(inventory, { threshold: 60 });
  assert.ok(report.some((r) => r.name === 'Freebie'));
  assert.ok(!report.some((r) => r.name === 'Widget'));
});

test('threshold 0 only reports empty items without their own level', () => {
  const report = buildLowStockReport([{ name: 'a', quantity: 0 }, { name: 'b', quantity: 1 }], { threshold: 0 });
  assert.deepStrictEqual(report.map((r) => r.name), ['a']);
});

test('category filter is case-insensitive and trims', () => {
  const report = buildLowStockReport(inventory, { category: '  ELECTRONICS ' });
  assert.deepStrictEqual(report.map((r) => r.name), ['Gizmo', 'Doohickey']);
});

test('category filter can match uncategorized items', () => {
  const report = buildLowStockReport(inventory, { category: 'uncategorized' });
  assert.deepStrictEqual(report.map((r) => r.name), ['Thingamajig']);
});

test('ties on quantity fall back to name order', () => {
  const report = buildLowStockReport([
    { name: 'b', quantity: 2 },
    { name: 'a', quantity: 2 },
  ]);
  assert.deepStrictEqual(report.map((r) => r.name), ['a', 'b']);
});

test('an empty inventory or fully stocked one yields an empty report', () => {
  assert.deepStrictEqual(buildLowStockReport([]), []);
  assert.deepStrictEqual(buildLowStockReport([{ name: 'a', quantity: 500 }]), []);
});

test('invalid thresholds are rejected', () => {
  assert.throws(() => buildLowStockReport(inventory, { threshold: -1 }), RangeError);
  assert.throws(() => buildLowStockReport(inventory, { threshold: NaN }), RangeError);
  assert.throws(() => buildLowStockReport(inventory, { threshold: '5' }), RangeError);
});

test('non-array input is rejected', () => {
  assert.throws(() => buildLowStockReport(undefined), TypeError);
});
