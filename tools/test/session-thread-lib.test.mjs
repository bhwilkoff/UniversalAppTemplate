import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/session-thread-lib.js');

const CATS = [
  { id: 'C_a', name: 'Announcements', slug: 'announcements' },
  { id: 'C_g', name: 'General', slug: 'general' },
  { id: 'C_i', name: 'Ideas', slug: 'ideas' },
  { id: 'C_p', name: 'Polls', slug: 'polls' }
];

test('variables ask for the thread only when the session has one', () => {
  assert.deepEqual(lib.variables('humanshaped/cohort-test', 12), { owner: 'humanshaped', name: 'cohort-test', number: 12, has: true });
  assert.deepEqual(lib.variables('humanshaped/cohort-test', null), { owner: 'humanshaped', name: 'cohort-test', number: 1, has: false });
  assert.equal(lib.variables('not a repo', 3), null);
});

test('shape reads the repository and the thread, and a missing thread as null', () => {
  const answer = { repository: {
    id: 'R_1', url: 'https://github.com/humanshaped/cohort-test',
    discussionCategories: { nodes: CATS },
    discussion: {
      id: 'D_1', number: 12, title: 'Week 2, the session thread', url: 'https://github.com/humanshaped/cohort-test/discussions/12',
      bodyHTML: '<p>Hi</p>', createdAt: '2026-10-20T17:00:00Z', locked: false,
      author: { login: 'bhwilkoff', url: 'https://github.com/bhwilkoff' }, category: { name: 'General' },
      comments: { totalCount: 1, nodes: [{ id: 'DC_1', url: 'u', bodyHTML: '<p>a link</p>', createdAt: '2026-10-20T17:05:00Z', isMinimized: false,
        author: null, replies: { totalCount: 0, nodes: [] } }] }
    }
  } };
  const s = lib.shape(answer);
  assert.equal(s.repositoryId, 'R_1');
  assert.equal(s.categories.length, 4);
  assert.equal(s.thread.number, 12);
  assert.equal(s.thread.comments.length, 1);
  assert.equal(s.thread.comments[0].author, null);
  const gone = lib.shape({ repository: { id: 'R_1', url: 'x', discussionCategories: { nodes: [] }, discussion: null } });
  assert.equal(gone.thread, null);
  assert.equal(lib.shape({ repository: null }), null);
});

test('the thread goes in a sessions category, then General, never Announcements or Polls', () => {
  assert.equal(lib.category(CATS).id, 'C_g');
  assert.equal(lib.category(CATS.concat([{ id: 'C_s', name: 'Live sessions', slug: 'live-sessions' }])).id, 'C_s');
  assert.equal(lib.category([CATS[0], CATS[3]]), null);
  assert.equal(lib.category([{ id: 'C_q', name: 'Q&A', slug: 'q-a' }]).id, 'C_q');
});

test('title and opening words name the week, without em dashes', () => {
  assert.equal(lib.title({ number: 3, title: 'Prove it' }), 'Week 3: Prove it, the session thread');
  assert.equal(lib.title({ number: 3, title: 'Week 3' }), 'Week 3, the session thread');
  const b = lib.body({ number: 3, title: null }, 'https://humanshaped.org/live/?c=c1');
  assert.match(b, /Week 3’s live session/);
  assert.match(b, /https:\/\/humanshaped\.org\/live\/\?c=c1/);
  assert.doesNotMatch(b, /—/);
  assert.doesNotMatch(lib.body({ number: 1 }, 'javascript:alert(1)'), /javascript/);
});

test('threadUrl links only a real repository and number', () => {
  assert.equal(lib.threadUrl('humanshaped/cohort-test', 12), 'https://github.com/humanshaped/cohort-test/discussions/12');
  assert.equal(lib.threadUrl('humanshaped/cohort-test', 0), null);
  assert.equal(lib.threadUrl('../evil', 4), null);
});

test('state says what the page offers', () => {
  const repo = 'humanshaped/cohort-test';
  assert.equal(lib.state({ repo: null, number: 4 }), 'none');
  assert.equal(lib.state({ repo, number: 4, teaching: false, token: null }), 'show');
  assert.equal(lib.state({ repo, number: null, teaching: false, token: 't' }), 'waiting');
  assert.equal(lib.state({ repo, number: null, teaching: true, token: 't' }), 'open');
  assert.equal(lib.state({ repo, number: null, teaching: true, token: null }), 'signin');
});

test('reads again only while the page is seen', () => {
  assert.equal(lib.nextRead(true), lib.EVERY);
  assert.equal(lib.nextRead(false), null);
});

test('when two teachers open a thread at once, the stored one stays', () => {
  assert.deepEqual(lib.settle(null, 12), { keep: 12, extra: null });
  assert.deepEqual(lib.settle(12, 12), { keep: 12, extra: null });
  assert.deepEqual(lib.settle(11, 12), { keep: 11, extra: 12 });
});
