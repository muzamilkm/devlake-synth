const test = require('node:test');
const assert = require('node:assert');
const app = require('./app');

let server;
let base;

async function call(method, path, body, raw) {
  const res = await fetch(base + path, {
    method,
    headers: body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://localhost:' + server.address().port;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  app.locals.itemStore.clear();
});

test('GET /items returns an empty list initially', async () => {
  const res = await call('GET', '/items');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { total: 0, items: [] });
});

test('POST /items creates an item', async () => {
  const res = await call('POST', '/items', { name: '  Widget ', description: 'blue' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.headers.get('location'), '/items/1');
  assert.strictEqual(res.body.id, 1);
  assert.strictEqual(res.body.name, 'Widget');
  assert.strictEqual(res.body.description, 'blue');
  assert.ok(res.body.createdAt);
});

test('POST /items ignores unknown fields and client-supplied id', async () => {
  const res = await call('POST', '/items', { name: 'a', id: 99, admin: true });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.id, 1);
  assert.strictEqual(res.body.admin, undefined);
});

test('POST /items rejects invalid input', async () => {
  for (const body of [{}, { name: '' }, { name: 3 }, { name: 'a', description: 1 }]) {
    const res = await call('POST', '/items', body);
    assert.strictEqual(res.status, 400, JSON.stringify(body));
    assert.ok(res.body.error);
  }
});

test('POST /items rejects malformed JSON', async () => {
  const res = await call('POST', '/items', undefined, '{bad');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Invalid JSON body');
});

test('GET /items lists created items with pagination', async () => {
  for (const name of ['a', 'b', 'c']) await call('POST', '/items', { name });
  const all = await call('GET', '/items');
  assert.strictEqual(all.body.total, 3);
  assert.deepStrictEqual(all.body.items.map((i) => i.name), ['a', 'b', 'c']);
  const page = await call('GET', '/items?offset=1&limit=1');
  assert.strictEqual(page.body.total, 3);
  assert.deepStrictEqual(page.body.items.map((i) => i.name), ['b']);
});

test('GET /items sets X-Total-Count to the total regardless of page', async () => {
  assert.strictEqual((await call('GET', '/items')).headers.get('x-total-count'), '0');
  for (let i = 0; i < 25; i++) app.locals.itemStore.create({ name: 'n' + i });
  const res = await call('GET', '/items?offset=20&limit=2');
  assert.strictEqual(res.headers.get('x-total-count'), '25');
  assert.strictEqual(res.body.items.length, 2);
});

test('GET /items sets Link next/prev headers', async () => {
  for (let i = 0; i < 25; i++) app.locals.itemStore.create({ name: 'n' + i });
  const first = await call('GET', '/items?limit=10');
  assert.strictEqual(first.headers.get('link'), '</items?offset=10&limit=10>; rel="next"');
  const middle = await call('GET', '/items?offset=10&limit=10');
  assert.strictEqual(
    middle.headers.get('link'),
    '</items?offset=20&limit=10>; rel="next", </items?offset=0&limit=10>; rel="prev"',
  );
  const last = await call('GET', '/items?offset=20&limit=10');
  assert.strictEqual(last.headers.get('link'), '</items?offset=10&limit=10>; rel="prev"');
});

test('GET /items omits Link when everything fits on one page', async () => {
  app.locals.itemStore.create({ name: 'a' });
  const res = await call('GET', '/items');
  assert.strictEqual(res.headers.get('link'), null);
});

test('GET /items rejects bad pagination params', async () => {
  for (const q of ['limit=-1', 'limit=0', 'offset=x', 'limit=1.5']) {
    const res = await call('GET', '/items?' + q);
    assert.strictEqual(res.status, 400, q);
  }
});

test('GET /items defaults to a page size of 20', async () => {
  for (let i = 0; i < 25; i++) app.locals.itemStore.create({ name: 'n' + i });
  const res = await call('GET', '/items');
  assert.strictEqual(res.body.total, 25);
  assert.strictEqual(res.body.items.length, 20);
});

test('GET /items clamps limit to the max page size of 100', async () => {
  for (let i = 0; i < 105; i++) app.locals.itemStore.create({ name: 'n' + i });
  for (const q of ['?limit=1000', '?limit=100']) {
    const res = await call('GET', '/items' + q);
    assert.strictEqual(res.status, 200, q);
    assert.strictEqual(res.body.total, 105, q);
    assert.strictEqual(res.body.items.length, 100, q);
  }
  const small = await call('GET', '/items?limit=5');
  assert.strictEqual(small.body.items.length, 5);
});

test('non-string name returns 400 instead of throwing', async () => {
  await call('POST', '/items', { name: 'a' });
  for (const name of [123, null, {}, [], true]) {
    assert.strictEqual((await call('POST', '/items', { name })).status, 400, JSON.stringify(name));
    assert.strictEqual((await call('PUT', '/items/1', { name })).status, 400, JSON.stringify(name));
    assert.strictEqual((await call('PATCH', '/items/1', { name })).status, 400, JSON.stringify(name));
  }
  assert.strictEqual((await call('GET', '/items/1')).body.name, 'a');
});

