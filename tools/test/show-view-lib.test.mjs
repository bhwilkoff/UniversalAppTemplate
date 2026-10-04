import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/show-view-lib.js');
const C = require('../../assets/cohort-lib.js');

const parts = C.agenda(90);

test('every part of the session becomes a scene of one kind', () => {
  const sc = S.scenes(parts);
  assert.equal(sc.length, parts.length);
  assert.deepEqual(sc.map((s) => s.kind), ['talk', 'rooms', 'break', 'presenter', 'design', 'reflection', 'question']);
  for (const s of sc) {
    assert.ok(S.KINDS[s.kind], s.key);
    assert.ok(s.kindLine.length > 10, s.key);
  }
});

test('the timeline marks done, now, next, and later', () => {
  const t = S.timeline(parts, 'value');
  assert.deepEqual(t.map((s) => s.state), ['done', 'done', 'done', 'now', 'next', 'later', 'later']);
  const before = S.timeline(parts, null);
  assert.equal(before[0].state, 'next');
  assert.ok(before.slice(1).every((s) => s.state === 'later'));
});

test('each scene holds what it needs, and nothing is out of reach', () => {
  const all = S.SLOTS.map((s) => s.key);
  for (const key of [null].concat(parts.map((p) => p.key))) {
    for (const teaching of [true, false]) {
      const l = S.layout(parts, key, { teaching, available: all });
      const seen = l.now.concat(l.anytime);
      assert.equal(new Set(seen).size, seen.length, 'no part twice');
      const visible = S.SLOTS.filter((s) => teaching || !s.teacher).map((s) => s.key);
      assert.deepEqual(seen.slice().sort(), visible.slice().sort(), 'every visible part has a place');
      assert.equal(l.now[0], 'clock', 'the clock leads the current scene');
    }
  }
});

test('the rooms scene brings the rooms forward, and only the teacher gets the cue', () => {
  const t = S.layout(parts, 'show', { teaching: true });
  assert.ok(t.now.includes('rooms') && t.now.includes('cue-rooms') && t.now.includes('brought'));
  const s = S.layout(parts, 'show', { teaching: false });
  assert.ok(s.now.includes('rooms'));
  assert.ok(!s.now.includes('cue-rooms') && !s.anytime.includes('cue-rooms'));
});

test('the presenter scene brings the wings forward, and the question scene the questions', () => {
  assert.ok(S.layout(parts, 'value', { teaching: false }).now.includes('wings'));
  assert.ok(S.layout(parts, 'check', { teaching: false }).now.includes('questions'));
  assert.ok(S.layout(parts, 'check', { teaching: false }).anytime.includes('wings'));
});

test('a page only places the parts it has', () => {
  const l = S.layout(parts, 'show', { teaching: true, available: ['clock', 'rooms'] });
  assert.deepEqual(l.now, ['clock', 'rooms']);
  assert.deepEqual(l.anytime, []);
});

test('each part explains itself in one plain line, on each side', () => {
  for (const s of S.SLOTS) {
    for (const teaching of s.teacher ? [true] : [true, false]) {
      const t = S.slotText(s.key, teaching);
      assert.ok(t.name && t.line, s.key);
      assert.doesNotMatch(t.line, /—/, s.key);
      assert.equal((t.line.match(/\. /g) || []).length <= 1, true, 'one or two short sentences: ' + s.key);
    }
  }
  for (const w of S.WORDS) assert.doesNotMatch(w.line, /—/);
});

test('the next scene follows the current one, and the first comes before any', () => {
  assert.equal(S.nextScene(parts, 'show').key, 'break');
  assert.equal(S.nextScene(parts, 'check'), null);
  assert.equal(S.nextScene(parts, null).key, 'arrive');
  assert.equal(S.minutesText(25), '25 min');
  assert.equal(S.minutesText(0), '');
});

test('the shared drawing scene is the design stage, and the main stage keeps its name', () => {
  assert.equal(S.KINDS.design.name, 'Design stage');
  assert.equal(S.PART_KIND.prompt, 'design');
  assert.ok(!S.KINDS.board);
  assert.ok(S.layout(parts, 'prompt', { teaching: false }).now.includes('design'));
  assert.ok(S.WORDS.some((w) => w.name === 'Main stage'));
});

test('the main stage says whose work is on it, and the audience their part (R7)', () => {
  const V = createRequire(import.meta.url)('../../assets/show-view-lib.js');
  const items = [
    { id: 'i1', user_id: 'bea', url: 'https://bea.github.io/swap', note: 'The new list', state: 'waiting', created_at: '2026-10-20T23:05:00Z' },
    { id: 'i2', user_id: 'me', url: 'https://me.github.io/app', note: null, state: 'waiting', created_at: '2026-10-20T23:01:00Z' },
    { id: 'i3', user_id: 'cal', url: 'https://cal.github.io/x', note: null, state: 'shown', created_at: '2026-10-20T22:59:00Z' }
  ];
  const scene = { kind: 'presenter', config: { prompt: 'Listen for the value at work, and what it cost.' } };
  const nameOf = (id) => ({ bea: 'Bea', cal: 'Cal' })[id] || 'Someone';
  const label = (i) => 'Work at ' + i.url;
  const theirs = V.onStageNow({ stage: 'presenter', stage_ref: 'i1' }, items, scene, 'me', nameOf, label);
  assert.equal(theirs.line, 'Bea is presenting.');
  assert.equal(theirs.audience, 'Listen for the value at work, and what it cost.');
  assert.equal(theirs.what, 'Work at https://bea.github.io/swap');
  assert.equal(theirs.note, 'The new list');
  const mine = V.onStageNow({ stage: 'presenter', stage_ref: 'i2' }, items, scene, 'me', nameOf, label);
  assert.ok(mine.mine && /You are presenting/.test(mine.line) && mine.audience === null);
  assert.equal(V.onStageNow({ stage: 'presenter', stage_ref: 'i1' }, items, { kind: 'talk', config: {} }, 'me', nameOf, label).audience, null, 'only a presenter scene has an audience part');
  assert.equal(V.onStageNow({ stage: 'scene' }, items, scene, 'me', nameOf, label), null);
  assert.equal(V.onStageNow({ stage: 'presenter', stage_ref: 'gone' }, items, scene, 'me', nameOf, label), null);
  assert.equal(V.nextFromWings(items, null).id, 'i2', 'the first to ask, still waiting');
  assert.equal(V.nextFromWings(items, 'i2').id, 'i1', 'never whoever is on the stage now');
  assert.equal(V.nextFromWings([items[2]], null), null);
  assert.equal(V.audienceOf(scene), scene.config.prompt);
  assert.equal(V.audienceOf({ kind: 'talk', config: { prompt: 'x' } }), null);
});
