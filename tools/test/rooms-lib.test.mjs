import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/rooms-lib.js');
const { TURN } = require('../../assets/live-lib.js');

const order = ['bea', 'eve', 'fay'];
const N = TURN.length;

test('a group starts on the first step of the first person’s turn', () => {
  assert.deepEqual(R.start(order), { step: 0, presenter: 'bea' });
  assert.deepEqual(R.start([]), { step: 0, presenter: null });
});

test('next moves through the steps, then to the next person, then to done', () => {
  assert.deepEqual(R.advance(null, order, N), { step: 1, presenter: 'bea' });
  assert.deepEqual(R.advance({ step: 1, presenter: 'bea' }, order, N), { step: 2, presenter: 'bea' });
  assert.deepEqual(R.advance({ step: N - 1, presenter: 'bea' }, order, N), { step: 0, presenter: 'eve' });
  assert.deepEqual(R.advance({ step: N - 1, presenter: 'fay' }, order, N), { step: N, presenter: null });
  assert.ok(R.isDone({ step: N, presenter: null }, N));
  assert.deepEqual(R.advance({ step: N, presenter: null }, order, N), { step: N, presenter: null });
});

test('a presenter who left the group starts the order again', () => {
  assert.deepEqual(R.advance({ step: 3, presenter: 'gone' }, order, N), { step: 0, presenter: 'bea' });
  assert.deepEqual(R.advance({ step: 2, presenter: null }, order, N), { step: 1, presenter: 'bea' });
});

test('starting a step’s timer keeps the turn the group is in', () => {
  assert.deepEqual(R.atStep({ step: 0, presenter: 'eve' }, order, 3), { step: 3, presenter: 'eve' });
  assert.deepEqual(R.atStep(null, order, 2), { step: 2, presenter: 'bea' });
  assert.deepEqual(R.atStep({ step: 1, presenter: 'gone' }, order, 1), { step: 1, presenter: 'bea' });
});

test('a group’s place reads in words', () => {
  const nameOf = (id) => (id === 'eve' ? 'You' : id.toUpperCase());
  assert.equal(R.placeText(null, order, TURN, nameOf).text, 'Not started yet.');
  assert.equal(R.placeText({ step: 1, presenter: 'bea' }, order, TURN, nameOf).text, 'BEA’s turn, step 2 of 5: Show it, and one decision.');
  assert.equal(R.placeText({ step: 0, presenter: 'eve' }, order, TURN, nameOf).text, 'Your turn, step 1 of 5: Their question.');
  assert.equal(R.placeText({ step: N, presenter: null }, order, TURN, nameOf).text, 'Every turn is done.');
  assert.equal(R.placeText({ step: 2, presenter: 'gone' }, order, TURN, nameOf).text, 'Between turns, step 3 of 5: One clarifying question.');
});

test('a teacher sees every group, anyone else only their own, and asking never reorders', () => {
  const groups = [
    { id: 'g2', name: 'Trio B', meet_url: 'https://meet.google.com/bbb', group_members: [{ user_id: 'fay' }] },
    { id: 'g1', name: 'trio a', meet_url: 'http://not-safe', group_members: [{ user_id: 'bea' }, { user_id: 'eve' }] }
  ];
  const states = [{ group_id: 'g2', step: 2, presenter: 'fay', help_at: '2026-10-03T10:00:00Z' }];
  const teacher = R.board(groups, states, 'ben', true);
  assert.deepEqual(teacher.map((r) => r.id), ['g1', 'g2']);
  assert.equal(teacher[0].url, null);
  assert.equal(teacher[1].helpAt, '2026-10-03T10:00:00Z');
  assert.deepEqual(teacher[1].state, { step: 2, presenter: 'fay' });
  const student = R.board(groups, states, 'eve', false);
  assert.deepEqual(student.map((r) => [r.id, r.mine, r.state]), [['g1', true, null]]);
  assert.deepEqual(R.board(groups, states, 'fay', true).map((r) => r.id), ['g2', 'g1']);
});

test('how long ago a group asked', () => {
  const now = Date.parse('2026-10-03T10:05:30Z');
  assert.equal(R.agoText('2026-10-03T10:05:10Z', now), 'just now');
  assert.equal(R.agoText('2026-10-03T10:04:20Z', now), 'a minute ago');
  assert.equal(R.agoText('2026-10-03T09:55:00Z', now), '10 minutes ago');
});

