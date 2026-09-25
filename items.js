const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
  { id: 4, name: 'Item 4' },
  { id: 5, name: 'Item 5' },
];

function paginate(limit = 10, offset = 0) {
  return items.slice(offset, offset + limit);
}

module.exports = { items, paginate };
