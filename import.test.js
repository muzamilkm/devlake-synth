const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const app = require('./app');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

let server;
let base;

async function upload(body, { query = '', type = 'text/csv' } = {}) {
  const res = await fetch(`${base}/items/import${query}`, {
    method: 'POST',
    headers: type ? { 'Content-Type': type } : {},
    body,
  });
  return { status: res.status, body: await res.json() };
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
  app.locals.itemStore.clear();
});

test('POST /items/import creates items from a valid CSV', async () => {
  const res = await upload(fixture('valid.csv'));
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.total, 3);
  assert.strictEqual(res.body.created, 3);
  assert.strictEqual(res.body.failed, 0);
  assert.deepStrictEqual(res.body.items.map((i) => i.name), ['Widget', 'Gadget', 'Gizmo']);
  assert.strictEqual(app.locals.itemStore.list().total, 3);
});

test('POST /items/import handles quoted fields and CRLF', async () => {
  const res = await upload('name,description\r\n"A, B","say ""x"""\r\n');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.items[0].name, 'A, B');
  assert.strictEqual(res.body.items[0].description, 'say "x"');
});

test('POST /items/import accepts text/csv with a charset parameter', async () => {
  const res = await upload(fixture('valid.csv'), { type: 'text/csv; charset=utf-8' });
  assert.strictEqual(res.status, 201);
});

test('POST /items/import accepts application/csv', async () => {
  const res = await upload(fixture('valid.csv'), { type: 'application/csv' });
  assert.strictEqual(res.status, 201);
});

test('POST /items/import rejects the whole upload when any row is invalid', async () => {
  const res = await upload(fixture('invalid-rows.csv'));
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.errors.length, 3);
  assert.strictEqual(res.body.errors[0].row, 3);
  assert.strictEqual(app.locals.itemStore.list().total, 0);
});

test('POST /items/import?partial=true imports valid rows and reports the rest', async () => {
  const res = await upload(fixture('invalid-rows.csv'), { query: '?partial=true' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.total, 5);
  assert.strictEqual(res.body.created, 2);
  assert.strictEqual(res.body.failed, 3);
  assert.strictEqual(app.locals.itemStore.list().total, 2);
});

test('POST /items/import returns 400 for header and syntax problems', async () => {
  for (const name of ['missing-column.csv', 'unknown-column.csv', 'header-only.csv', 'unterminated.csv']) {
    const res = await upload(fixture(name));
    assert.strictEqual(res.status, 400, name);
    assert.ok(res.body.error, name);
  }
  assert.strictEqual(app.locals.itemStore.list().total, 0);
});

test('POST /items/import returns 400 for an empty body', async () => {
  const res = await upload('');
  assert.strictEqual(res.status, 400);
});

test('POST /items/import returns 415 for a non-CSV content type', async () => {
  const res = await upload('{"name":"x"}', { type: 'application/json' });
  assert.strictEqual(res.status, 415);
});

test('POST /items/import returns 413 for an oversized body', async () => {
  const big = 'name\n' + 'x'.repeat(1024 * 1024 + 1);
  const res = await upload(big);
  assert.strictEqual(res.status, 413);
});

test('POST /items/import returns 400 when over the row limit', async () => {
  const csv = 'name\n' + Array.from({ length: 1001 }, (_, i) => 'item' + i).join('\n');
  const res = await upload(csv);
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /maximum of 1000 rows/);
});

test('imported items are visible through GET /items', async () => {
  await upload(fixture('valid.csv'));
  const res = await fetch(base + '/items');
  const body = await res.json();
  assert.strictEqual(body.total, 3);
});
