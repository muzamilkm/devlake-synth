const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadConfig } = require('./config');

test('loadConfig: defaults port to 3000 when PORT is unset', () => {
  assert.deepStrictEqual(loadConfig({}), { port: 3000 });
});

test('loadConfig: reads a valid PORT as a number', () => {
  assert.deepStrictEqual(loadConfig({ PORT: '8080' }), { port: 8080 });
});

test('loadConfig: throws with a clear message for an invalid PORT', () => {
  assert.throws(
    () => loadConfig({ PORT: 'abc' }),
    { message: 'Invalid configuration: PORT must be an integer between 1 and 65535 (got "abc")' }
  );
});

test('bin/www: exits non-zero with the config error before listening', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'bin', 'www')], {
    env: { ...process.env, PORT: 'abc' },
    encoding: 'utf8',
    timeout: 5000,
  });

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Invalid configuration: PORT must be an integer between 1 and 65535/);
  assert.doesNotMatch(result.stdout, /Server running/);
});
