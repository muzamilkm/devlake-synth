const express = require('express');
const requestLogger = require('./logger');

const app = express();

app.use(requestLogger());

app.get('/api/test', (req, res) => {
  res.json({ message: 'success' });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
