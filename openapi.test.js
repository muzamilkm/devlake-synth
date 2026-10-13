const test = require('node:test');
const assert = require('node:assert');
const app = require('./app');
const openapi = require('./openapi.json');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// Express 4 keeps routes in its internal stack. Mounted routers appear as 'router'
// layers whose regexp encodes the mount path, e.g. /^\/items\/?(?=\/|$)/ for '/items'.
function mountPath(layer) {
  const match = layer.regexp.source.match(/^\^((?:\\\/[\w-]+)*)/);
  return match ? match[1].replace(/\\\//g, '/') : '';
}

function listRoutes(stack, prefix = '') {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const path = (prefix + layer.route.path).replace(/\/$/, '') || '/';
      return Object.keys(layer.route.methods).map((method) => ({
        method: method.toUpperCase(),
        path: path.replace(/:(\w+)/g, '{$1}'),
      }));
    }
    if (layer.name === 'router') return listRoutes(layer.handle.stack, prefix + mountPath(layer));
    return [];
  });
}

function documentedOperations() {
  return Object.entries(openapi.paths).flatMap(([path, item]) =>
    HTTP_METHODS.filter((method) => item[method]).map((method) => ({
      method: method.toUpperCase(),
      path,
      operation: item[method],
    })),
  );
}

function resolveRef(ref) {
  return ref
    .slice(2)
    .split('/')
    .reduce((node, key) => node[key], openapi);
}

function collectRefs(node, refs = []) {
  if (Array.isArray(node)) node.forEach((child) => collectRefs(child, refs));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref') refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
}

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

test('every route the app serves is documented, and nothing else', () => {
  const served = listRoutes(app._router.stack).map((r) => `${r.method} ${r.path}`).sort();
  const documented = documentedOperations().map((o) => `${o.method} ${o.path}`).sort();
  assert.ok(served.includes('GET /items/{id}'), 'route discovery should find mounted items routes');
  assert.deepStrictEqual(documented, served);
});

test('path parameters in the spec match the placeholders in each path', () => {
  for (const [path, item] of Object.entries(openapi.paths)) {
    const placeholders = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const declared = (item.parameters || [])
      .map((p) => (p.$ref ? resolveRef(p.$ref) : p))
      .filter((p) => p.in === 'path')
      .map((p) => p.name)
      .sort();
    assert.deepStrictEqual(declared, placeholders, path);
  }
});

test('every operation has a unique operationId and at least one response', () => {
  const ids = documentedOperations().map((o) => o.operation.operationId);
  assert.ok(ids.every(Boolean), 'every operation needs an operationId');
  assert.strictEqual(new Set(ids).size, ids.length, 'operationIds must be unique');
  for (const { method, path, operation } of documentedOperations()) {
    assert.ok(Object.keys(operation.responses || {}).length > 0, `${method} ${path} has no responses`);
  }
});

test('every $ref in the spec resolves to a component', () => {
  for (const ref of collectRefs(openapi)) {
    assert.match(ref, /^#\//, ref);
    assert.notStrictEqual(resolveRef(ref), undefined, ref);
  }
});
