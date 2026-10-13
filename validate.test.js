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

test('validateItem: category is optional but must be a non-empty string', () => {
  assert.strictEqual(validateItem({ name: 'x', category: 'tools' }), null);
  assert.strictEqual(validateItem({ name: 'x', category: 3 }), 'Category must be a non-empty string');
  assert.strictEqual(validateItem({ name: 'x', category: '' }), 'Category must be a non-empty string');
});

const patchCases = [
  { name: 'name only', patch: { name: 'x' }, expected: null },
  { name: 'description only', patch: { description: 'd' }, expected: null },
  { name: 'category only', patch: { category: 'c' }, expected: null },
  { name: 'empty patch', patch: {}, expected: 'At least one of name, description, or category is required' },
  { name: 'blank category', patch: { category: ' ' }, expected: 'Category must be a non-empty string' },
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
