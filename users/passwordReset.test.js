const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { createUserStore } = require('./userStore');
const { verifyPassword } = require('./password');
const { createPasswordResetRouter } = require('./passwordReset');

const TTL_MS = 60 * 1000;

let server;
let base;
let userStore;
let clock;

async function post(path, body) {
  const res = await fetch(base + '/users/password-reset' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function requestToken(email = 'alice@example.com') {
  const res = await post('/request', { email });
  assert.strictEqual(res.status, 201);
  return res.body.token;
}

const passwordOf = (email) => userStore.findByEmail(email).passwordHash;

test.before(async () => {
  userStore = createUserStore();
  clock = { now: 1_000_000 };
  const app = express();
  app.use('/users/password-reset', createPasswordResetRouter(userStore, { ttlMs: TTL_MS, now: () => clock.now }));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://localhost:' + server.address().port;
});

test.beforeEach(() => {
  userStore.clear();
  userStore.add('alice@example.com', 'original-pass');
  clock.now = 1_000_000;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('request returns a token and expiry for an existing email', async () => {
  const res = await post('/request', { email: 'Alice@Example.com' });
  assert.strictEqual(res.status, 201);
  assert.match(res.body.token, /^[0-9a-f]{64}$/);
  assert.strictEqual(res.body.expiresAt, new Date(clock.now + TTL_MS).toISOString());
});

test('request returns 404 for an unknown email and 400 for a missing one', async () => {
  assert.strictEqual((await post('/request', { email: 'nobody@example.com' })).status, 404);
  assert.strictEqual((await post('/request', {})).status, 400);
  assert.strictEqual((await post('/request', { email: '  ' })).status, 400);
  assert.strictEqual((await post('/request', { email: 42 })).status, 400);
});

test('confirm with a valid token updates the stored hash', async () => {
  const token = await requestToken();
  const res = await post('/confirm', { token, password: 'brand-new-pass' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(verifyPassword('brand-new-pass', passwordOf('alice@example.com')), true);
  assert.strictEqual(verifyPassword('original-pass', passwordOf('alice@example.com')), false);
});

test('confirm rejects a token that has already been used', async () => {
  const token = await requestToken();
  assert.strictEqual((await post('/confirm', { token, password: 'brand-new-pass' })).status, 200);
  const reuse = await post('/confirm', { token, password: 'another-pass' });
  assert.strictEqual(reuse.status, 400);
  assert.strictEqual(verifyPassword('brand-new-pass', passwordOf('alice@example.com')), true);
});

test('confirm rejects an expired token and leaves the password unchanged', async () => {
  const token = await requestToken();
  clock.now += TTL_MS;
  const res = await post('/confirm', { token, password: 'brand-new-pass' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(verifyPassword('original-pass', passwordOf('alice@example.com')), true);
});

test('confirm accepts a token just before it expires', async () => {
  const token = await requestToken();
  clock.now += TTL_MS - 1;
  assert.strictEqual((await post('/confirm', { token, password: 'brand-new-pass' })).status, 200);
});

test('confirm rejects an unknown or missing token', async () => {
  assert.strictEqual((await post('/confirm', { token: 'f'.repeat(64), password: 'brand-new-pass' })).status, 400);
  assert.strictEqual((await post('/confirm', { password: 'brand-new-pass' })).status, 400);
});

test('confirm validates the new password without consuming the token', async () => {
  const token = await requestToken();
  const weak = await post('/confirm', { token, password: 'short' });
  assert.strictEqual(weak.status, 400);
  assert.match(weak.body.error, /at least/);
  assert.strictEqual((await post('/confirm', { token })).status, 400);
  assert.strictEqual(verifyPassword('original-pass', passwordOf('alice@example.com')), true);

  assert.strictEqual((await post('/confirm', { token, password: 'brand-new-pass' })).status, 200);
});

test('requesting a new token invalidates the previous one', async () => {
  const first = await requestToken();
  const second = await requestToken();
  assert.strictEqual((await post('/confirm', { token: first, password: 'brand-new-pass' })).status, 400);
  assert.strictEqual((await post('/confirm', { token: second, password: 'brand-new-pass' })).status, 200);
});
