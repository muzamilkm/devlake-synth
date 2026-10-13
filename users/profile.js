const { validateProfilePatch } = require('./validateProfile');

// The user id comes from the verified token's "sub" claim, never from the request body.
function userIdFrom(req) {
  const { sub } = req.user || {};
  return typeof sub === 'string' && sub !== '' ? sub : null;
}

function createUpdateProfileHandler(store) {
  return function updateProfile(req, res) {
    const id = userIdFrom(req);
    if (!id) return res.status(401).json({ error: 'Token has no subject' });

    const { data, error } = validateProfilePatch(req.body);
    if (error) return res.status(400).json({ error });

    res.json(store.update(id, data));
  };
}

module.exports = { createUpdateProfileHandler };
