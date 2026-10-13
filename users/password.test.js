const test = require('node:test');
const assert = require('node:assert');
const { validatePassword, hashPassword, verifyPassword } = require('./password');
const { createUserStore } = require('./userStore');

test('validatePassword rejects missing, non-string, short and overlong passwords', () => {
  assert.strictEqual(typeof validatePassword(undefined), 'string');
  assert.strictEqual(typeof validatePassword(''), 'string');
  assert.strictEqual(typeof validatePassword(12345678), 'string');
  assert.strictEqual(typeof validatePassword('short'), 'string');
  assert.strictEqual(typeof validatePassword('x'.repeat(129)), 'string');
});

test('validatePassword accepts a password of reasonable length', () => {
  assert.strictEqual(validatePassword('correct horse'), null);
});

test('hashPassword salts each hash and verifyPassword checks it', () => {
  const a = hashPassword('correct horse');
  const b = hashPassword('correct horse');
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes('correct horse'));
  assert.strictEqual(verifyPassword('correct horse', a), true);
  assert.strictEqual(verifyPassword('wrong horse', a), false);
});

test('verifyPassword returns false for a malformed stored hash', () => {
  assert.strictEqual(verifyPassword('anything', 'not-a-hash'), false);
});

test('user store looks up by case-insensitive email and updates the hash', () => {
  const store = createUserStore();
  store.add('Alice@Example.com', 'original-pass');
  const user = store.findByEmail('alice@example.com ');
  assert.ok(user);
  assert.strictEqual(verifyPassword('original-pass', user.passwordHash), true);

  assert.strictEqual(store.setPasswordHash('ALICE@example.com', hashPassword('new-password')), true);
  assert.strictEqual(verifyPassword('new-password', store.findByEmail('alice@example.com').passwordHash), true);
  assert.strictEqual(store.setPasswordHash('nobody@example.com', 'x:y'), false);
  assert.strictEqual(store.findByEmail('nobody@example.com'), null);
});
