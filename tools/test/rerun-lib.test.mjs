import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const R = req('../../assets/rerun-lib.js');
const L = req('../../assets/live-lib.js');

const first = { id: 'k1', kind: 'choice', prompt: 'Which?', choices: ['A', 'B', 'C'] };
const second = Object.assign({}, first, { id: 'k2', rerun_of: 'k1' });

test('only a question with choices is asked again, unanswered and hidden', () => {
  assert.equal(R.canRerun('choice'), true);
  assert.equal(R.canRerun('short'), false);
  assert.equal(R.canRerun('words'), false);
  assert.deepEqual(R.againRow(first, { cohortId: 'c', sessionId: 's', me: 't' }),
    { cohort_id: 'c', session_id: 's', created_by: 't', prompt: 'Which?', choices: ['A', 'B', 'C'], kind: 'choice', points: null, show_tally: false, rerun_of: 'k1' });
});

test('who changed, among those who answered both times', () => {
  const a1 = [{ check_id: 'k1', user_id: 'bea', choice: 1 }, { check_id: 'k1', user_id: 'eve', choice: 2 }, { check_id: 'k1', user_id: 'fay', choice: 3 }];
  const a2 = [{ check_id: 'k2', user_id: 'bea', choice: 2 }, { check_id: 'k2', user_id: 'eve', choice: 2 }, { check_id: 'k2', user_id: 'gus', choice: 1 }];
  const c = R.changes(first, second, a1, a2, L.answerText);
  assert.deepEqual(c.changed, [{ user_id: 'bea', from: 'A', to: 'B' }]);
  assert.equal(c.same, 1); assert.equal(c.both, 2);
  assert.equal(R.changesLine(c), '1 of 2 who answered both times changed their answer.');
  assert.equal(R.changesLine({ both: 0, changed: [] }), 'No one has answered both times yet.');
});

test('each bar carries the first time\'s share, by label', () => {
  const rows = R.withBefore([{ label: 'B', share: 60 }, { label: 'A', share: 40 }, { label: 'New', share: 0 }], [{ label: 'A', share: 70 }, { label: 'B', share: 30 }]);
  assert.deepEqual(rows.map(r => r.before), [30, 70, null]);
});
