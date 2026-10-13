const express = require('express');
const { createStore } = require('./store');
const { createItemsRouter } = require('./routes/items');
const openApiSpec = require('./openapi.json');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DevLake' });
});

app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

const itemStore = createStore();
app.locals.itemStore = itemStore;
app.use('/items', createItemsRouter(itemStore));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
