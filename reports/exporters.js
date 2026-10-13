const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// RFC 4180 field quoting. Strings starting with a spreadsheet formula character
// get a leading apostrophe so opening the file in Excel cannot run them.
function csvField(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

// rows: array of flat objects. columns defaults to the keys of the first row.
// Lines end in CRLF, including the last one.
function toCsv(rows, columns) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const cols = columns || (rows.length ? Object.keys(rows[0]) : []);
  if (cols.length === 0) return '';
  const lines = [cols.map(csvField).join(',')];
  for (const row of rows) lines.push(cols.map((c) => csvField(row[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

// A single object (e.g. the summary) becomes metric,value rows.
function objectToCsv(obj) {
  return toCsv(Object.entries(obj).map(([metric, value]) => ({ metric, value })), ['metric', 'value']);
}

function toJson(data, { pretty = true } = {}) {
  return pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data);
}

module.exports = { csvField, toCsv, objectToCsv, toJson };
