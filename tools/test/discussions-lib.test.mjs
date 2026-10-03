import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/discussions-lib.js');

// Shaped like the answers GitHub gave for humanshaped/cohort-test on
// October 3, 2026 (research/notes/cohort-conversation-notes.md, part 7).
const LIST_ANSWER = {
  repository: {
    id: 'R_1', url: 'https://github.com/humanshaped/cohort-test',
    discussionCategories: { nodes: [
      { id: 'C_a', name: 'Announcements', slug: 'announcements' },
      { id: 'C_g', name: 'General', slug: 'general' },
      { id: 'C_i', name: 'Ideas', slug: 'ideas' },
      { id: 'C_p', name: 'Polls', slug: 'polls' },
      { id: 'C_q', name: 'Q&A', slug: 'q-a' }
    ] },
    discussions: { totalCount: 7, nodes: [
      { id: 'D_1', number: 4, title: 'Stuck on the first deploy', url: 'https://github.com/humanshaped/cohort-test/discussions/4',
        createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z',
        author: { login: 'bea', url: 'https://github.com/bea' }, category: { name: 'Q&A' },
        comments: { totalCount: 3, nodes: [{ createdAt: '2026-10-02T09:00:00Z' }] } },
      { id: 'D_2', number: 1, title: 'Welcome', url: 'https://github.com/humanshaped/cohort-test/discussions/1',
        createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T12:00:00Z',
        author: null, category: { name: 'Announcements' },
        comments: { totalCount: 0, nodes: [] } }
    ] }
  }
};

test('the repository splits into owner and name, and nothing else passes', () => {
  assert.deepEqual(lib.splitRepo('humanshaped/cohort-1'), { owner: 'humanshaped', name: 'cohort-1' });
  assert.equal(lib.splitRepo('humanshaped'), null);
  assert.equal(lib.splitRepo('a/b/c'), null);
  assert.equal(lib.splitRepo(null), null);
});

test('a list keeps title, author, category, comment count, and last activity', () => {
  const l = lib.shapeList(LIST_ANSWER);
  assert.equal(l.repositoryId, 'R_1');
  assert.equal(l.total, 7);
  assert.equal(l.discussions.length, 2);
  const d = l.discussions[0];
  assert.equal(d.title, 'Stuck on the first deploy');
  assert.deepEqual(d.author, { login: 'bea', url: 'https://github.com/bea' });
  assert.equal(d.category, 'Q&A');
  assert.equal(d.comments, 3);
  assert.equal(d.lastActivity, '2026-10-02T09:00:00Z', 'the newest comment is later than updatedAt');
  assert.equal(l.discussions[1].lastActivity, '2026-09-30T12:00:00Z', 'with no comments, updatedAt');
});

test('a deleted account is an author of null, not a crash', () => {
  assert.equal(lib.shapeList(LIST_ANSWER).discussions[1].author, null);
});

test('a missing repository shapes to null', () => {
  assert.equal(lib.shapeList({ repository: null }), null);
  assert.equal(lib.shapeList(null), null);
});

test('students are offered General first, never Announcements or Polls', () => {
  const names = lib.postableCategories(lib.shapeList(LIST_ANSWER).categories).map((c) => c.name);
  assert.deepEqual(names, ['General', 'Ideas', 'Q&A']);
});

test('a thread keeps its comments, their replies, and says how many are not shown', () => {
  const t = lib.shapeThread({ node: {
    id: 'D_1', number: 4, title: 'Stuck', url: 'u', bodyHTML: '<p>Help</p>', createdAt: '2026-10-01T10:00:00Z', locked: false,
    author: { login: 'bea', url: 'https://github.com/bea' }, category: { name: 'Q&A' },
    comments: { totalCount: 52, nodes: [
      { id: 'C1', url: 'c1', bodyHTML: '<p>Try this</p>', createdAt: '2026-10-01T11:00:00Z', isMinimized: false,
        author: { login: 'ben', url: 'https://github.com/ben' },
        replies: { totalCount: 21, nodes: [{ id: 'R1', url: 'r1', bodyHTML: '<p>Thanks</p>', createdAt: '2026-10-01T12:00:00Z', isMinimized: false, author: { login: 'bea' } }] } },
      { id: 'C2', url: 'c2', bodyHTML: '', createdAt: '2026-10-01T13:00:00Z', isMinimized: true, author: null, replies: { totalCount: 0, nodes: [] } }
    ] }
  } });
  assert.equal(t.title, 'Stuck');
  assert.equal(t.html, '<p>Help</p>');
  assert.equal(t.comments.length, 2);
  assert.equal(t.more, 50);
  assert.equal(t.comments[0].replies[0].author.url, 'https://github.com/bea', 'a missing profile link is made from the login');
  assert.equal(t.comments[0].moreReplies, 20);
  assert.equal(t.comments[1].minimized, true);
  assert.equal(t.comments[1].author, null);
});

