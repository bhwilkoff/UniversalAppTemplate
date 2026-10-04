import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/show-lib.js');
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
