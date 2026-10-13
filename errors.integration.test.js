const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const app = require('./app');
const { HttpError, notFoundHandler, errorHandler } = require('./errors');

async function listen(target) {
  const server = target.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: 'http://localhost:' + server.address().port };
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('real app: unknown routes return a JSON 404', async () => {
  const { server, base } = await listen(app);
  try {
    const res = await fetch(base + '/nope');
    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(await res.json(), { error: 'Route not found' });
  } finally {
    await close(server);
  }
});

test('real app: oversized JSON bodies return 413', async () => {
  const { server, base } = await listen(app);
  try {
    const res = await fetch(base + '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(200 * 1024) }),
    });
    assert.strictEqual(res.status, 413);
    assert.deepStrictEqual(await res.json(), { error: 'Request body too large' });
  } finally {
    await close(server);
  }
});

test('middleware handles sync throws, async rejections and HttpErrors', async () => {
  const original = console.error;
  console.error = () => {};
  const probe = express();
  probe.get('/sync', () => {
    throw new Error('boom');
  });
  probe.get('/next', (req, res, next) => next(new Error('via next')));
  probe.get('/http', (req, res, next) => next(new HttpError(403, 'Forbidden')));
  probe.get('/partial', (req, res, next) => {
    res.write('partial');
    next(new Error('mid-stream'));
  });
  probe.use(notFoundHandler);
  probe.use(errorHandler);

  const { server, base } = await listen(probe);
  try {
    const sync = await fetch(base + '/sync');
    assert.strictEqual(sync.status, 500);
    assert.deepStrictEqual(await sync.json(), { error: 'Internal server error' });

    const viaNext = await fetch(base + '/next');
    assert.strictEqual(viaNext.status, 500);
    assert.deepStrictEqual(await viaNext.json(), { error: 'Internal server error' });

    const http = await fetch(base + '/http');
    assert.strictEqual(http.status, 403);
    assert.deepStrictEqual(await http.json(), { error: 'Forbidden' });

    const missing = await fetch(base + '/missing');
    assert.strictEqual(missing.status, 404);
    assert.deepStrictEqual(await missing.json(), { error: 'Route not found' });

    // Headers already sent: the default handler tears down the connection.
    await assert.rejects(async () => {
      const res = await fetch(base + '/partial');
      await res.text();
    });
  } finally {
    console.error = original;
    await close(server);
  }
});
