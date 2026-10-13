const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { jwtAuth } = require('./jwtAuth');

const SECRET = 'unit-test-secret';

function b64url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

function sign(payload, { secret = SECRET, header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const data = `${b64url(header)}.${b64url(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function run(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  const result = { nextCalled: false, status: undefined, body: undefined };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  jwtAuth(req, res, () => {
    result.nextCalled = true;
  });
  return { req, ...result };
}

function assertRejected(result) {
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.nextCalled, false);
  assert.ok(result.body && typeof result.body.error === 'string');
}

test.beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

test.after(() => {
  delete process.env.JWT_SECRET;
});

test('accepts a valid token and sets req.user to the payload', () => {
  const result = run('Bearer ' + sign({ sub: 'u1', role: 'admin' }));
  assert.strictEqual(result.nextCalled, true);
  assert.strictEqual(result.status, undefined);
  assert.strictEqual(result.req.user.sub, 'u1');
  assert.strictEqual(result.req.user.role, 'admin');
});

test('accepts a token whose exp is in the future', () => {
  const result = run('Bearer ' + sign({ sub: 'u1', exp: nowSeconds() + 60 }));
  assert.strictEqual(result.nextCalled, true);
});

test('rejects a request with no Authorization header', () => {
  assertRejected(run(undefined));
});

test('rejects a non-Bearer scheme', () => {
  assertRejected(run('Basic ' + sign({ sub: 'u1' })));
});

test('rejects an empty bearer token', () => {
  assertRejected(run('Bearer '));
});

test('rejects malformed tokens', () => {
  for (const token of ['abc', 'a.b', 'a.b.c.d', '..', 'not.base64!.sig']) {
    assertRejected(run('Bearer ' + token));
  }
});

test('rejects a token whose payload is not JSON', () => {
  const data = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url('nope')}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  assertRejected(run(`Bearer ${data}.${sig}`));
});

test('rejects an expired token', () => {
  assertRejected(run('Bearer ' + sign({ sub: 'u1', exp: nowSeconds() - 10 })));
});

test('rejects a token signed with a different secret', () => {
  assertRejected(run('Bearer ' + sign({ sub: 'u1' }, { secret: 'other' })));
});

test('rejects a token whose payload was tampered with', () => {
  const [h, , s] = sign({ sub: 'u1' }).split('.');
  assertRejected(run(`Bearer ${h}.${b64url({ sub: 'admin' })}.${s}`));
});

test('rejects tokens that are not HS256', () => {
  assertRejected(run('Bearer ' + sign({ sub: 'u1' }, { header: { alg: 'none', typ: 'JWT' } })));
  assertRejected(run('Bearer ' + sign({ sub: 'u1' }, { header: { alg: 'HS512', typ: 'JWT' } })));
  assertRejected(run(`Bearer ${b64url({ alg: 'none' })}.${b64url({ sub: 'u1' })}.`));
});

test('fails closed with 500 when JWT_SECRET is not configured', () => {
  delete process.env.JWT_SECRET;
  const result = run('Bearer ' + sign({ sub: 'u1' }));
  assert.strictEqual(result.status, 500);
  assert.strictEqual(result.nextCalled, false);
});