test('a thread GitHub would not return shapes to null', () => {
  assert.equal(lib.shapeThread({ node: null }), null);
});

test('GitHub errors are read plainly', () => {
  assert.equal(lib.problem(200, { data: { viewer: {} } }), null);
  assert.equal(lib.problem(401, { message: 'Bad credentials' }).kind, 'expired');
  // What GitHub returned for a repository the person cannot see (checked October 3).
  assert.equal(lib.problem(200, { data: { repository: null }, errors: [{ type: 'NOT_FOUND', path: ['repository'], message: "Could not resolve to a Repository with the name 'humanshaped/x'." }] }).kind, 'not-visible');
  assert.equal(lib.problem(200, { errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] }).kind, 'rate');
  assert.equal(lib.problem(403, { message: 'You have exceeded a secondary rate limit.' }).kind, 'rate');
  assert.equal(lib.problem(200, { errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by integration' }] }).kind, 'forbidden');
  assert.equal(lib.problem(502, {}).kind, 'github');
  assert.equal(lib.problem(200, { errors: [{ message: 'Something odd' }] }).message, 'Something odd');
});

test('ask sends the token only to api.github.com, and never rejects', async () => {
  const calls = [];
  const ok = await lib.ask('ghu_x', lib.LIST, { owner: 'o', name: 'n', n: 5 }, (url, init) => {
    calls.push([url, init]);
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ data: LIST_ANSWER }) });
  });
  assert.equal(calls[0][0], 'https://api.github.com/graphql');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer ghu_x');
  assert.equal(ok.data.repository.id, 'R_1');
  const off = await lib.ask('ghu_x', lib.LIST, {}, () => Promise.reject(new TypeError('Failed to fetch')));
  assert.equal(off.problem.kind, 'offline');
  const none = await lib.ask(null, lib.LIST, {}, () => { throw new Error('should not be called'); });
  assert.equal(none.problem.kind, 'expired');
});

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('the token is kept for the tab, and expires before GitHub says it does', () => {
  const s = memory();
  lib.remember({ provider_token: 'ghu_a' }, s, 1000);
  assert.equal(lib.read(s, 1000 + 3600000), 'ghu_a');
  lib.remember({ provider_token: 'ghu_a' }, s, 5000000);
  assert.equal(JSON.parse(s.getItem(lib.TOKEN_KEY)).at, 1000, 'the same token keeps its first time');
  assert.equal(lib.read(s, 1000 + 8 * 3600000), null);
  assert.equal(s.getItem(lib.TOKEN_KEY), null, 'an expired token is removed');
  lib.remember({ provider_token: 'ghu_b' }, s, 10);
  lib.forget(s);
  assert.equal(lib.read(s, 10), null);
});

test('the long-lived session loses the GitHub tokens and keeps everything else', () => {
  const local = memory();
  local.setItem('sb-x-auth-token', JSON.stringify({ access_token: 'a', refresh_token: 'r', provider_token: 'ghu_a', provider_refresh_token: 'ghr_a', user: { id: 'u' } }));
  const session = memory();
  const t = lib.tokenFrom({ provider_token: 'ghu_a' }, { session, local }, 1, 'sb-x-auth-token');
  assert.equal(t, 'ghu_a');
  assert.deepEqual(JSON.parse(local.getItem('sb-x-auth-token')), { access_token: 'a', refresh_token: 'r', user: { id: 'u' } });
  assert.equal(lib.scrub(local, 'sb-x-auth-token'), false, 'nothing left to remove');
  local.setItem('broken', '{not json');
  assert.equal(lib.scrub(local, 'broken'), false);
  assert.equal(local.getItem('broken'), '{not json', 'what it cannot read, it leaves alone');
});

test('no session token and no stored token means none', () => {
  assert.equal(lib.tokenFrom({}, { session: memory(), local: memory() }, 1, 'k'), null);
});
