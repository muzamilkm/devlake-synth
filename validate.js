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

  if (item.price !== undefined && !isValidPrice(item.price)) {
    return 'Price must be a non-negative number';
  }

  return null;
}

function isValidPrice(price) {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0;
}

// Partial updates: only fields that are present are validated.
function validateItemPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return 'Item must be an object';
  }

  if (patch.name === undefined && patch.description === undefined && patch.price === undefined) {
    return 'At least one of name, description or price is required';
  }

  if (patch.name !== undefined) {
    return validateItem({ name: patch.name, description: patch.description, price: patch.price });
  }

  if (patch.description !== undefined && typeof patch.description !== 'string') {
    return 'Description must be a string';
  }

  if (patch.price !== undefined && !isValidPrice(patch.price)) {
    return 'Price must be a non-negative number';
  }

  return null;
}

module.exports = { validateItem, validateItemPatch };
