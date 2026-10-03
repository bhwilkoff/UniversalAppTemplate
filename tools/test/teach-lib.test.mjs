// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/teach-lib.js');

test('a 5pm Denver session is 23:00 UTC in October (daylight time)', () => {
  assert.equal(lib.zonedToUtc('2026-10-20', '17:00', 'America/Denver').toISOString(), '2026-10-20T23:00:00.000Z');
});
test('the same wall time is 00:00 UTC the next day after daylight saving ends', () => {
  assert.equal(lib.zonedToUtc('2026-11-03', '17:00', 'America/Denver').toISOString(), '2026-11-04T00:00:00.000Z');
});
test('time zones east of UTC work too', () => {
  assert.equal(lib.zonedToUtc('2026-10-20', '09:30', 'Asia/Kolkata').toISOString(), '2026-10-20T04:00:00.000Z');
});
test('sessions start on the first chosen weekday on or after the first day', () => {
  // 2026-10-19 is a Monday; Tuesday sessions start the 20th.
  assert.deepEqual(lib.sessionDates('2026-10-19', 2, 3), ['2026-10-20', '2026-10-27', '2026-11-03']);
});
test('a first day that is already the session weekday counts', () => {
  assert.deepEqual(lib.sessionDates('2026-10-20', 2, 1), ['2026-10-20']);
});
test('session rows cross the daylight saving change at the same local time', () => {
  const rows = lib.sessionRows({ id: 'x', starts_on: '2026-10-19', session_weekday: 2, session_time: '17:00:00', time_zone: 'America/Denver', weeks: 3 });
  assert.deepEqual(rows.map(r => r.starts_at), ['2026-10-20T23:00:00.000Z', '2026-10-27T23:00:00.000Z', '2026-11-04T00:00:00.000Z']);
  assert.deepEqual(rows.map(r => r.number), [1, 2, 3]);
});
test('no session rows until the day, time, and first day are set', () => {
  assert.equal(lib.sessionRows({ starts_on: '2026-10-19', session_weekday: null, session_time: '17:00', time_zone: 'UTC', weeks: 5 }), null);
});
test('the Meet setup matches what tools/meet-events reads', () => {
  const out = lib.meetSetup({ slug: 'fall-2026', title: 'Fall 2026', starts_on: '2026-10-19', session_weekday: 2, session_time: '17:00:00', time_zone: 'America/Denver', session_minutes: 75, weeks: 5 }, ['a@example.org', 'b@example.org'], ['t@example.org']);
  assert.deepEqual(out, { id: 'fall-2026', title: 'Fall 2026', startDate: '2026-10-20', weekday: 'TU', startTime: '17:00', timeZone: 'America/Denver', minutes: 75, sessions: 5, members: 'a@example.org, b@example.org', teachers: 't@example.org', sessionUrl: 'https://humanshaped.org/live/?c=fall-2026' });
});

test('the feedback queue holds unanswered requests and questions, oldest first', () => {
  const shares = [
    { id: 'a', cohort_id: 'c1', kind: 'for-feedback', created_at: '2026-10-08T10:00:00Z', feedback: [] },
    { id: 'b', cohort_id: 'c1', kind: 'question', created_at: '2026-10-07T10:00:00Z' },
    { id: 'c', cohort_id: 'c1', kind: 'bring-back', created_at: '2026-10-06T10:00:00Z', feedback: [] },
    { id: 'd', cohort_id: 'c1', kind: 'for-feedback', created_at: '2026-10-05T10:00:00Z', feedback: [{ author_id: 'ben' }] },
    { id: 'e', cohort_id: 'c2', kind: 'for-feedback', created_at: '2026-10-04T10:00:00Z', feedback: [{ author_id: 'classmate' }] },
    { id: 'f', cohort_id: 'c2', kind: 'ai-review', created_at: '2026-10-03T10:00:00Z', feedback: [] }
  ];
  const teachers = { c1: ['ben'], c2: ['ben', 'ana'] };
  assert.deepEqual(lib.waitingForFeedback(shares, teachers).map((s) => s.id), ['e', 'b', 'a']);
});

test('feedback from any teacher of the cohort answers a request', () => {
  const shares = [{ id: 'a', cohort_id: 'c2', kind: 'for-feedback', created_at: '2026-10-08T10:00:00Z', feedback: [{ author_id: 'ana' }] }];
  assert.deepEqual(lib.waitingForFeedback(shares, { c2: ['ben', 'ana'] }), []);
});

const C = { session_weekday: 2, session_time: '17:00:00', session_minutes: 75, time_zone: 'America/Denver', starts_on: '2026-10-06' };
test('a schedule reads in the cohort time zone', () => {
  assert.equal(lib.scheduleText(C, 'America/Denver', 'en-US'), 'Tuesdays at 5:00 PM MDT, for 75 minutes.');
});
test('a schedule adds the reader clock time when it differs', () => {
  assert.equal(lib.scheduleText(C, 'America/New_York', 'en-US'), 'Tuesdays at 5:00 PM MDT, for 75 minutes (7:00 PM EDT where you are).');
});
test('a schedule names the reader day when the session crosses midnight for them', () => {
  assert.equal(lib.scheduleText(C, 'Europe/Berlin', 'en-US'), 'Tuesdays at 5:00 PM MDT, for 75 minutes (Wednesdays at 1:00 AM GMT+2 where you are).');
});
test('a schedule without a day or time says so', () => {
  assert.equal(lib.scheduleText({ session_minutes: 75, time_zone: 'UTC' }), 'The weekly session time is still to come.');
});
