// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/followup-lib.js');

const people = [
  { user_id: 'b', status: 'enrolled', role: 'student', app_repo: 'bea/garden-swap', profiles: { github_login: 'bea', display_name: 'Bea' } },
  { user_id: 'c', status: 'enrolled', role: 'student', app_repo: 'Bea/Garden-Swap', profiles: { github_login: 'cal' } },
  { user_id: 'd', status: 'left', role: 'student', app_repo: 'dee/gone', profiles: { github_login: 'dee' } },
  { user_id: 'e', status: 'enrolled', role: 'student', app_repo: 'not a repo', profiles: { github_login: 'eve' } },
  { user_id: 'f', status: 'enrolled', role: 'mentor', app_repo: 'fay/tides', profiles: { github_login: 'fay' } },
];

test('each repository is read once, only for people still in the cohort', () => {
  const r = lib.cohortRepos(people);
  assert.deepEqual(r.map((x) => x.repo), ['bea/garden-swap', 'fay/tides']);
  assert.equal(r[0].name, 'Bea');
  assert.equal(r[1].name, 'fay');
});

test('the commits address asks GitHub for commits since the session began', () => {
  assert.equal(lib.commitsUrl('bea/garden-swap', '2026-10-06T23:00:00.000Z'),
    'https://api.github.com/repos/bea/garden-swap/commits?since=2026-10-06T23%3A00%3A00.000Z&per_page=30');
});

test('an agent is named only when a Co-Authored-By line names one', () => {
  assert.equal(lib.agentOf('Fix the list\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'), 'Claude');
  assert.equal(lib.agentOf('Fix\n\nco-authored-by: gemini-code-assist[bot] <x@users.noreply.github.com>'), 'Gemini');
  assert.equal(lib.agentOf('Fix\n\nCo-authored-by: Cal <cal@example.org>'), null);
  assert.equal(lib.agentOf('Claude helped with this, said the message'), null);
  assert.equal(lib.agentOf(null), null);
});

const api = (sha, date, message, url) => ({ sha, html_url: url ?? `https://github.com/bea/garden-swap/commit/${sha}`, commit: { message, committer: { date }, author: { date: '2020-01-01T00:00:00Z' } } });

test('a commit reads as its first line, its short sha, its time, and its agent', () => {
  const [c] = lib.normalizeCommits([api('abcdef1234', '2026-10-06T23:30:00Z', 'Make the list sortable\n\nCo-Authored-By: Claude <noreply@anthropic.com>')], { repo: 'bea/garden-swap', user_id: 'b', name: 'Bea' });
  assert.deepEqual(c, { repo: 'bea/garden-swap', user_id: 'b', name: 'Bea', sha: 'abcdef1', line: 'Make the list sortable', date: '2026-10-06T23:30:00Z', url: 'https://github.com/bea/garden-swap/commit/abcdef1234', agent: 'Claude' });
  assert.equal(lib.normalizeCommits([api('a1', '2026-10-06T23:30:00Z', 'x', 'javascript:alert(1)')], { repo: 'r/r' })[0].url, null);
  assert.deepEqual(lib.normalizeCommits({ message: 'Not Found' }, { repo: 'r/r' }), []);
  assert.match(lib.normalizeCommits([api('a1', '2026-10-06T23:30:00Z', 'x'.repeat(120))], { repo: 'r/r' })[0].line, /…$/);
});

test('commits since the session began, newest first, across repositories', () => {
  const a = lib.normalizeCommits([api('a1', '2026-10-06T23:10:00Z', 'one'), api('a0', '2026-10-06T22:00:00Z', 'before')], { repo: 'bea/garden-swap' });
  const b = lib.normalizeCommits([api('b1', '2026-10-06T23:40:00Z', 'two')], { repo: 'fay/tides' });
  const all = lib.pushedSince([a, b], '2026-10-06T23:00:00Z');
  assert.deepEqual(all.map((c) => c.sha), ['b1', 'a1']);
  assert.deepEqual(lib.pushedSince([a, b], '2026-10-06T23:00:00Z', 1).map((c) => c.sha), ['b1']);
  assert.deepEqual(lib.pushedSince([], '2026-10-06T23:00:00Z'), []);
});

test('what GitHub could not show is said plainly', () => {
  assert.equal(lib.unreadText([{ repo: 'a/a', list: [] }]), '');
  assert.match(lib.unreadText([{ repo: 'a/a', missing: true }]), /^a\/a is private or moved, so its commits/);
  assert.match(lib.unreadText([{ repo: 'a/a', missing: true }, { repo: 'b/b', missing: true }]), /a\/a and b\/b are private or moved, so their/);
  assert.match(lib.unreadText([{ repo: 'c/c', unavailable: 403 }]), /did not answer for c\/c just now/);
});

