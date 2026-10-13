const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('./app');

let server;

test('setup', async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
});

test('GET /health returns 200 with status ok', async () => {
  const port = server.address().port;

  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/health`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, 200, 'Expected status 200');
          const body = JSON.parse(data);
          assert.strictEqual(body.status, 'ok', 'Expected status property to be "ok"');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
});

test('requests are logged with method, path and status', { timeout: 2000 }, async () => {
  const port = server.address().port;
  const originalLog = console.log;
  const lines = [];
  let onLogged;
  const logged = new Promise(resolve => { onLogged = resolve; });
  console.log = (line) => { lines.push(line); onLogged(); };
  try {
    const request = new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/health?verbose=1`, (res) => {
        res.resume();
        res.on('end', resolve);
      }).on('error', reject);
    });
    await Promise.all([request, logged]);
  } finally {
    console.log = originalLog;
  }
  assert.ok(
    lines.some(line => /^GET \/health 200 \d+\.\d{2}ms$/.test(line)),
    `Expected a request log line, got: ${JSON.stringify(lines)}`
  );
});

test('teardown', async () => {
  await new Promise(resolve => server.close(resolve));
});
