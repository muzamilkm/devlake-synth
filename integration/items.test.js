const test = require('node:test');
const assert = require('node:assert');
const { useApp } = require('./helpers');
const { widget, gadget, invalidItemBodies, itemNames, seed } = require('./fixtures');

const api = useApp();

test('item lifecycle: create, read, replace, patch, delete', async () => {
  const created = await api.post('/items', widget);
  assert.strictEqual(created.status, 201);
  const url = created.headers.get('location');
  assert.strictEqual(url, '/items/' + created.body.id);

  const read = await api.get(url);
  assert.deepStrictEqual(read.body, created.body);

  const replaced = await api.put(url, gadget);
  assert.strictEqual(replaced.status, 200);
  assert.strictEqual(replaced.body.name, gadget.name);
  assert.strictEqual('description' in replaced.body, false);
  assert.strictEqual(replaced.body.createdAt, created.body.createdAt);

  const patched = await api.patch(url, { description: 'now with text' });
  assert.strictEqual(patched.status, 200);
  assert.strictEqual(patched.body.name, gadget.name);
  assert.strictEqual(patched.body.description, 'now with text');

  assert.strictEqual((await api.del(url)).status, 204);
  assert.strictEqual((await api.get(url)).status, 404);
});

test('responses are JSON with the expected item shape', async () => {
  const res = await api.post('/items', widget);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepStrictEqual(Object.keys(res.body).sort(), ['createdAt', 'description', 'id', 'name', 'updatedAt']);
  assert.ok(!Number.isNaN(Date.parse(res.body.createdAt)));
  assert.ok(!Number.isNaN(Date.parse(res.body.updatedAt)));
});

test('updatedAt advances on write while createdAt stays fixed', async () => {
  const created = await api.post('/items', widget);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const patched = await api.patch('/items/' + created.body.id, { name: 'renamed' });
  assert.strictEqual(patched.body.createdAt, created.body.createdAt);
  assert.ok(Date.parse(patched.body.updatedAt) > Date.parse(created.body.updatedAt));
});

test('POST and PUT reject every invalid body', async () => {
  api.store.create({ name: 'existing' });
  for (const body of invalidItemBodies) {
    const post = await api.post('/items', body);
    assert.strictEqual(post.status, 400, 'POST ' + JSON.stringify(body));
    assert.ok(post.body.error);
    const put = await api.put('/items/1', body);
    assert.strictEqual(put.status, 400, 'PUT ' + JSON.stringify(body));
  }
  const after = await api.get('/items');
  assert.strictEqual(after.body.total, 1);
  assert.strictEqual(after.body.items[0].name, 'existing');
});

test('PATCH rejects invalid bodies without modifying the item', async () => {
  api.store.create({ name: 'a', description: 'd' });
  for (const body of [{}, { name: '' }, { name: 5 }, { description: 5 }, { description: null }, []]) {
    const res = await api.patch('/items/1', body);
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }
  const item = (await api.get('/items/1')).body;
  assert.strictEqual(item.name, 'a');
  assert.strictEqual(item.description, 'd');
});

test('client-supplied id and timestamps are ignored on every write', async () => {
  const forged = { name: 'a', id: 99, createdAt: '2000-01-01T00:00:00.000Z', role: 'admin' };
  const created = await api.post('/items', forged);
  assert.strictEqual(created.body.id, 1);
  assert.notStrictEqual(created.body.createdAt, forged.createdAt);
  assert.strictEqual(created.body.role, undefined);

  const replaced = await api.put('/items/1', forged);
  assert.strictEqual(replaced.body.id, 1);
  assert.strictEqual(replaced.body.createdAt, created.body.createdAt);

  const patched = await api.patch('/items/1', { ...forged, name: 'b' });
  assert.strictEqual(patched.body.id, 1);
  assert.strictEqual(patched.body.createdAt, created.body.createdAt);
  assert.strictEqual(patched.body.role, undefined);
});

test('names are trimmed on every write', async () => {
  const created = await api.post('/items', { name: '  a  ' });
  assert.strictEqual(created.body.name, 'a');
  assert.strictEqual((await api.put('/items/1', { name: ' b ' })).body.name, 'b');
  assert.strictEqual((await api.patch('/items/1', { name: ' c ' })).body.name, 'c');
});

test('invalid ids are rejected with 400 on every :id endpoint', async () => {
  for (const id of ['abc', '0', '-1', '1.5', '01']) {
    for (const [method, body] of [['GET'], ['PUT', gadget], ['PATCH', gadget], ['DELETE']]) {
      const res = await api.request(method, '/items/' + id, { body });
      assert.strictEqual(res.status, 400, `${method} /items/${id}`);
      assert.deepStrictEqual(res.body, { error: 'Invalid item id' }, `${method} /items/${id}`);
    }
  }
});

test('unknown ids return 404 on every :id endpoint', async () => {
  for (const [method, body] of [['GET'], ['PUT', gadget], ['PATCH', gadget], ['DELETE']]) {
    const res = await api.request(method, '/items/404', { body });
    assert.strictEqual(res.status, 404, method);
    assert.deepStrictEqual(res.body, { error: 'Item not found' }, method);
  }
});

test('deleting one item leaves the others untouched', async () => {
  seed(api.store, 3);
  assert.strictEqual((await api.del('/items/2')).status, 204);
  const list = await api.get('/items');
  assert.deepStrictEqual(list.body.items.map((i) => i.id), [1, 3]);
  assert.strictEqual(list.body.total, 2);
});

test('walking the Link rel=next chain visits every item exactly once', async () => {
  seed(api.store, 45);
  const seen = [];
  let path = '/items?limit=10';
  let pages = 0;
  while (path) {
    const res = await api.get(path);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-total-count'), '45');
    seen.push(...res.body.items.map((i) => i.name));
    const next = /<([^>]+)>; rel="next"/.exec(res.headers.get('link') || '');
    path = next ? next[1] : null;
    pages += 1;
  }
  assert.strictEqual(pages, 5);
  assert.deepStrictEqual(seen, itemNames(45));
});

test('paging past the end returns an empty page with a prev link', async () => {
  seed(api.store, 5);
  const res = await api.get('/items?offset=50&limit=10');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { total: 5, items: [] });
  assert.strictEqual(res.headers.get('link'), '</items?offset=40&limit=10>; rel="prev"');
});

test('pagination rejects malformed parameters', async () => {
  for (const q of ['offset=-1', 'offset=1.5', 'offset=', 'limit=', 'limit=abc', 'limit=0']) {
    const res = await api.get('/items?' + q);
    assert.strictEqual(res.status, 400, q);
    assert.ok(res.body.error, q);
  }
});

test('mutations are visible through the list endpoint', async () => {
  await api.post('/items', { name: 'a' });
  await api.post('/items', { name: 'b' });
  await api.patch('/items/1', { name: 'a2' });
  await api.del('/items/2');
  const list = await api.get('/items');
  assert.deepStrictEqual(list.body.items.map((i) => i.name), ['a2']);
  assert.strictEqual(list.headers.get('x-total-count'), '1');
});

test('store.clear() resets id assignment', async () => {
  await api.post('/items', { name: 'a' });
  api.store.clear();
  const res = await api.post('/items', { name: 'b' });
  assert.strictEqual(res.body.id, 1);
});
