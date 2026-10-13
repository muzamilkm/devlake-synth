const test = require('node:test');
const app = require('../app');

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
    const res = await fetch(base + path, {
      method,
      headers: payload !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
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
