const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'profile-test-secret';
const app = require('../app');

let server;
let base;

function sign(payload, secret = process.env.JWT_SECRET) {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  return `${data}.${crypto.createHmac('sha256', secret).update(data).digest('base64url')}`;
}

async function patch(body, token, raw) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + '/users/me', {
    method: 'PATCH',
    headers,
    body: raw !== undefined ? raw : JSON.stringify(body),
  });
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
  app.locals.profileStore.clear();
});

test('PATCH /users/me without a token returns 401 and changes nothing', async () => {
  const res = await patch({ displayName: 'Ann' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(app.locals.profileStore.get('u1').displayName, null);
});

test('PATCH /users/me with a badly signed or expired token returns 401', async () => {
  assert.strictEqual((await patch({ displayName: 'Ann' }, sign({ sub: 'u1' }, 'wrong'))).status, 401);
  const exp = Math.floor(Date.now() / 1000) - 5;
  assert.strictEqual((await patch({ displayName: 'Ann' }, sign({ sub: 'u1', exp }))).status, 401);
});

test('PATCH /users/me with a token lacking sub returns 401', async () => {
  assert.strictEqual((await patch({ displayName: 'Ann' }, sign({ name: 'x' }))).status, 401);
});

test('PATCH /users/me updates the caller profile', async () => {
  const res = await patch({ displayName: ' Ann ', bio: 'Hello' }, sign({ sub: 'u1' }));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 'u1');
  assert.strictEqual(res.body.displayName, 'Ann');
  assert.strictEqual(res.body.bio, 'Hello');
  assert.deepStrictEqual(app.locals.profileStore.get('u1'), res.body);
});

test('PATCH /users/me is partial and keeps other fields', async () => {
  const token = sign({ sub: 'u1' });
  await patch({ displayName: 'Ann', bio: 'Hello' }, token);
  const res = await patch({ bio: null }, token);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.displayName, 'Ann');
  assert.strictEqual(res.body.bio, null);
});

test('PATCH /users/me only touches the authenticated user', async () => {
  await patch({ displayName: 'Ann' }, sign({ sub: 'u1' }));
  await patch({ displayName: 'Bob' }, sign({ sub: 'u2' }));
  assert.strictEqual(app.locals.profileStore.get('u1').displayName, 'Ann');
  assert.strictEqual(app.locals.profileStore.get('u2').displayName, 'Bob');
});

test('PATCH /users/me cannot change the id', async () => {
  const res = await patch({ id: 'u2', displayName: 'Ann' }, sign({ sub: 'u1' }));
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /Unknown field: id/);
  assert.strictEqual(app.locals.profileStore.get('u2').displayName, null);
});

test('PATCH /users/me rejects invalid values with 400 and stores nothing', async () => {
  const token = sign({ sub: 'u1' });
  for (const body of [{}, { displayName: '' }, { displayName: 7 }, { bio: 'x'.repeat(281) }, []]) {
    const res = await patch(body, token);
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }
  assert.strictEqual(app.locals.profileStore.get('u1').updatedAt, null);
});

test('PATCH /users/me with malformed JSON returns 400', async () => {
  const res = await patch(undefined, sign({ sub: 'u1' }), '{bad');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Invalid JSON body');
});
