import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../../assets/session-story-lib.js');

const t = (m) => new Date(Date.UTC(2026, 10, 11, 20, m)).toISOString();
const events = [
  { kind: 'stage', detail: 'scene:open', at: t(0) },
  { kind: 'here', user_id: 'b', at: t(0) },
  { kind: 'here', user_id: 'b', at: t(1) },
  { kind: 'reaction', user_id: 'b', detail: 'clap', at: t(2) },
  { kind: 'reaction', user_id: 'b', detail: 'clap', at: t(3) },
  { kind: 'reaction', user_id: 'b', detail: 'love', at: t(4) },
  { kind: 'stage', detail: 'presenter:', at: t(5) },
  { kind: 'here', user_id: 'a', at: t(9) }
];

test('counts a person’s minutes and reactions', () => {
  assert.equal(L.minutesHere(events, 'b'), 2);
  assert.deepEqual(L.reactionsOf(events, 'b'), [['clap', 2], ['love', 1]]);
});

test('people are in name order, never by how much they did', () => {
  const p = L.people({ names: { b: 'Zoe', a: 'Amy' }, events });
  assert.deepEqual(p.map((x) => x.name), ['Amy', 'Zoe']);
  assert.ok(p[1].minutes > p[0].minutes);
});

test('no row of any kind leaves a person out rather than showing zeros', () => {
  assert.deepEqual(L.people({ names: { c: 'Cy' }, events }), []);
});

test('counts only work actually shown', () => {
  const p = L.people({ names: { a: 'Amy' }, events: [], queue: [{ user_id: 'a', shown_at: t(1) }, { user_id: 'a', shown_at: null }] });
  assert.equal(p[0].shown, 1);
});

test('stops run to the next move, and the last to the last thing kept', () => {
  const s = L.stops(events);
  assert.deepEqual(s.map((x) => [x.stage, x.scene, x.minutes]), [['scene', 'open', 5], ['presenter', null, 4]]);
});

test('nothing kept gives nothing', () => {
  assert.deepEqual(L.stops([]), []);
  assert.deepEqual(L.people({ names: {} }), []);
});
