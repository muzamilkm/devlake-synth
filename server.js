const { loadConfig } = require('./config');

const config = loadConfig();

console.log(`Server listening on port ${config.port}`);
