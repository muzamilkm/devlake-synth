const { buildSummary } = require('./summary');
const { buildLowStockReport } = require('./lowStock');
const { buildCategoryBreakdown } = require('./categories');
const { toCsv, objectToCsv, toJson } = require('./exporters');

const REPORTS = {
  summary: { build: buildSummary, csv: objectToCsv },
  'low-stock': { build: buildLowStockReport, csv: toCsv },
  categories: { build: buildCategoryBreakdown, csv: toCsv },
};

const FORMATS = {
  json: { contentType: 'application/json; charset=utf-8', extension: 'json' },
  csv: { contentType: 'text/csv; charset=utf-8', extension: 'csv' },
};

function generateReport(type, items, options) {
  if (!Object.prototype.hasOwnProperty.call(REPORTS, type)) {
    throw new RangeError('Unknown report type: ' + type);
  }
  return REPORTS[type].build(items, options);
}

// Returns { contentType, filename, body } ready to hand to an HTTP response or fs.writeFile.
function exportReport(type, format, items, options) {
  if (!Object.prototype.hasOwnProperty.call(FORMATS, format)) {
    throw new RangeError('Unknown export format: ' + format);
  }
  const data = generateReport(type, items, options);
  const body = format === 'json' ? toJson(data) : REPORTS[type].csv(data);
  return {
    contentType: FORMATS[format].contentType,
    filename: 'inventory-' + type + '.' + FORMATS[format].extension,
    body,
  };
}

module.exports = {
  REPORT_TYPES: Object.keys(REPORTS),
  EXPORT_FORMATS: Object.keys(FORMATS),
  generateReport,
  exportReport,
};
