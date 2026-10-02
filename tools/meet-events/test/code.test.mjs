// Loads Code.gs into a sandbox and tests the pure helpers. The Google
// services (Calendar, Drive, DriveApp...) are not stubbed, so any helper
// that reached for one by accident would throw here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({ console });
vm.runInContext(source, gs, { filename: 'Code.gs' });

const base = {
  id: 'c1',
  title: 'Human Shaped Software, cohort 1',
  startDate: '2026-10-19',
  weekday: 'Tuesday',
  startTime: '17:00',
  timeZone: 'America/Denver',
  minutes: 90,
  sessions: 5,
  members: 'A@example.com, b@gmail.com\nb@gmail.com; c@example.org',
  teachers: ['teacher@example.org'],
  sessionUrl: 'https://humanshaped.org/live/c1/',
};

test('a cohort row normalizes into the first session and its end', () => {
  const { cohort, errors } = gs.normalizeCohort(base);
  assert.deepEqual([...errors], []);
  assert.equal(cohort.weekday, 'TU');
  assert.equal(cohort.firstDate, '2026-10-20');
  assert.equal(cohort.start, '2026-10-20T17:00:00');
  assert.equal(cohort.end, '2026-10-20T18:30:00');
  assert.deepEqual([...cohort.members], ['a@example.com', 'b@gmail.com', 'c@example.org']);
});

test('a session that runs past midnight ends on the next day', () => {
  assert.equal(gs.localDateTime('2026-12-31', '23:30', 90), '2027-01-01T01:00:00');
});

test('the first session is the start date when it already falls on the weekday', () => {
  assert.equal(gs.firstSessionDate('2026-10-20', 'TU'), '2026-10-20');
  assert.equal(gs.firstSessionDate('2026-10-21', 'TU'), '2026-10-27');
});

test('bad definitions say what is wrong in plain words', () => {
  const { errors } = gs.normalizeCohort({ ...base, id: 'c 1', startDate: '10/20/2026', weekday: 'someday', timeZone: 'Mountain', minutes: 5, sessions: 2.5, sessionUrl: 'http://x', members: 'nope' });
  const text = errors.join(' | ');
  for (const bit of ['id must', 'startDate', 'weekday', 'timeZone', 'minutes', 'sessions', 'sessionUrl', '"nope"']) {
    assert.ok(text.includes(bit), `missing: ${bit}`);
  }
});

test('the event resource carries the session page, guests and privacy', () => {
  const { cohort } = gs.normalizeCohort(base);
  const ev = gs.buildEventResource(cohort, 'https://drive.google.com/drive/folders/F');
  assert.deepEqual([...ev.recurrence], ['RRULE:FREQ=WEEKLY;COUNT=5;BYDAY=TU']);
  assert.equal(ev.start.timeZone, 'America/Denver');
  assert.match(ev.description, /humanshaped\.org\/live\/c1/);
  assert.match(ev.description, /drive\.google\.com\/drive\/folders\/F/);
  assert.doesNotMatch(ev.description, /\u2014/);
  assert.equal(ev.attendees.length, 4);
  assert.equal(ev.guestsCanSeeOtherGuests, false);
});

test('sharing diff adds the missing, removes outsiders, and never touches the owner', () => {
  const have = [
    { id: '1', email: 'meet@humanshaped.org', role: 'owner', type: 'user' },
    { id: '2', email: 'a@example.com', role: 'reader', type: 'user' },
    { id: '3', email: 'left@example.com', role: 'reader', type: 'user' },
    { id: '4', email: '', role: 'reader', type: 'anyone' },
  ];
  const d = gs.diffSharing(['a@example.com', 'b@gmail.com'], have, ['meet@humanshaped.org']);
  assert.deepEqual([...d.add], ['b@gmail.com']);
  assert.deepEqual(d.remove.map((p) => p.id), ['3']);
  assert.deepEqual(d.openLinks.map((p) => p.id), ['4']);
});

test('a Sheet row with a real Date cell becomes a cohort', () => {
  const headers = ['id', 'title', 'startDate', 'weekday', 'startTime', 'timeZone', 'minutes', 'sessions', 'members', 'sessionUrl'];
  const row = ['c2', 'Cohort 2', vm.runInContext('new Date(2027, 0, 12)', gs), 'TU', '17:00', 'America/Denver', 90, 5, 'x@example.com', 'https://humanshaped.org/live/c2/'];
  const { cohort, errors } = gs.normalizeCohort(gs.rowToCohort(headers, row));
  assert.deepEqual([...errors], []);
  assert.equal(cohort.start, '2027-01-12T17:00:00');
});

test('the extension line round-trips through the recorder settings parser', async () => {
  const { parseCohortList } = await import('../../session-recorder/extension/lib.js');
  const { cohort } = gs.normalizeCohort(base);
  const line = gs.extensionLine(cohort, '1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
  const parsed = parseCohortList(line);
  assert.deepEqual([...parsed.errors], []);
  assert.equal(parsed.cohorts[0].id, 'c1');
  assert.equal(parsed.cohorts[0].label, cohort.title);
});
