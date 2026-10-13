const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { createRequestLogger } = require('./requestLogger');

function runRequest(req, statusCode = 200) {
  const lines = [];
  const res = Object.assign(new EventEmitter(), { statusCode });
  createRequestLogger(line => lines.push(line))(req, res, () => {});
  res.emit('finish');
  return lines;
}

test('logs method, path, status and duration after response finishes', () => {
  const [line] = runRequest({ method: 'GET', originalUrl: '/items/1' }, 404);
  assert.match(line, /^GET \/items\/1 404 \d+\.\d{2}ms$/);
});

test('strips query string from logged path', () => {
  const [line] = runRequest({ method: 'GET', originalUrl: '/items?offset=0&limit=5' });
  assert.match(line, /^GET \/items 200 /);
});

test('does not log before the response finishes', () => {
  const lines = [];
  const res = new EventEmitter();
  createRequestLogger(line => lines.push(line))({ method: 'POST', originalUrl: '/items' }, res, () => {});
  assert.strictEqual(lines.length, 0);
});

test('calls next() so the request continues', () => {
  let called = false;
  createRequestLogger(() => {})({ method: 'GET', originalUrl: '/' }, new EventEmitter(), () => { called = true; });
  assert.strictEqual(called, true);
});
