const test = require('node:test');
const assert = require('node:assert');
const { REPORT_TYPES, EXPORT_FORMATS, generateReport, exportReport } = require('./index');
const { inventory, expectedSummary } = require('./fixtures');

test('exposes the supported report types and formats', () => {
  assert.deepStrictEqual(REPORT_TYPES, ['summary', 'low-stock', 'categories']);
  assert.deepStrictEqual(EXPORT_FORMATS, ['json', 'csv']);
});

test('generateReport dispatches to each builder', () => {
  assert.deepStrictEqual(generateReport('summary', inventory), expectedSummary);
  assert.strictEqual(generateReport('low-stock', inventory).length, 4);
  assert.strictEqual(generateReport('categories', inventory).length, 4);
});

test('generateReport forwards options', () => {
  assert.strictEqual(generateReport('low-stock', inventory, { threshold: 1 }).length, 2);
});

test('generateReport rejects unknown and prototype-key types', () => {
  assert.throws(() => generateReport('nope', inventory), RangeError);
  assert.throws(() => generateReport('toString', inventory), RangeError);
});

test('summary exports as JSON', () => {
  const out = exportReport('summary', 'json', inventory);
  assert.strictEqual(out.contentType, 'application/json; charset=utf-8');
  assert.strictEqual(out.filename, 'inventory-summary.json');
  assert.deepStrictEqual(JSON.parse(out.body), expectedSummary);
});

test('summary exports as metric/value CSV', () => {
  const out = exportReport('summary', 'csv', inventory);
  assert.strictEqual(out.contentType, 'text/csv; charset=utf-8');
  assert.strictEqual(out.filename, 'inventory-summary.csv');
  const lines = out.body.split('\r\n');
  assert.strictEqual(lines[0], 'metric,value');
  assert.ok(lines.includes('totalItems,6'));
  assert.ok(lines.includes('totalValue,463.3'));
  assert.strictEqual(lines[lines.length - 1], '');
});

test('low-stock exports as CSV with one row per item', () => {
  const out = exportReport('low-stock', 'csv', inventory);
  const lines = out.body.trimEnd().split('\r\n');
  assert.strictEqual(lines[0], 'id,name,category,quantity,reorderLevel,shortfall');
  assert.strictEqual(lines[1], '3,Gizmo,electronics,0,10,10');
  assert.strictEqual(lines.length, 5);
});

test('low-stock CSV for a fully stocked inventory is empty, not a bare header', () => {
  const out = exportReport('low-stock', 'csv', [{ name: 'a', quantity: 99 }]);
  assert.strictEqual(out.body, '');
});

test('categories export as JSON matching generateReport', () => {
  const out = exportReport('categories', 'json', inventory);
  assert.deepStrictEqual(JSON.parse(out.body), generateReport('categories', inventory));
});

test('categories export as CSV with a header row', () => {
  const out = exportReport('categories', 'csv', inventory);
  const lines = out.body.trimEnd().split('\r\n');
  assert.strictEqual(lines[0], 'category,itemCount,totalUnits,totalValue,outOfStock,valueShare');
  assert.strictEqual(lines[1], 'hardware,2,105,300,0,64.75');
});

test('item names with commas and formulas are safe in CSV', () => {
  const out = exportReport('low-stock', 'csv', [{ id: 1, name: '=cmd, "x"', quantity: 0 }]);
  assert.ok(out.body.includes('"\'=cmd, ""x"""'));
});

test('exportReport rejects unknown formats and types', () => {
  assert.throws(() => exportReport('summary', 'xml', inventory), RangeError);
  assert.throws(() => exportReport('summary', 'constructor', inventory), RangeError);
  assert.throws(() => exportReport('bogus', 'csv', inventory), RangeError);
});
