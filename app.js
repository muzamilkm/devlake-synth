const express = require('express');
const { createStore } = require('./store');
const { createItemsRouter } = require('./routes/items');
const { notFoundHandler, errorHandler } = require('./errors');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DevLake' });
});

const itemStore = createStore();
app.locals.itemStore = itemStore;
app.use('/items', createItemsRouter(itemStore));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
