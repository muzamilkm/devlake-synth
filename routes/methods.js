// Methods with a handler registered on `owner` (an app or router) for exactly
// the catch-all's own path. The catch-all route itself is skipped.
function registeredMethods(owner, catchAll) {
  const stack = (owner._router || owner).stack;
  const methods = new Set();
  for (const layer of stack) {
    const route = layer.route;
    if (!route || route === catchAll || route.path !== catchAll.path) continue;
    for (const method of Object.keys(route.methods)) {
      methods.add(method.toUpperCase());
      if (method === 'get') methods.add('HEAD');
    }
  }
  return [...methods];
}

// Catch-all for a path whose specific method handlers did not match: OPTIONS
// reports the allowed methods, anything else gets a 405 with an Allow header.
// The list is read from the routes registered on `owner` when the request arrives.
function allowMethods(owner) {
  const handler = (req, res) => {
    res.set('Allow', registeredMethods(owner, req.route).join(', '));
    if (req.method === 'OPTIONS') return res.status(204).end();
    res.status(405).json({ error: 'Method not allowed' });
  };
  // Lets the OpenAPI test tell catch-alls apart from documented routes.
  handler.isAllowMethods = true;
  return handler;
}

module.exports = { allowMethods };
