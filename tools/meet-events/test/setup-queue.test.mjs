// The setup queue's pure parts (migration 20261004000000), and the
// contract between /teach/ and this script: a setup built by the site's
// TeachLib.meetSetup, which the setup-queue function sends, is a cohort
// definition this script accepts as it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({ console });
vm.runInContext(source, gs, { filename: 'Code.gs' });
const TeachLib = createRequire(import.meta.url)('../../../assets/teach-lib.js');

test('the queue is off until the Script Property says true', () => {
  assert.equal(gs.setupQueueOn('true'), true);
  assert.equal(gs.setupQueueOn(' TRUE '), true);
  assert.equal(gs.setupQueueOn(''), false);
  assert.equal(gs.setupQueueOn(null), false);
  assert.equal(gs.setupQueueOn('yes'), false);
});

test('rooms go back to the hub as a link, and a space name when the Meet API made them', () => {
  const api = gs.roomsForHub({ 'g-1a2b3c4d': { name: 'spaces/AbC', uri: 'https://meet.google.com/abc-defg-hij' }, 'g-0000': { name: 'spaces/X' } }, true);
  assert.deepEqual(JSON.parse(JSON.stringify(api)), { 'g-1a2b3c4d': { url: 'https://meet.google.com/abc-defg-hij', space: 'spaces/AbC' } });
  const cal = gs.roomsForHub({ 'g-1a2b3c4d': 'https://meet.google.com/qqq-rrrr-sss', 'g-0000': null }, false);
  assert.deepEqual(JSON.parse(JSON.stringify(cal)), { 'g-1a2b3c4d': { url: 'https://meet.google.com/qqq-rrrr-sss', space: null } });
});

test('the teacher reads the check’s first line', () => {
  assert.equal(gs.setupSummary('Check for c1: 1 problem(s).\n  ok  Running as meet@humanshaped.org.'), 'Check for c1: 1 problem(s).');
  assert.equal(gs.setupSummary(''), 'Set up.');
});

test('a setup built by /teach/’s TeachLib is a definition this script accepts', () => {
  const cohort = {
    slug: 'fall-2026', title: 'Human Shaped Software, fall', starts_on: '2026-10-19', session_weekday: 2,
    session_time: '17:00:00', time_zone: 'America/Denver', session_minutes: 90, weeks: 5,
  };
  const groups = [{ id: '1a2b3c4d-0000-4000-8000-000000000000', name: 'Trio A', emails: ['a@example.org', 'b@example.org'] }];
  const setup = TeachLib.meetSetup(cohort, ['a@example.org', 'b@example.org', 'c@example.org'], ['teacher@example.org'], groups);
  const { cohort: c, errors } = gs.normalizeCohort(JSON.parse(JSON.stringify(setup)));
  assert.deepEqual([...errors], []);
  assert.equal(c.id, 'fall-2026');
  assert.equal(c.firstDate, '2026-10-20');
  assert.deepEqual([...c.members], ['a@example.org', 'b@example.org', 'c@example.org']);
  assert.equal(c.groups[0].key, 'g-1a2b3c4d');
});

test('a cohort with no dates yet is refused in plain words, so the request fails and says why', () => {
  const setup = TeachLib.meetSetup({ slug: 'early', title: 'Early', time_zone: 'America/Denver', weeks: 5, session_minutes: 90 }, [], [], []);
  const { errors } = gs.normalizeCohort(JSON.parse(JSON.stringify(setup)));
  assert.ok(errors.length > 0);
});
