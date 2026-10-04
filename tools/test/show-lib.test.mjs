import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/show-lib.js');
const C = require('../../assets/cohort-lib.js');
const L = require('../../assets/live-lib.js');

test('the default run of show is COURSE.md’s parts, as scenes, filling the session', () => {
  const show = S.defaultShow(C.agenda(90), L.TURN);
  assert.deepEqual(show.map((s) => s.kind), ['talk', 'rooms', 'break', 'presenter', 'talk', 'reflection', 'question']);
  assert.equal(show[0].title, 'Arrive');
  assert.equal(S.total(show), 90);
  show.forEach((s) => assert.equal(S.problem(s), null, s.title));
  const rooms = show[1];
  assert.equal(rooms.config.room_scenes.length, L.TURN.length);
  assert.equal(rooms.config.room_scenes[0].title, 'Their question');
  // A short session drops the break, as the teaching guide says.
  assert.ok(!S.defaultShow(C.agenda(60), L.TURN).some((s) => s.kind === 'break'));
});

test('a scene is checked the way the database checks it', () => {
  const ok = { kind: 'talk', title: 'Arrive', minutes: 7, config: {} };
  assert.equal(S.problem(ok), null);
  assert.match(S.problem({ ...ok, kind: 'lecture' }), /kind/);
  assert.match(S.problem({ ...ok, title: '  ' }), /title/);
  assert.match(S.problem({ ...ok, minutes: 0 }), /minutes/);
  assert.match(S.problem({ ...ok, minutes: 2.5 }), /whole number/);
  assert.match(S.problem({ ...ok, config: { options: ['a', 'b'] } }), /does not use options/);
  assert.match(S.problem({ kind: 'question', title: 'Q', minutes: 2, config: { options: ['only'] } }), /two to eight/);
  assert.match(S.problem({ kind: 'rooms', title: 'R', minutes: 20, config: { room_scenes: [{ title: 'No minutes' }] } }), /minutes/);
});

test('typed lines become choices and room scenes, and back', () => {
  assert.deepEqual(S.optionsFromText(' Yes \n\nNo\n'), ['Yes', 'No']);
  const rs = S.roomScenesFromText('Their question, 2\nShow it 6 min\nWhat comes next');
  assert.deepEqual(rs, [{ title: 'Their question', minutes: 2 }, { title: 'Show it', minutes: 6 }, { title: 'What comes next', minutes: 1 }]);
  assert.equal(S.roomScenesToText(rs), 'Their question, 2\nShow it, 6\nWhat comes next, 1');
  assert.deepEqual(S.cleanConfig('talk', { prompt: 'x' }), {});
  assert.deepEqual(S.cleanConfig('question', { prompt: '  Which?  ', options: [] }), { prompt: 'Which?' });
});

test('moving a scene gives the new order, or nothing at the ends', () => {
  assert.deepEqual(S.moved(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(S.moved(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.equal(S.moved(['a', 'b', 'c'], 0, -1), null);
  assert.equal(S.moved(['a', 'b', 'c'], 2, 1), null);
  assert.deepEqual(S.startTimes([{ minutes: 7 }, { minutes: 25 }, { minutes: 3 }]), [0, 7, 32]);
});

test('the minutes are told against the session’s length', () => {
  assert.equal(S.fitText([{ minutes: 60 }], 90), '60 minutes planned, 30 to spare in a 90-minute session.');
  assert.equal(S.fitText([{ minutes: 95 }], 90), '95 minutes planned, 5 more than the 90-minute session.');
  assert.equal(S.fitText([{ minutes: 90 }], 90), '90 minutes planned, the whole session.');
});

test('copying starts from the latest earlier week that has a run of show', () => {
  const sessions = [{ id: 'w1', number: 1 }, { id: 'w2', number: 2 }, { id: 'w3', number: 3 }];
  assert.equal(S.copySource(sessions, sessions[2], ['w1']).id, 'w1');
  assert.equal(S.copySource(sessions, sessions[2], ['w1', 'w2']).id, 'w2');
  assert.equal(S.copySource(sessions, sessions[0], ['w2']), null);
});

test('the preview shows what the main stage will', () => {
  const q = S.stagePreview({ kind: 'question', title: 'Check', minutes: 3, config: { prompt: 'Which one?', options: ['This', 'That'] } });
  assert.equal(q.eyebrow, 'Question');
  assert.deepEqual(q.lines, ['Which one?']);
  assert.deepEqual(q.items, ['This', 'That']);
  const r = S.stagePreview({ kind: 'rooms', title: 'Rooms', minutes: 25, config: { room_scenes: [{ title: 'Their question', minutes: 2 }] } });
  assert.match(r.note, /25 minutes/);
  assert.deepEqual(r.items, ['Their question, 2 min']);
});

test('the shared board is the design stage', () => {
  assert.equal(S.kind('design').name, 'Design stage');
  assert.equal(S.kind('board'), null);
  assert.equal(S.problem({ kind: 'design', title: 'Sketch the screen', minutes: 10, config: { template: 'Phone screen' } }), null);
  assert.match(S.stagePreview({ kind: 'design', title: 'Sketch', minutes: 10, config: {} }).note, /blank/);
});
