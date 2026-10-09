import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/times-lib.js');

const poll = {
  time_zone: 'America/Denver', days: [1, 3], first_minute: 17 * 60, last_minute: 20 * 60,
  step_minutes: 60, starts_on: '2026-10-19'
};

test('a poll offers each step from the first time to the last, on each day', () => {
  assert.deepEqual(T.slotsOf(poll), [2460, 2520, 2580, 2640, 5340, 5400, 5460, 5520]);
});

test('in its own zone, the grid is the days and times the teacher chose', () => {
  const g = T.gridFor(poll, 'America/Denver');
  assert.deepEqual(g.days, [1, 3]);
  assert.deepEqual(g.minutes, [1020, 1080, 1140, 1200]);
  assert.equal(g.slotAt(1, 1080), 2520);
  assert.equal(g.slotAt(2, 1080), null);
});

test('in New York the same times read two hours later', () => {
  const g = T.gridFor(poll, 'America/New_York');
  assert.deepEqual(g.minutes, [1140, 1200, 1260, 1320]);
  assert.equal(g.slotAt(1, 1140), 2460);
});

test('in London, late Denver evenings cross into the next morning', () => {
  // October 19, 2026: Denver is UTC-6, London UTC+1, seven hours apart.
  const g = T.gridFor(poll, 'Europe/London');
  assert.deepEqual(g.days, [2, 4]);
  assert.equal(g.slotAt(2, 0), 2460);
  assert.equal(g.slotAt(2, 180), 2640);
});

test('a half-hour zone gives half-hour rows', () => {
  const g = T.gridFor(poll, 'Asia/Kolkata');
  assert.ok(g.minutes.every((m) => m % 60 === 30));
});

test('the week the cohort begins decides daylight saving', () => {
  // Denver leaves daylight time on November 1, 2026; London on October 25.
  const before = T.placeIn({ ...poll, starts_on: '2026-10-19' }, 2460, 'Europe/London');
  const after = T.placeIn({ ...poll, starts_on: '2026-11-09' }, 2460, 'Europe/London');
  assert.equal(before.minute, 0);
  assert.equal(after.minute, 0);
  const between = T.placeIn({ ...poll, starts_on: '2026-10-26' }, 2460, 'Europe/London');
  assert.equal(between.minute, 23 * 60);
  assert.equal(between.day, 1);
});

test('without a start date, the current week is used', () => {
  const at = T.placeIn({ ...poll, starts_on: null }, 2520, 'America/Denver', new Date(2026, 6, 15));
  assert.deepEqual([at.day, at.minute], [1, 1080]);
});

test('a time reads as a day and a clock time', () => {
  assert.equal(T.slotText(poll, 2520, 'America/Denver', 'en-US'), 'Monday at 6:00 PM');
  assert.equal(T.slotText(poll, 2640, 'Europe/London', 'en-US'), 'Tuesday at 3:00 AM');
});

test('the link carries the token, and optionally an answer to change', () => {
  const tok = '0123456789abcdef0123456789abcdef';
  const id = '11111111-2222-3333-4444-555555555555';
  assert.deepEqual(T.parseHash('#' + tok), { token: tok, answer: null });
  assert.deepEqual(T.parseHash('#' + tok + '~' + id + '~' + id), { token: tok, answer: { id, secret: id } });
  assert.equal(T.parseHash('#nope'), null);
  assert.equal(T.parseHash(''), null);
});

test('a teacher\'s form is checked before it is saved', () => {
  const ok = { title: ' Fall ', days: ['3', '1'], from: '17:00', to: '20:00', step: '60', time_zone: 'America/Denver' };
  assert.deepEqual(T.checkPoll(ok).row.days, [1, 3]);
  assert.equal(T.checkPoll(ok).row.title, 'Fall');
  assert.equal(T.checkPoll(ok).row.first_minute, 1020);
  assert.match(T.checkPoll({ ...ok, title: '' }).error, /name/);
  assert.match(T.checkPoll({ ...ok, days: [] }).error, /day/);
  assert.match(T.checkPoll({ ...ok, to: '16:00' }).error, /before/);
  assert.match(T.checkPoll({ ...ok, to: '20:30' }).error, /steps/);
  assert.match(T.checkPoll({ ...ok, time_zone: '' }).error, /time zone/);
});

test('the times most can make come first, and works outranks if need be', () => {
  const tally = T.tallyOf([
    { works: [2460, 2520], if_need_be: [5340] },
    { works: [2520], if_need_be: [2460] },
    { works: [5340], if_need_be: [] }
  ]);
  assert.equal(tally.answers, 3);
  assert.deepEqual(T.bestTimes(tally, 3).map((b) => b.slot), [2520, 2460, 5340]);
});

test('a calendar check spans the first four weeks, with a day to spare on each side', () => {
  const span = T.checkSpan(poll);
  // Week of October 18 (Sunday) to the week of November 15, in Denver.
  assert.equal(span.timeMin, '2026-10-17T06:00:00.000Z');
  assert.equal(span.timeMax, '2026-11-16T07:00:00.000Z');
});

test('a time is busy in each week a calendar block overlaps the whole session', () => {
  // Monday October 19, 6 PM Denver = 00:00 UTC Tuesday; a 75-minute session.
  const busy = [
    { start: '2026-10-20T01:00:00Z', end: '2026-10-20T02:00:00Z' }, // 7 PM Monday Oct 19
    { start: '2026-10-27T00:30:00Z', end: '2026-10-27T00:45:00Z' }, // 6:30 PM Monday Oct 26
    { start: '2026-11-03T02:00:00Z', end: '2026-11-03T03:00:00Z' } // 7 PM Monday Nov 2, after the change to standard time
  ];
  const r = T.busyWeeks({ ...poll, session_minutes: 75 }, busy);
  assert.equal(r.weeks, 4);
  assert.equal(r.busy[2460], 0); // 5 PM ends at 6:15, before any block
  assert.equal(r.busy[2520], 3); // 6 PM to 7:15 overlaps all three blocks
  assert.equal(r.busy[2580], 2); // 7 PM: Oct 19, and Nov 2 (7 PM MST = 02:00 UTC)
  assert.equal(r.busy[5340], 0);
});
