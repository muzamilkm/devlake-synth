const test = require('node:test');
const assert = require('node:assert');
const { generateReport, exportReport } = require('./index');
const { inventory, messyInventory } = require('./fixtures');

const emptySummary = {
  totalItems: 0,
  totalUnits: 0,
  totalValue: 0,
  outOfStock: 0,
  categoryCount: 0,
  averagePrice: 0,
  minPrice: null,
  maxPrice: null,
};

test('empty inventory: every report builds without NaN or errors', () => {
  assert.deepStrictEqual(generateReport('summary', []), emptySummary);
  assert.deepStrictEqual(generateReport('low-stock', []), []);
  assert.deepStrictEqual(generateReport('categories', []), []);
});

test('empty inventory: JSON exports', () => {
  assert.strictEqual(exportReport('low-stock', 'json', []).body, '[]\n');
  assert.strictEqual(exportReport('categories', 'json', []).body, '[]\n');
  assert.deepStrictEqual(JSON.parse(exportReport('summary', 'json', []).body), emptySummary);
});

test('empty inventory: CSV exports', () => {
  assert.strictEqual(exportReport('low-stock', 'csv', []).body, '');
  assert.strictEqual(exportReport('categories', 'csv', []).body, '');
  const lines = exportReport('summary', 'csv', []).body.split('\r\n');
  assert.ok(lines.includes('totalItems,0'));
  assert.ok(lines.includes('minPrice,'));
  assert.ok(lines.includes('maxPrice,'));
});

test('zero-quantity items count as out of stock and add no value', () => {
  const items = [{ id: 1, name: 'Empty', category: 'Misc', price: 5, quantity: 0 }];
  assert.deepStrictEqual(generateReport('summary', items), {
    totalItems: 1,
    totalUnits: 0,
    totalValue: 0,
    outOfStock: 1,
    categoryCount: 1,
    averagePrice: 5,
    minPrice: 5,
    maxPrice: 5,
  });
  assert.deepStrictEqual(generateReport('categories', items), [
    { category: 'misc', itemCount: 1, totalUnits: 0, totalValue: 0, outOfStock: 1, valueShare: 0 },
  ]);
});

test('zero-quantity items are always low stock, with the full level as shortfall', () => {
  const [row] = generateReport('low-stock', [{ id: 1, name: 'Empty', quantity: 0 }]);
  assert.strictEqual(row.quantity, 0);
  assert.strictEqual(row.reorderLevel, 10);
  assert.strictEqual(row.shortfall, 10);
  const [own] = generateReport('low-stock', [{ id: 2, name: 'Own', quantity: 0, reorderLevel: 0 }]);
  assert.strictEqual(own.shortfall, 0);
});

test('items exactly at the default threshold are low, one above is not', () => {
  const names = generateReport('low-stock', [
    { name: 'below', quantity: 9 },
    { name: 'at', quantity: 10 },
    { name: 'above', quantity: 11 },
  ]).map((r) => r.name);
  assert.deepStrictEqual(names, ['below', 'at']);
});

test('items exactly at a custom threshold are low, one above is not', () => {
  const items = [
    { name: 'at', quantity: 3 },
    { name: 'above', quantity: 4 },
  ];
  assert.deepStrictEqual(generateReport('low-stock', items, { threshold: 3 }).map((r) => r.name), ['at']);
});

test('items exactly at their own reorderLevel are low, one above is not', () => {
  const items = [
    { name: 'at', quantity: 50, reorderLevel: 50 },
    { name: 'above', quantity: 51, reorderLevel: 50 },
  ];
  const report = generateReport('low-stock', items, { threshold: 1000 });
  assert.deepStrictEqual(report.map((r) => r.name), ['at']);
  assert.strictEqual(report[0].shortfall, 0);
});

test('unknown, blank and non-string categories fall into uncategorized', () => {
  const rows = generateReport('categories', messyInventory);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].category, 'uncategorized');
  assert.strictEqual(rows[0].itemCount, 3);
  assert.strictEqual(rows[0].totalUnits, 0);
  assert.strictEqual(rows[0].outOfStock, 3);
});

test('category names are trimmed and case-folded so variants merge', () => {
  const rows = generateReport('categories', [
    { name: 'a', category: 'Tools', price: 1, quantity: 1 },
    { name: 'b', category: ' tools ', price: 1, quantity: 1 },
    { name: 'c', category: 'TOOLS', price: 1, quantity: 1 },
  ]);
  assert.deepStrictEqual(rows.map((r) => [r.category, r.itemCount]), [['tools', 3]]);
});

