// Running the show (research/notes/run-of-show-design.md, R3): the pure
// parts in assets/show-view-lib.js and the main stage's scene view in
// assets/addon-lib.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/show-view-lib.js');
const SL = require('../../assets/show-lib.js');
const A = require('../../assets/addon-lib.js');
const C = require('../../assets/cohort-lib.js');

const parts = C.agenda(90);
const rows = [
  { id: 'c', position: 2, kind: 'question', title: 'Check', minutes: 3, body: null, config: { prompt: 'Which one?', options: ['This', 'That'] } },
  { id: 'a', position: 0, kind: 'talk', title: 'Arrive', minutes: 7, body: 'One line each.', config: {} },
  { id: 'b', position: 1, kind: 'rooms', title: 'Show it', minutes: 25, body: null, config: { prompt: 'On the device.', room_scenes: [{ title: 'Their question', minutes: 2 }] } }
];

test('a session’s own run of show becomes the scenes, in order, each starting where the last ends', () => {
  const list = S.fromRows(rows);
  assert.deepEqual(list.map((s) => s.key), ['a', 'b', 'c']);
  assert.deepEqual(list.map((s) => s.start), [0, 7, 32]);
  assert.ok(list.every((s) => s.own));
  const sc = S.scenes(list);
  assert.deepEqual(sc.map((s) => s.kind), ['talk', 'rooms', 'question'], 'a scene keeps its own kind');
  assert.equal(sc[1].kindName, 'Rehearsal rooms');
  assert.ok(S.layout(list, 'b').now.includes('rooms'), 'a scene of its own holds what its kind needs');
  assert.deepEqual(S.scenes(parts).map((s) => s.kind), ['talk', 'rooms', 'break', 'presenter', 'design', 'reflection', 'question'], 'the six parts are unchanged');
});

test('each scene stands in for the part whose code it needs', () => {
  const list = S.fromRows(rows);
  assert.deepEqual(list.map((s, i) => S.partKeyOf(s, i)), ['arrive', 'show', 'check']);
  const p = S.scenes(parts);
  assert.equal(S.partKeyOf(p[3], 3), 'value', 'a part is itself');
  assert.equal(S.partKeyOf(null, 0), null);
});

test('the current scene is the one the show names, and only if it is still there', () => {
  const list = S.fromRows(rows);
  assert.equal(S.currentKey({ current_scene: 'b' }, list), 'b');
  assert.equal(S.currentKey({ current_scene: 'gone' }, list), null);
  assert.equal(S.currentKey(null, list), null);
});

test('back and next stay within the show', () => {
  const list = S.fromRows(rows);
  assert.equal(S.step(list, null, 1), 'a', 'next before the show begins is the first scene');
  assert.equal(S.step(list, 'a', 1), 'b');
  assert.equal(S.step(list, 'b', -1), 'a');
  assert.equal(S.step(list, 'a', -1), null, 'nothing before the first');
  assert.equal(S.step(list, 'c', 1), null, 'nothing after the last');
  assert.equal(S.step([], 'a', 1), null);
});

test('the clock counts down from when the database started it', () => {
  const scene = S.fromRows(rows)[0];
  const st = { scene_started_at: '2026-10-04T17:00:00Z' };
  const t0 = Date.parse('2026-10-04T17:00:00Z');
  assert.equal(S.secondsLeft(st, scene, t0), 420);
  assert.equal(S.secondsLeft(st, scene, t0 + 60000), 360);
  assert.equal(S.secondsLeft(st, scene, t0 + 3600000), 0);
  assert.equal(S.secondsLeft({ scene_started_at: null }, scene, t0), null, 'a stopped clock has no time left');
  assert.equal(S.endsAt(st, scene), t0 + 420000);
  assert.equal(S.leftText(420), '7:00 left');
  assert.equal(S.leftText(65), '1:05 left');
  assert.equal(S.leftText(0), 'Time is up');
  assert.equal(S.leftText(null), '');
});

test('the main stage follows the scene unless the teacher pins something, and back again', () => {
  assert.equal(S.pinOf({ stage: 'scene' }), null);
  assert.equal(S.pinOf(null), null);
  assert.deepEqual(S.pinOf({ stage: 'answers', stage_ref: 'k1' }), { kind: 'check', id: 'k1' });
  assert.deepEqual(S.pinOf({ stage: 'presenter', stage_ref: 'q1' }), { kind: 'item', id: 'q1' });
  assert.deepEqual(S.pinOf({ stage: 'welcome' }), { kind: 'welcome' });
  assert.deepEqual(S.pinOf({ stage: 'path' }), { kind: 'path' });
  assert.deepEqual(S.pinOf({ stage: 'rooms' }), { kind: 'rooms' });
  assert.deepEqual(S.stageChange({ kind: 'path' }), { stage: 'path', stage_ref: null });
  for (const pin of [null, { kind: 'check', id: 'k1' }, { kind: 'item', id: 'q1' }, { kind: 'welcome' }, { kind: 'blank' }]) {
    assert.deepEqual(S.pinOf(S.stageChange(pin)), pin, JSON.stringify(pin));
  }
  assert.deepEqual(S.stageChange(null), { stage: 'scene', stage_ref: null });
});

