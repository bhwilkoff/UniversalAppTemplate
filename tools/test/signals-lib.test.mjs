import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/signals-lib.js');

const T0 = Date.parse('2026-10-08T17:00:00Z');
const min = (n) => n * 60000;
const iso = (t) => new Date(t).toISOString();
let n = 0;
const sig = (kind, at, extra = {}) => ({ id: 's' + (++n), kind, created_at: iso(at), cleared_at: null, ends_at: null, body: null, people: null, ...extra });

test('a late joiner sees the same clock as everyone else, in any time zone', () => {
  const rooms = sig('rooms', T0, { ends_at: '2026-10-08T11:25:00-06:00' }); // 17:25 UTC, written in Denver time
  const early = lib.countdown(rooms.ends_at, T0 + min(1));
  const late = lib.countdown(rooms.ends_at, new Date(T0 + min(20)));
  assert.equal(early.text, '24:00 left');
  assert.equal(late.text, '5:00 left');
  assert.equal(late.left, 300);
  assert.equal(lib.countdown('2026-10-08T17:25:00+00:00', T0 + min(20)).left, 300);
});

test('the two-minute warning, and time up', () => {
  const end = iso(T0 + min(10));
  assert.equal(lib.countdown(end, T0 + min(7)).warn, false);
  assert.equal(lib.countdown(end, T0 + min(8)).warn, true);
  assert.equal(lib.countdown(end, T0 + min(9) + 59500).text, '0:01 left');
  const up = lib.countdown(end, T0 + min(11));
  assert.deepEqual([up.done, up.warn, up.text, up.left], [true, false, 'Time is up', 0]);
  assert.equal(lib.countdown(null, T0), null);
});

test('reduced motion gets whole minutes rather than a ticking clock', () => {
  const end = iso(T0 + min(10));
  assert.equal(lib.countdown(end, T0 + 1000, true).text, 'About 10 minutes left');
  assert.equal(lib.countdown(end, T0 + min(9) + 30000, true).text, 'Less than a minute left');
  assert.equal(lib.nextTick({ rooms: { ends_at: end } }, T0, true), 15000);
  assert.equal(lib.nextTick({ rooms: { ends_at: end } }, T0, false), 1000);
  assert.equal(lib.nextTick({ rooms: { ends_at: end } }, T0 + min(10) - 3000, true), 3000);
  assert.equal(lib.nextTick({ card: { ends_at: null } }, T0, false), 30000);
});

test('the clock reads plainly past an hour', () => {
  assert.equal(lib.clock(65), '1:05');
  assert.equal(lib.clock(3725), '1:02:05');
  assert.equal(lib.clock(-4), '0:00');
});

test('rooms show until the teacher calls everyone back', () => {
  const rooms = sig('rooms', T0, { ends_at: iso(T0 + min(25)) });
  let st = lib.state([rooms], T0 + min(5));
  assert.equal(st.rooms, rooms);
  assert.equal(lib.where(st, T0 + min(5)).kind, 'rooms');
  const back = sig('together', T0 + min(12));
  st = lib.state([rooms, back], T0 + min(13));
  assert.equal(st.rooms, null);
  assert.equal(st.together, back);
  assert.deepEqual([lib.where(st, T0 + min(13)).kind, lib.where(st, T0 + min(13)).because], ['back', 'called']);
});

test('when the rooms’ time runs out, the banner says to come back, then goes', () => {
  const rooms = sig('rooms', T0, { ends_at: iso(T0 + min(25)) });
  const w = lib.where(lib.state([rooms], T0 + min(26)), T0 + min(26));
  assert.deepEqual([w.kind, w.because], ['back', 'time']);
  assert.equal(lib.where(lib.state([rooms], T0 + min(36)), T0 + min(36)), null);
});

test('rooms with no return time stay until called back, and nothing outlives four hours', () => {
  const rooms = sig('rooms', T0);
  const w = lib.where(lib.state([rooms], T0 + min(90)), T0 + min(90));
  assert.equal(w.kind, 'rooms');
  assert.equal(w.clock, null);
  assert.equal(lib.state([rooms], T0 + min(241)).rooms, null);
  const rec = sig('recording', T0);
  assert.equal(lib.state([rec], T0 + min(200)).recording, rec);
  assert.equal(lib.state([rec], T0 + min(250)).recording, null);
});

