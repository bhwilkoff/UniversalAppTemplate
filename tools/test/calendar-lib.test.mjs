import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/calendar-lib.js');

const S = { session_id: 's1', slug: 'fall', cohort_title: 'Fall', number: 1, title: 'A start', starts_at: '2026-11-11T20:00:00Z', minutes: 60, time_zone: 'America/Denver', guests: ['a@x.org', 'b@x.org'], want: 'h1' };

function google(routes) {
  const calls = [];
  const f = (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    const r = routes(url, init.method, calls.length);
    return Promise.resolve({ ok: r.status < 300, status: r.status, text: () => Promise.resolve(r.body ? JSON.stringify(r.body) : '') });
  };
  return { f, calls };
}
const run = (rows, g) => { const seen = []; return L.sync({ rows, token: 't', fetch: g.f, wait: () => Promise.resolve(), done: (s, x) => { seen.push(x); } }).then((tally) => ({ tally, seen })); };

test('an event says what to do, lasts the hour, and keeps guests from each other', () => {
  const r = L.resource(S, true);
  assert.equal(r.summary, 'Fall: Week 1: A start');
  assert.equal(r.end.dateTime, '2026-11-11T21:00:00.000Z');
  assert.equal(r.guestsCanSeeOtherGuests, false);
  assert.match(r.description, /session\/\?c=fall&s=1/);
  assert.match(r.description, /account\/\?join=fall/, 'the event is the invitation for someone not in yet');
  assert.equal(r.conferenceData.createRequest.requestId, 'hs-s1');
});

test('a change sends no conference, and only a guest leaving stays quiet', () => {
  const after = L.resource(S, false);
  assert.equal(after.conferenceData, undefined);
  const before = { summary: after.summary, start: after.start, end: after.end, attendees: [{ email: 'a@x.org' }, { email: 'b@x.org' }, { email: 'gone@x.org' }] };
  assert.equal(L.notice(before, after), 'none');
  assert.equal(L.notice({ ...before, attendees: [{ email: 'a@x.org' }] }, after), 'all');
  assert.equal(L.notice({ ...before, summary: 'Old' }, after), 'all');
});

test('a new session is made with a Meet link, and waits for one to arrive', async () => {
  const g = google((url, method, n) => method === 'POST' ? { status: 200, body: { id: 'e1' } } : n < 3 ? { status: 200, body: { id: 'e1' } } : { status: 200, body: { id: 'e1', hangoutLink: 'https://meet.google.com/abc-defg-hij' } });
  const { tally, seen } = await run([S], g);
  assert.deepEqual(tally, { done: 1, failed: 0 });
  assert.deepEqual(seen[0], { event_id: 'e1', meet_url: 'https://meet.google.com/abc-defg-hij' });
  assert.match(g.calls[0].url, /conferenceDataVersion=1&sendUpdates=all/);
});

test('an existing event is changed in place, and a deleted one made again', async () => {
  let g = google((url, method) => method === 'GET' ? { status: 200, body: { id: 'e1', summary: 'Fall: Week 1: A start', start: L.resource(S).start, end: L.resource(S).end, attendees: [{ email: 'a@x.org' }, { email: 'b@x.org' }] } } : { status: 200, body: { id: 'e1' } });
  await run([{ ...S, event_id: 'e1' }], g);
  assert.equal(g.calls[1].method, 'PATCH');
  assert.match(g.calls[1].url, /sendUpdates=none/);
  g = google((url, method) => method === 'GET' ? { status: 200, body: { id: 'e1', status: 'cancelled' } } : { status: 200, body: { id: 'e2', hangoutLink: 'https://meet.google.com/abc-defg-hij' } });
  const { seen } = await run([{ ...S, event_id: 'e1' }], g);
  assert.equal(seen[0].event_id, 'e2');
});

test('a finished cohort\'s event is removed, even if it is already gone', async () => {
  const g = google(() => ({ status: 404 }));
  const { seen } = await run([{ ...S, event_id: 'e1', want: 'cancel' }], g);
  assert.deepEqual(seen[0], { cancelled: true });
});

test('one failure is reported and the rest still go', async () => {
  const g = google((url, method, n) => n === 1 ? { status: 403, body: { error: { message: 'Nope' } } } : { status: 200, body: { id: 'e2', hangoutLink: 'https://meet.google.com/abc-defg-hij' } });
  const { tally, seen } = await run([S, { ...S, session_id: 's2' }], g);
  assert.deepEqual(tally, { done: 1, failed: 1 });
  assert.equal(seen[0].problem, 'Nope');
});

test('a cohort on its own schedule names each event as a session', () => {
  assert.equal(L.resource({ ...S, schedule: 'custom', number: 3, title: 'Listening' }, true).summary, 'Fall: Session 3: Listening');
  assert.equal(L.resource({ ...S, schedule: 'custom', number: 2, title: 'Session 2' }, true).summary, 'Fall: Session 2');
  assert.equal(L.resource({ ...S, number: 0, title: '' }, true).summary, 'Fall: Prep');
});

test('a session on your own goes on the calendar with no call', () => {
  const r = L.resource({ ...S, mode: 'own' }, true);
  assert.equal(r.conferenceData, undefined);
  assert.match(r.description, /^This session has no call\./);
});
