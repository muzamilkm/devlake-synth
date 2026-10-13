const test = require('node:test');
const assert = require('node:assert');
const { createUserStore, toPublicUser } = require('./store');

test('create assigns incrementing ids and hides the password hash', () => {
  const store = createUserStore();
  const a = store.create({ email: 'a@example.com', passwordHash: 'h1' });
  const b = store.create({ email: 'b@example.com', passwordHash: 'h2' });
  assert.strictEqual(a.id, 1);
  assert.strictEqual(b.id, 2);
  assert.strictEqual(a.email, 'a@example.com');
  assert.ok(a.createdAt);
  assert.strictEqual(a.passwordHash, undefined);
  assert.strictEqual(store.count(), 2);
});

test('create returns null for a duplicate email', () => {
  const store = createUserStore();
  store.create({ email: 'a@example.com', passwordHash: 'h1' });
  assert.strictEqual(store.create({ email: 'a@example.com', passwordHash: 'h2' }), null);
  assert.strictEqual(store.count(), 1);
  assert.strictEqual(store.findByEmail('a@example.com').passwordHash, 'h1');
});

test('get returns the public user, or null when missing', () => {
  const store = createUserStore();
  const created = store.create({ email: 'a@example.com', passwordHash: 'h' });
  assert.deepStrictEqual(store.get(1), created);
  assert.strictEqual(store.get(2), null);
});

test('findByEmail includes the hash and returns a copy', () => {
  const store = createUserStore();
  store.create({ email: 'a@example.com', passwordHash: 'h' });
  const user = store.findByEmail('a@example.com');
  assert.strictEqual(user.passwordHash, 'h');
  user.passwordHash = 'tampered';
  assert.strictEqual(store.findByEmail('a@example.com').passwordHash, 'h');
  assert.strictEqual(store.findByEmail('missing@example.com'), null);
});

test('has reports whether an email is registered', () => {
  const store = createUserStore();
  store.create({ email: 'a@example.com', passwordHash: 'h' });
  assert.strictEqual(store.has('a@example.com'), true);
  assert.strictEqual(store.has('b@example.com'), false);
});

test('clear empties the store and resets ids', () => {
  const store = createUserStore();
  store.create({ email: 'a@example.com', passwordHash: 'h' });
  store.clear();
  assert.strictEqual(store.count(), 0);
  assert.strictEqual(store.has('a@example.com'), false);
  assert.strictEqual(store.create({ email: 'a@example.com', passwordHash: 'h' }).id, 1);
});

test('toPublicUser keeps only id, email and createdAt', () => {
  const user = { id: 1, email: 'a@example.com', passwordHash: 'h', createdAt: 'now', extra: true };
  assert.deepStrictEqual(toPublicUser(user), { id: 1, email: 'a@example.com', createdAt: 'now' });
});
