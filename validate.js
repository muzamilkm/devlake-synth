function validateItem(item) {
  if (!item || typeof item !== 'object') {
    return 'Item must be an object';
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
    return 'Name field is required and must be a non-empty string';
  }

  if (item.description !== undefined && typeof item.description !== 'string') {
    return 'Description must be a string';
  }

  return null;
}

// Partial updates: only fields that are present are validated.
function validateItemPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return 'Item must be an object';
  }

  if (patch.name === undefined && patch.description === undefined) {
    return 'At least one of name or description is required';
  }

  if (patch.name !== undefined) {
    return validateItem({ name: patch.name, description: patch.description });
  }

  if (typeof patch.description !== 'string') {
    return 'Description must be a string';
  }

  return null;
}

// Startup configuration: unset values fall back to defaults, set values must be valid.
function validateConfig(env) {
  if (env.PORT === undefined || env.PORT === '') {
    return null;
  }

  const port = Number(env.PORT);
  if (!/^\d+$/.test(env.PORT) || port < 1 || port > 65535) {
    return `PORT must be an integer between 1 and 65535 (got "${env.PORT}")`;
  }

  return null;
}

module.exports = { validateItem, validateItemPatch, validateConfig };
