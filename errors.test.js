const test = require('node:test');
const assert = require('node:assert');
const { HttpError, notFoundHandler, errorHandler } = require('./errors');

function fakeRes(headersSent = false) {
  return {
    headersSent,
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function quietly(fn) {
  const original = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args);
  try {
    fn(calls);
  } finally {
    console.error = original;
  }
}

test('HttpError carries status, message and optional details', () => {
  const err = new HttpError(422, 'Nope', { field: 'name' });
  assert.ok(err instanceof Error);
  assert.strictEqual(err.status, 422);
  assert.strictEqual(err.message, 'Nope');
  assert.deepStrictEqual(err.details, { field: 'name' });
  assert.strictEqual('details' in new HttpError(400, 'x'), false);
});

test('notFoundHandler forwards a 404 HttpError', () => {
  let forwarded;
  notFoundHandler({}, fakeRes(), (err) => {
    forwarded = err;
  });
  assert.ok(forwarded instanceof HttpError);
  assert.strictEqual(forwarded.status, 404);
});

test('errorHandler responds with the HttpError status and message', () => {
  const res = fakeRes();
  errorHandler(new HttpError(409, 'Conflict', ['a']), {}, res, () => {});
  assert.strictEqual(res.statusCode, 409);
  assert.deepStrictEqual(res.body, { error: 'Conflict', details: ['a'] });
});

test('errorHandler maps body-parser errors', () => {
  const parse = fakeRes();
  errorHandler(Object.assign(new Error('x'), { type: 'entity.parse.failed', status: 400 }), {}, parse, () => {});
  assert.strictEqual(parse.statusCode, 400);
  assert.deepStrictEqual(parse.body, { error: 'Invalid JSON body' });

  const large = fakeRes();
  errorHandler(Object.assign(new Error('x'), { type: 'entity.too.large', status: 413 }), {}, large, () => {});
  assert.strictEqual(large.statusCode, 413);
  assert.deepStrictEqual(large.body, { error: 'Request body too large' });
});

test('errorHandler hides details of unexpected errors and logs them', () => {
  quietly((calls) => {
    const res = fakeRes();
    errorHandler(new Error('db password is hunter2'), {}, res, () => {});
    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.body, { error: 'Internal server error' });
    assert.strictEqual(calls.length, 1);
  });
});

test('errorHandler treats out-of-range statuses as 500', () => {
  quietly(() => {
    const res = fakeRes();
    errorHandler(Object.assign(new Error('weird'), { status: 200 }), {}, res, () => {});
    assert.strictEqual(res.statusCode, 500);
  });
});

test('errorHandler does not expose details on 5xx HttpErrors', () => {
  quietly(() => {
    const res = fakeRes();
    errorHandler(new HttpError(503, 'Down', { secret: 1 }), {}, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.deepStrictEqual(res.body, { error: 'Internal server error' });
  });
});

test('errorHandler delegates when headers were already sent', () => {
  const res = fakeRes(true);
  const err = new Error('late');
  let delegated;
  errorHandler(err, {}, res, (e) => {
    delegated = e;
  });
  assert.strictEqual(delegated, err);
  assert.strictEqual(res.statusCode, null);
});
