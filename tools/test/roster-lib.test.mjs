import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('../../assets/roster-lib.js');

const people = [{ user_id: 'b', name: 'Bea' }, { user_id: 'e', name: 'Eve' }, { user_id: 'f', name: 'Fay' }, { user_id: 'a', name: 'Ari' }];
const presence = { b: [{ stage: '01' }], e: [{ stage: 'nope' }], f: [{}], t: [{ name: 'Teacher' }] };
const answers = [{ check_id: 'k1', user_id: 'b' }, { check_id: 'k1', user_id: 'a' }, { check_id: 'k0', user_id: 'e' }];

test('who is here, who is not yet, and who answered the question being asked', () => {
  const r = R.roster(people, presence, answers, 'k1');
  assert.deepEqual(r.here.map(x => x.name), ['Bea', 'Eve', 'Fay']);
  assert.deepEqual(r.missing.map(x => x.name), ['Ari']);
  assert.equal(r.here[0].answered, true);
  assert.equal(r.here[1].answered, false);
  assert.deepEqual(r.counts, { here: 3, total: 4, answered: 2, answeredHere: 1, sharing: 1 });
  assert.equal(R.summary(r, 'k1'), '3 of 4 here, 2 answered, 1 sharing where they are.');
  assert.equal(R.summary(R.roster(people, {}, [], null), null), '0 of 4 here.');
});

test('only a real stage counts, and only for people who chose to share it', () => {
  const r = R.roster(people, presence, [], null);
  assert.equal(r.here.find(x => x.id === 'e').stage, null);
  assert.equal(r.byStage['01'], 1);
  const v = R.pathView(r);
  assert.equal(v.rows.length, 10);
  assert.deepEqual(v.rows.find(x => x.stage === '01'), { stage: '01', label: '01 Prototype', count: 1, share: 100 });
  assert.equal(v.sharing, 1);
});

test('the question counted is the one on the stage, or the newest open one', () => {
  const checks = [{ id: 'k2', state: 'closed' }, { id: 'k1', state: 'open' }];
  assert.equal(R.askingNow(checks, { kind: 'check', id: 'k9' }), 'k9');
  assert.equal(R.askingNow(checks, { kind: 'item', id: 'x' }), 'k1');
  assert.equal(R.askingNow([], null), null);
});
