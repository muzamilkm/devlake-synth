const { BoundedCache } = require('./cache');

const validationCache = new BoundedCache(1000);

function validateItem(item) {
  if (!item || typeof item !== 'object') {
    return 'Item must be an object';
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
    return 'Name field is required and must be a non-empty string';
  }

  return null;
}

function validateItemWithCache(item) {
  const cacheKey = JSON.stringify(item);
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }
  const result = validateItem(item);
  validationCache.set(cacheKey, result);
  return result;
}

module.exports = { validateItem, validateItemWithCache };
