const test = require('node:test');
const assert = require('node:assert');
const app = require('./app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://localhost:' + server.address().port;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /openapi.json serves the OpenAPI document', async () => {
  const res = await fetch(base + '/openapi.json');
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const spec = await res.json();
  assert.match(spec.openapi, /^3\.0\./);
  assert.ok(spec.info.title);
  assert.ok(spec.paths['/items']);
});
