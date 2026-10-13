const express = require('express');
const { validateItem, validateItemPatch } = require('../validate');

const MAX_PAGE_SIZE = 100;

// Only these fields are accepted from clients; anything else is ignored.
function pick(body) {
  const data = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description;
  return data;
}

function parseId(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  req.itemId = Number(req.params.id);
  next();
}

function parseNonNegativeInt(value, fallback) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

function clampLimit(limit) {
  return limit === undefined ? MAX_PAGE_SIZE : Math.min(limit, MAX_PAGE_SIZE);
}

function createItemsRouter(store) {
  const router = express.Router();
  router.use(express.json());

  router.get('/', (req, res) => {
    const offset = parseNonNegativeInt(req.query.offset, 0);
    const limit = parseNonNegativeInt(req.query.limit, undefined);
    if (offset === null || limit === null) {
      return res.status(400).json({ error: 'offset and limit must be non-negative integers' });
    }
    res.json(store.list({ offset, limit: clampLimit(limit) }));
  });

  router.post('/', (req, res) => {
    const error = validateItem(req.body);
    if (error) return res.status(400).json({ error });
    const item = store.create(pick(req.body));
    res.status(201).location('/items/' + item.id).json(item);
  });

  router.get('/:id', parseId, (req, res) => {
    const item = store.get(req.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  });

  router.put('/:id', parseId, (req, res) => {
    const error = validateItem(req.body);
    if (error) return res.status(400).json({ error });
    const item = store.replace(req.itemId, pick(req.body));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  });

  router.patch('/:id', parseId, (req, res) => {
    const error = validateItemPatch(req.body);
    if (error) return res.status(400).json({ error });
    const item = store.update(req.itemId, pick(req.body));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  });

  router.delete('/:id', parseId, (req, res) => {
    if (!store.remove(req.itemId)) return res.status(404).json({ error: 'Item not found' });
    res.status(204).end();
  });

  return router;
}

module.exports = { createItemsRouter };
