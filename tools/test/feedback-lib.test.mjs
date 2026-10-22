// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/feedback-lib.js');

const me = 'u-bea';
const names = { 'u-ben': 'Ben Wilkoff', 'u-cal': 'Cal' };

test('feedback from every place comes back as one list, newest first, each saying who can see it', () => {
  const items = L.merge({
    me, myLogin: 'bea', names, appRepo: 'bea/garden',
    notes: [{ id: 'n1', author_id: 'u-ben', body: 'Lovely start.', created_at: '2026-10-20T10:00:00Z' }],
    shares: [{ id: 's1', user_id: me, note: 'My bring-back', feedback: [
      { id: 'f1', author_id: 'u-cal', body: 'Try it on a phone.', created_at: '2026-10-21T10:00:00Z' },
      { id: 'f2', author_id: me, body: 'Thanks!', created_at: '2026-10-21T11:00:00Z' },
    ] }],
    cohortIssues: [{ title: 'Can someone test on Android?', html_url: 'https://github.com/humanshaped/x/issues/3', user: { login: 'cal' }, updated_at: '2026-10-22T09:00:00Z' }],
    appIssues: [
      { title: 'Sign-in fails on Safari', html_url: 'https://github.com/bea/garden/issues/1', user: { login: 'ben' }, created_at: '2026-10-19T09:00:00Z' },
      { title: 'A pull request', html_url: 'https://github.com/bea/garden/pull/2', user: { login: 'ben' }, created_at: '2026-10-22T12:00:00Z', pull_request: {} },
      { title: 'My own reminder', html_url: 'https://github.com/bea/garden/issues/4', user: { login: 'bea' }, created_at: '2026-10-22T12:00:00Z' },
    ],
  });
  assert.deepEqual(items.map((i) => [i.kind, i.who, i.audience]), [
    ['cohort', '@cal', 'cohort'],
    ['share', 'Cal', 'cohort'],
    ['note', 'Ben Wilkoff', 'teachers'],
    ['app', '@ben', 'public'],
  ]);
  assert.equal(items[2].noteId, 'n1');
});

test('only feedback on their own shares, and never their own words', () => {
  const items = L.merge({ me, names, shares: [{ id: 's2', user_id: 'u-cal', feedback: [{ id: 'f3', author_id: 'u-ben', body: 'x', created_at: '2026-10-21T10:00:00Z' }] }] });
  assert.deepEqual(items, []);
  assert.deepEqual(L.merge({}), []);
});

test('each item says where it lives', () => {
  assert.equal(L.where({ kind: 'note' }), 'A note from a leader');
  assert.equal(L.where({ kind: 'share', about: 'My bring-back' }), 'On “My bring-back”');
  assert.equal(L.where({ kind: 'share' }), 'On what you shared');
  assert.equal(L.where({ kind: 'cohort' }), 'In the cohort’s repository');
  assert.equal(L.where({ kind: 'app', about: 'bea/garden' }), 'An issue on bea/garden');
});

test('the GitHub addresses it reads', () => {
  assert.equal(L.cohortSearchUrl('humanshaped/kit', 'bea'),
    'https://api.github.com/search/issues?per_page=20&sort=updated&q=repo%3Ahumanshaped%2Fkit%20mentions%3Abea');
  assert.equal(L.appIssuesUrl('bea/garden'), 'https://api.github.com/repos/bea/garden/issues?state=open&per_page=20');
  assert.equal(L.appIssuesUrl('not a repo'), null);
  assert.equal(L.appIssuesUrl(null), null);
});