test('sending people to their rooms again replaces the call back', () => {
  const back = sig('together', T0);
  const again = sig('rooms', T0 + min(3), { ends_at: iso(T0 + min(13)) });
  const st = lib.state([back, again], T0 + min(4));
  assert.equal(st.together, null);
  assert.equal(st.rooms, again);
});

test('a call back that was taken down still ends the rooms before it', () => {
  const rooms = sig('rooms', T0);
  const back = sig('together', T0 + min(5), { cleared_at: iso(T0 + min(6)) });
  const st = lib.state([rooms, back], T0 + min(7));
  assert.equal(st.rooms, null);
  assert.equal(st.together, null);
  assert.equal(lib.state([sig('together', T0)], T0 + min(11)).together, null);
});

test('the newest card shows, and a cleared one does not', () => {
  const a = sig('card', T0, { body: 'First' });
  const b = sig('card', T0 + min(1), { body: 'Second' });
  assert.equal(lib.state([a, b], T0 + min(2)).card, b);
  b.cleared_at = iso(T0 + min(3));
  assert.equal(lib.state([a, b], T0 + min(4)).card, a);
  assert.equal(lib.state([sig('card', T0 + min(5), { body: 'From a fast clock' })], T0).card.body, 'From a fast clock');
});

test('a shared screen shows a card first, then where people are, then the stage', () => {
  const stage = sig('stage', T0, { people: ['u1'] });
  const rooms = sig('rooms', T0 + min(1), { ends_at: iso(T0 + min(10)) });
  const card = sig('card', T0 + min(2), { body: 'Five minutes', ends_at: iso(T0 + min(7)) });
  const now = T0 + min(3);
  assert.equal(lib.screen(lib.state([stage, rooms, card], now), now).kind, 'card');
  assert.equal(lib.screen(lib.state([stage, rooms, card], now), now).clock.text, '4:00 left');
  assert.equal(lib.screen(lib.state([stage, rooms], now), now).kind, 'rooms');
  assert.equal(lib.screen(lib.state([stage], now), now).kind, 'stage');
  assert.equal(lib.screen(lib.state([], now), now), null);
});

test('your own group’s room comes first, and a student sees only theirs', () => {
  const groups = [
    { id: 'a', name: 'Trio A', meet_url: 'https://meet.google.com/aaa', group_members: [{ user_id: 'bea' }] },
    { id: 'c', name: 'Trio C', meet_url: 'http://not-safe', group_members: [{ user_id: 'ben' }] },
    { id: 'b', name: 'Trio B', meet_url: null, group_members: [{ user_id: 'fay' }] }
  ];
  assert.deepEqual(lib.roomsFor(groups, 'bea', false).map((r) => r.id), ['a']);
  assert.deepEqual(lib.roomsFor(groups, 'zed', false), []);
  const teacher = lib.roomsFor(groups, 'ben', true);
  assert.deepEqual(teacher.map((r) => r.id), ['c', 'a', 'b']);
  assert.equal(teacher[0].url, null, 'only https links are offered');
  assert.equal(teacher[0].mine, true);
});

test('who is on stage, in plain words with an Oxford comma', () => {
  const names = { u1: 'Bea', u2: 'Cal', u3: 'Eve' };
  const nameOf = (id) => names[id] || 'You';
  assert.equal(lib.stageText({ people: ['u1'] }, nameOf), 'Bea is presenting.');
  assert.equal(lib.stageText({ people: ['u1', 'u2'] }, nameOf), 'Bea is presenting, and Cal is responding.');
  assert.equal(lib.stageText({ people: ['u1', 'u2', 'u3'] }, nameOf), 'Bea is presenting, and Cal and Eve are responding.');
  assert.equal(lib.stageText({ people: ['me', 'u2'] }, nameOf), 'You are presenting, and Cal is responding.');
  assert.equal(lib.stageText({ people: ['u1', 'me'] }, nameOf), 'Bea is presenting, and you are responding.');
  assert.equal(lib.list(['A', 'B', 'C']), 'A, B, and C');
  assert.deepEqual(lib.stageRoles({ people: ['u1', 'u2'] }).map((r) => r.role), ['presenting', 'responding']);
});

test('choosing the stage drops blanks and repeats, and holds three at most', () => {
  assert.deepEqual(lib.stagePeople(['u1', '', 'u1', 'u2']), { people: ['u1', 'u2'] });
  assert.ok(lib.stagePeople(['', null]).error);
  assert.ok(lib.stagePeople(['a', 'b', 'c', 'd']).error);
});

