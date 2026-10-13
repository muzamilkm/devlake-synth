const test = require('node:test');
const assert = require('node:assert');
const app = require('../app');
const { verifyPassword } = require('./password');

const PASSWORD = 'Str0ng!Pass';

let server;
let base;

async function register(body, raw) {
  const res = await fetch(base + '/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw !== undefined ? raw : JSON.stringify(body),
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
  app.locals.userStore.clear();
});

test('POST /users/register creates a user', async () => {
  const res = await register({ email: 'alice@example.com', password: PASSWORD });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.id, 1);
  assert.strictEqual(res.body.email, 'alice@example.com');
  assert.ok(!Number.isNaN(Date.parse(res.body.createdAt)));
  assert.deepStrictEqual(Object.keys(res.body).sort(), ['createdAt', 'email', 'id']);
});

test('POST /users/register never returns the password or its hash', async () => {
  const res = await register({ email: 'alice@example.com', password: PASSWORD });
  const raw = JSON.stringify(res.body);
  assert.ok(!raw.includes(PASSWORD));
  assert.ok(!raw.includes('scrypt'));
  assert.strictEqual(res.body.password, undefined);
  assert.strictEqual(res.body.passwordHash, undefined);
});

test('POST /users/register stores a salted hash that verifies', async () => {
  await register({ email: 'alice@example.com', password: PASSWORD });
  await register({ email: 'bob@example.com', password: PASSWORD });
  const alice = app.locals.userStore.findByEmail('alice@example.com');
  const bob = app.locals.userStore.findByEmail('bob@example.com');
  assert.notStrictEqual(alice.passwordHash, PASSWORD);
  assert.notStrictEqual(alice.passwordHash, bob.passwordHash);
  assert.strictEqual(await verifyPassword(PASSWORD, alice.passwordHash), true);
  assert.strictEqual(await verifyPassword('Wr0ng!Pass', alice.passwordHash), false);
});

test('POST /users/register normalizes the email', async () => {
  const res = await register({ email: '  Alice@Example.COM ', password: PASSWORD });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.email, 'alice@example.com');
});

test('POST /users/register ignores unknown fields', async () => {
  const res = await register({ email: 'alice@example.com', password: PASSWORD, id: 99, admin: true });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.id, 1);
  assert.strictEqual(res.body.admin, undefined);
});

test('POST /users/register rejects a duplicate email (case-insensitive)', async () => {
  assert.strictEqual((await register({ email: 'alice@example.com', password: PASSWORD })).status, 201);
  const res = await register({ email: 'ALICE@example.com', password: 'An0ther!Pass' });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error, 'Email is already registered');
  assert.strictEqual(app.locals.userStore.count(), 1);
});

test('concurrent registrations with the same email create one user', async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () => register({ email: 'race@example.com', password: PASSWORD })),
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepStrictEqual(statuses, [201, 409, 409, 409, 409]);
  assert.strictEqual(app.locals.userStore.count(), 1);
});

test('POST /users/register rejects invalid emails', async () => {
  for (const email of [undefined, '', 'plainaddress', 'a@b', 'a@@b.com', 42]) {
    const res = await register({ email, password: PASSWORD });
    assert.strictEqual(res.status, 400, JSON.stringify(email));
    assert.strictEqual(res.body.error, 'Validation failed');
    assert.ok(res.body.details.some((d) => d.field === 'email'), JSON.stringify(email));
  }
  assert.strictEqual(app.locals.userStore.count(), 0);
});

test('POST /users/register rejects weak passwords with every unmet rule', async () => {
  const res = await register({ email: 'alice@example.com', password: 'weak' });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body.details, [
    { field: 'password', message: 'Password must be at least 8 characters' },
    { field: 'password', message: 'Password must contain an uppercase letter' },
    { field: 'password', message: 'Password must contain a digit' },
    { field: 'password', message: 'Password must contain a special character' },
  ]);
});

test('POST /users/register enforces password length and complexity', async () => {
  for (const password of [undefined, '', 'Sh0rt!', 'alllower1!', 'ALLUPPER1!', 'NoDigits!!', 'NoSpecial12', 'Aa1!'.repeat(33)]) {
    const res = await register({ email: 'alice@example.com', password });
    assert.strictEqual(res.status, 400, String(password));
    assert.ok(res.body.details.every((d) => d.field === 'password'), String(password));
  }
  assert.strictEqual(app.locals.userStore.count(), 0);
});

test('POST /users/register reports errors for both fields together', async () => {
  const res = await register({ email: 'nope', password: 'nope' });
  assert.strictEqual(res.status, 400);
  const fields = new Set(res.body.details.map((d) => d.field));
  assert.deepStrictEqual([...fields].sort(), ['email', 'password']);
});

test('POST /users/register rejects non-object bodies', async () => {
  const res = await register(undefined, '[]');
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body.details, [{ field: 'body', message: 'Request body must be a JSON object' }]);
});

test('POST /users/register rejects malformed JSON', async () => {
  const res = await register(undefined, '{bad');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Invalid JSON body');
});

test('POST /users/register rejects a missing JSON body', async () => {
  const res = await fetch(base + '/users/register', { method: 'POST' });
  assert.strictEqual(res.status, 400);
});

test('other methods on /users/register are not found', async () => {
  const res = await fetch(base + '/users/register');
  assert.strictEqual(res.status, 404);
});
