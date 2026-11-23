// Ben 2026-11-23: "fix the re-scan of the exact same failures. We should never
// build something that does that." The ten-minute jobs (reminders,
// session-read) must not try the same failing item on every tick.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GIVE_UP_AFTER, failure, givenUp, pick, waiting } from '../../supabase/functions/_shared/retry.js';
import { due, startFailed, MOST_TRIES } from '../../supabase/functions/session-read/logic.js';

const TICK = 10 * 60000;

test('an announcement GitHub keeps refusing is tried four times in a week and a day, not every ten minutes', () => {
  const failures = new Map();
  const rows = [{ id: 'bad' }];
  let now = new Date('2026-11-23T00:00:00Z'), tries = 0;
  for (let i = 0; i < 6 * 24 * 60; i++) { // sixty days of ticks
    for (const a of pick(rows, failures, (r) => `announce:${r.id}`, now, 10)) {
      tries++;
      failures.set(`announce:${a.id}`, failure(failures.get(`announce:${a.id}`), 'reminders', `announce:${a.id}`, 'GitHub said 404', now));
    }
    now = new Date(now.getTime() + TICK);
  }
  assert.equal(tries, GIVE_UP_AFTER);
  assert.ok(givenUp(failures.get('announce:bad')));
  assert.equal(failures.get('announce:bad').reason, 'GitHub said 404');
});

test('items that keep failing never hold the places of new ones', () => {
  const now = new Date('2026-11-23T00:00:00Z');
  const failures = new Map();
  const rows = Array.from({ length: 12 }, (_, i) => ({ id: `old${i}` })).concat([{ id: 'new' }]);
  for (const r of rows.slice(0, 12)) failures.set(r.id, failure(null, 'reminders', r.id, 'comment 410', now));
  assert.deepEqual(pick(rows, failures, (r) => r.id, now, 10).map((r) => r.id), ['new']);
});

test('the waits grow: an hour, a day, a week', () => {
  const t0 = new Date('2026-11-23T00:00:00Z');
  const one = failure(null, 'j', 'i', 'x', t0);
  assert.equal(waiting(one, new Date(t0.getTime() + 59 * 60000)), true);
  assert.equal(waiting(one, new Date(t0.getTime() + 61 * 60000)), false);
  const two = failure(one, 'j', 'i', 'x', t0);
  assert.equal(waiting(two, new Date(t0.getTime() + 23 * 3600000)), true);
  const three = failure(two, 'j', 'i', 'x', t0);
  assert.equal(waiting(three, new Date(t0.getTime() + 6 * 86400000)), true);
  assert.equal(waiting(failure(three, 'j', 'i', 'x', t0), new Date(t0.getTime() + 365 * 86400000)), true);
});

test('a session-read GitHub will not start counts as a try and waits longer each time', () => {
  const s = { id: 's1', cohort_id: 'c', recording_url: 'https://drive.google.com/file/d/abcdefghijkl/view', cohorts: { github_repo: 'cohort-a' } };
  const t0 = new Date('2026-11-23T00:00:00Z');
  let row = null, starts = 0, now = t0;
  for (let i = 0; i < 6 * 24 * 7; i++) { // a week of ticks
    if (due(s, row, now)) { starts++; row = startFailed(row, s, 'GitHub refused the start: 404', now); }
    now = new Date(now.getTime() + TICK);
  }
  assert.equal(starts, MOST_TRIES);
  const second = startFailed(startFailed(null, s, 'x', t0), s, 'x', t0);
  assert.equal(second.tries, 2);
  assert.equal(due(s, second, new Date(t0.getTime() + 151 * 60000)), false, 'the second wait is longer than the first');
  assert.equal(due(s, second, new Date(t0.getTime() + 301 * 60000)), true);
});