test('a card needs words, and its countdown is optional and whole minutes', () => {
  assert.deepEqual(lib.parseCard('  You have 5 minutes\n of worktime left ', ''), { body: 'You have 5 minutes of worktime left', minutes: null });
  assert.deepEqual(lib.parseCard('Break', '10'), { body: 'Break', minutes: 10 });
  assert.ok(lib.parseCard('   ', '5').error);
  assert.ok(lib.parseCard('x'.repeat(201), '').error);
  assert.ok(lib.parseCard('Break', '2.5').error);
  assert.ok(lib.parseCard('Break', '0').error);
  assert.ok(lib.parseMinutes('241').error);
  assert.deepEqual(lib.parseMinutes(' 25 '), { minutes: 25 });
});

test('end times are stored as instants, and five more minutes counts from now once time is up', () => {
  assert.equal(lib.endsAt(25, T0), '2026-10-08T17:25:00.000Z');
  assert.equal(lib.endsAt(null, T0), null);
  assert.equal(lib.extend(iso(T0 + min(2)), 5, T0), iso(T0 + min(7)));
  assert.equal(lib.extend(iso(T0 - min(2)), 5, T0), iso(T0 + min(5)));
});

test('saved cards come first in their own order, then defaults not already saved', () => {
  const saved = [
    { id: 'p2', body: 'Back in five', minutes: 5, created_at: '2026-10-02T00:00:00Z' },
    { id: 'p1', body: 'you have 5 minutes of worktime  left', minutes: 5, created_at: '2026-10-01T00:00:00Z' }
  ];
  const list = lib.presets(saved);
  assert.deepEqual(list.map((p) => p.id), ['p1', 'p2', null]);
  assert.equal(list[2].saved, false);
  assert.equal(list.length, 1 + lib.DEFAULT_CARDS.length);
  assert.equal(lib.presets([]).length, lib.DEFAULT_CARDS.length);
  assert.ok(lib.isSaved(saved, 'Back in   FIVE'));
  assert.ok(!lib.isSaved(saved, 'Back in six'));
  assert.equal(lib.presetLabel({ body: 'Break', minutes: 10 }), 'Break (10 min)');
  assert.equal(lib.presetLabel({ body: 'Hello', minutes: null }), 'Hello');
});

test('the live page and the card page read the same session', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  assert.equal(lib.sessionFor({ live: true, next: b, current: a }), b);
  assert.equal(lib.sessionFor({ live: false, next: b, current: a }), b);
  assert.equal(lib.sessionFor({ live: false, next: null, current: a }), a);
  assert.equal(lib.sessionFor({ live: false, next: null, current: null }), null);
});

test('measuring talk shows until the teacher clears it, like recording', () => {
  const talk = sig('talk', T0);
  assert.equal(lib.state([talk], T0 + min(5)).talk, talk);
  assert.equal(lib.state([{ ...talk, cleared_at: iso(T0 + min(6)) }], T0 + min(7)).talk, null);
  assert.equal(lib.state([talk], T0 + min(5)).recording, null);
});

test('the teacher types the percent the recorder showed, and the database keeps a share', () => {
  assert.deepEqual(lib.parseShare('41'), { share: 0.41 });
  assert.deepEqual(lib.parseShare(' 41 % '), { share: 0.41 });
  assert.deepEqual(lib.parseShare('37.5 percent'), { share: 0.375 });
  assert.deepEqual(lib.parseShare('0'), { share: 0 });
  assert.deepEqual(lib.parseShare('100'), { share: 1 });
  assert.ok(lib.parseShare('').error);
  assert.ok(lib.parseShare('120').error);
  assert.ok(lib.parseShare('-3').error);
  assert.ok(lib.parseShare('forty').error);
});

test('the saved share reads as a whole percent, about the teacher only', () => {
  assert.equal(lib.percent('0.380'), 38);
  assert.equal(lib.percent(null), null);
  assert.match(lib.shareText(0.41, false), /^Your teacher talked 41 percent/);
  assert.match(lib.shareText(0.41, true), /^You talked 41 percent/);
  assert.doesNotMatch(lib.shareText(0.41, false), /—/);
  assert.equal(lib.shareText(null, false), '');
});
