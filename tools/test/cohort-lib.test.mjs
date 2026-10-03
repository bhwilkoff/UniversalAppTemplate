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
  assert.deepEqual(lib.agenda(75).map(p => p.minutes), [7, 25, 6, 25, 12]);
  assert.deepEqual(lib.agenda(75).map(p => p.key), ['arrive', 'show', 'value', 'prompt', 'start']);
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

// The teaching tools (M12): which part of the session it is, each
// stage's bar, and ready or not yet.
test('the part of the session comes from the clock, and a started timer wins', () => {
  const parts = lib.agenda(75);
  const start = '2026-10-20T23:00:00Z';
  const at = (min) => new Date(Date.parse(start) + min * 60000);
  assert.equal(lib.partNow(parts, start, at(-30)).key, 'arrive');
  assert.equal(lib.partNow(parts, start, at(-90)), null);
  assert.equal(lib.partNow(parts, start, at(3)).key, 'arrive');
  assert.equal(lib.partNow(parts, start, at(7)).key, 'show');
  assert.equal(lib.partNow(parts, start, at(31.9)).key, 'show');
  assert.equal(lib.partNow(parts, start, at(74)).key, 'start');
  assert.equal(lib.partNow(parts, start, at(75)), null);
  assert.equal(lib.partNow(parts, start, at(40), 'show').key, 'show');
  assert.equal(lib.partNow(parts, null, at(0)), null);
});
test('a part list from elsewhere scales the same way', () => {
  const a = lib.agenda(60, [{ key: 'x', name: 'X', minutes: 10, what: '' }, { key: 'y', name: 'Y', minutes: 20, what: '' }]);
  assert.deepEqual(a.map(p => [p.key, p.start, p.minutes]), [['x', 0, 20], ['y', 20, 40]]);
});
test('a stage bar is the first sentence of its ready paragraph, in plain words', () => {
  const md = 'Intro.\n\n**When you are ready to move on,** your app is live at a real address,\nit is full of `real` data, and [you](x.md) have sent two rounds. Stage 02 is next.\n\nBe ready to show it.';
  assert.equal(lib.readyBar(md), 'When you are ready to move on, your app is live at a real address, it is full of real data, and you have sent two rounds.');
  assert.equal(lib.readyBar('No bar here.'), null);
  assert.equal(lib.stageFile('04'), 'docs/path/04-seeing-it-work.md');
  assert.equal(lib.stageFile('99'), null);
});
test('ready or not yet reads as the builder wrote it, never as a score', () => {
  assert.equal(lib.readinessText({ readiness: 'ready' }, true), 'You marked it ready to move on.');
  assert.equal(lib.readinessText({ readiness: 'not-yet', missing: 'It breaks offline.' }, false), 'Not yet, by their own reading: It breaks offline.');
  assert.equal(lib.readinessText({ readiness: null }, false), null);
  assert.equal(lib.seenText(['Eve']), 'Seen working on a device by Eve.');
  assert.equal(lib.seenText(['Eve', 'Ben', 'Fay']), 'Seen working on a device by Eve, Ben, and Fay.');
  assert.equal(lib.seenText([]), null);
});
test('only a partner or a teacher confirms, and only what its builder marked ready', () => {
  const groups = [{ group_members: [{ user_id: 'bea' }, { user_id: 'eve' }] }, { group_members: [{ user_id: 'fay' }] }];
  assert.deepEqual(lib.partnersOf('eve', groups), ['bea']);
  assert.deepEqual(lib.partnersOf('ben', groups), []);
  const s = { kind: 'bring-back', readiness: 'ready', user_id: 'bea' };
  assert.equal(lib.canConfirm(s, 'eve', ['bea'], false), true);
  assert.equal(lib.canConfirm(s, 'fay', [], false), false);
  assert.equal(lib.canConfirm(s, 'ben', [], true), true);
  assert.equal(lib.canConfirm(s, 'bea', ['eve'], true), false);
  assert.equal(lib.canConfirm({ ...s, readiness: 'not-yet' }, 'eve', ['bea'], false), false);
});
