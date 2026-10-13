const express = require('express');
const { createStore } = require('./store');
const { createItemsRouter } = require('./routes/items');
const { createRequestLogger } = require('./middleware/requestLogger');
const { loginHandler } = require('./users/login');
const { createProfileStore } = require('./users/profileStore');
const { createUpdateProfileHandler } = require('./users/profile');
const { jwtAuth } = require('./middleware/jwtAuth');

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

const profileStore = createProfileStore();
app.locals.profileStore = profileStore;
app.patch('/users/me', jwtAuth, createUpdateProfileHandler(profileStore));

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
