const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'items-auth-test-secret';
const app = require('./app');

let server;
let base;

function sign(payload, secret = process.env.JWT_SECRET) {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  return `${data}.${crypto.createHmac('sha256', secret).update(data).digest('base64url')}`;
}

async function post(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + '/items', { method: 'POST', headers, body: JSON.stringify({ name: 'a' }) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
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

test('POST /items without a token returns 401 and creates nothing', async () => {
  assert.strictEqual((await post()).status, 401);
  assert.strictEqual(app.locals.itemStore.list({ offset: 0, limit: 10 }).total, 0);
});

test('POST /items with a badly signed token returns 401', async () => {
  assert.strictEqual((await post(sign({ sub: 'u1' }, 'wrong'))).status, 401);
});

test('POST /items with an expired token returns 401', async () => {
  const exp = Math.floor(Date.now() / 1000) - 5;
  assert.strictEqual((await post(sign({ sub: 'u1', exp }))).status, 401);
});

test('POST /items with an admin or staff token creates the item', async () => {
  for (const role of ['admin', 'staff']) {
    app.locals.itemStore.clear();
    const res = await post(sign({ sub: 'u1', role }));
    assert.strictEqual(res.status, 201, role);
    assert.strictEqual(res.body.name, 'a', role);
  }
});

test('POST /items with a customer token returns 403 and creates nothing', async () => {
  const res = await post(sign({ sub: 'u1', role: 'customer' }));
  assert.strictEqual(res.status, 403);
  assert.deepStrictEqual(res.body, { error: 'Forbidden' });
  assert.strictEqual(app.locals.itemStore.list({ offset: 0, limit: 10 }).total, 0);
});

test('POST /items with a token that has no role or an unknown role returns 403', async () => {
  assert.strictEqual((await post(sign({ sub: 'u1' }))).status, 403);
  assert.strictEqual((await post(sign({ sub: 'u1', role: 'superuser' }))).status, 403);
});

test('GET /items stays public', async () => {
  const res = await fetch(base + '/items');
  assert.strictEqual(res.status, 200);
});
