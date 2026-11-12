import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('../../assets/replay-lib.js');

const start = '2026-11-11T20:00:00.000Z';
const at = (s) => new Date(Date.parse(start) + s * 1000).toISOString();

test('places a clock time on the recording, and nothing before or after it', () => {
  assert.equal(R.second(at(65), start, 3000), 65);
  assert.equal(R.second(at(-5), start, 3000), null);
  assert.equal(R.second(at(4000), start, 3000), null);
  assert.equal(R.second(at(10), null, 3000), null);
});

test('finds the start from a moment seen in the video', () => {
  assert.equal(R.startFrom(at(241), 241), start);
});

test('joins one person’s turns across short gaps, never across people', () => {
  const s = R.stretches([
    { user_id: 'a', started_s: 0, ended_s: 10 }, { user_id: 'a', started_s: 14, ended_s: 20 },
    { user_id: 'b', started_s: 21, ended_s: 30 }, { user_id: 'a', started_s: 60, ended_s: 70 }
  ]);
  assert.deepEqual(s.map((x) => [x.user_id, x.started_s, x.ended_s]), [['a', 0, 20], ['b', 21, 30], ['a', 60, 70]]);
});

test('a part starts only when the scene changes, with its title', () => {
  const rows = R.rows({ startedAt: start, length: 3000, sceneTitle: (id) => ({ s1: 'Open', s2: 'Build' })[id],
    events: [
      { kind: 'stage', detail: 'scene:s1', at: at(10) }, { kind: 'stage', detail: 'answers:s1', at: at(20) },
      { kind: 'stage', detail: 'scene:s1', at: at(30) }, { kind: 'stage', detail: 'scene:s2', at: at(90) }
    ] });
  assert.deepEqual(rows.map((r) => [r.kind, r.s, r.text]), [['part', 10, 'Open'], ['part', 90, 'Build']]);
});

test('reactions in the same half minute are one row of counts', () => {
  const rows = R.rows({ startedAt: start, events: [
    { kind: 'reaction', user_id: 'a', detail: 'love', at: at(31) }, { kind: 'reaction', user_id: 'b', detail: 'love', at: at(40) },
    { kind: 'reaction', user_id: 'b', detail: 'smile', at: at(50) }, { kind: 'reaction', user_id: 'a', detail: 'love', at: at(65) }
  ] });
  assert.deepEqual(rows.map((r) => [r.s, r.counts]), [[31, [['love', 2], ['smile', 1]]], [65, [['love', 1]]]]);
});

test('leaves out a person the reader may not see, but keeps the reader’s marks', () => {
  const rows = R.rows({ startedAt: start, nameOf: (id) => (id === 'me' ? 'You' : null),
    talk: [{ user_id: 'me', started_s: 5, ended_s: 9 }, { user_id: 'x', started_s: 12, ended_s: 20 }],
    marks: [{ id: 1, user_id: 'me', at: at(15), word: 'rewatch' }],
    checks: [{ id: 'k', prompt: 'Why?', created_at: at(2) }],
    answers: [{ check_id: 'k', user_id: 'x', body: 'Because', created_at: at(3) }, { check_id: 'k', user_id: 'me', body: 'So', created_at: at(4) }] });
  assert.deepEqual(rows.map((r) => [r.kind, r.s]), [['question', 2], ['answer', 4], ['talk', 5], ['mark', 15]]);
});

test('without the recording’s start, only what counts from the recording shows', () => {
  const rows = R.rows({ nameOf: () => 'A', talk: [{ user_id: 'a', started_s: 5, ended_s: 9 }], marks: [{ id: 1, user_id: 'a', at: at(15) }],
    feedback: [{ id: 'f', learner_id: 'a', at_s: 7, body: 'Good question', shared_at: null }] });
  assert.deepEqual(rows.map((r) => r.kind), ['talk', 'feedback']);
});

test('a view narrows by kind and by person, keeping the parts around them', () => {
  const list = [{ kind: 'part', s: 0 }, { kind: 'talk', s: 1, user_id: 'a' }, { kind: 'talk', s: 2, user_id: 'b' }, { kind: 'mark', s: 3, user_id: 'a' }];
  assert.deepEqual(R.view(list, 'talk', 'a').map((r) => r.s), [0, 1]);
  assert.deepEqual(R.view(list, 'mine').map((r) => r.s), [0, 3]);
  assert.equal(R.view(list, 'all').length, 4);
});

test('a leader’s own share of the talking, and none from too little talk', () => {
  const talk = [{ user_id: 'lead', started_s: 0, ended_s: 90 }, { user_id: 'a', started_s: 100, ended_s: 130 }, { user_id: null, started_s: 140, ended_s: 170 }];
  assert.equal(R.share(talk, 'lead'), 60);
  assert.equal(R.share([{ user_id: 'lead', started_s: 0, ended_s: 60 }], 'lead'), null);
});
