const test = require('node:test');
const assert = require('node:assert');
const {
  MAX_PASSWORD_LENGTH,
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateRegistration,
} = require('./validate');

const STRONG = 'Str0ng!Pass';

test('normalizeEmail trims and lowercases', () => {
  assert.strictEqual(normalizeEmail('  Alice@Example.COM '), 'alice@example.com');
});

for (const email of [
  'alice@example.com',
  'a.b+tag@sub.example.co.uk',
  'x_y-z@my-domain.io',
  "o'brien@example.org",
  '  padded@example.com  ',
]) {
  test(`validateEmail accepts ${JSON.stringify(email)}`, () => {
    assert.strictEqual(validateEmail(email), null);
  });
}

for (const email of [
  'plainaddress',
  '@example.com',
  'alice@',
  'alice@example',
  'alice@@example.com',
  'a@b@example.com',
  'alice@.example.com',
  'alice@example..com',
  'alice@-example.com',
  'alice@example-.com',
  'alice@example.c',
  'alice@example.123',
  '.alice@example.com',
  'alice.@example.com',
  'al..ice@example.com',
  'al ice@example.com',
  'alice@exa mple.com',
  'a'.repeat(65) + '@example.com',
  'a@' + 'b'.repeat(64) + '.com',
]) {
  test(`validateEmail rejects ${JSON.stringify(email.length > 40 ? email.slice(0, 40) + '…' : email)}`, () => {
    assert.strictEqual(validateEmail(email), 'Email must be a valid email address');
  });
}

test('validateEmail requires a non-empty string', () => {
  for (const email of [undefined, null, '', '   ', 42, {}, []]) {
    assert.strictEqual(
      validateEmail(email),
      'Email is required and must be a non-empty string',
      JSON.stringify(email),
    );
  }
});

test('validateEmail reports the max length', () => {
  const email = 'a'.repeat(60) + '@' + 'b'.repeat(190) + '.com';
  assert.strictEqual(validateEmail(email), 'Email must be at most 254 characters');
});

test('validatePassword accepts a strong password', () => {
  assert.deepStrictEqual(validatePassword(STRONG), []);
  assert.deepStrictEqual(validatePassword('with space 1A!'), []);
});

test('validatePassword requires a non-empty string', () => {
  for (const password of [undefined, null, '', 12345678, {}]) {
    assert.deepStrictEqual(
      validatePassword(password),
      ['Password is required and must be a non-empty string'],
      JSON.stringify(password),
    );
  }
});

test('validatePassword enforces each complexity rule', () => {
  const cases = [
    ['Sh0rt!', 'Password must be at least 8 characters'],
    ['NOLOWER1!', 'Password must contain a lowercase letter'],
    ['noupper1!', 'Password must contain an uppercase letter'],
    ['NoDigits!!', 'Password must contain a digit'],
    ['NoSpecial12', 'Password must contain a special character'],
    [' Leading1!', 'Password must not start or end with whitespace'],
    ['Trailing1! ', 'Password must not start or end with whitespace'],
  ];
  for (const [password, expected] of cases) {
    assert.deepStrictEqual(validatePassword(password), [expected], password);
  }
});

test('validatePassword enforces the max length', () => {
  const password = 'Aa1!'.repeat(MAX_PASSWORD_LENGTH / 4);
  assert.deepStrictEqual(validatePassword(password), []);
  assert.deepStrictEqual(validatePassword(password + 'x'), ['Password must be at most 128 characters']);
});

test('validatePassword reports every unmet rule', () => {
  assert.deepStrictEqual(validatePassword('abc'), [
    'Password must be at least 8 characters',
    'Password must contain an uppercase letter',
    'Password must contain a digit',
    'Password must contain a special character',
  ]);
});

test('validateRegistration accepts a valid body', () => {
  assert.deepStrictEqual(validateRegistration({ email: 'alice@example.com', password: STRONG }), []);
});

test('validateRegistration rejects non-object bodies', () => {
  for (const body of [undefined, null, 'x', 1, []]) {
    assert.deepStrictEqual(
      validateRegistration(body),
      [{ field: 'body', message: 'Request body must be a JSON object' }],
      JSON.stringify(body),
    );
  }
});

test('validateRegistration collects errors for both fields', () => {
  const errors = validateRegistration({ email: 'nope', password: 'short' });
  assert.deepStrictEqual(errors[0], { field: 'email', message: 'Email must be a valid email address' });
  assert.ok(errors.length > 1);
  assert.ok(errors.slice(1).every((e) => e.field === 'password'));
});

test('validateRegistration rejects passwords containing the email', () => {
  const errors = validateRegistration({ email: 'Bob@Example.com', password: 'X1!bob@example.comY' });
  assert.deepStrictEqual(errors, [
    { field: 'password', message: 'Password must not contain the email address' },
  ]);
});
