const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { createShutdown, installGracefulShutdown } = require('./shutdown');

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

function exitRecorder() {
  let resolveExit;
  const done = new Promise(resolve => { resolveExit = resolve; });
  return { exit: (code) => resolveExit(code), done };
}

test('lets an in-flight request finish before exiting', async () => {
  let releaseRequest;
  const requestStarted = new Promise(resolve => {
    releaseRequest = resolve;
  });
  let finish;
  const server = await listen((req, res) => {
    finish = () => res.end('done');
    releaseRequest();
  });
  const { exit, done } = exitRecorder();
  const shutdown = createShutdown(server, { exit, log: () => {} });

  const responseBody = new Promise((resolve, reject) => {
    http.get({ port: server.address().port, agent: false }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  await requestStarted;
  shutdown('SIGTERM');

  let exited = false;
  done.then(() => { exited = true; });
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.strictEqual(exited, false, 'must not exit while request is in flight');

  finish();
  assert.strictEqual(await responseBody, 'done');
  assert.strictEqual(await done, 0);
});

test('stops accepting new connections after shutdown starts', async () => {
  let finish;
  const server = await listen((req, res) => { finish = () => res.end('ok'); });
  const port = server.address().port;
  const { exit, done } = exitRecorder();
  const shutdown = createShutdown(server, { exit, log: () => {} });

  const first = new Promise(resolve => {
    http.get({ port, agent: false }, res => res.resume().on('end', resolve));
  });
  await new Promise(resolve => setTimeout(resolve, 50));
  shutdown('SIGTERM');

  await assert.rejects(new Promise((resolve, reject) => {
    http.get({ port, agent: false }, resolve).on('error', reject);
  }));

  finish();
  await first;
  assert.strictEqual(await done, 0);
});

test('forces exit with code 1 when requests exceed the timeout', async () => {
  const server = await listen(() => {});
  const { exit, done } = exitRecorder();
  const shutdown = createShutdown(server, { exit, log: () => {}, timeoutMs: 50 });

  http.get({ port: server.address().port, agent: false }).on('error', () => {});
  await new Promise(resolve => setTimeout(resolve, 50));
  shutdown('SIGTERM');

  assert.strictEqual(await done, 1);
  server.closeAllConnections();
});

test('installGracefulShutdown triggers on SIGTERM only once', async () => {
  const server = await listen((req, res) => res.end());
  const fakeProcess = new EventEmitter();
  const { exit, done } = exitRecorder();
  let closeCalls = 0;
  const originalClose = server.close.bind(server);
  server.close = (cb) => { closeCalls++; return originalClose(cb); };

  installGracefulShutdown(server, { process: fakeProcess, exit, log: () => {} });
  fakeProcess.emit('SIGTERM');
  fakeProcess.emit('SIGTERM');

  assert.strictEqual(await done, 0);
  assert.strictEqual(closeCalls, 1);
});
