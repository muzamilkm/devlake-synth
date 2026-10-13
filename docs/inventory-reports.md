# Inventory reports

Reports live in `reports/` and are pure functions over an array of items. Items may carry optional `category`, `price`, `quantity` and `reorderLevel`. Missing or invalid numbers count as 0, and a missing category becomes `uncategorized` (categories are trimmed and lowercased).

## Generating a report

```js
const { generateReport } = require('./reports');

generateReport('summary', items);
generateReport('low-stock', items, { threshold: 5, category: 'hardware' });
generateReport('categories', items);
```

Types: `summary`, `low-stock`, `categories`. An unknown type throws a `RangeError`.

`low-stock` options:

- `threshold` (default 10): items with `quantity <= threshold` are listed. An item's own `reorderLevel` takes precedence. An item exactly at the limit is included.
- `category`: only report this category (case-insensitive).

## Exporting

```js
const { exportReport } = require('./reports');

const { contentType, filename, body } = exportReport('categories', 'csv', items);
// contentType: 'text/csv; charset=utf-8'
// filename:    'inventory-categories.csv'
```

Formats: `json` and `csv`. An unknown format throws a `RangeError`.

In an Express handler:

```js
res.type(contentType).attachment(filename).send(body);
```

### JSON

Pretty printed with two spaces and a trailing newline. `summary` is an object; `low-stock` and `categories` are arrays of rows. Empty reports are `[]`.

### CSV

- Header row first, CRLF line endings (including the last line).
- Fields containing commas, quotes or newlines are quoted, and embedded quotes are doubled (`He said "hi"` becomes `"He said ""hi"""`).
- Strings starting with `=`, `+`, `-` or `@` are prefixed with `'` to block spreadsheet formula injection.
- `summary` is written as `metric,value` rows; null values are empty cells.
- `low-stock` and `categories` with no rows export as an empty string (no header).

The lower-level helpers `csvField`, `toCsv`, `objectToCsv` and `toJson` are in `reports/exporters.js`.
