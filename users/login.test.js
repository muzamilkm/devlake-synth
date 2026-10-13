const test = require('node:test');
const assert = require('node:assert');
const { loginHandler } = require('./login');

function run(body) {
  const req = { body };
  const result = { status: 200, body: undefined };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  loginHandler(req, res);
  return result;
}

test('rejects an empty password with 400', () => {
  const result = run({ username: 'alice', password: '' });
  assert.strictEqual(result.status, 400);
  assert.ok(result.body && typeof result.body.error === 'string');
});

test('rejects a missing password with 400', () => {
  assert.strictEqual(run({ username: 'alice' }).status, 400);
});

test('rejects a non-string password with 400', () => {
  assert.strictEqual(run({ username: 'alice', password: 0 }).status, 400);
  assert.strictEqual(run({ username: 'alice', password: ['x'] }).status, 400);
});

test('rejects a missing or empty username with 400', () => {
  assert.strictEqual(run({ password: 'secret' }).status, 400);
  assert.strictEqual(run({ username: '', password: 'secret' }).status, 400);
});

test('a well-formed request is not rejected as bad input', () => {
  // There is no user store yet, so credentials can never be verified.
  assert.strictEqual(run({ username: 'alice', password: 'secret' }).status, 401);
});
