function validateCategory(category) {
  if (category !== undefined && (typeof category !== 'string' || category.trim() === '')) {
    return 'Category must be a non-empty string';
  }

  return null;
}

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

  return validateCategory(item.category);
}

// Partial updates: only fields that are present are validated.
function validateItemPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return 'Item must be an object';
  }

  if (patch.name === undefined && patch.description === undefined && patch.category === undefined) {
    return 'At least one of name, description, or category is required';
  }

  if (patch.name !== undefined) {
    const error = validateItem({ name: patch.name, description: patch.description });
    if (error) return error;
  }

  if (patch.description !== undefined && typeof patch.description !== 'string') {
    return 'Description must be a string';
  }

  return validateCategory(patch.category);
}

module.exports = { validateItem, validateItemPatch };
