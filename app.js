const express = require('express');
const { createStore } = require('./store');
const { createItemsRouter } = require('./routes/items');
const { createUserStore, createUsersRouter } = require('./users');
const { notFoundHandler, errorHandler } = require('./errors');
const { createRequestLogger } = require('./middleware/requestLogger');
const { loginHandler } = require('./users/login');

const app = express();

app.use(createRequestLogger());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DevLake' });
});

app.post('/auth/login', loginHandler);

const itemStore = createStore();
app.locals.itemStore = itemStore;
app.use('/items', createItemsRouter(itemStore));

const userStore = createUserStore();
app.locals.userStore = userStore;
app.use('/users', createUsersRouter(userStore));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
