// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/asks-lib.js');

const now = new Date('2026-10-22T12:00:00Z');
const issue = (n, o = {}) => ({ number: n, title: 'Ask ' + n, html_url: 'https://github.com/humanshaped/kit/issues/' + n, user: { login: 'bea' }, state: 'open', assignees: [], updated_at: '2026-10-21T00:00:00Z', ...o });

test('open with no one on it is Asked, open with someone is Someone has it, closed is Done', () => {
  const c = A.columns([
    issue(2),
    issue(1),
    issue(3, { assignees: [{ login: 'cal' }] }),
    issue(4, { state: 'closed', closed_at: '2026-10-20T00:00:00Z' }),
    issue(5, { state: 'closed', closed_at: '2026-09-01T00:00:00Z' }),
    issue(6, { pull_request: {} }),
  ], now);
  assert.deepEqual(c.asked.map((x) => x.number), [1, 2]);
  assert.deepEqual(c.taken.map((x) => [x.number, x.holders]), [[3, ['cal']]]);
  assert.deepEqual(c.done.map((x) => x.number), [4]);
  assert.equal(c.asked[0].by, 'bea');
});

test('what a person can do with a card depends on its column and whether they hold it', () => {
  assert.deepEqual(A.moves({ holders: [] }, 'asked', 'bea'), ['take', 'done']);
  assert.deepEqual(A.moves({ holders: ['bea'] }, 'taken', 'bea'), ['release', 'done']);
  assert.deepEqual(A.moves({ holders: ['cal'] }, 'taken', 'bea'), ['take', 'done']);
  assert.deepEqual(A.moves({ holders: [] }, 'done', 'bea'), ['reopen']);
});

test('each move is one GitHub request', () => {
  const card = { number: 7 };
  assert.deepEqual(A.request('humanshaped/kit', card, 'take', 'bea'),
    { method: 'POST', url: 'https://api.github.com/repos/humanshaped/kit/issues/7/assignees', body: { assignees: ['bea'] } });
  assert.equal(A.request('humanshaped/kit', card, 'release', 'bea').method, 'DELETE');
  assert.deepEqual(A.request('humanshaped/kit', card, 'done', 'bea').body, { state: 'closed', state_reason: 'completed' });
  assert.deepEqual(A.request('humanshaped/kit', card, 'reopen', 'bea').body, { state: 'open' });
  assert.equal(A.request('humanshaped/kit', card, 'delete', 'bea'), null);
});

test('a new ask needs a short title and carries the label', () => {
  assert.deepEqual(A.newAsk('  Can someone test   on Android? ', ''), { body: { title: 'Can someone test on Android?', body: null, labels: ['ask'] } });
  assert.equal(A.newAsk(' ', 'x').problem, 'Say what you are asking');
  assert.ok(A.newAsk('x'.repeat(201)).problem);
  assert.equal(A.listUrl('humanshaped/kit'), 'https://api.github.com/repos/humanshaped/kit/issues?labels=ask&state=all&per_page=100&sort=created&direction=asc');
});
