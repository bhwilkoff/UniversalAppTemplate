import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const C = require('../../assets/community-lib.js');
const sample = JSON.parse(readFileSync(new URL('./fixtures/community.json', import.meta.url), 'utf8'));

test('the sample splits into coming up and already happened, by the viewer’s date', () => {
  const s = C.splitEvents(sample.events, new Date(2026, 9, 3, 12));
  assert.deepEqual(s.upcoming.map((e) => e.slug), ['sample-denver-meetup']);
  assert.deepEqual(s.past.map((e) => e.slug), ['sample-hackathon']);
  assert.equal(s.past[0].writeUp, 'https://github.com/orgs/humanshaped/discussions/1');
});

test('an event stays coming up through its last day, and sorts soonest first', () => {
  const list = [
    { title: 'B', starts: '2026-10-05T09:00' },
    { title: 'A', starts: '2026-10-02', ends: '2026-10-03' },
    { title: 'C', starts: '2026-10-05T08:00' }
  ];
  const s = C.splitEvents(list, new Date(2026, 9, 3, 23));
  assert.deepEqual(s.upcoming.map((e) => e.title), ['A', 'C', 'B']);
  assert.equal(C.splitEvents(list, new Date(2026, 9, 4)).past[0].title, 'A');
});

test('unusable or unsafe event fields are dropped', () => {
  assert.equal(C.cleanEvent({ title: 'No date' }), null);
  assert.equal(C.cleanEvent({ title: 'Bad date', starts: '2026-13-01' }), null);
  assert.equal(C.cleanEvent({ title: '', starts: '2026-10-01' }), null);
  const e = C.cleanEvent({ title: '  Spaced   out ', starts: '2026-10-01', kind: 'rave', host: 'not a login!', online: 'javascript:alert(1)', link: 'http://example.org', write_up: 'https://ok.example/x', ends: '2026-09-01' });
  assert.equal(e.title, 'Spaced out');
  assert.equal(e.kind, 'other');
  assert.equal(e.host, null);
  assert.equal(e.online, null);
  assert.equal(e.link, null);
  assert.equal(e.writeUp, 'https://ok.example/x');
  assert.equal(e.ends, null);
  assert.equal(C.cleanEvent({ title: 'x'.repeat(300), starts: '2026-10-01' }).title.length, 120);
});

test('when an event is, written out the same way for everyone', () => {
  const [meetup, hack] = sample.events.map(C.cleanEvent);
  assert.equal(C.whenText(meetup), 'Saturday, November 7, 2026, at 6:30 pm until 8 pm (America/Denver)');
  assert.equal(C.whenText(hack), 'Saturday, September 12, 2026, through Sunday, September 13');
  assert.equal(C.whenText(C.cleanEvent({ title: 'x', starts: '2026-12-31', ends: '2027-01-02' })), 'Thursday, December 31, 2026, through Saturday, January 2, 2027');
  assert.equal(C.whenText(C.cleanEvent({ title: 'x', starts: '2026-10-01T00:05' })), 'Thursday, October 1, 2026, at 12:05 am');
});

test('threads keep only GitHub links and are cut to the limit', () => {
  const list = C.threads([
    ...sample.threads,
    { title: 'Elsewhere', url: 'https://evil.example/x' },
    { title: 'Script', url: 'javascript:alert(1)' },
    { title: 'Two', url: 'https://github.com/orgs/humanshaped/discussions/2', comments: '1' }
  ], 5);
  assert.deepEqual(list.map((t) => t.title), ['Sample thread (not real)', 'Two']);
  assert.equal(list[1].comments, 1);
  assert.equal(C.threads(sample.threads, 0).length, 1);
});

test('an app’s issues leave out pull requests, and discussions read from GraphQL', () => {
  const issues = [
    { title: 'A bug', html_url: 'https://github.com/bea/garden/issues/3', user: { login: 'bea' }, comments: 0, updated_at: '2026-10-01T00:00:00Z', state: 'open' },
    { title: 'A change', html_url: 'https://github.com/bea/garden/pull/2', pull_request: {}, user: { login: 'eve' } },
    { title: 'Old', html_url: 'https://github.com/bea/garden/issues/1', user: { login: 'eve' }, comments: 3, state: 'closed' }
  ];
  const out = C.fromIssues(issues, 3);
  assert.deepEqual(out.map((t) => t.title), ['A bug', 'Old']);
  assert.equal(C.threadLine(out[1]), 'eve, 3 replies, closed');
  const gql = { data: { repository: { discussions: { nodes: [
    { title: 'Hello', url: 'https://github.com/bea/garden/discussions/4', updatedAt: '2026-10-02T00:00:00Z', author: null, comments: { totalCount: 1 }, category: { name: 'Q&A' } }
  ] } } } };
  const d = C.fromDiscussions(gql, 3);
  assert.equal(d[0].author, null);
  assert.equal(C.threadLine(d[0], () => '1 day ago'), '1 reply, active 1 day ago, in Q&A');
  assert.deepEqual(C.fromDiscussions({ errors: [{}] }), []);
});
