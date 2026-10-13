const test = require('node:test');
const assert = require('node:assert');
const { useApp } = require('./helpers');
const { oversizedBody } = require('./fixtures');

const api = useApp();

test('GET / returns the welcome message', async () => {
  const res = await api.get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepStrictEqual(res.body, { message: 'Welcome to DevLake' });
});

test('GET /health returns ok', async () => {
  const res = await api.get('/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(Object.keys(res.body).sort(), ['status', 'uptime']);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(typeof res.body.uptime, 'number');
  assert.ok(res.body.uptime >= 0, `Expected a non-negative uptime, got ${res.body.uptime}`);
});

test('HEAD /health succeeds without a body', async () => {
  const res = await api.request('HEAD', '/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.text, '');
});

test('unknown routes return a JSON 404', async () => {
  for (const path of ['/nope', '/items/1/extra', '/health/deep']) {
    const res = await api.get(path);
    assert.strictEqual(res.status, 404, path);
    assert.deepStrictEqual(res.body, { error: 'Route not found' }, path);
  }
});

test('unsupported methods on system routes return 405 with an Allow header', async () => {
  for (const path of ['/', '/health']) {
    const res = await api.post(path, {});
    assert.strictEqual(res.status, 405, path);
    assert.strictEqual(res.headers.get('allow'), 'GET, HEAD', path);
    assert.deepStrictEqual(res.body, { error: 'Method not allowed' }, path);
  }
});

test('unsupported methods on /items return 405 with an Allow header', async () => {
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    const res = await api.request(method, '/items');
    assert.strictEqual(res.status, 405, method);
    assert.strictEqual(res.headers.get('allow'), 'GET, HEAD, POST', method);
  }
});

test('unsupported methods on /items/:id return 405 with an Allow header', async () => {
  const res = await api.post('/items/1', { name: 'a' });
  assert.strictEqual(res.status, 405);
  assert.strictEqual(res.headers.get('allow'), 'GET, HEAD, PUT, PATCH, DELETE');
});

test('OPTIONS reports the allowed methods', async () => {
  const collection = await api.request('OPTIONS', '/items');
  assert.strictEqual(collection.status, 204);
  assert.strictEqual(collection.headers.get('allow'), 'GET, HEAD, POST');
  const member = await api.request('OPTIONS', '/items/1');
  assert.strictEqual(member.status, 204);
  assert.strictEqual(member.headers.get('allow'), 'GET, HEAD, PUT, PATCH, DELETE');
});

test('malformed JSON returns a 400 on every write endpoint', async () => {
  api.store.create({ name: 'a' });
  for (const [method, path] of [['POST', '/items'], ['PUT', '/items/1'], ['PATCH', '/items/1']]) {
    const res = await api.request(method, path, { raw: '{bad' });
    assert.strictEqual(res.status, 400, method);
    assert.deepStrictEqual(res.body, { error: 'Invalid JSON body' }, method);
  }
});

test('oversized bodies return 413 instead of a 500', async () => {
  const res = await api.post('/items', oversizedBody);
  assert.strictEqual(res.status, 413);
  assert.deepStrictEqual(res.body, { error: 'Request body too large' });
});

test('a non-JSON content type is treated as an empty body', async () => {
  const res = await api.request('POST', '/items', {
    raw: 'name=a',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
});
