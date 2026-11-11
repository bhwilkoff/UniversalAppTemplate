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
  assert.equal(R.summary(r, 'k1'), '3 of 4 have Human Shaped open, 2 answered, 1 sharing their stage on the path.');
  assert.equal(R.summary(R.roster(people, {}, [], null), null), '0 of 4 have Human Shaped open.');
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

test('a quiet pick is whoever has done least, by what the site records', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }];
  const signals = { reactions: { a: 3, b: 0, c: 1 }, answers: { a: 1, b: 0, c: 0 }, shares: { c: 1 }, queue: {}, requests: {} };
  const q = R.toFeature(people, signals, 'quiet', 0.5);
  assert.equal(q.id, 'b');
  assert.deepEqual(q.why, ['no reactions', 'no answers', 'nothing shared', 'not in the queue', 'no requests']);
  // Someone featured already goes to the back.
  assert.equal(R.toFeature(people, Object.assign({ featured: { b: 1 } }, signals), 'quiet', 0.5).id, 'c');
  // Ties go to chance.
  const tie = [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }];
  assert.equal(R.toFeature(tie, {}, 'quiet', 0).id, 'x');
  assert.equal(R.toFeature(tie, {}, 'quiet', 0.99).id, 'y');
});

test('a random pick is anyone not featured yet, and everyone once all have been', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }];
  assert.equal(R.toFeature(people, { featured: { a: 1 } }, 'random', 0).id, 'b');
  assert.equal(R.toFeature(people, { featured: { a: 1, b: 1 } }, 'random', 0.99).id, 'b');
  assert.equal(R.toFeature([], {}, 'random', 0), null);
});

test('several picks never repeat, and stop when the pool runs out', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }];
  const signals = { reactions: { a: 5, b: 1, c: 0 } };
  assert.deepEqual(R.toFeatureMany(people, signals, 'quiet', 2, [0, 0]).map((x) => x.id), ['c', 'b']);
  assert.equal(R.toFeatureMany(people, {}, 'random', 8, [0, 0, 0]).length, 3);
  assert.equal(new Set(R.toFeatureMany(people, {}, 'random', 3).map((x) => x.id)).size, 3);
});
