const test = require('node:test');
const assert = require('node:assert');
const { csvField, toCsv, objectToCsv, toJson } = require('./exporters');

test('csvField leaves plain values alone', () => {
  assert.strictEqual(csvField('abc'), 'abc');
  assert.strictEqual(csvField(12.5), '12.5');
  assert.strictEqual(csvField(0), '0');
  assert.strictEqual(csvField(false), 'false');
});

test('csvField renders null and undefined as empty', () => {
  assert.strictEqual(csvField(null), '');
  assert.strictEqual(csvField(undefined), '');
});

test('csvField quotes commas, quotes and newlines', () => {
  assert.strictEqual(csvField('a,b'), '"a,b"');
  assert.strictEqual(csvField('say "hi"'), '"say ""hi"""');
  assert.strictEqual(csvField('line1\nline2'), '"line1\nline2"');
  assert.strictEqual(csvField('line1\r\nline2'), '"line1\r\nline2"');
});

test('csvField neutralizes spreadsheet formulas in strings', () => {
  assert.strictEqual(csvField('=SUM(A1)'), "'=SUM(A1)");
  assert.strictEqual(csvField('+1'), "'+1");
  assert.strictEqual(csvField('-1+2'), "'-1+2");
  assert.strictEqual(csvField('@cmd'), "'@cmd");
  assert.strictEqual(csvField('=a,b'), '"\'=a,b"');
});

test('csvField also guards plain strings that merely start with a formula character', () => {
  // Known trade-off: the guard is prefix-based, so ordinary data like phone
  // numbers or a lone dash is quoted with an apostrophe too.
  assert.strictEqual(csvField('+1 555'), "'+1 555");
  assert.strictEqual(csvField('-'), "'-");
});

test('csvField does not alter negative numbers', () => {
  assert.strictEqual(csvField(-5), '-5');
});

test('toCsv writes a header and CRLF-terminated rows', () => {
  const csv = toCsv([{ a: 1, b: 'x' }, { a: 2, b: 'y' }]);
  assert.strictEqual(csv, 'a,b\r\n1,x\r\n2,y\r\n');
});

test('toCsv honours an explicit column list and order', () => {
  const csv = toCsv([{ a: 1, b: 2, c: 3 }], ['c', 'a']);
  assert.strictEqual(csv, 'c,a\r\n3,1\r\n');
});

test('toCsv leaves cells for missing keys empty', () => {
  assert.strictEqual(toCsv([{ a: 1 }], ['a', 'b']), 'a,b\r\n1,\r\n');
});

test('toCsv with no rows still emits the header when columns are given', () => {
  assert.strictEqual(toCsv([], ['a', 'b']), 'a,b\r\n');
});

test('toCsv with no rows and no columns is empty', () => {
  assert.strictEqual(toCsv([]), '');
});

test('toCsv rejects non-arrays', () => {
  assert.throws(() => toCsv({}), TypeError);
});

test('objectToCsv emits metric/value rows', () => {
  assert.strictEqual(objectToCsv({ total: 3, min: null }), 'metric,value\r\ntotal,3\r\nmin,\r\n');
});

test('toJson pretty prints with a trailing newline by default', () => {
  assert.strictEqual(toJson({ a: 1 }), '{\n  "a": 1\n}\n');
});

test('toJson can emit compact output', () => {
  assert.strictEqual(toJson({ a: [1, 2] }, { pretty: false }), '{"a":[1,2]}');
});

test('toJson round-trips', () => {
  const data = [{ a: 1, b: null, c: 'x' }];
  assert.deepStrictEqual(JSON.parse(toJson(data)), data);
});
