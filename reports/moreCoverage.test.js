const test = require('node:test');
const assert = require('node:assert');
const { generateReport, exportReport } = require('./index');
const { toJson } = require('./exporters');
const { inventory, expectedSummary } = require('./fixtures');

test('JSON round-trip: every report parses back to the generated data', () => {
  for (const type of ['summary', 'low-stock', 'categories']) {
    const parsed = JSON.parse(exportReport(type, 'json', inventory).body);
    assert.deepStrictEqual(parsed, generateReport(type, inventory));
  }
});

test('JSON round-trip: compact and pretty output parse to the same value', () => {
  const data = generateReport('categories', inventory);
  assert.deepStrictEqual(JSON.parse(toJson(data, { pretty: false })), JSON.parse(toJson(data)));
  assert.strictEqual(toJson(data, { pretty: false }).includes('\n'), false);
});

test('JSON round-trip: awkward strings survive parsing', () => {
  const items = [{ id: 1, name: 'He said "hi", \\ then\nleft', category: 'Ünï', quantity: 1 }];
  const [row] = JSON.parse(exportReport('low-stock', 'json', items).body);
  assert.strictEqual(row.name, items[0].name);
  assert.strictEqual(row.category, 'ünï');
});

test('CSV header order matches the documented column order', () => {
  const header = (type) => exportReport(type, 'csv', inventory).body.split('\r\n')[0];
  assert.strictEqual(header('low-stock'), 'id,name,category,quantity,reorderLevel,shortfall');
  assert.strictEqual(header('categories'), 'category,itemCount,totalUnits,totalValue,outOfStock,valueShare');
  assert.strictEqual(header('summary'), 'metric,value');
});

test('CSV summary metrics appear in the same order as the JSON keys', () => {
  const lines = exportReport('summary', 'csv', inventory).body.split('\r\n');
  const metrics = lines.slice(1, -1).map((l) => l.split(',')[0]);
  assert.deepStrictEqual(metrics, Object.keys(expectedSummary));
});

test('CSV header order is stable regardless of the item field order', () => {
  const items = [{ quantity: 2, category: 'x', name: 'n', id: 7 }];
  const lines = exportReport('low-stock', 'csv', items).body.split('\r\n');
  assert.strictEqual(lines[0], 'id,name,category,quantity,reorderLevel,shortfall');
  assert.strictEqual(lines[1], '7,n,x,2,10,8');
});

test('summary with mixed price types only counts finite non-negative numbers', () => {
  const items = [
    { name: 'num', price: 2.5, quantity: 2 },
    { name: 'string', price: '9.99', quantity: 1 },
    { name: 'negative', price: -1, quantity: 1 },
    { name: 'nan', price: NaN, quantity: 1 },
    { name: 'inf', price: Infinity, quantity: 1 },
    { name: 'null', price: null, quantity: 1 },
    { name: 'int', price: 4, quantity: 1 },
    { name: 'zero', price: 0, quantity: 1 },
  ];
  assert.deepStrictEqual(generateReport('summary', items), {
    totalItems: 8,
    totalUnits: 9,
    totalValue: 9, // 2.5 * 2 + 4
    outOfStock: 0,
    categoryCount: 1,
    averagePrice: 3.25, // (2.5 + 4) / 2
    minPrice: 2.5,
    maxPrice: 4,
  });
});

test('summary with only unpriced items has zero average and null extremes', () => {
  const summary = generateReport('summary', [
    { name: 'a', price: '5', quantity: 3 },
    { name: 'b', price: 0, quantity: 3 },
  ]);
  assert.strictEqual(summary.averagePrice, 0);
  assert.strictEqual(summary.minPrice, null);
  assert.strictEqual(summary.maxPrice, null);
  assert.strictEqual(summary.totalValue, 0);
});

test('summary rounds float noise out of totals and averages', () => {
  const summary = generateReport('summary', [
    { name: 'a', price: 0.1, quantity: 1 },
    { name: 'b', price: 0.2, quantity: 1 },
  ]);
  assert.strictEqual(summary.totalValue, 0.3);
  assert.strictEqual(summary.averagePrice, 0.15);
});

test('category breakdown sorts by total value, highest first', () => {
  const rows = generateReport('categories', [
    { name: 'a', category: 'low', price: 1, quantity: 1 },
    { name: 'b', category: 'high', price: 10, quantity: 10 },
    { name: 'c', category: 'mid', price: 5, quantity: 2 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.category), ['high', 'mid', 'low']);
});

test('category breakdown breaks value ties alphabetically', () => {
  const rows = generateReport('categories', [
    { name: 'a', category: 'zeta', price: 2, quantity: 5 },
    { name: 'b', category: 'alpha', price: 5, quantity: 2 },
    { name: 'c', category: 'Mid', price: 10, quantity: 1 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.category), ['alpha', 'mid', 'zeta']);
  assert.deepStrictEqual(rows.map((r) => r.valueShare), [33.33, 33.33, 33.33]);
});

test('category breakdown tie order does not depend on input order', () => {
  const items = [
    { name: 'a', category: 'b', price: 1, quantity: 1 },
    { name: 'b', category: 'a', price: 1, quantity: 1 },
    { name: 'c', category: 'c', price: 1, quantity: 1 },
  ];
  const forward = generateReport('categories', items).map((r) => r.category);
  const backward = generateReport('categories', [...items].reverse()).map((r) => r.category);
  assert.deepStrictEqual(forward, ['a', 'b', 'c']);
  assert.deepStrictEqual(backward, forward);
});

test('category breakdown sorts zero-value categories last, alphabetically', () => {
  const rows = generateReport('categories', [
    { name: 'a', category: 'free-b', price: 0, quantity: 5 },
    { name: 'b', category: 'free-a', price: 0, quantity: 5 },
    { name: 'c', category: 'paid', price: 1, quantity: 1 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.category), ['paid', 'free-a', 'free-b']);
});

test('exportReport rejects an unknown format with a RangeError', () => {
  assert.throws(
    () => exportReport('summary', 'xml', inventory),
    (err) => err instanceof RangeError && err.message === 'Unknown export format: xml'
  );
});

test('exportReport rejects missing, wrong-case and inherited format names', () => {
  for (const format of [undefined, null, '', 'CSV', 'Json', 'toString', '__proto__', 'constructor']) {
    assert.throws(() => exportReport('summary', format, inventory), RangeError, String(format));
  }
});

test('exportReport checks the format before the report type', () => {
  assert.throws(() => exportReport('nope', 'xml', inventory), /Unknown export format: xml/);
  assert.throws(() => exportReport('nope', 'csv', inventory), /Unknown report type: nope/);
});

test('exportReport with an invalid format does not read the items', () => {
  assert.throws(() => exportReport('summary', 'xml', 'not an array'), /Unknown export format/);
});
