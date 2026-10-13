const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'openapi-test-secret';
const app = require('./app');
const spec = require('./openapi.json');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

let server;
let base;

function sign(payload) {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  return `${data}.${crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url')}`;
}

async function call(method, path, body, raw, token) {
  const headers = body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {};
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

// Express 4 keeps routes in app._router.stack. A router mounted with
// app.use(prefix, router) is a nested layer; its prefix is only recoverable
// from the layer's regexp, e.g. ^\/items\/?(?=\/|$) -> /items.
function mountPrefix(layer) {
  const match = layer.regexp.source.match(/^\^((?:\\\/[\w-]+)*)\\\/\?\(\?=/);
  assert.ok(match, 'Unrecognised mount path: ' + layer.regexp.source);
  return match[1].replace(/\\\//g, '/');
}

function servedRoutes(stack, prefix = '') {
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      const sub = layer.route.path;
      const path = sub === '/' ? prefix || '/' : prefix + sub;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push(`${method} ${path.replace(/:(\w+)/g, '{$1}')}`);
      }
    } else if (layer.name === 'router') {
      routes.push(...servedRoutes(layer.handle.stack, prefix + mountPrefix(layer)));
    }
  }
  return routes;
}

function documentedOperations() {
  return Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((key) => HTTP_METHODS.includes(key))
      .map((method) => `${method} ${path}`),
  );
}

function resolve(ref) {
  assert.ok(ref.startsWith('#/'), 'Only local refs are supported: ' + ref);
  return ref
    .slice(2)
    .split('/')
    .reduce((node, key) => {
      assert.ok(node && key in node, 'Unresolved $ref: ' + ref);
      return node[key];
    }, spec);
}

function deref(node) {
  return node.$ref ? resolve(node.$ref) : node;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}

// Small subset of JSON Schema: enough for the object/array/integer/string shapes this spec uses.
function matches(schema, value) {
  schema = deref(schema);
  switch (schema.type) {
    case 'integer':
      return Number.isInteger(value);
    case 'string':
      return typeof value === 'string' && (schema.format !== 'date-time' || !Number.isNaN(Date.parse(value)));
    case 'array':
      return Array.isArray(value) && value.every((v) => matches(schema.items, v));
    case 'object':
      return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (schema.required || []).every((key) => key in value) &&
        Object.entries(schema.properties || {}).every(([key, s]) => !(key in value) || matches(s, value[key]))
      );
    default:
      return true;
  }
}

function documentedResponse(method, template, status) {
  const op = spec.paths[template][method];
  const response = op.responses[String(status)];
  assert.ok(response, `${method.toUpperCase()} ${template} does not document a ${status} response`);
  return deref(response);
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

test('spec documents exactly the routes the app serves', () => {
  assert.deepStrictEqual(documentedOperations().sort(), servedRoutes(app._router.stack).sort());
});

test('every $ref in the spec resolves', () => {
  const refs = [];
  walk(spec, (node) => {
    if (typeof node.$ref === 'string') refs.push(node.$ref);
  });
  assert.ok(refs.length > 0);
  for (const ref of refs) resolve(ref);
});

test('every path parameter is declared on its path', () => {
  for (const [path, item] of Object.entries(spec.paths)) {
    const declared = (item.parameters || []).map(deref).filter((p) => p.in === 'path').map((p) => p.name);
    for (const [, name] of path.matchAll(/\{(\w+)\}/g)) {
      assert.ok(declared.includes(name), `${path} is missing path parameter ${name}`);
    }
  }
});

test('operations have unique ids, responses and declared tags', () => {
  const ids = new Set();
  const tags = new Set(spec.tags.map((tag) => tag.name));
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      assert.ok(!ids.has(op.operationId), 'duplicate operationId ' + op.operationId);
      ids.add(op.operationId);
      assert.ok(Object.keys(op.responses).length > 0, `${method} ${path} has no responses`);
      for (const tag of op.tags || []) {
        assert.ok(tags.has(tag), `${method} ${path} uses undeclared tag ${tag}`);
      }
    }
  }
});

// Exercises each documented status code against the live app. Cases run in order
// because later ones depend on the items created by earlier ones.
const cases = [
  { method: 'GET', url: '/', template: '/' },
  { method: 'GET', url: '/health', template: '/health' },
  { method: 'GET', url: '/openapi.json', template: '/openapi.json' },
  { method: 'GET', url: '/items', template: '/items' },
  { method: 'GET', url: '/items?offset=-1', template: '/items' },
  { method: 'POST', url: '/items', template: '/items', body: { name: 'a' } },
  { method: 'POST', url: '/items', template: '/items', body: { name: 'a' }, token: true },
  { method: 'POST', url: '/items', template: '/items', body: {}, token: true },
  { method: 'POST', url: '/items', template: '/items', raw: '{bad', token: true },
  { method: 'POST', url: '/auth/login', template: '/auth/login', body: {} },
  { method: 'POST', url: '/auth/login', template: '/auth/login', body: { username: 'u', password: 'p' } },
  { method: 'POST', url: '/users/register', template: '/users/register', body: {} },
  { method: 'GET', url: '/items/1', template: '/items/{id}' },
  { method: 'GET', url: '/items/abc', template: '/items/{id}' },
  { method: 'GET', url: '/items/9', template: '/items/{id}' },
  { method: 'PUT', url: '/items/1', template: '/items/{id}', body: { name: 'b' } },
  { method: 'PUT', url: '/items/1', template: '/items/{id}', body: {} },
  { method: 'PUT', url: '/items/9', template: '/items/{id}', body: { name: 'x' } },
  { method: 'PATCH', url: '/items/1', template: '/items/{id}', body: { description: 'd' } },
  { method: 'PATCH', url: '/items/1', template: '/items/{id}', body: {} },
  { method: 'PATCH', url: '/items/9', template: '/items/{id}', body: { name: 'x' } },
  { method: 'DELETE', url: '/items/1', template: '/items/{id}' },
  { method: 'DELETE', url: '/items/1', template: '/items/{id}' },
  { method: 'DELETE', url: '/items/abc', template: '/items/{id}' },
];

test('real responses match the documented status codes, headers and bodies', async () => {
  for (const { method, url, template, body, raw, token } of cases) {
    const label = `${method} ${url}`;
    const res = await call(method, url, body, raw, token ? sign({ sub: 'openapi-test' }) : undefined);
    const response = documentedResponse(method.toLowerCase(), template, res.status);

    for (const [name, header] of Object.entries(response.headers || {})) {
      if (deref(header).required) {
        assert.ok(res.headers.has(name.toLowerCase()), `${label} is missing documented header ${name}`);
      }
    }

    if (response.content) {
      const media = response.content['application/json'];
      assert.ok(res.headers.get('content-type').includes('application/json'), `${label} is not JSON`);
      assert.ok(matches(media.schema, res.body), `${label} body does not match its documented schema`);
    } else {
      assert.strictEqual(res.body, null, `${label} returned a body but none is documented`);
    }
  }
});
