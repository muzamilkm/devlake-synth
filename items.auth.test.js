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

test('POST /items with a valid token creates the item', async () => {
  const res = await post(sign({ sub: 'u1' }));
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.name, 'a');
});

test('GET /items stays public', async () => {
  const res = await fetch(base + '/items');
  assert.strictEqual(res.status, 200);
});