test('filtering low-stock by a category that does not exist yields nothing', () => {
  assert.deepStrictEqual(generateReport('low-stock', inventory, { category: 'nonexistent' }), []);
});

test('a non-string category option is ignored rather than filtering everything out', () => {
  const all = generateReport('low-stock', inventory);
  assert.deepStrictEqual(generateReport('low-stock', inventory, { category: 42 }), all);
});

test('category valueShare values are 0 when the whole inventory is worthless', () => {
  const rows = generateReport('categories', [
    { name: 'a', category: 'x', price: 0, quantity: 5 },
    { name: 'b', category: 'y', price: 3, quantity: 0 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.valueShare), [0, 0]);
});

test('CSV escapes commas in item names and categories', () => {
  const items = [{ id: 1, name: 'Nuts, bolts', category: 'Parts, misc', quantity: 1 }];
  const lines = exportReport('low-stock', 'csv', items).body.split('\r\n');
  assert.strictEqual(lines[1], '1,"Nuts, bolts","parts, misc",1,10,9');
  const cats = exportReport('categories', 'csv', items).body.split('\r\n');
  assert.strictEqual(cats[1].split(',')[0], '"parts');
  assert.ok(cats[1].startsWith('"parts, misc",1,'));
});

test('CSV doubles embedded quotes', () => {
  const items = [{ id: 1, name: 'The "Big" One', quantity: 2 }];
  const lines = exportReport('low-stock', 'csv', items).body.split('\r\n');
  assert.strictEqual(lines[1], '1,"The ""Big"" One",uncategorized,2,10,8');
});

test('CSV keeps newlines inside a quoted field', () => {
  const items = [{ id: 1, name: 'two\nlines', quantity: 1 }];
  const body = exportReport('low-stock', 'csv', items).body;
  assert.ok(body.includes('"two\nlines"'));
});

test('CSV with a comma and a quote together stays a single field', () => {
  const items = [{ id: 1, name: 'a, "b"', quantity: 1 }];
  const body = exportReport('low-stock', 'csv', items).body;
  assert.ok(body.includes(',"a, ""b""",'));
});

test('JSON low-stock rows have exactly the documented keys, in order', () => {
  const [row] = JSON.parse(exportReport('low-stock', 'json', inventory).body);
  assert.deepStrictEqual(Object.keys(row), ['id', 'name', 'category', 'quantity', 'reorderLevel', 'shortfall']);
});

test('JSON category rows have exactly the documented keys, in order', () => {
  const [row] = JSON.parse(exportReport('categories', 'json', inventory).body);
  assert.deepStrictEqual(Object.keys(row), [
    'category',
    'itemCount',
    'totalUnits',
    'totalValue',
    'outOfStock',
    'valueShare',
  ]);
});

test('JSON summary has exactly the documented keys, and null extremes survive', () => {
  const summary = JSON.parse(exportReport('summary', 'json', inventory).body);
  assert.deepStrictEqual(Object.keys(summary), [
    'totalItems',
    'totalUnits',
    'totalValue',
    'outOfStock',
    'categoryCount',
    'averagePrice',
    'minPrice',
    'maxPrice',
  ]);
  const empty = JSON.parse(exportReport('summary', 'json', []).body);
  assert.strictEqual(empty.minPrice, null);
  assert.strictEqual(empty.maxPrice, null);
});

test('JSON exports are pretty printed, newline-terminated arrays or objects', () => {
  const list = exportReport('categories', 'json', inventory).body;
  assert.ok(list.startsWith('[\n  {\n    "category"'));
  assert.ok(list.endsWith(']\n'));
  const summary = exportReport('summary', 'json', inventory).body;
  assert.ok(summary.startsWith('{\n  "totalItems": 6'));
  assert.ok(summary.endsWith('}\n'));
});

test('export result has the expected shape for every type and format', () => {
  for (const type of ['summary', 'low-stock', 'categories']) {
    for (const [format, contentType] of [
      ['json', 'application/json; charset=utf-8'],
      ['csv', 'text/csv; charset=utf-8'],
    ]) {
      const out = exportReport(type, format, inventory);
      assert.deepStrictEqual(Object.keys(out), ['contentType', 'filename', 'body']);
      assert.strictEqual(out.contentType, contentType);
      assert.strictEqual(out.filename, 'inventory-' + type + '.' + format);
      assert.strictEqual(typeof out.body, 'string');
    }
  }
});

test('reports do not mutate the input items', () => {
  const copy = JSON.parse(JSON.stringify(inventory));
  for (const type of ['summary', 'low-stock', 'categories']) exportReport(type, 'csv', inventory);
  assert.deepStrictEqual(inventory, copy);
});