test('a scene’s words are edited in the moment, and checked as the class builder checks them', () => {
  const [talkScene, rooms, question] = S.fromRows(rows);
  const f = S.editFields(question);
  assert.deepEqual(f, { title: 'Check', minutes: '3', body: '', prompt: 'Which one?', options: 'This\nThat' });
  const ok = S.edited(question, Object.assign({}, f, { prompt: 'Which one, really?', options: 'This\nThat\n\nThe other' }), SL);
  assert.equal(ok.problem, null);
  assert.deepEqual(ok.change, { title: 'Check', minutes: 3, body: null, config: { prompt: 'Which one, really?', options: ['This', 'That', 'The other'] } });
  assert.match(S.edited(question, Object.assign({}, f, { options: 'Only one' }), SL).problem, /two to eight/);
  assert.match(S.edited(question, Object.assign({}, f, { title: ' ' }), SL).problem, /title/);
  assert.match(S.edited(question, Object.assign({}, f, { minutes: '0' }), SL).problem, /minutes/);
  const kept = S.edited(rooms, S.editFields(rooms), SL);
  assert.equal(kept.problem, null);
  assert.deepEqual(kept.change.config.room_scenes, [{ title: 'Their question', minutes: 2 }], 'a room’s own scenes are kept');
  assert.deepEqual(S.editable('talk'), { prompt: false, options: false });
  const talk = S.edited(talkScene, { title: 'Hello', minutes: '5', body: 'Hi.', prompt: 'ignored', options: 'x\ny' }, SL);
  assert.deepEqual(talk.change.config, {}, 'a talk scene carries no prompt or choices');
  assert.equal(talk.problem, null);
});

test('the teacher’s own main stage shows a draft before anyone else sees it', () => {
  const talk = S.fromRows(rows)[0];
  const d = S.draft(talk, { title: 'Arrive, and say hello', minutes: '', body: 'Line one.\n\nLine two.', prompt: '', options: '' });
  assert.equal(d.name, 'Arrive, and say hello');
  assert.equal(d.minutes, 7, 'an empty minutes field keeps the minutes');
  const p = SL.stagePreview(S.asRow(d));
  assert.equal(p.title, 'Arrive, and say hello');
  assert.deepEqual(p.lines, ['Line one.', 'Line two.']);
});

test('the main stage shows the current scene, and reads only a scene it can check', () => {
  const question = S.fromRows(rows)[2];
  const preview = SL.stagePreview(S.asRow(question));
  const part = { key: 'c', name: 'Check', endsAt: 1000 };
  const view = A.stageView({ part, onStage: null, scene: preview, welcome: null });
  assert.equal(view.mode, 'scene');
  assert.equal(view.scene.title, 'Check');
  assert.deepEqual(view.scene.items, ['This', 'That']);
  const back = A.readStageMessage(A.stageMessage(view));
  assert.deepEqual(back, view, 'the scene survives the trip to the stage');
  assert.equal(A.stageView({ part, onStage: { kind: 'blank' }, scene: preview }).mode, 'blank');
  assert.equal(A.readStageMessage(A.stageMessage({ mode: 'blank', part: null })).mode, 'blank');
  const pinned = A.stageView({ part, onStage: { kind: 'check', id: 'k' }, checks: [{ id: 'k', state: 'open', prompt: 'Q?', choices: null }], scene: preview });
  assert.equal(pinned.mode, 'check', 'a pinned question wins over the scene');
  assert.equal(A.readStageMessage(A.stageMessage({ mode: 'scene', part: null, scene: { title: '' } })), null, 'a scene with no title is not shown');
  const long = A.sceneOf({ title: 'T', lines: Array(9).fill('x'.repeat(400)), items: Array(12).fill('i'), note: 5 });
  assert.equal(long.lines.length, 4);
  assert.equal(long.lines[0].length, 300);
  assert.equal(long.items.length, 8);
  assert.equal(long.note, null);
  assert.equal(A.stageView({ part: null, onStage: null, scene: preview, welcome: { cohort: 'C' } }).mode, 'welcome', 'before the show begins, the welcome');
});
