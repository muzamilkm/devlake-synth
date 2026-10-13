const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, CsvParseError } = require('./csv');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parseCsv: simple rows', () => {
  assert.deepStrictEqual(parseCsv('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
});

test('parseCsv: no trailing newline', () => {
  assert.deepStrictEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('parseCsv: CRLF and bare CR line endings', () => {
  assert.deepStrictEqual(parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
  assert.deepStrictEqual(parseCsv('a,b\r1,2\r'), [['a', 'b'], ['1', '2']]);
});

test('parseCsv: empty fields are preserved', () => {
  assert.deepStrictEqual(parseCsv('a,,c\n,,\n'), [['a', '', 'c'], ['', '', '']]);
});

test('parseCsv: trailing empty field', () => {
  assert.deepStrictEqual(parseCsv('a,b\nGizmo,\n'), [['a', 'b'], ['Gizmo', '']]);
});

test('parseCsv: quoted commas, escaped quotes and embedded newlines', () => {
  assert.deepStrictEqual(parseCsv(fixture('quoted.csv')), [
    ['name', 'description'],
    ['Quoted, Name', 'Says "hi"'],
    ['Multi\nLine', 'two\nlines'],
  ]);
});

test('parseCsv: quoted empty string stays a single empty field on its own line', () => {
  assert.deepStrictEqual(parseCsv('a\n""\nb\n'), [['a'], [''], ['b']]);
});

test('parseCsv: blank lines are skipped', () => {
  assert.deepStrictEqual(parseCsv('a,b\n\n1,2\n\n'), [['a', 'b'], ['1', '2']]);
});

test('parseCsv: strips a UTF-8 BOM', () => {
  assert.deepStrictEqual(parseCsv('﻿name\nx\n'), [['name'], ['x']]);
});

test('parseCsv: custom delimiter', () => {
  assert.deepStrictEqual(parseCsv('a;b\n1;"2;3"\n', { delimiter: ';' }), [['a', 'b'], ['1', '2;3']]);
});

test('parseCsv: empty input yields no rows', () => {
  assert.deepStrictEqual(parseCsv(''), []);
});

test('parseCsv: unterminated quote reports the line it started on', () => {
  assert.throws(
    () => parseCsv(fixture('unterminated.csv')),
    (err) => err instanceof CsvParseError && err.line === 2 && /Unterminated/.test(err.message)
  );
});

test('parseCsv: quote in the middle of an unquoted field is rejected', () => {
  assert.throws(() => parseCsv('ab"c,d\n'), CsvParseError);
});

test('parseCsv: text after a closing quote is rejected', () => {
  assert.throws(() => parseCsv('"ab"c,d\n'), CsvParseError);
});

test('parseCsv: non-string input throws TypeError', () => {
  assert.throws(() => parseCsv(null), TypeError);
  assert.throws(() => parseCsv(Buffer.from('a')), TypeError);
});
