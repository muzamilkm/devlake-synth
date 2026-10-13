const test = require('node:test');
const assert = require('node:assert');
const { createRateLimiter } = require('./rateLimit');

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function hit(limiter, ip = '1.1.1.1') {
  const res = makeRes();
  let nexted = false;
  limiter({ ip }, res, () => { nexted = true; });
  return { res, nexted };
}

test('allows requests up to the limit', () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 });
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(hit(limiter).nexted, true);
  }
});

test('returns 429 with Retry-After once the limit is exceeded', () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 10000, now: () => t });
  hit(limiter);
  hit(limiter);
  t = 4000;
  const { res, nexted } = hit(limiter);
  assert.strictEqual(nexted, false);
  assert.strictEqual(res.statusCode, 429);
  assert.strictEqual(res.headers['Retry-After'], '6');
  assert.deepStrictEqual(res.body, { error: 'Too many requests' });
});

test('tracks each client IP separately', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
  assert.strictEqual(hit(limiter, '1.1.1.1').nexted, true);
  assert.strictEqual(hit(limiter, '1.1.1.1').nexted, false);
  assert.strictEqual(hit(limiter, '2.2.2.2').nexted, true);
});

test('resets the count when the window elapses', () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
  hit(limiter);
  assert.strictEqual(hit(limiter).nexted, false);
  t = 1000;
  assert.strictEqual(hit(limiter).nexted, true);
});

test('sets RateLimit-Limit and RateLimit-Remaining headers', () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 });
  const { res } = hit(limiter);
  assert.strictEqual(res.headers['RateLimit-Limit'], '3');
  assert.strictEqual(res.headers['RateLimit-Remaining'], '2');
});
