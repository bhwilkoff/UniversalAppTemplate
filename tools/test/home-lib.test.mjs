import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/home-lib.js');

const C = { id: 'c1', slug: 'fall', title: 'Fall', status: 'running', weeks: 3, session_minutes: 75, starts_on: '2026-10-20' };
const S = [
  { number: 1, starts_at: '2026-10-20T23:00:00Z' },
  { number: 2, starts_at: '2026-10-27T23:00:00Z' },
  { number: 3, starts_at: '2026-11-03T23:00:00Z' }
];

test('a cohort before its first session is "before", with week 1 next', () => {
  const n = lib.cohortNow(C, S, new Date('2026-10-15T00:00:00Z'));
  assert.equal(n.kind, 'before'); assert.equal(n.next.number, 1); assert.equal(n.week, 0);
});

test('during a session the cohort is live, and stays live until the session ends', () => {
  assert.equal(lib.cohortNow(C, S, new Date('2026-10-27T23:30:00Z')).kind, 'live');
  assert.equal(lib.cohortNow(C, S, new Date('2026-10-28T00:14:00Z')).kind, 'live');
  const after = lib.cohortNow(C, S, new Date('2026-10-28T00:16:00Z'));
  assert.equal(after.kind, 'between'); assert.equal(after.week, 2); assert.equal(after.next.number, 3);
});

test('finished, draft, over, and unscheduled cohorts say so', () => {
  assert.equal(lib.cohortNow({ ...C, status: 'finished' }, S, new Date('2026-10-27T23:30:00Z')).kind, 'finished');
  assert.equal(lib.cohortNow({ ...C, status: 'draft' }, S, new Date('2026-10-15T00:00:00Z')).kind, 'draft');
  assert.equal(lib.cohortNow(C, S, new Date('2026-12-01T00:00:00Z')).kind, 'over');
  assert.equal(lib.cohortNow(C, [], new Date('2026-12-01T00:00:00Z')).kind, 'unscheduled');
});

test('coming up lists live sessions first, then those within eight days, soonest first', () => {
  const now = new Date('2026-10-27T23:30:00Z');
  const a = { ...C, id: 'a', now: lib.cohortNow(C, S, now) };
  const later = S.map((s) => ({ ...s, starts_at: s.starts_at.replace('23:00', '20:00').replace('-10-27', '-10-29') }));
  const b = { ...C, id: 'b', now: lib.cohortNow(C, later, now) };
  const far = { ...C, id: 'far', now: lib.cohortNow(C, [{ number: 1, starts_at: '2026-11-20T00:00:00Z' }], now) };
  const up = lib.comingUp([b, far, a], now);
  assert.deepEqual(up.map((u) => u.cohort.id), ['a', 'b']);
  assert.equal(up[0].live, true);
});

test('times are said as today, tomorrow, a weekday, or a date, on the reader\'s clock', () => {
  const now = new Date('2026-10-14T15:00:00Z');
  assert.equal(lib.whenText('2026-10-14T23:00:00Z', now, 'America/Denver', 'en-US'), 'Today at 5:00 PM');
  assert.equal(lib.whenText('2026-10-15T23:00:00Z', now, 'America/Denver', 'en-US'), 'Tomorrow at 5:00 PM');
  assert.equal(lib.whenText('2026-10-17T23:00:00Z', now, 'America/Denver', 'en-US'), 'Saturday at 5:00 PM');
  assert.equal(lib.whenText('2026-10-27T23:00:00Z', now, 'America/Denver', 'en-US'), 'Tuesday, October 27, at 5:00 PM');
});

test('a cohort\'s state is a registry status and a short meta line', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  assert.deepEqual(lib.cohortState(C, lib.cohortNow(C, S, now)), { thing: 'cohort', state: 'running', meta: 'Week 2 of 3' });
});

test('answered polls come from this browser\'s hs-times keys only', () => {
  const t = 'a'.repeat(32);
  assert.deepEqual(lib.answeredPolls(['hs-theme', 'hs-times-' + t, 'hs-times-short', 'sb-x']), [t]);
});

test('waiting lines appear only for what is there, with a place to go', () => {
  assert.deepEqual(lib.waiting({}), []);
  const w = lib.waiting({ requests: 1, feedback: 3, notes: 0, videos: 2 });
  assert.deepEqual(w.map((x) => [x.title, x.count]), [['Requests to teach', 1], ['Feedback', 3], ['New videos in your exchanges', 2]]);
  assert.equal(w[1].href, '/teach/feedback/');
});

test('sections: everyone sees cohorts, exchanges, and their app; the rest only when there is something', () => {
  assert.deepEqual(lib.sections({}), ['cohorts', 'exchanges', 'app', 'more']);
  assert.deepEqual(lib.sections({ comingUp: [1], waiting: [1], teacher: true, lastMark: {} }),
    ['next', 'waiting', 'cohorts', 'exchanges', 'times', 'app', 'stages', 'more']);
  assert.deepEqual(lib.sections({ polls: [1] }), ['cohorts', 'exchanges', 'times', 'app', 'more']);
});

test('the last stage marked is the newest mark', () => {
  assert.equal(lib.lastStage([]), null);
  assert.deepEqual(lib.lastStage([{ stage: '01', updated_at: '2026-10-01' }, { stage: '02', updated_at: '2026-10-05' }]), { stage: '02', at: '2026-10-05' });
});

test('newerThan counts rows after a moment, or all of them with no moment', () => {
  const rows = [{ created_at: '2026-10-01' }, { created_at: '2026-10-10' }];
  assert.equal(lib.newerThan(rows, 'created_at', '2026-10-05'), 1);
  assert.equal(lib.newerThan(rows, 'created_at', null), 2);
});
