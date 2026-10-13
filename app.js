const express = require('express');
const { createStore } = require('./store');
const { createItemsRouter } = require('./routes/items');
const { allowMethods } = require('./routes/methods');
const openApiSpec = require('./openapi.json');
const { createUserStore, createUsersRouter } = require('./users');
const { notFoundHandler, errorHandler } = require('./errors');
const { createRequestLogger } = require('./middleware/requestLogger');
const { createRateLimiter } = require('./middleware/rateLimit');
const { loginHandler } = require('./users/login');
const { createProfileStore } = require('./users/profileStore');
const { createUpdateProfileHandler } = require('./users/profile');
const { jwtAuth } = require('./middleware/jwtAuth');

const app = express();

app.use(createRequestLogger());
app.use(createRateLimiter({ limit: Number(process.env.RATE_LIMIT_MAX) || 100 }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.all('/health', allowMethods(app));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DevLake' });
});
app.all('/', allowMethods(app));

app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

app.post('/auth/login', loginHandler);

const profileStore = createProfileStore();
app.locals.profileStore = profileStore;
app.patch('/users/me', jwtAuth, createUpdateProfileHandler(profileStore));

const itemStore = createStore();
app.locals.itemStore = itemStore;
app.use('/items', createItemsRouter(itemStore));

const userStore = createUserStore();
app.locals.userStore = userStore;
app.use('/users', createUsersRouter(userStore));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
