// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callerOk, due, whenLine } from '../../supabase/functions/github-tick/tick.js';

const good = { iss: 'https://token.actions.githubusercontent.com', aud: 'https://humanshaped.org', repository: 'humanshaped/automation', ref: 'refs/heads/main', event_name: 'schedule' };

test('only the automation repository’s main branch, on its schedule or by hand, may call', () => {
  assert.ok(callerOk(good).ok);
  assert.ok(callerOk({ ...good, event_name: 'workflow_dispatch', aud: ['x', 'https://humanshaped.org'] }).ok);
  assert.equal(callerOk({ ...good, repository: 'someone/automation' }).reason, 'repository');
  assert.equal(callerOk({ ...good, ref: 'refs/heads/try' }).reason, 'ref');
  assert.equal(callerOk({ ...good, event_name: 'pull_request' }).reason, 'event');
  assert.equal(callerOk({ ...good, aud: 'https://example.org' }).reason, 'audience');
  assert.equal(callerOk({ ...good, iss: 'https://example.org' }).reason, 'issuer');
  assert.equal(callerOk(null).ok, false);
});

test('a session’s thread opens within the day before it, once, in a cohort with its repository', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const c = { slug: 'k', status: 'running', github_repo: 'humanshaped/k', time_zone: 'America/Denver' };
  const rows = [
    { id: 'a', starts_at: '2026-10-23T00:00:00Z', discussion_number: null, cohorts: c },
    { id: 'b', starts_at: '2026-10-24T00:00:00Z', discussion_number: null, cohorts: c },
    { id: 'c', starts_at: '2026-10-22T11:00:00Z', discussion_number: null, cohorts: c },
    { id: 'd', starts_at: '2026-10-23T00:00:00Z', discussion_number: 4, cohorts: c },
    { id: 'e', starts_at: '2026-10-23T00:00:00Z', discussion_number: null, cohorts: { ...c, github_repo: null } },
    { id: 'f', starts_at: '2026-10-23T00:00:00Z', discussion_number: null, cohorts: { ...c, status: 'draft' } },
    { id: 'g', starts_at: null, discussion_number: null, cohorts: c },
  ];
  assert.deepEqual(due(rows, now).map((s) => s.id), ['a']);
});

test('the start is written out in the cohort’s own zone', () => {
  assert.equal(whenLine('2026-10-23T00:00:00Z', 'America/Denver'),
    'It starts Thursday, October 22, 6:00 PM Mountain Daylight Time. On humanshaped.org it shows on your own clock.');
});
