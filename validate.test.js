const { validateItem } = require('./validate');

const testCases = [
  { item: { name: 'Valid Item' }, expected: null },
  { item: { name: '' }, expected: 'Name field is required and must be a non-empty string' },
  { item: {}, expected: 'Name field is required and must be a non-empty string' },
  { item: null, expected: 'Item must be an object' },
  { item: { name: '  ' }, expected: 'Name field is required and must be a non-empty string' },
];

testCases.forEach((test, idx) => {
  const result = validateItem(test.item);
  const passed = result === test.expected;
  console.log(`Test ${idx + 1}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) {
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got: ${result}`);
  }
});
