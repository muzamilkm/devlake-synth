const ROLES = Object.freeze(['admin', 'staff', 'customer']);

// Must run after jwtAuth: the role is read from the `role` claim on req.user.
function requireRole(...allowed) {
  if (allowed.length === 0) throw new Error('requireRole needs at least one role');
  const unknown = allowed.filter((role) => !ROLES.includes(role));
  if (unknown.length > 0) throw new Error(`Unknown role: ${unknown.join(', ')}`);

  return function roleGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { requireRole, ROLES };
