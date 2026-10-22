import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/admin-lib.js');

test('rights read as their names, or None', () => {
  assert.equal(A.rightsText({ teacher: true, can_admin: true }), 'Leader, Admin');
  assert.equal(A.rightsText({}), 'None');
});

test('a change reads as what was done to whom', () => {
  assert.equal(A.changeText({ right: 'teacher', before: false, after: true }, 'Ivy'), 'made Ivy a leader');
  assert.equal(A.changeText({ right: 'can_sign', before: true, after: false }, 'Jo'), 'took away Jo’s signing');
});

test('only giving or taking admin, and taking teaching from someone with more, asks once more', () => {
  assert.ok(A.confirmFor('can_admin', true, {}));
  assert.ok(A.confirmFor('can_admin', false, {}));
  assert.equal(A.confirmFor('can_sign', true, {}), null);
  assert.equal(A.confirmFor('teacher', false, { cohorts: [] }), null);
  assert.ok(A.confirmFor('teacher', false, { cohorts: [{ role: 'teacher', status: 'running' }] }));
  assert.ok(A.confirmFor('teacher', false, { can_sign: true, cohorts: [] }));
});
