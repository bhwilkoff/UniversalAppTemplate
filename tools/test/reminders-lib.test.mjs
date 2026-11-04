import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/reminders-lib.js');

const Z = 'America/Denver';
const at = (s) => new Date(s);
const base = { zone: Z, hasItems: true, lastOn: null };

test('every open item starts with what to do and has a direct link', () => {
  assert.deepEqual(R.line({ kind: 'prep', slug: 'c', session_number: 2, amount: 3 }), { text: 'Answer 3 questions before Week 2', href: '/session/?c=c&s=2' });
  assert.equal(R.line({ kind: 'prep', slug: 'c', session_number: 2, amount: 1 }).text, 'Answer 1 question before Week 2');
  assert.equal(R.line({ kind: 'exchange', token: 'ab', session_number: 0, label: 'Hi' }).text, 'Reply to the exchange before Prep: Hi');
  assert.equal(R.line({ kind: 'exchange', token: 'ab', session_number: 1 }).href, '/exchange/#ab');
  assert.equal(R.line({ kind: 'repo', slug: 'c' }).href, '/cohort/?c=c&t=mine');
  assert.match(R.line({ kind: 'invite' }).href, /^https:\/\/github\.com/);
  assert.equal(R.line({ kind: 'nonsense' }), null);
});

test('the digest waits for the morning on the cohort clock', () => {
  const nextStart = '2026-11-11T20:00:00Z';
  assert.equal(R.digestDue({ ...base, nextStart, now: at('2026-11-10T14:59:00Z') }), false);
  assert.equal(R.digestDue({ ...base, nextStart, now: at('2026-11-10T15:00:00Z') }), true);
});

test('the digest goes once a day', () => {
  const nextStart = '2026-11-11T20:00:00Z', now = at('2026-11-10T16:00:00Z');
  assert.equal(R.digestDue({ ...base, nextStart, now, lastOn: '2026-11-10' }), false);
  assert.equal(R.digestDue({ ...base, nextStart, now, lastOn: '2026-11-09' }), true);
});

test('the digest starts three days before a session, and runs through its morning', () => {
  const nextStart = '2026-11-11T20:00:00Z';
  assert.equal(R.digestDue({ ...base, nextStart, now: at('2026-11-07T16:00:00Z') }), false);
  assert.equal(R.digestDue({ ...base, nextStart, now: at('2026-11-08T16:00:00Z') }), true);
  assert.equal(R.digestDue({ ...base, nextStart, now: at('2026-11-11T16:00:00Z') }), true);
});

test('no digest with nothing open, or no session coming', () => {
  const now = at('2026-11-10T16:00:00Z');
  assert.equal(R.digestDue({ ...base, hasItems: false, nextStart: '2026-11-11T20:00:00Z', now }), false);
  assert.equal(R.digestDue({ ...base, nextStart: null, now }), false);
});

test('a learner sees the session, numbered links, and a way to stop', () => {
  const m = R.learnerMessage({ login: 'amy', slug: 'c', zone: Z, nextStart: '2026-11-11T20:00:00Z', nextNumber: 2, items: [
    { kind: 'repo', slug: 'c' }, { kind: 'prep', slug: 'c', session_number: 2, amount: 3, starts_at: '2026-11-11T20:00:00Z' }] });
  assert.match(m, /^@amy/);
  assert.match(m, /Week 2 is Wednesday, November 11 at 1:00 PM MST\./);
  assert.ok(m.indexOf('Answer 3 questions') < m.indexOf('Add your repository'), 'dated work comes first');
  assert.match(m, /1\. \[Answer 3 questions before Week 2\]\(https:\/\/humanshaped\.org\/session\/\?c=c&s=2\)/);
  assert.match(m, /Stop these reminders/);
});

test('a learner message never carries anyone else', () => {
  const m = R.learnerMessage({ login: 'amy', slug: 'c', zone: Z, items: [{ kind: 'repo', slug: 'c' }], people: [{ name: 'Rosa', items: [] }] });
  assert.doesNotMatch(m, /Rosa/);
});

test('an event alone is enough, and nothing at all says nothing', () => {
  const m = R.learnerMessage({ login: 'amy', slug: 'c', zone: Z, items: [], events: [{ kind: 'reply', token: 'ab' }] });
  assert.match(m, /Watch the reply to your video\]\(https:\/\/humanshaped\.org\/exchange\/#ab\)/);
  assert.equal(R.learnerMessage({ login: 'amy', slug: 'c', zone: Z, items: [], events: [] }), null);
});

test('a leader sees who has what open, feedback, and open issues', () => {
  const m = R.leaderMessage({ login: 'ben', slug: 'c', zone: Z, nextStart: '2026-11-11T20:00:00Z', nextNumber: 2, feedback: 2,
    people: [{ name: 'Rosa', items: [{ kind: 'prep', slug: 'c', session_number: 2, amount: 3 }] }],
    issues: [{ title: 'Broken [link]', html_url: 'https://github.com/x/y/issues/1' }] });
  assert.match(m, /- Rosa: answer 3 questions before Week 2/);
  assert.match(m, /Give feedback on 2 pieces of shared work/);
  assert.match(m, /\[Broken link\]\(https:\/\/github\.com\/x\/y\/issues\/1\)/);
  assert.equal(R.leaderMessage({ login: 'ben', slug: 'c', zone: Z }), null);
});

test('a repository name is one person\'s, and safe for GitHub', () => {
  assert.equal(R.repoFor('SattikBhaumik'), 'reminders-sattikbhaumik');
});