test('the room line setup prints is read in either order', () => {
  assert.deepEqual(R.parseRoomLine('https://meet.google.com/abc-defg-hij | spaces/AbC_1-2'), { url: 'https://meet.google.com/abc-defg-hij', space: 'spaces/AbC_1-2' });
  assert.deepEqual(R.parseRoomLine('spaces/x https://meet.google.com/abc'), { url: 'https://meet.google.com/abc', space: 'spaces/x' });
  assert.deepEqual(R.parseRoomLine('https://meet.google.com/abc'), { url: 'https://meet.google.com/abc', space: null });
  assert.deepEqual(R.parseRoomLine('  '), { url: null, space: null });
  assert.ok(R.parseRoomLine('spaces/x').error);
  assert.ok(R.parseRoomLine('meet.google.com/abc').error);
  assert.ok(R.parseRoomLine('https://meet.google.com/abc spaces/bad!').error);
});

test('a group with nobody on the hub still moves through the steps', () => {
  assert.deepEqual(R.advance({ step: 0, presenter: null }, [], N), { step: 1, presenter: null });
  assert.deepEqual(R.advance({ step: N - 1, presenter: null }, [], N), { step: N, presenter: null });
  assert.deepEqual(R.advance(null, [], N), { step: 0, presenter: null });
});

test('a room runs the rooms scene’s own scenes, or the trio protocol without them (R6)', () => {
  const L = createRequire(import.meta.url)('../../assets/live-lib.js');
  const planned = L.roomTurn({ minutes: 25, config: { room_scenes: [{ title: 'Their question', minutes: 1 }, { title: 'Free talk', minutes: 2.5 }] } }, 3);
  assert.deepEqual(planned.map((s) => [s.key, s.name, s.seconds]), [['ask', 'Their question', 60], ['scene-1', 'Free talk', 150]]);
  assert.match(planned[0].what, /what they want to know/, 'a step named like the protocol keeps its line');
  assert.equal(planned[1].what, '');
  const fallback = L.roomTurn({ minutes: 24, config: {} }, 3);
  assert.deepEqual(fallback.map((s) => s.key), L.TURN.map((t) => t.key));
  assert.deepEqual(L.roomTurn(null, 3).map((s) => s.key), L.TURN.map((t) => t.key));
  const many = L.roomTurn({ config: { room_scenes: Array.from({ length: 25 }, (_, i) => ({ title: 'S' + i, minutes: 1 })) } }, 3);
  assert.equal(many.length, 20, 'never more steps than the database keeps');
});

test('inside a room, the person reading sees whose turn it is and what everyone else does (R6)', () => {
  const step = { name: 'One clarifying question', what: 'Partners ask one question to understand it.' };
  const nameOf = (id) => (id === 'me' ? 'You' : 'Bea');
  assert.deepEqual(R.roleText({ started: true, done: false, presenter: 'me' }, 'me', nameOf, step), { presenting: true, text: 'You are presenting.', job: step.what });
  assert.deepEqual(R.roleText({ started: true, done: false, presenter: 'bea' }, 'me', nameOf, step), { presenting: false, text: 'Bea is presenting, and you are the audience.', job: step.what });
  assert.equal(R.roleText({ started: false }, 'me', nameOf, step), null);
  assert.equal(R.roleText({ started: true, done: true, presenter: null }, 'me', nameOf, step), null);
  assert.equal(R.roleText({ started: true, done: false, presenter: null }, 'me', nameOf, step), null);
});

test('a room’s step clock counts down from when the database started it (R6)', () => {
  const at = Date.parse('2026-10-20T23:00:00Z');
  const row = { step_started_at: '2026-10-20T23:00:00Z' };
  assert.equal(R.stepLeft(row, 120, at + 30000), 90);
  assert.equal(R.stepLeft(row, 120, at + 999999), 0);
  assert.equal(R.stepLeft({ step_started_at: null }, 120, at), null, 'no clock before the database has one');
  assert.equal(R.stepLeft(row, 0, at), null);
  assert.equal(R.stepLeft(null, 120, at), null);
});
