import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/board-lib.js');

const el = (id, version, versionNonce, index = 'a0', extra = {}) => ({ id, version, versionNonce, index, ...extra });

test('a board link names its cohort, its week or session, its group, and the stage view', () => {
  const id = '3f2b8c1e-0a4d-4e9b-8f6a-1c2d3e4f5a6b';
  assert.deepEqual(lib.params('?c=Fall-2026&s=week-3'), { slug: 'fall-2026', week: 3, sessionId: null, group: null, stage: false, template: null });
  assert.deepEqual(lib.params(`?c=fall&s=${id}&g=${id.toUpperCase()}&view=stage`), { slug: 'fall', week: null, sessionId: id, group: id, stage: true, template: null });
  assert.equal(lib.params('?c=fall&stage').stage, true);
  assert.deepEqual(lib.params('?c=fall&s=week-x&g=nope'), { slug: 'fall', week: null, sessionId: null, group: null, stage: false, template: null });
  assert.equal(lib.link('fall 2026', { number: 2 }, null, false), '/board/?c=fall%202026&s=week-2');
  assert.equal(lib.link('fall', { number: 2 }, id, true), `/board/?c=fall&s=week-2&g=${id}&view=stage`);
});

test('the session is the one the link names, or else the one happening now', () => {
  const ss = [{ id: 'a', number: 1 }, { id: 'b', number: 2 }];
  assert.equal(lib.pickSession(ss, { week: 2 }, ss[0]).id, 'b');
  assert.equal(lib.pickSession(ss, { sessionId: 'a' }, ss[1]).id, 'a');
  assert.equal(lib.pickSession(ss, { week: 9 }, ss[0]), null, 'a week that does not exist is not quietly another week');
  assert.equal(lib.pickSession(ss, { week: null, sessionId: null }, ss[1]).id, 'b');
  assert.equal(lib.topic('xyz'), 'board:xyz');
});

test('only elements that changed since they were last sent or received go out', () => {
  const seen = {};
  const first = [el('r', 1, 5), el('s', 1, 6)];
  assert.deepEqual(lib.unsent(first, seen).map(e => e.id), ['r', 's']);
  lib.markSeen(seen, first);
  assert.deepEqual(lib.unsent(first, seen), []);
  const next = [el('r', 2, 7), el('s', 1, 6), el('t', 1, 1)];
  assert.deepEqual(lib.unsent(next, seen).map(e => e.id), ['r', 't']);
  lib.markSeen(seen, [el('r', 1, 0)]);
  assert.equal(seen.r, 1, 'an older copy never lowers what was seen');
});

test('erased elements travel for a day, and then are dropped', () => {
  const now = 10 * lib.DAY;
  const kept = lib.syncable([
    el('live', 1, 1),
    el('erased-now', 2, 1, 'a1', { isDeleted: true, updated: now - 1000 }),
    el('erased-long-ago', 2, 1, 'a2', { isDeleted: true, updated: now - 2 * lib.DAY })
  ], now);
  assert.deepEqual(kept.map(e => e.id), ['live', 'erased-now']);
});

test('two copies of an element settle the way Excalidraw and the database settle them', () => {
  assert.equal(lib.keepLocal(el('r', 3, 9), el('r', 2, 1)), true, 'the higher version wins');
  assert.equal(lib.keepLocal(el('r', 2, 9), el('r', 3, 1)), false);
  assert.equal(lib.keepLocal(el('r', 2, 1), el('r', 2, 9)), true, 'at the same version, the lower nonce wins');
  assert.equal(lib.keepLocal(el('r', 2, 9), el('r', 2, 1)), false);
  assert.equal(lib.keepLocal(el('r', 1, 9), el('r', 5, 1), { r: true }), true, 'what someone is drawing stays on their screen');
  assert.equal(lib.keepLocal(undefined, el('r', 1, 1)), false);
});

test('merging keeps everyone\'s newest work, in z-order, the same on every screen', () => {
  const mine = [el('a', 2, 5, 'a0'), el('b', 1, 1, 'a2'), el('mine-only', 1, 1, 'a3')];
  const theirs = [el('a', 1, 1, 'a0'), el('b', 4, 3, 'a2'), el('theirs-only', 1, 1, 'a1')];
  const m1 = lib.merge(mine, theirs);
  assert.deepEqual(m1.map(e => [e.id, e.version]), [['a', 2], ['theirs-only', 1], ['b', 4], ['mine-only', 1]]);
  const m2 = lib.merge(theirs, mine);
  assert.deepEqual(m2, m1, 'whichever screen merges, the result is the same');
  assert.deepEqual(lib.merge([], []), []);
  assert.deepEqual(lib.merge([el('x', 1, 1, null), el('y', 1, 1, 'a0')], []).map(e => e.id), ['y', 'x'], 'an element without an index goes last');
});

test('a large change is cut into messages that fit, and a giant element waits for the save', () => {
  const small = Array.from({ length: 30 }, (_, i) => el('e' + i, 1, 1, 'a' + i, { points: Array(40).fill([1.5, 2.5]) }));
  const { batches, tooBig } = lib.batches(small, 2000);
  assert.equal(tooBig.length, 0);
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flat().map(e => e.id), small.map(e => e.id), 'nothing lost, nothing reordered');
  batches.forEach(b => assert.ok(lib.bytes(b) <= 2000, 'every message fits'));
  const giant = el('giant', 1, 1, 'a0', { points: Array(5000).fill([123.456, 789.012]) });
  const r = lib.batches([small[0], giant], 2000);
  assert.deepEqual(r.tooBig.map(e => e.id), ['giant']);
  assert.deepEqual(r.batches.flat().map(e => e.id), ['e0']);
  assert.deepEqual(lib.batches([]), { batches: [], tooBig: [] });
  assert.equal(lib.bytes('é'), 2, 'sizes are counted in bytes, as Realtime counts them');
});

