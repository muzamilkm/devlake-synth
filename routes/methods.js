// Catch-all for a path whose specific method handlers did not match: OPTIONS
// reports the allowed methods, anything else gets a 405 with an Allow header.
function allowMethods(...methods) {
  const allow = methods.join(', ');
  return (req, res) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') return res.status(204).end();
    res.status(405).json({ error: 'Method not allowed' });
  };
}

module.exports = { allowMethods };
