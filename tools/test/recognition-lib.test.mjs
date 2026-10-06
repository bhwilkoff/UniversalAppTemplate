import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('../../assets/recognition-lib.js');

test('every listed skill has its own key, in the shape the database takes', () => {
  const keys = R.SKILLS.map(s => s.key);
  assert.equal(new Set(keys).size, keys.length);
  keys.forEach(k => assert.match(k, /^[a-z][a-z-]{1,39}$/));
  R.SKILLS.forEach(s => assert.ok(s.label.length <= 120));
});

test('a recognition names who, a skill or the teacher\'s words, and the moment', () => {
  assert.deepEqual(R.row({ cohortId: 'c', sessionId: 's', userId: 'u', key: 'own-voice', moment: '  During  the demo ' }).row,
    { cohort_id: 'c', session_id: 's', user_id: 'u', skill: 'Wrote it in their own voice', skill_key: 'own-voice', moment: 'During the demo' });
  assert.equal(R.row({ cohortId: 'c', userId: 'u', ownWords: 'Asked the question everyone was thinking' }).row.skill_key, null);
  assert.match(R.row({ cohortId: 'c', userId: 'u' }).why, /Choose a skill/);
  assert.match(R.row({ cohortId: 'c' }).why, /Choose who/);
  assert.equal(R.momentFor('Show your work', 2), 'During “Show your work”, week 2');
  assert.equal(R.momentFor('', null), 'In class');
});

test('the student reads theirs newest first, with the principle it shows', () => {
  const l = R.lines([
    { id: 1, skill: 'Wrote it in their own voice', skill_key: 'own-voice', given_at: '2026-10-01', given_by: 't' },
    { id: 2, skill: 'Something else', skill_key: null, given_at: '2026-10-05', given_by: 't', moment: 'Week 2' }
  ], () => 'Ben');
  assert.deepEqual(l.map(x => x.id), [2, 1]);
  assert.equal(l[1].principle, 13);
  assert.equal(l[0].by, 'Ben');
});