const sessions = [
  { id: 's1', number: 1, starts_at: '2026-10-06T23:00:00Z' },
  { id: 's2', number: 2, starts_at: '2026-10-13T23:00:00Z' },
  { id: 's3', number: 3, starts_at: '2026-10-20T23:00:00Z' },
];

test('a session owns the time from the previous session to the next', () => {
  assert.deepEqual(lib.sessionWindow(sessions, sessions[1]), { from: '2026-10-06T23:00:00Z', to: '2026-10-20T23:00:00Z' });
  assert.deepEqual(lib.sessionWindow(sessions, sessions[0]), { from: '2026-09-29T23:00:00.000Z', to: '2026-10-13T23:00:00Z' });
  assert.equal(lib.sessionWindow(sessions, sessions[2]).to, null);
  assert.equal(lib.within('2026-10-13T23:00:00Z', { from: '2026-10-06T23:00:00Z', to: '2026-10-13T23:00:00Z' }), false);
});

const w = { from: '2026-10-06T23:00:00Z', to: '2026-10-20T23:00:00Z' };
const data = {
  teacherIds: ['t'],
  shares: [
    { id: 'bb1', user_id: 'b', kind: 'bring-back', created_at: '2026-10-12T10:00:00Z', readiness: 'not-yet', missing: 'Offline.', feedback: [
      { author_id: 'c', body: 'Love the list.', created_at: '2026-10-12T11:00:00Z' },
      { author_id: 't', body: 'Try it on the train.', created_at: '2026-10-14T11:00:00Z' },
      { author_id: 'b', body: 'Thanks!', created_at: '2026-10-14T12:00:00Z' },
    ] },
    { id: 'bb0', user_id: 'b', kind: 'bring-back', created_at: '2026-10-01T10:00:00Z', feedback: [] },
    { id: 'q1', user_id: 'b', kind: 'question', created_at: '2026-10-13T10:00:00Z', feedback: [] },
    { id: 'cbb', user_id: 'c', kind: 'bring-back', created_at: '2026-10-12T09:00:00Z', feedback: [
      { author_id: 'b', body: 'The colors help.', created_at: '2026-10-13T20:00:00Z' },
      { author_id: 'b', body: 'Old one.', created_at: '2026-10-01T20:00:00Z' },
    ] },
  ],
  queue: [{ user_id: 'b', url: 'https://bea.github.io/garden-swap', kind: 'app', state: 'shown', created_at: '2026-10-13T23:10:00Z' }, { user_id: 'c', url: 'https://x.org', kind: 'link', state: 'waiting', created_at: '2026-10-13T23:11:00Z' }],
  checks: [
    { id: 'k1', prompt: 'What can you decide now?', choices: null, created_at: '2026-10-14T00:10:00Z' },
    { id: 'k2', prompt: 'What is still muddy?', choices: null, created_at: '2026-10-14T00:11:00Z' },
    { id: 'k3', prompt: 'Which?', choices: ['Planning', 'Testing'], created_at: '2026-10-14T00:05:00Z' },
  ],
  answers: [
    { check_id: 'k1', user_id: 'b', body: 'Which screen comes first' },
    { check_id: 'k2', user_id: 'b', body: 'Sync' },
    { check_id: 'k3', user_id: 'b', choice: 2 },
    { check_id: 'k1', user_id: 'c', body: 'Not mine' },
    { check_id: 'gone', user_id: 'b', body: 'From another session' },
  ],
  notes: [{ id: 'n1', student_id: 'b', author_id: 't', body: 'Glad you came.', created_at: '2026-10-15T00:00:00Z' }, { id: 'n0', student_id: 'b', author_id: 't', body: 'Old.', created_at: '2026-10-01T00:00:00Z' }],
};

test('a student\'s contributions are what they did on purpose in the session\'s time', () => {
  const c = lib.contributions('b', w, data);
  assert.deepEqual(c.bringBacks.map((s) => s.id), ['bb1']);
  assert.deepEqual(c.otherShares.map((s) => s.id), ['q1']);
  assert.deepEqual(c.queue.map((q) => q.url), ['https://bea.github.io/garden-swap']);
  assert.deepEqual(c.answers.map((a) => a.text), ['Sync', 'Testing', 'Which screen comes first']);
  assert.equal(c.answers[0].muddy, true);
  assert.equal(c.muddy.text, 'Sync');
  assert.deepEqual(c.given.map((g) => g.body), ['The colors help.']);
  assert.deepEqual(c.received.map((g) => g.body), ['Love the list.']);
  assert.deepEqual(c.fromTeachers.map((g) => g.body), ['Try it on the train.', 'Glad you came.']);
  assert.equal(c.empty, false);
});

