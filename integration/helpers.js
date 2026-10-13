const test = require('node:test');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'integration-test-secret';
const app = require('../app');

// POST /items requires a bearer token; every request here carries a valid one.
function makeToken() {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: 'tester' })}`;
  return `${data}.${crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url')}`;
}

// Boots the real app on an ephemeral port for the calling test file, wipes the
// item store before every test, and returns a small JSON-aware HTTP client.
function useApp() {
  let server;
  let base;

  // A fresh server per test, closed in afterEach so a failing test cannot
  // leave the port open.
  test.beforeEach(async () => {
    app.locals.itemStore.clear();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://localhost:' + server.address().port;
  });

  test.afterEach(async () => {
    if (!server || !server.listening) return;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  // `body` is JSON-encoded; `raw` is sent verbatim (for malformed payloads).
  async function request(method, path, { body, raw, headers = {} } = {}) {
    const payload = raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined;
    const withAuth = { Authorization: 'Bearer ' + makeToken(), ...headers };
    const res = await fetch(base + path, {
      method,
      headers: payload !== undefined ? { 'Content-Type': 'application/json', ...withAuth } : withAuth,
      body: payload,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON bodies are exposed via `text` only
    }
    return { status: res.status, headers: res.headers, text, body: json };
  }

  return {
    request,
    store: app.locals.itemStore,
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
    del: (path, opts) => request('DELETE', path, opts),
  };
}

module.exports = { useApp };
