const { validateConfig } = require('./validate');

// Reads and validates config from the environment. Throws on invalid values
// so startup can fail before the server begins listening.
function loadConfig(env = process.env) {
  const error = validateConfig(env);
  if (error) {
    throw new Error(`Invalid configuration: ${error}`);
  }

  return {
    port: env.PORT ? Number(env.PORT) : 3000
  };
}

module.exports = { loadConfig };
