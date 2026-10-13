const test = require('node:test');
const assert = require('node:assert');
const { validateItem, validateItemPatch } = require('./validate');

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

test('validateItem: non-string description', () => {
  assert.strictEqual(validateItem({ name: 'x', description: 5 }), 'Description must be a string');
});

test('validateItem: valid description', () => {
  assert.strictEqual(validateItem({ name: 'x', description: 'd' }), null);
});

const priceCases = [
  { name: 'integer price', price: 10, expected: null },
  { name: 'decimal price', price: 9.99, expected: null },
  { name: 'zero price', price: 0, expected: null },
  { name: 'negative price', price: -1, expected: 'Price must be a non-negative number' },
  { name: 'string price', price: '10', expected: 'Price must be a non-negative number' },
  { name: 'null price', price: null, expected: 'Price must be a non-negative number' },
  { name: 'NaN price', price: NaN, expected: 'Price must be a non-negative number' },
  { name: 'infinite price', price: Infinity, expected: 'Price must be a non-negative number' },
];

priceCases.forEach(({ name, price, expected }) => {
  test(`validateItem: ${name}`, () => {
    assert.strictEqual(validateItem({ name: 'x', price }), expected);
  });
});

const patchCases = [
  { name: 'name only', patch: { name: 'x' }, expected: null },
  { name: 'description only', patch: { description: 'd' }, expected: null },
  { name: 'price only', patch: { price: 5 }, expected: null },
  { name: 'bad price', patch: { price: -5 }, expected: 'Price must be a non-negative number' },
  { name: 'valid name, bad price', patch: { name: 'x', price: 'a' }, expected: 'Price must be a non-negative number' },
  { name: 'empty patch', patch: {}, expected: 'At least one of name, description or price is required' },
  { name: 'null patch', patch: null, expected: 'Item must be an object' },
  { name: 'array patch', patch: [], expected: 'Item must be an object' },
  { name: 'blank name', patch: { name: ' ' }, expected: 'Name field is required and must be a non-empty string' },
  { name: 'bad description', patch: { description: 1 }, expected: 'Description must be a string' },
  { name: 'valid name, bad description', patch: { name: 'x', description: 1 }, expected: 'Description must be a string' },
];

patchCases.forEach(({ name, patch, expected }) => {
  test(`validateItemPatch: ${name}`, () => {
    assert.strictEqual(validateItemPatch(patch), expected);
  });
});
