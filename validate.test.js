const test = require('node:test');
const assert = require('node:assert');
const { validateItem } = require('./validate');

const testCases = [
  { name: 'valid item', item: { name: 'Valid Item' }, expected: null },
  { name: 'empty name', item: { name: '' }, expected: 'Name field is required and must be a non-empty string' },
  { name: 'missing name', item: {}, expected: 'Name field is required and must be a non-empty string' },
  { name: 'null item', item: null, expected: 'Item must be an object' },
  { name: 'whitespace name', item: { name: '  ' }, expected: 'Name field is required and must be a non-empty string' },
];

testCases.forEach(({ name, item, expected }) => {
  test(`validateItem: ${name}`, () => {
    assert.strictEqual(validateItem(item), expected);
  });
});
