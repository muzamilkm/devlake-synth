const widget = { name: 'Widget', description: 'A blue widget' };
const gadget = { name: 'Gadget' };

// Bodies that every write endpoint (POST/PUT) must reject with 400.
const invalidItemBodies = [
  {},
  { name: '' },
  { name: '   ' },
  { name: 42 },
  { name: null },
  { name: 'ok', description: 42 },
];

// Distinct, ordered names so list ordering assertions are easy to read.
function itemNames(count) {
  return Array.from({ length: count }, (_, i) => 'item-' + String(i + 1).padStart(3, '0'));
}

function seed(store, count) {
  return itemNames(count).map((name) => store.create({ name }));
}

// Larger than express.json()'s default 100kb limit.
const oversizedBody = { name: 'x'.repeat(200 * 1024) };

module.exports = { widget, gadget, invalidItemBodies, itemNames, seed, oversizedBody };
