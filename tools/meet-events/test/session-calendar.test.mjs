// One calendar event per session, and the invitation email (JOURNEYS.md,
// Ben's decisions of October 23, 2026): the pure parts of Code.gs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({ console });
vm.runInContext(source, gs, { filename: 'Code.gs' });
const plain = (x) => JSON.parse(JSON.stringify(x));

const prep = {
  session_id: '11111111-2222-3333-4444-555555555555', slug: 'minerva', cohort_title: 'Minerva research team',
  number: 0, title: 'Prep', starts_at: '2026-10-28T19:00:00+00:00', minutes: 60, time_zone: 'America/Denver',
  guests: ['a@example.org', 'ben@example.org'], want: 'abc'
};

test('a session is named Prep or Week N, with a leader title after it', () => {
  assert.equal(gs.sessionName(prep), 'Prep');
  assert.equal(gs.sessionName({ number: 2, title: 'Week 2' }), 'Week 2');
  assert.equal(gs.sessionName({ number: 1, title: 'Finding a problem' }), 'Week 1: Finding a problem');
});

test('each session is its own event, with its own Meet link asked for, its page, and its guests', () => {
  const r = plain(gs.sessionEventResource(prep, 'https://drive.google.com/x', true));
  assert.equal(r.summary, 'Minerva research team: Prep');
  assert.equal(r.start.dateTime, '2026-10-28T19:00:00.000Z');
  assert.equal(r.end.dateTime, '2026-10-28T20:00:00.000Z');
  assert.equal(r.start.timeZone, 'America/Denver');
  assert.equal(r.recurrence, undefined);
  assert.deepEqual(r.attendees, [{ email: 'a@example.org' }, { email: 'ben@example.org' }]);
  assert.equal(r.guestsCanSeeOtherGuests, false);
  assert.deepEqual(r.conferenceData, { createRequest: { requestId: 'hs-' + prep.session_id, conferenceSolutionKey: { type: 'hangoutsMeet' } } });
  assert.match(r.description, /https:\/\/humanshaped\.org\/session\/\?c=minerva&s=0/);
  assert.match(r.description, /drive\.google\.com\/x/);
});

test('a session that already has a Meet link keeps it on its new event', () => {
  const r = plain(gs.sessionEventResource(Object.assign({}, prep, { meet_url: 'https://meet.google.com/irt-ynum-rnw' }), null, true));
  assert.equal(r.conferenceData.createRequest, undefined);
  assert.equal(r.conferenceData.conferenceId, 'irt-ynum-rnw');
  assert.equal(r.conferenceData.entryPoints[0].uri, 'https://meet.google.com/irt-ynum-rnw');
  assert.equal(gs.meetCodeOf('https://meet.google.com/irt-ynum-rnw?x=1'), null);
});

test('changing an event keeps its Meet link', () => {
  assert.equal(plain(gs.sessionEventResource(prep, null, false)).conferenceData, undefined);
});

test('guests hear about a change when it moves, or when they are new, and not when someone leaves', () => {
  const after = plain(gs.sessionEventResource(prep, null, false));
  const same = JSON.parse(JSON.stringify(after));
  assert.equal(gs.sessionUpdateNotice(same, after), 'none');
  const fewer = JSON.parse(JSON.stringify(after)); fewer.attendees = [{ email: 'a@example.org' }];
  assert.equal(gs.sessionUpdateNotice(fewer, after), 'all');
  const more = JSON.parse(JSON.stringify(after)); more.attendees.push({ email: 'gone@example.org' });
  assert.equal(gs.sessionUpdateNotice(more, after), 'none');
  const moved = JSON.parse(JSON.stringify(after)); moved.start = { dateTime: '2026-10-28T13:00:00-06:00' }; moved.end = { dateTime: '2026-10-28T14:00:00-06:00' };
  assert.equal(gs.sessionUpdateNotice(moved, after), 'none');
  moved.start = { dateTime: '2026-10-28T14:00:00-06:00' };
  assert.equal(gs.sessionUpdateNotice(moved, after), 'all');
});

test('each cohort folder is shared with everyone on any of its sessions', () => {
  const c = plain(gs.guestsByCohort([prep, Object.assign({}, prep, { number: 1, guests: ['b@example.org', 'a@example.org'] })]));
  assert.deepEqual(c.minerva.members, ['a@example.org', 'ben@example.org', 'b@example.org']);
});

test('the invitation names the cohort, the leader, the first session, and one link that joins', () => {
  const m = gs.invitationEmail({ email: 'amira@example.org', name: 'Amira Samatova', cohort_title: 'Minerva research team', slug: 'minerva', leader: 'Ben Wilkoff', minutes: 60, token: 'tok-1' }, 'Wednesday, October 28 at 1:00 PM (America/Denver time)');
  assert.equal(m.to, 'amira@example.org');
  assert.equal(m.subject, 'You are invited to Minerva research team');
  assert.match(m.body, /^Hello Amira,/);
  assert.match(m.body, /Ben Wilkoff has made the cohort/);
  assert.match(m.body, /an hour each week/);
  assert.match(m.body, /Wednesday, October 28 at 1:00 PM/);
  assert.match(m.body, /https:\/\/humanshaped\.org\/account\/\?join=minerva&invite=tok-1/);
});

test('no invitation without an address, a cohort, or a token', () => {
  assert.equal(gs.invitationEmail({ email: 'not an address', slug: 'm', token: 't' }), null);
  assert.equal(gs.invitationEmail({ email: 'a@example.org', slug: '', token: 't' }), null);
});
