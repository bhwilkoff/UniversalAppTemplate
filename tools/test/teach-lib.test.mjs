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
  assert.deepEqual(out, { id: 'fall-2026', title: 'Fall 2026', startDate: '2026-10-20', weekday: 'TU', startTime: '17:00', timeZone: 'America/Denver', minutes: 75, sessions: 5, members: 'a@example.org, b@example.org', teachers: 't@example.org', sessionUrl: 'https://humanshaped.org/live/fall-2026/' });
});
