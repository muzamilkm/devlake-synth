const EDITABLE_FIELDS = ['displayName', 'bio'];
const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 280;

// Returns { error } or { data } with the cleaned fields to apply.
function validateProfilePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const unknown = Object.keys(body).filter((key) => !EDITABLE_FIELDS.includes(key));
  if (unknown.length > 0) return { error: `Unknown field: ${unknown[0]}` };

  const data = {};

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string') return { error: 'displayName must be a string' };
    const displayName = body.displayName.trim();
    if (displayName === '') return { error: 'displayName must not be empty' };
    if (displayName.length > MAX_DISPLAY_NAME) {
      return { error: `displayName must be at most ${MAX_DISPLAY_NAME} characters` };
    }
    data.displayName = displayName;
  }

  // null clears the bio.
  if (body.bio !== undefined) {
    if (body.bio !== null && typeof body.bio !== 'string') return { error: 'bio must be a string or null' };
    if (body.bio !== null && body.bio.length > MAX_BIO) {
      return { error: `bio must be at most ${MAX_BIO} characters` };
    }
    data.bio = body.bio;
  }

  if (Object.keys(data).length === 0) {
    return { error: `Provide at least one of: ${EDITABLE_FIELDS.join(', ')}` };
  }
  return { data };
}

module.exports = { validateProfilePatch, MAX_DISPLAY_NAME, MAX_BIO };
