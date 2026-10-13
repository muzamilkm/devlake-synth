// Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), embedded
// commas/newlines inside quotes, CRLF or LF line endings, optional UTF-8 BOM.

class CsvParseError extends Error {
  constructor(message, line) {
    super(`${message} (line ${line})`);
    this.name = 'CsvParseError';
    this.line = line;
  }
}

function parseCsv(input, { delimiter = ',' } = {}) {
  if (typeof input !== 'string') throw new TypeError('CSV input must be a string');
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let fieldQuoted = false;
  let line = 1;
  let quoteStartLine = 1;

  const endField = () => {
    row.push(field);
    field = '';
    fieldQuoted = false;
  };
  const endRow = () => {
    // Blank lines carry no data; a quoted "" is a real empty value.
    if (row.length === 0 && field === '' && !fieldQuoted) return;
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (field !== '' || fieldQuoted) throw new CsvParseError('Unexpected quote in field', line);
      inQuotes = true;
      fieldQuoted = true;
      quoteStartLine = line;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
      line++;
    } else if (fieldQuoted) {
      throw new CsvParseError('Unexpected character after closing quote', line);
    } else {
      field += ch;
    }
  }

  if (inQuotes) throw new CsvParseError('Unterminated quoted field', quoteStartLine);
  if (field !== '' || fieldQuoted || row.length > 0) endRow();

  return rows;
}

module.exports = { parseCsv, CsvParseError };
