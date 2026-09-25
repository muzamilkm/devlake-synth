const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('./server');

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

test('teardown', async () => {
  await new Promise(resolve => server.close(resolve));
});
