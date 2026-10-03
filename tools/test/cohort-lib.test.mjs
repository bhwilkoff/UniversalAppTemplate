import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/cohort-lib.js');
const S = [
  { number: 1, starts_at: '2026-10-20T23:00:00Z' },
  { number: 2, starts_at: '2026-10-27T23:00:00Z' },
  { number: 3, starts_at: '2026-11-04T00:00:00Z' }
];
test('before the cohort, the current week is week 1 and it is next', () => {
  const r = lib.currentAndNext(S, new Date('2026-10-10T00:00:00Z'), 75);
  assert.equal(r.current.number, 1); assert.equal(r.next.number, 1); assert.equal(r.live, false);
});
test('during a session, it is both current and live', () => {
  const r = lib.currentAndNext(S, new Date('2026-10-27T23:30:00Z'), 75);
  assert.equal(r.current.number, 2); assert.equal(r.next.number, 2); assert.equal(r.live, true);
});
test('between sessions, the current week is the last one that began', () => {
  const r = lib.currentAndNext(S, new Date('2026-10-30T12:00:00Z'), 75);
  assert.equal(r.current.number, 2); assert.equal(r.next.number, 3); assert.equal(r.live, false);
});
test('after the last session there is no next one', () => {
  const r = lib.currentAndNext(S, new Date('2026-12-01T00:00:00Z'), 75);
  assert.equal(r.current.number, 3); assert.equal(r.next, null);
});
test('no sessions means nothing current', () => {
  assert.deepEqual(lib.currentAndNext([], new Date(), 75), { current: null, next: null, live: false });
});
test('a commit shows its first line, shortened', () => {
  assert.equal(lib.commitLine('Add the seedling list\n\nLonger body'), 'Add the seedling list');
  assert.equal(lib.commitLine('x'.repeat(120)).length, 88);
});
test('times read the way a person says them', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  assert.equal(lib.ago('2026-10-30T11:59:30Z', now), 'just now');
  assert.equal(lib.ago('2026-10-30T11:20:00Z', now), '40 minutes ago');
  assert.equal(lib.ago('2026-10-30T11:00:00Z', now), '1 hour ago');
  assert.equal(lib.ago('2026-10-28T12:00:00Z', now), '2 days ago');
});
test('a repository can be given as owner/name or as a GitHub link', () => {
  assert.equal(lib.repoPath('bea/garden-swap'), 'bea/garden-swap');
  assert.equal(lib.repoPath('https://github.com/bea/garden-swap/'), 'bea/garden-swap');
  assert.equal(lib.repoPath('https://github.com/bea/garden-swap.git'), 'bea/garden-swap');
  assert.equal(lib.repoPath('not a repo'), null);
});
test('the agenda fills exactly the session length', () => {
  for (const m of [60, 75, 90]) {
    const a = lib.agenda(m);
    assert.equal(a.at(-1).start + a.at(-1).minutes, m);
    assert.equal(a[0].start, 0);
  }
});
test('a 75 minute session keeps the course shape', () => {
  assert.deepEqual(lib.agenda(75).map(p => p.minutes), [5, 25, 7, 20, 15, 3]);
});
test('each week points at its stages of the path', () => {
  assert.deepEqual(lib.stagesForWeek(1), ['00', '01']);
  assert.deepEqual(lib.stagesForWeek(9), []);
});

test('setup steps read their state from the hub, and the agent step is never marked', () => {
  const none = lib.setupSteps({ app_repo: null, app_url: null }, null, { github_team: 'cohort-x' });
  assert.deepEqual(none.map((s) => s.key), ['setup', 'repo', 'address', 'talk', 'agent']);
  assert.ok(none.slice(0, 4).every((s) => s.done === false));
  assert.equal(none[4].done, null);
  const most = lib.setupSteps({ app_repo: 'bea/garden', app_url: 'https://bea.github.io/garden/' }, { state: 'member' }, { github_team: 'cohort-x' });
  assert.ok(most.slice(0, 4).every((s) => s.done === true));
});
test('without a cohort team yet, there is no conversation step', () => {
  assert.ok(!lib.setupSteps({}, null, { github_team: null }).some((s) => s.key === 'talk'));
});
