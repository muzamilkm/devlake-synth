const express = require('express');
const { validateItem, validateItemPatch } = require('../validate');
const { jwtAuth } = require('../middleware/jwtAuth');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SORT_FIELDS = ['name', 'price', 'createdAt'];

// Only these fields are accepted from clients; anything else is ignored.
function pick(body) {
  const data = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined) data.price = body.price;
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

// Positive integer; omitted means the default page size, larger values are capped.
function parseLimit(value) {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  if (!/^[1-9]\d*$/.test(value)) return null;
  return Math.min(Number(value), MAX_PAGE_SIZE);
}

// "field" sorts ascending, "-field" descending; omitted means store order.
function parseSort(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const direction = value.startsWith('-') ? 'desc' : 'asc';
  const field = value.replace(/^-/, '');
  return SORT_FIELDS.includes(field) ? { field, direction } : null;
}

// Non-negative decimal such as "5" or "9.99"; omitted means no bound.
function parsePrice(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return null;
  return Number(value);
}

// Returns { filters } or { error } for the name/minPrice/maxPrice query params.
function parseFilters(query) {
  const filters = {};
  if (query.name !== undefined) {
    if (typeof query.name !== 'string') return { error: 'name must be a single string' };
    filters.name = query.name;
  }
  for (const key of ['minPrice', 'maxPrice']) {
    const value = parsePrice(query[key]);
    if (value === null) return { error: `${key} must be a non-negative number` };
    if (value !== undefined) filters[key] = value;
  }
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    return { error: 'minPrice must not be greater than maxPrice' };
  }
  return { filters };
}

// RFC 8288 Link header with next/prev relations; page size, filters and sort are kept on both links.
function buildLinkHeader(baseUrl, { offset, limit, total, filters, sort }) {
  const pageLink = (pageOffset) => {
    const params = new URLSearchParams({ offset: pageOffset, limit, ...filters });
    if (sort) params.set('sort', sort);
    return `<${baseUrl}?${params}>`;
  };
  const links = [];
  if (offset + limit < total) links.push(`${pageLink(offset + limit)}; rel="next"`);
  if (offset > 0) links.push(`${pageLink(Math.max(0, offset - limit))}; rel="prev"`);
  return links.join(', ');
}

function createItemsRouter(store) {
  const router = express.Router();
  router.use(express.json());

  router.get('/', (req, res) => {
    const offset = parseNonNegativeInt(req.query.offset, 0);
    const limit = parseLimit(req.query.limit);
    if (offset === null || limit === null) {
      return res.status(400).json({ error: 'offset must be a non-negative integer and limit a positive integer' });
    }
    const sort = parseSort(req.query.sort);
    if (sort === null) {
      return res.status(400).json({ error: 'sort must be one of: ' + SORT_FIELDS.flatMap((f) => [f, '-' + f]).join(', ') });
    }
    const { filters, error } = parseFilters(req.query);
    if (error) return res.status(400).json({ error });
    const page = store.list({ offset, limit, ...filters, sort });
    res.set('X-Total-Count', String(page.total));
    const link = buildLinkHeader(req.baseUrl, { offset, limit, total: page.total, filters, sort: req.query.sort });
    if (link) res.set('Link', link);
    res.json(page);
  });

  router.post('/', jwtAuth, (req, res) => {
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
