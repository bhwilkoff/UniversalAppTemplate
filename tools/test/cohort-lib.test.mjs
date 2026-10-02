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
