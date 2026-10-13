const test = require('node:test');
const assert = require('node:assert');
const { createProfileStore } = require('./profileStore');

test('get returns a blank profile for an unknown user', () => {
  const store = createProfileStore();
  assert.deepStrictEqual(store.get('u1'), { id: 'u1', displayName: null, bio: null, updatedAt: null });
});

test('update creates the profile and stamps updatedAt', () => {
  const store = createProfileStore();
  const profile = store.update('u1', { displayName: 'Ann' });
  assert.strictEqual(profile.displayName, 'Ann');
  assert.strictEqual(profile.bio, null);
  assert.ok(!Number.isNaN(Date.parse(profile.updatedAt)));
});

test('update merges fields and leaves others untouched', () => {
  const store = createProfileStore();
  store.update('u1', { displayName: 'Ann', bio: 'hi' });
  const profile = store.update('u1', { bio: 'hello' });
  assert.strictEqual(profile.displayName, 'Ann');
  assert.strictEqual(profile.bio, 'hello');
});

test('profiles are isolated per user and returned as copies', () => {
  const store = createProfileStore();
  store.update('u1', { displayName: 'Ann' });
  store.get('u1').displayName = 'mutated';
  assert.strictEqual(store.get('u1').displayName, 'Ann');
  assert.strictEqual(store.get('u2').displayName, null);
});

test('clear removes all profiles', () => {
  const store = createProfileStore();
  store.update('u1', { displayName: 'Ann' });
  store.clear();
  assert.strictEqual(store.get('u1').displayName, null);
});
