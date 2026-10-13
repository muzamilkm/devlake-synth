const { parseCsv, CsvParseError } = require('./csv');
const { validateItem } = require('./validate');

const MAX_ROWS = 1000;
const REQUIRED_COLUMNS = ['name'];
const KNOWN_COLUMNS = ['name', 'description'];

class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

// Parses CSV text into candidate items plus per-row errors.
// Row numbers are 1-based and count the header as row 1.
function parseItemsCsv(text, { maxRows = MAX_ROWS } = {}) {
  let rows;
  try {
    rows = parseCsv(text);
  } catch (err) {
    if (err instanceof CsvParseError) throw new ImportError(err.message);
    throw err;
  }
  if (rows.length === 0) throw new ImportError('CSV is empty');

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new ImportError(`Missing required column(s): ${missing.join(', ')}`);
  const unknown = header.filter((c) => !KNOWN_COLUMNS.includes(c));
  if (unknown.length) throw new ImportError(`Unknown column(s): ${unknown.join(', ')}`);
  if (new Set(header).size !== header.length) throw new ImportError('Duplicate column in header');

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) throw new ImportError('CSV has no data rows');
  if (dataRows.length > maxRows) throw new ImportError(`CSV exceeds the maximum of ${maxRows} rows`);

  const valid = [];
  const errors = [];
  dataRows.forEach((cells, idx) => {
    const row = idx + 2;
    if (cells.length !== header.length) {
      errors.push({ row, error: `Expected ${header.length} columns but found ${cells.length}` });
      return;
    }
    const raw = {};
    header.forEach((col, i) => {
      raw[col] = cells[i];
    });
    const item = { name: raw.name };
    // An empty description cell means "not provided".
    if (raw.description !== undefined && raw.description !== '') item.description = raw.description;

    const error = validateItem(item);
    if (error) {
      errors.push({ row, error });
      return;
    }
    item.name = item.name.trim();
    valid.push({ row, item });
  });

  return { valid, errors, total: dataRows.length };
}

module.exports = { parseItemsCsv, ImportError, MAX_ROWS };
