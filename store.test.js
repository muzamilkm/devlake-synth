const test = require('node:test');
const assert = require('node:assert');
const { createStore } = require('./store');

test('create assigns incrementing ids and timestamps', () => {
  const store = createStore();
  const a = store.create({ name: 'a' });
  const b = store.create({ name: 'b' });
  assert.strictEqual(a.id, 1);
  assert.strictEqual(b.id, 2);
  assert.ok(a.createdAt);
  assert.strictEqual(a.createdAt, a.updatedAt);
});

test('get returns a copy, or null when missing', () => {
  const store = createStore();
  const a = store.create({ name: 'a' });
  const fetched = store.get(a.id);
  fetched.name = 'mutated';
  assert.strictEqual(store.get(a.id).name, 'a');
  assert.strictEqual(store.get(999), null);
});

test('list returns total and supports offset/limit', () => {
  const store = createStore();
  for (let i = 0; i < 5; i++) store.create({ name: 'item' + i });
  assert.strictEqual(store.list().items.length, 5);
  const page = store.list({ offset: 1, limit: 2 });
  assert.strictEqual(page.total, 5);
  assert.deepStrictEqual(page.items.map((i) => i.name), ['item1', 'item2']);
  assert.strictEqual(store.list({ offset: 10 }).items.length, 0);
});

test('list filters by case-insensitive name substring', () => {
  const store = createStore();
  for (const name of ['Red Apple', 'green apple', 'Banana']) store.create({ name });
  const page = store.list({ name: 'APPLE' });
  assert.strictEqual(page.total, 2);
  assert.deepStrictEqual(page.items.map((i) => i.name), ['Red Apple', 'green apple']);
});

test('list filters by inclusive price range and skips unpriced items', () => {
  const store = createStore();
  store.create({ name: 'free', price: 0 });
  store.create({ name: 'cheap', price: 5 });
  store.create({ name: 'mid', price: 10 });
  store.create({ name: 'pricey', price: 50 });
  store.create({ name: 'unpriced' });
  const names = (opts) => store.list(opts).items.map((i) => i.name);
  assert.deepStrictEqual(names({ minPrice: 5, maxPrice: 10 }), ['cheap', 'mid']);
  assert.deepStrictEqual(names({ minPrice: 10 }), ['mid', 'pricey']);
  assert.deepStrictEqual(names({ maxPrice: 5 }), ['free', 'cheap']);
  assert.strictEqual(store.list().total, 5);
});

test('list applies filters before pagination', () => {
  const store = createStore();
  for (let i = 0; i < 6; i++) store.create({ name: (i % 2 ? 'odd' : 'even') + i, price: i });
  const page = store.list({ name: 'odd', offset: 1, limit: 1 });
  assert.strictEqual(page.total, 3);
  assert.deepStrictEqual(page.items.map((i) => i.name), ['odd3']);
});

test('replace drops old fields but keeps id and createdAt', () => {
  const store = createStore();
  const a = store.create({ name: 'a', description: 'old' });
  const r = store.replace(a.id, { name: 'new' });
  assert.strictEqual(r.name, 'new');
  assert.strictEqual(r.description, undefined);
  assert.strictEqual(r.id, a.id);
  assert.strictEqual(r.createdAt, a.createdAt);
  assert.strictEqual(store.replace(999, { name: 'x' }), null);
});

test('update merges changes and cannot change id', () => {
  const store = createStore();
  const a = store.create({ name: 'a', description: 'd' });
  const u = store.update(a.id, { name: 'b', id: 42 });
  assert.strictEqual(u.name, 'b');
  assert.strictEqual(u.description, 'd');
  assert.strictEqual(u.id, a.id);
  assert.strictEqual(store.update(999, {}), null);
});

test('remove deletes and reports whether anything was removed', () => {
  const store = createStore();
  const a = store.create({ name: 'a' });
  assert.strictEqual(store.remove(a.id), true);
  assert.strictEqual(store.remove(a.id), false);
  assert.strictEqual(store.get(a.id), null);
});

test('clear empties the store and resets ids', () => {
  const store = createStore();
  store.create({ name: 'a' });
  store.clear();
  assert.strictEqual(store.list().total, 0);
  assert.strictEqual(store.create({ name: 'b' }).id, 1);
});
