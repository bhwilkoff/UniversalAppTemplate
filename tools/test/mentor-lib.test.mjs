import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/mentor-lib.js');

const cohorts = [
  { id: 'a', status: 'running', starts_on: '2026-09-01' },
  { id: 'b', status: 'open', starts_on: '2026-11-01' },
  { id: 'c', status: 'open', starts_on: '2026-10-15' },
  { id: 'd', status: 'finished', starts_on: '2026-06-01' },
  { id: 'e', status: 'draft', starts_on: '2026-12-01' },
  { id: 'f', status: 'open', starts_on: '2026-10-20' }
];

test('a credential holder is offered open and running cohorts, open first, soonest first', () => {
  assert.deepEqual(M.mentorChoices(cohorts, [], []).map((c) => c.id), ['c', 'f', 'b', 'a']);
});

test('not a cohort they are in, or teach, but one they left is offered again', () => {
  const mine = [{ cohort_id: 'c', status: 'enrolled' }, { cohorts: { id: 'f' }, status: 'left' }];
  assert.deepEqual(M.mentorChoices(cohorts, mine, ['b']).map((c) => c.id), ['f', 'a']);
});

test('a role reads as a word only for mentors, and the switch moves between the two', () => {
  assert.equal(M.roleLabel('mentor'), 'Mentor');
  assert.equal(M.roleLabel('student'), '');
  assert.equal(M.otherRole('student'), 'mentor');
  assert.equal(M.otherRole('mentor'), 'student');
});
