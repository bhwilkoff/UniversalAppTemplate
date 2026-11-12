import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../../assets/coach-lib.js');

function store() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("a learner's tour starts on the stage, and waits for it when it is not open", () => {
  const open = C.tour('learner', true);
  assert.deepEqual(open.now.map((s) => s.key), ['stage', 'reacts', 'asks', 'app']);
  assert.deepEqual(open.later, []);
  const closed = C.tour('learner', false);
  assert.deepEqual(closed.now.map((s) => s.key), ['asks', 'app']);
  assert.deepEqual(closed.later.map((s) => s.key), ['stage', 'reacts']);
  assert.deepEqual(C.tour('leader', false).now.map((s) => s.key), ['now', 'next', 'plan', 'tools']);
});

test('a hint is due the first time its thing appears, one at a time, and never again once seen', () => {
  const s = store();
  const q = { mode: 'check', answerable: true, kind: 'choice' };
  assert.equal(C.due({ teaching: false, stageOn: true, view: q }, s), 'question');
  assert.equal(C.due({ teaching: false, stageOn: true, view: { ...q, kind: 'short' } }, s), 'write');
  // Answered already: nothing to teach.
  assert.equal(C.due({ teaching: false, stageOn: true, view: { ...q, mine: { choice: 1 } } }, s), null);
  // A room to join outranks the question.
  assert.equal(C.due({ teaching: false, stageOn: true, view: q, roomJoin: true }, s), 'room');
  C.mark(s, 'hint:question');
  assert.equal(C.due({ teaching: false, stageOn: true, view: q }, s), null);
  assert.equal(C.due({ teaching: false, stageOn: true, view: { mode: 'apps' } }, s), 'app');
  // No stage, no stage hints.
  assert.equal(C.due({ teaching: false, stageOn: false, view: { mode: 'apps' } }, s), null);
  // A leader is told to open the stage, then cued when learners get a hint.
  const l = store();
  assert.equal(C.due({ teaching: true, stageOn: false, openStage: true, view: {} }, l), 'openstage');
  // Once the stage is open, the leader is given the words to say first.
  assert.equal(C.due({ teaching: true, stageOn: true, view: q }, l), 'tell');
  C.mark(l, 'hint:tell');
  assert.equal(C.due({ teaching: true, stageOn: true, view: q }, l), 'cue');
  C.forget(l);
  assert.equal(C.seen(l, 'hint:cue'), false);
});

test('the message to the stage carries only a target, words, and the step', () => {
  const m = C.readMessage(C.message({ target: 'reacts', text: 'React here.', n: 2, of: 4, label: 'Next', extra: 'x' }));
  assert.deepEqual(m, { show: { target: 'reacts', text: 'React here.', n: 2, of: 4, label: 'Next' } });
  assert.deepEqual(C.readMessage(C.message(null)), { hide: true });
  assert.equal(C.readMessage('{"type":"other"}'), null);
  assert.equal(C.readMessage('not json'), null);
});

test('every step and hint names one thing to do, in a sentence or two', () => {
  const all = [...C.TOURS.learner, ...C.TOURS.leader, ...Object.values(C.HINTS)];
  for (const s of all) {
    assert.ok(['panel', 'stage'].includes(s.where), s.text);
    assert.ok(s.text.split(/\s+/).length <= 26, s.text);
  }
});
