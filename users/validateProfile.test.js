const test = require('node:test');
const assert = require('node:assert');
const { validateProfilePatch, MAX_DISPLAY_NAME, MAX_BIO } = require('./validateProfile');

test('accepts displayName and bio, trimming displayName', () => {
  const { data, error } = validateProfilePatch({ displayName: '  Ann  ', bio: 'hi' });
  assert.strictEqual(error, undefined);
  assert.deepStrictEqual(data, { displayName: 'Ann', bio: 'hi' });
});

test('accepts a single field', () => {
  assert.deepStrictEqual(validateProfilePatch({ bio: '' }).data, { bio: '' });
});

test('null bio clears the bio', () => {
  assert.deepStrictEqual(validateProfilePatch({ bio: null }).data, { bio: null });
});

test('rejects non-object bodies', () => {
  for (const body of [undefined, null, 'x', 5, []]) {
    assert.match(validateProfilePatch(body).error, /JSON object/);
  }
});

test('rejects an empty object', () => {
  assert.match(validateProfilePatch({}).error, /at least one/);
});

test('rejects unknown fields', () => {
  assert.match(validateProfilePatch({ displayName: 'Ann', role: 'admin' }).error, /Unknown field: role/);
  assert.match(validateProfilePatch({ id: 'u2' }).error, /Unknown field: id/);
});

test('rejects invalid displayName', () => {
  assert.match(validateProfilePatch({ displayName: 5 }).error, /must be a string/);
  assert.match(validateProfilePatch({ displayName: '   ' }).error, /must not be empty/);
  assert.match(validateProfilePatch({ displayName: null }).error, /must be a string/);
  assert.match(validateProfilePatch({ displayName: 'a'.repeat(MAX_DISPLAY_NAME + 1) }).error, /at most/);
});

test('accepts displayName and bio at their maximum length', () => {
  const body = { displayName: 'a'.repeat(MAX_DISPLAY_NAME), bio: 'b'.repeat(MAX_BIO) };
  assert.deepStrictEqual(validateProfilePatch(body).data, body);
});

test('rejects invalid bio', () => {
  assert.match(validateProfilePatch({ bio: 5 }).error, /string or null/);
  assert.match(validateProfilePatch({ bio: 'b'.repeat(MAX_BIO + 1) }).error, /at most/);
});
