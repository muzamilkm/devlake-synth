const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DevLake' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
