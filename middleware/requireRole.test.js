const test = require('node:test');
const assert = require('node:assert');
const { requireRole, ROLES } = require('./requireRole');

function run(guard, user) {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  guard({ user }, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('ROLES lists admin, staff and customer', () => {
  assert.deepStrictEqual([...ROLES], ['admin', 'staff', 'customer']);
});

test('allows a user whose role is permitted', () => {
  const guard = requireRole('admin', 'staff');
  for (const role of ['admin', 'staff']) {
    const { res, nextCalled } = run(guard, { sub: 'u1', role });
    assert.strictEqual(nextCalled, true, role);
    assert.strictEqual(res.statusCode, null, role);
  }
});

test('returns 403 for an authenticated user with another role', () => {
  const { res, nextCalled } = run(requireRole('admin', 'staff'), { sub: 'u1', role: 'customer' });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 403);
  assert.deepStrictEqual(res.body, { error: 'Forbidden' });
});

test('returns 403 when the role claim is missing or not a known role', () => {
  const guard = requireRole('admin');
  for (const user of [{ sub: 'u1' }, { sub: 'u1', role: 'superuser' }, { sub: 'u1', role: ['admin'] }, { sub: 'u1', role: null }]) {
    const { res, nextCalled } = run(guard, user);
    assert.strictEqual(nextCalled, false, JSON.stringify(user));
    assert.strictEqual(res.statusCode, 403, JSON.stringify(user));
  }
});

test('returns 401 when no user is attached to the request', () => {
  const { res, nextCalled } = run(requireRole('admin'), undefined);
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
});

test('rejects bad configuration at setup time', () => {
  assert.throws(() => requireRole(), /at least one role/);
  assert.throws(() => requireRole('admin', 'root'), /Unknown role: root/);
});
