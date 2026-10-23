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
  const rows = lib.sessionRows({ id: 'x', starts_on: '2026-10-19', session_weekday: 2, session_time: '17:00:00', time_zone: 'America/Denver', weeks: 2 });
  assert.deepEqual(rows.map(r => r.starts_at), ['2026-10-20T23:00:00.000Z', '2026-10-27T23:00:00.000Z', '2026-11-04T00:00:00.000Z']);
  assert.deepEqual(rows.map(r => r.number), [0, 1, 2]);
  assert.deepEqual(rows.map(r => r.title), ['Prep', 'Week 1', 'Week 2']);
});
test('no session rows until the day, time, and first day are set', () => {
  assert.equal(lib.sessionRows({ starts_on: '2026-10-19', session_weekday: null, session_time: '17:00', time_zone: 'UTC', weeks: 5 }), null);
});
test('the Meet setup matches what tools/meet-events reads', () => {
  const out = lib.meetSetup({ slug: 'fall-2026', title: 'Fall 2026', starts_on: '2026-10-19', session_weekday: 2, session_time: '17:00:00', time_zone: 'America/Denver', session_minutes: 75, weeks: 5 }, ['a@example.org', 'b@example.org'], ['t@example.org']);
  assert.deepEqual(out, { id: 'fall-2026', title: 'Fall 2026', startDate: '2026-10-20', weekday: 'TU', startTime: '17:00', timeZone: 'America/Denver', minutes: 75, sessions: 5, members: 'a@example.org, b@example.org', teachers: 't@example.org', sessionUrl: 'https://humanshaped.org/session/?c=fall-2026' });
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

const draft = { slug: 'spring', status: 'draft', starts_on: null, session_weekday: null, session_time: null, github_repo: null, github_team: null };
const keysDone = (steps) => steps.filter((s) => s.done).map((s) => s.key);
test('a new draft cohort has every setup step still to do, and only what a leader decides', () => {
  const steps = lib.cohortSetupSteps(draft, [], null);
  assert.deepEqual(steps.map((s) => s.key), ['schedule', 'sessions', 'repo', 'open', 'agent']);
  assert.deepEqual(keysDone(steps), []);
  assert.equal(steps.some((s) => /host|Meet links|Rehearse/i.test(s.label)), false);
});
test('the conversation step appears once the repository and team are named, and checks off for a member', () => {
  const c = { ...draft, status: 'open', github_repo: 'humanshaped/cohort-spring', github_team: 'cohort-spring' };
  const invited = lib.cohortSetupSteps(c, [], { state: 'invited' });
  const talk = invited.find((s) => s.key === 'talk');
  assert.equal(talk.done, false);
  assert.equal(talk.href, '/cohort/?c=spring&t=talk');
  assert.deepEqual(keysDone(invited), ['repo', 'open']);
  assert.equal(lib.cohortSetupSteps(c, [], { state: 'member' }).find((s) => s.key === 'talk').done, true);
});
test('once there are sessions, reading the first one is offered, and never keeps the card open', () => {
  const c = { ...draft, status: 'open' };
  const plan = lib.cohortSetupSteps(c, [{ number: 1 }, { number: 0 }], null).find((s) => s.key === 'plan');
  assert.equal(plan.label, 'Read the prep session’s plan');
  assert.equal(plan.href, '/session/?c=spring&s=0');
  assert.equal(plan.optional, true);
});
test('the calendar is a note beside the sessions, never a step', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const ahead = (extra) => [{ starts_at: '2026-10-28T19:00:00Z', ...extra }, { starts_at: '2026-10-01T19:00:00Z' }];
  assert.match(lib.calendarNote({ status: 'draft' }, ahead({}), now), /once the cohort is open/);
  assert.match(lib.calendarNote({ status: 'open' }, ahead({}), now), /within the hour/);
  assert.match(lib.calendarNote({ status: 'open' }, ahead({ calendar_event_id: 'e1' }), now), /^On everyone’s calendar/);
  assert.equal(lib.calendarNote({ status: 'open' }, ahead({ calendar_error: 'Quota.' }), now), 'The calendar said: Quota.');
  assert.equal(lib.calendarNote({ status: 'open' }, [{ starts_at: '2026-10-01T19:00:00Z' }], now), null);
});
test('connecting an agent is optional, so it never keeps the card open', () => {
  const a = lib.cohortSetupSteps(draft, [], null).find((s) => s.key === 'agent');
  assert.equal(a.optional, true);
  assert.equal(a.href, '/connect/');
});
test('a person sees the form, their waiting request, or the answer', () => {
  assert.equal(lib.requestState(true, null), 'teacher');
  assert.equal(lib.requestState(false, null), 'ask');
  assert.equal(lib.requestState(false, { state: 'waiting' }), 'waiting');
  assert.equal(lib.requestState(false, { state: 'declined' }), 'declined');
});
test('requests waiting for an answer come oldest first, and decided ones drop out', () => {
  const r = [
    { user_id: 'b', state: 'waiting', created_at: '2026-10-05T00:00:00Z' },
    { user_id: 'a', state: 'waiting', created_at: '2026-10-04T00:00:00Z' },
    { user_id: 'c', state: 'declined', created_at: '2026-10-01T00:00:00Z' }
  ];
  assert.deepEqual(lib.waitingRequests(r).map((x) => x.user_id), ['a', 'b']);
});

// The teaching tools (M12).
test('the Meet setup asks for one room per group, by a key that survives a rename', () => {
  const out = lib.meetSetup({ slug: 'f', title: 'F', starts_on: '2026-10-19', session_weekday: 2, session_time: '17:00:00', time_zone: 'America/Denver', session_minutes: 75, weeks: 5 }, [], [],
    [{ id: '1a2b3c4d-0000-4000-8000-000000000000', name: 'Trio A', emails: ['a@example.org', 'b@example.org'] }]);
  assert.deepEqual(out.groups, [{ key: 'g-1a2b3c4d', name: 'Trio A', members: 'a@example.org, b@example.org' }]);
});
test('the last session is the one that started most recently', () => {
  const s = [{ number: 1, starts_at: '2026-10-20T23:00:00Z' }, { number: 2, starts_at: '2026-10-27T23:00:00Z' }];
  assert.equal(lib.lastStarted(s, new Date('2026-10-28T00:00:00Z')).number, 2);
  assert.equal(lib.lastStarted(s, new Date('2026-10-01T00:00:00Z')), null);
});
test('not seen this week: no share, queue item, answer, or feedback since the last session, in name order', () => {
  const p = (id, name, extra) => ({ user_id: id, role: 'student', status: 'enrolled', profiles: { github_login: name }, ...extra });
  const people = [p('z', 'zed'), p('a', 'amy'), p('b', 'bo'), p('l', 'lee', { status: 'left' }), p('m', 'mo', { role: 'mentor' }), p('c', 'cy')];
  const since = '2026-10-20T23:00:00Z';
  const activity = [
    { user_id: 'b', at: '2026-10-21T10:00:00Z' },
    { user_id: 'c', at: '2026-10-19T10:00:00Z' },
    { user_id: 'm', at: '2026-10-20T23:30:00Z' }
  ];
  assert.deepEqual(lib.notSeen(people, since, activity).map(x => x.user_id), ['a', 'c', 'z']);
  assert.deepEqual(lib.notSeen(people, null, []), []);
});
test("a session's checks come back with each answer in the person's words", () => {
  const checks = [{ id: 'k2', prompt: 'Muddy?', choices: null, created_at: '2' }, { id: 'k1', prompt: 'Which?', choices: ['A', 'B'], created_at: '1' }];
  const answers = [{ check_id: 'k1', user_id: 'u', choice: 2, updated_at: '1' }, { check_id: 'k2', user_id: 'u', body: 'Pipelines', updated_at: '1' }];
  const out = lib.checkAnswers(checks, answers, (id) => id.toUpperCase());
  assert.deepEqual(out.map(k => k.prompt), ['Which?', 'Muddy?']);
  assert.deepEqual(out[0].answers, [{ user_id: 'u', name: 'U', text: 'B' }]);
  assert.equal(out[1].answers[0].text, 'Pipelines');
});

test('the repository step asks the hub to make it', () => {
  assert.equal(lib.cohortSetupSteps(draft, [], null).find((s) => s.key === 'repo').action, 'provision');
});

test('a short name for the address comes from the title, the way the database allows', () => {
  assert.equal(lib.slugFrom('Fall 2026: Evenings!'), 'fall-2026-evenings');
  assert.equal(lib.slugFrom('  Café & Code  '), 'cafe-and-code');
  assert.equal(lib.slugFrom('---'), '');
  assert.equal(lib.slugFrom('x'.repeat(80)).length, 60);
  assert.equal(lib.slugProblem('fall-2026'), null);
  assert.match(lib.slugProblem('Fall 2026'), /lowercase letters/);
  assert.match(lib.slugProblem(''), /short name/);
});

test('the line under a cohort on /cohorts/ says when it begins, how long, and how many', () => {
  assert.equal(lib.openingLine({ starts_on: '2026-11-02', weeks: 5, capacity: 12 }, 'en-US'), 'Begins November 2, 2026, for 5 weeks, with room for 12 people.');
  assert.equal(lib.openingLine({ starts_on: null, weeks: 5, capacity: null }, 'en-US'), 'Dates to come, for 5 weeks.');
});