test('the more people on the board, the less often each page sends', () => {
  assert.equal(lib.sendInterval(1), 100);
  assert.equal(lib.sendInterval(0), 100);
  assert.equal(lib.sendInterval(30), 750);
  assert.ok(30 * (1000 / lib.sendInterval(30)) <= lib.MESSAGES_PER_SECOND, 'thirty people drawing at once stay inside the budget');
  assert.equal(lib.pointerInterval(30), 3000);
});

function fakeClock() {
  let t = 0, id = 0; const timers = new Map();
  return {
    now: () => t,
    set: (fn, ms) => { timers.set(++id, { fn, at: t + ms }); return id; },
    clear: (k) => timers.delete(k),
    tick(ms) {
      t += ms;
      for (const [k, v] of [...timers]) if (v.at <= t) { timers.delete(k); v.fn(); }
    }
  };
}

test('throttling sends at once, then only the latest change at the end of the wait', () => {
  const clock = fakeClock(); const sent = [];
  const send = lib.throttle((v) => sent.push(v), 100, clock);
  send(1); send(2); send(3);
  assert.deepEqual(sent, [1]);
  assert.equal(send.waiting(), true);
  clock.tick(99); assert.deepEqual(sent, [1]);
  clock.tick(1); assert.deepEqual(sent, [1, 3], 'the in-between change is folded into the latest');
  clock.tick(500); send(4); assert.deepEqual(sent, [1, 3, 4], 'after a quiet spell it sends at once again');
  send(5); send.flush(); assert.deepEqual(sent, [1, 3, 4, 5], 'flush sends what is waiting, for a page that is closing');
  send(6); send.cancel(); clock.tick(1000); assert.deepEqual(sent, [1, 3, 4, 5]);
});

test('the wait can grow with the room', () => {
  const clock = fakeClock(); const sent = []; let people = 1;
  const send = lib.throttle((v) => sent.push(v), () => lib.sendInterval(people), clock);
  send('a'); people = 30; send('b');
  clock.tick(100); assert.deepEqual(sent, ['a']);
  clock.tick(650); assert.deepEqual(sent, ['a', 'b']);
});

test('a message from before a clear is ignored, and who may draw follows the lock', () => {
  assert.equal(lib.sameGeneration({ gen: 2 }, { generation: 2 }), true);
  assert.equal(lib.sameGeneration({ gen: 1 }, { generation: 2 }), false);
  assert.equal(lib.sameGeneration(null, { generation: 0 }), false);
  assert.equal(lib.canDraw({ locked: false }, false), true);
  assert.equal(lib.canDraw({ locked: true }, false), false);
  assert.equal(lib.canDraw({ locked: true }, true), true);
  assert.equal(lib.canDraw(null, true), false);
});

test('each person keeps one pointer color, and downloads are named for the cohort and week', () => {
  assert.equal(lib.colorFor('abc'), lib.colorFor('abc'));
  assert.match(lib.colorFor('someone'), /^#[0-9A-F]{6}$/);
  assert.equal(lib.fileName('fall-2026', { number: 3 }, null, 'png'), 'fall-2026-week-3-board.png');
  assert.equal(lib.fileName('fall-2026', { number: 3 }, 'Trio A!', 'svg'), 'fall-2026-week-3-trio-a-board.svg');
});

test('a design stage template is the course’s words, laid once, with ids that never collide (R5)', () => {
  assert.deepEqual(lib.TEMPLATES.map((t) => t.key), ['blank', 'prompt', 'moves', 'problem-tests', 'questions']);
  assert.equal(lib.params('?c=fall&s=week-2&t=moves').template, 'moves');
  assert.equal(lib.params('?c=fall&s=week-2&t=<script>').template, null);
  assert.equal(lib.link('fall', { number: 2 }, null, true, 'prompt'), '/board/?c=fall&s=week-2&view=stage&t=prompt');
  assert.equal(lib.link('fall', { number: 2 }, null, false, 'blank'), '/board/?c=fall&s=week-2');
  const els = lib.templateElements('moves', 7);
  assert.equal(els.length, 9);
  assert.equal(new Set(els.map((e) => e.id)).size, 9);
  assert.deepEqual(lib.templateElements('moves', 99).map((e) => e.id), els.map((e) => e.id), 'the same ids every time');
  assert.ok(els.every((e) => e.locked && e.version === 1 && e.updated === 7));
  assert.deepEqual(els.filter((e) => e.type === 'text' && e.fontSize === 28).map((e) => e.text), ['Write', 'Play', 'Publish']);
  const idx = els.map((e) => e.index);
  assert.deepEqual(idx, idx.slice().sort(), 'in z-order');
  assert.deepEqual(lib.templateElements('blank'), []);
  assert.deepEqual(lib.templateElements('nope'), []);
  assert.equal(lib.needsTemplate([], 'prompt'), true);
  assert.equal(lib.needsTemplate([{ id: 'x', isDeleted: true }], 'prompt'), false, 'never over something erased');
  assert.equal(lib.needsTemplate([], 'blank'), false);
  assert.equal(lib.needsTemplate([], null), false);
  // Four frames sit in two rows, and a long hint wraps inside its frame.
  const prompt = lib.templateElements('prompt');
  const frames = prompt.filter((e) => e.type === 'rectangle');
  assert.deepEqual(frames.map((f) => [f.x, f.y]), [[0, 0], [460, 0], [0, 360], [460, 360]]);
  assert.ok(prompt.filter((e) => e.type === 'text').every((t) => t.width <= 380));
});