test('someone who did nothing in the session reads as empty, with nothing muddy', () => {
  const c = lib.contributions('z', w, data);
  assert.equal(c.empty, true);
  assert.equal(c.muddy, null);
});

test('a follow-up goes on the newest bring-back, or as a note when there is none', () => {
  assert.deepEqual(lib.followupTarget(lib.contributions('b', w, data)), { kind: 'feedback', share_id: 'bb1' });
  assert.deepEqual(lib.followupTarget(lib.contributions('z', w, data)), { kind: 'note' });
});

test('the list puts anyone still muddy first, then everyone by name, and leaves out teachers and leavers', () => {
  const byId = { c: { muddy: { text: 'All of it' } }, b: { muddy: null } };
  const order = lib.followupOrder(people.concat([{ user_id: 't', status: 'enrolled', role: 'teacher', profiles: { github_login: 'ben' } }]), byId);
  assert.deepEqual(order.map((p) => p.user_id), ['c', 'b', 'e', 'f']);
});

test('a follow-up is the teacher\'s own words, trimmed, and not empty', () => {
  assert.deepEqual(lib.checkBody('  Good work.  '), { body: 'Good work.' });
  assert.match(lib.checkBody('   ').error, /Write the follow-up/);
  assert.match(lib.checkBody('x'.repeat(8001)).error, /8,000/);
});

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  };
}

test('a draft is kept in the browser, survives a reload, and goes when cleared', () => {
  const store = memoryStore();
  const key = lib.draftKey('co1', 's2', 'b');
  assert.equal(key, 'hs-followup:co1:s2:b');
  assert.equal(lib.loadDraft(store, key), '');
  assert.equal(lib.saveDraft(store, key, 'Your sync question is a good one.'), true);
  assert.equal(lib.loadDraft(store, key), 'Your sync question is a good one.');
  lib.saveDraft(store, lib.draftKey('co1', 's2', 'c'), 'Another');
  lib.saveDraft(store, lib.draftKey('co2', 's9', 'c'), 'Elsewhere');
  assert.equal(lib.draftCount(store, 'co1'), 2);
  lib.clearDraft(store, key);
  assert.equal(lib.loadDraft(store, key), '');
  lib.saveDraft(store, lib.draftKey('co1', 's2', 'c'), '   ');
  assert.equal(lib.draftCount(store, 'co1'), 0);
});

test('drafts fail quietly when the browser refuses storage', () => {
  const refusing = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  assert.equal(lib.loadDraft(refusing, 'k'), '');
  assert.equal(lib.saveDraft(refusing, 'k', 'x'), false);
  assert.equal(lib.saveDraft(null, 'k', 'x'), false);
  assert.equal(lib.draftCount(refusing, 'co1'), 0);
});

test('the follow-up is built from the show: its scenes, each student’s room, and what they presented (R8)', () => {
  const F = createRequire(import.meta.url)('../../assets/followup-lib.js');
  assert.deepEqual(F.showAsRun([{ position: 1, kind: 'rooms', title: 'Show what you brought back', minutes: 25 }, { position: 0, kind: 'talk', title: 'Arrive', minutes: 5 }]),
    [{ kind: 'Talk', title: 'Arrive', minutes: 5 }, { kind: 'Rehearsal rooms', title: 'Show what you brought back', minutes: 25 }]);
  const groups = [{ name: 'Trio A', group_members: [{ user_id: 'bea' }, { user_id: 'cal' }, { user_id: 'dee' }] }];
  const nameOf = (id) => ({ cal: 'Cal', dee: 'Dee' })[id];
  assert.deepEqual(F.roomOf('bea', groups, nameOf), { name: 'Trio A', partners: ['Cal', 'Dee'] });
  assert.equal(F.roomOf('eve', groups, nameOf), null);
  const p = F.presented([{ id: 1, state: 'shown' }, { id: 2, state: 'waiting' }]);
  assert.deepEqual([p.shown.map((x) => x.id), p.waiting.map((x) => x.id)], [[1], [2]]);
  const c = F.contributions('bea', { start: '2026-10-01T00:00:00Z', end: '2026-10-30T00:00:00Z' }, {
    checks: [{ id: 'k', kind: 'scale', prompt: 'How sure?', points: 5, created_at: '2026-10-20T23:00:00Z' }],
    answers: [{ check_id: 'k', user_id: 'bea', choice: 4 }]
  });
  assert.equal(c.answers[0].kind, 'scale');
  assert.equal(c.answers[0].text, '4 of 5');
});
