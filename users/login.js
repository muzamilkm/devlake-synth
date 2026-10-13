const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

// There is no user store yet, so credentials are never accepted here.
function loginHandler(req, res) {
  const { username, password } = req.body || {};

  if (!isNonEmptyString(username)) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Password is required' });
  }

  res.status(401).json({ error: 'Invalid credentials' });
}

module.exports = { loginHandler };
