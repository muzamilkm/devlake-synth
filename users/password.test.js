const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword } = require('./password');

test('hashPassword produces a self-describing scrypt hash', async () => {
  const hash = await hashPassword('Str0ng!Pass');
  const parts = hash.split('$');
  assert.strictEqual(parts.length, 6);
  assert.deepStrictEqual(parts.slice(0, 4), ['scrypt', '16384', '8', '1']);
  assert.strictEqual(Buffer.from(parts[4], 'base64').length, 16);
  assert.strictEqual(Buffer.from(parts[5], 'base64').length, 64);
  assert.ok(!hash.includes('Str0ng!Pass'));
});

test('hashPassword salts each hash', async () => {
  const [a, b] = await Promise.all([hashPassword('Str0ng!Pass'), hashPassword('Str0ng!Pass')]);
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(a.split('$')[4], b.split('$')[4]);
});

test('verifyPassword accepts the right password and rejects others', async () => {
  const hash = await hashPassword('Str0ng!Pass');
  assert.strictEqual(await verifyPassword('Str0ng!Pass', hash), true);
  assert.strictEqual(await verifyPassword('str0ng!Pass', hash), false);
  assert.strictEqual(await verifyPassword('Str0ng!Pass ', hash), false);
  assert.strictEqual(await verifyPassword('', hash), false);
});

test('verifyPassword treats canonically equivalent Unicode as equal', async () => {
  const hash = await hashPassword('CaféPass1!');
  assert.strictEqual(await verifyPassword('CaféPass1!', hash), true);
});

test('verifyPassword rejects malformed stored hashes and non-string input', async () => {
  const hash = await hashPassword('Str0ng!Pass');
  const parts = hash.split('$');
  const malformed = [
    '',
    'not-a-hash',
    ['bcrypt', ...parts.slice(1)].join('$'),
    [...parts.slice(0, 1), 'x', ...parts.slice(2)].join('$'),
    [...parts.slice(0, 1), '0', ...parts.slice(2)].join('$'),
    [...parts.slice(0, 1), '3', ...parts.slice(2)].join('$'),
    [...parts.slice(0, 4), '', parts[5]].join('$'),
    [...parts.slice(0, 5), ''].join('$'),
    hash + '$extra',
  ];
  for (const stored of malformed) {
    assert.strictEqual(await verifyPassword('Str0ng!Pass', stored), false, stored);
  }
  assert.strictEqual(await verifyPassword(undefined, hash), false);
  assert.strictEqual(await verifyPassword('Str0ng!Pass', null), false);
});