test('GET /items/:id returns the item',async () => {
  await call('POST', '/items', { name: 'a' });
  const res = await call('GET', '/items/1');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'a');
});

test('GET /items/:id returns 404 for unknown id and 400 for invalid id', async () => {
  assert.strictEqual((await call('GET', '/items/42')).status, 404);
  assert.strictEqual((await call('GET', '/items/abc')).status, 400);
  assert.strictEqual((await call('GET', '/items/0')).status, 400);
  assert.strictEqual((await call('GET', '/items/-1')).status, 400);
});

test('PUT /items/:id replaces the item', async () => {
  await call('POST', '/items', { name: 'a', description: 'old' });
  const res = await call('PUT', '/items/1', { name: 'b' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'b');
  assert.strictEqual(res.body.description, undefined);
  assert.strictEqual(res.body.id, 1);
});

test('PUT /items/:id validates and 404s', async () => {
  await call('POST', '/items', { name: 'a' });
  assert.strictEqual((await call('PUT', '/items/1', {})).status, 400);
  assert.strictEqual((await call('PUT', '/items/9', { name: 'x' })).status, 404);
  assert.strictEqual((await call('PUT', '/items/abc', { name: 'x' })).status, 400);
});

test('PATCH /items/:id updates only provided fields', async () => {
  await call('POST', '/items', { name: 'a', description: 'keep' });
  const res = await call('PATCH', '/items/1', { name: 'b' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'b');
  assert.strictEqual(res.body.description, 'keep');
  const res2 = await call('PATCH', '/items/1', { description: 'new' });
  assert.strictEqual(res2.body.name, 'b');
  assert.strictEqual(res2.body.description, 'new');
});

test('PATCH /items/:id validates and 404s', async () => {
  await call('POST', '/items', { name: 'a' });
  assert.strictEqual((await call('PATCH', '/items/1', {})).status, 400);
  assert.strictEqual((await call('PATCH', '/items/1', { name: ' ' })).status, 400);
  assert.strictEqual((await call('PATCH', '/items/9', { name: 'x' })).status, 404);
});

test('DELETE /items/:id removes the item', async () => {
  await call('POST', '/items', { name: 'a' });
  const res = await call('DELETE', '/items/1');
  assert.strictEqual(res.status, 204);
  assert.strictEqual((await call('GET', '/items/1')).status, 404);
  assert.strictEqual((await call('DELETE', '/items/1')).status, 404);
});

test('DELETE /items/:id rejects invalid id', async () => {
  assert.strictEqual((await call('DELETE', '/items/abc')).status, 400);
});

test('ids are not reused after delete', async () => {
  await call('POST', '/items', { name: 'a' });
  await call('DELETE', '/items/1');
  const res = await call('POST', '/items', { name: 'b' });
  assert.strictEqual(res.body.id, 2);
});

test('POST and PUT accept a trimmed category and reject a blank one', async () => {
  const created = await call('POST', '/items', { name: 'a', category: ' tools ' });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.category, 'tools');
  assert.strictEqual((await call('POST', '/items', { name: 'a', category: '  ' })).status, 400);
  assert.strictEqual((await call('PUT', '/items/1', { name: 'a', category: 5 })).status, 400);
  const replaced = await call('PUT', '/items/1', { name: 'b', category: 'food' });
  assert.strictEqual(replaced.body.category, 'food');
});

test('GET /items/categories returns distinct sorted categories', async () => {
  assert.deepStrictEqual((await call('GET', '/items/categories')).body, { categories: [] });
  await call('POST', '/items', { name: 'a', category: 'tools' });
  await call('POST', '/items', { name: 'b', category: 'food' });
  await call('POST', '/items', { name: 'c', category: 'tools' });
  await call('POST', '/items', { name: 'd' });
  const res = await call('GET', '/items/categories');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { categories: ['food', 'tools'] });
});

test('GET /items/categories drops a category once no item uses it', async () => {
  await call('POST', '/items', { name: 'a', category: 'tools' });
  await call('PATCH', '/items/1', { category: 'food' });
  assert.deepStrictEqual((await call('GET', '/items/categories')).body, { categories: ['food'] });
  await call('DELETE', '/items/1');
  assert.deepStrictEqual((await call('GET', '/items/categories')).body, { categories: [] });
});

test('PATCH /items/:id updates category on its own', async () => {
  await call('POST', '/items', { name: 'a', category: 'old' });
  const res = await call('PATCH', '/items/1', { category: ' new ' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'a');
  assert.strictEqual(res.body.category, 'new');
  assert.strictEqual((await call('PATCH', '/items/1', { category: '' })).status, 400);
});
