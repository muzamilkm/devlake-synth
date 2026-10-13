const express = require('express');
const { parseItemsCsv, ImportError } = require('../importer');

const MAX_BODY = '1mb';
const CSV_TYPES = ['text/csv', 'application/csv'];

// POST /items/import with a text/csv body. Default is all-or-nothing: any
// invalid row rejects the whole upload. ?partial=true imports the valid rows.
function createImportRouter(store) {
  const router = express.Router();

  router.post('/', express.text({ type: CSV_TYPES, limit: MAX_BODY }), (req, res) => {
    if (!req.is(CSV_TYPES)) {
      return res.status(415).json({ error: 'Content-Type must be text/csv' });
    }

    // body-parser leaves {} for an empty body.
    const text = typeof req.body === 'string' ? req.body : '';
    const partial = req.query.partial === 'true';
    let parsed;
    try {
      parsed = parseItemsCsv(text);
    } catch (err) {
      if (err instanceof ImportError) return res.status(400).json({ error: err.message });
      throw err;
    }

    const { valid, errors, total } = parsed;
    if (errors.length && !partial) {
      return res.status(422).json({ error: 'CSV contains invalid rows; no items were created', errors });
    }

    const items = store.createMany(valid.map((v) => v.item));
    res.status(201).json({ total, created: items.length, failed: errors.length, errors, items });
  });

  return router;
}

module.exports = { createImportRouter };
