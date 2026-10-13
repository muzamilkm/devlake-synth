const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseItemsCsv, ImportError } = require('./importer');
const { createStore } = require('./store');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parseItemsCsv: valid file', () => {
  const { valid, errors, total } = parseItemsCsv(fixture('valid.csv'));
  assert.strictEqual(total, 3);
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(
    valid.map((v) => v.item),
    [
      { name: 'Widget', description: 'A small widget' },
      { name: 'Gadget', description: 'Blue gadget' },
      { name: 'Gizmo' },
    ]
  );
});

test('parseItemsCsv: name-only header', () => {
  const { valid } = parseItemsCsv(fixture('name-only.csv'));
  assert.deepStrictEqual(valid.map((v) => v.item), [{ name: 'Only Name' }, { name: 'Another' }]);
});

test('parseItemsCsv: header is case-insensitive and BOM-tolerant', () => {
  const { valid } = parseItemsCsv('﻿Name, Description\nBom Item,from excel\n');
  assert.deepStrictEqual(valid[0].item, { name: 'Bom Item', description: 'from excel' });
});

test('parseItemsCsv: column order does not matter', () => {
  const { valid } = parseItemsCsv('description,name\nd,n\n');
  assert.deepStrictEqual(valid[0].item, { name: 'n', description: 'd' });
});

test('parseItemsCsv: names are trimmed', () => {
  const { valid } = parseItemsCsv('name\n  padded  \n');
  assert.strictEqual(valid[0].item.name, 'padded');
});

test('parseItemsCsv: reports invalid rows with 1-based row numbers counting the header', () => {
  const { valid, errors, total } = parseItemsCsv(fixture('invalid-rows.csv'));
  assert.strictEqual(total, 5);
  assert.deepStrictEqual(
    valid.map((v) => [v.row, v.item.name]),
    [[2, 'Good'], [6, 'Also Good']]
  );
  assert.deepStrictEqual(errors, [
    { row: 3, error: 'Name field is required and must be a non-empty string' },
    { row: 4, error: 'Name field is required and must be a non-empty string' },
    { row: 5, error: 'Expected 2 columns but found 3' },
  ]);
});

test('parseItemsCsv: header problems throw ImportError', () => {
  const cases = [
    ['', /empty/],
    [fixture('missing-column.csv'), /Missing required column.*name/],
    [fixture('unknown-column.csv'), /Unknown column.*colour/],
    [fixture('header-only.csv'), /no data rows/],
    [fixture('unterminated.csv'), /Unterminated/],
    ['name,name\na,b\n', /Duplicate/],
  ];
  for (const [input, pattern] of cases) {
    assert.throws(() => parseItemsCsv(input), (err) => err instanceof ImportError && pattern.test(err.message));
  }
});

test('parseItemsCsv: enforces the row limit', () => {
  const csv = 'name\na\nb\nc\n';
  assert.throws(() => parseItemsCsv(csv, { maxRows: 2 }), /maximum of 2 rows/);
  assert.strictEqual(parseItemsCsv(csv, { maxRows: 3 }).valid.length, 3);
});

test('store.createMany: creates items with sequential ids', () => {
  const store = createStore();
  const items = store.createMany([{ name: 'a' }, { name: 'b' }]);
  assert.deepStrictEqual(items.map((i) => i.id), [1, 2]);
  assert.strictEqual(store.list().total, 2);
});
