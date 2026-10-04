import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const B = createRequire(import.meta.url)('../../assets/builder-lib.js');

test('a repository is read from owner/name or its GitHub address', () => {
  assert.equal(B.repoFrom('kim/tide-log'), 'kim/tide-log');
  assert.equal(B.repoFrom(' https://github.com/kim/tide-log.git/ '), 'kim/tide-log');
  assert.equal(B.repoFrom('https://www.github.com/kim/tide-log/tree/main'), 'kim/tide-log');
  assert.equal(B.repoFrom('tide-log'), null);
  assert.equal(B.repoFrom('kim/tide log'), null);
  assert.equal(B.repoFrom(''), null);
});

test('the form is checked the way the database checks it', () => {
  assert.deepEqual(B.checkOwnApp({ repo: 'kim/tide-log', name: ' Tide Log ', url: 'https://kim.github.io/tide-log/', public: true }).row,
    { app_repo: 'kim/tide-log', app_name: 'Tide Log', app_url: 'https://kim.github.io/tide-log/', public: true });
  assert.deepEqual(B.checkOwnApp({ repo: 'kim/tide-log' }).row, { app_repo: 'kim/tide-log', app_name: null, app_url: null, public: false });
  assert.match(B.checkOwnApp({ repo: 'nope' }).error, /owner\/name/);
  assert.match(B.checkOwnApp({ repo: 'kim/x', url: 'javascript:alert(1)' }).error, /https/);
  assert.match(B.checkOwnApp({ repo: 'kim/x', url: 'http://kim.example' }).error, /https/);
  assert.match(B.checkOwnApp({ repo: 'kim/x', name: 'x'.repeat(121) }).error, /120/);
});

test('where an app stands is said plainly, and a hide never reads as the builder\'s doing', () => {
  assert.equal(B.standing(null, null), '');
  assert.match(B.standing({ public: false }, null), /Only you can see it/);
  assert.match(B.standing({ public: true }, null), /on the apps page/);
  assert.match(B.standing({ public: true }, { reason: 'It asks for a password first' }), /because: It asks for a password first\. Your switch is still yours/);
  assert.match(B.standing({ public: true }, { reason: null }), /for now\. Your switch/);
});
