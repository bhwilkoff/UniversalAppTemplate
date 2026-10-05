import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../../assets/chat-lib.js');

test('a message is trimmed, kept to a size, and marked when it is an agent\'s', () => {
  assert.equal(C.body('  hello \r\n'), 'hello');
  assert.equal(C.body('   '), null);
  assert.equal(C.body('x'.repeat(C.MAX + 1)), null);
  const ai = C.body('Try a smaller first step.', true);
  assert.equal(ai, '🤖 From my AI agent:\n\nTry a smaller first step.');
  assert.deepEqual(C.readAi(ai), { ai: true, text: 'Try a smaller first step.' });
  assert.deepEqual(C.readAi('plain'), { ai: false, text: 'plain' });
});

test('GitHub\'s answer becomes messages with replies and reactions', () => {
  const g = (content, n, mine) => ({ content, viewerHasReacted: mine, reactors: { totalCount: n } });
  const data = { repository: { discussion: { id: 'D1', url: 'u', locked: false, comments: { totalCount: 1, nodes: [
    { id: 'c1', url: 'u1', bodyText: '🤖 From my AI agent:\n\nIdea', createdAt: '2026-10-05T18:00:00Z', isMinimized: false, author: { login: 'bea' },
      reactionGroups: [g('HEART', 2, true), g('EYES', 0, false), g('NOPE', 3, false)],
      replies: { nodes: [{ id: 'r1', url: 'u2', bodyText: 'Agreed', createdAt: '2026-10-05T18:01:00Z', isMinimized: false, author: null, reactionGroups: [] }] } }
  ] } } } };
  const s = C.shape(data);
  assert.equal(s.messages.length, 1);
  const m = s.messages[0];
  assert.equal(m.ai, true); assert.equal(m.text, 'Idea'); assert.equal(m.author, 'bea');
  assert.deepEqual(m.reactions, [{ content: 'HEART', emoji: '❤️', count: 2, mine: true }]);
  assert.equal(m.replies[0].author, 'someone who has left GitHub');
  assert.equal(C.shape({ repository: { discussion: null } }), null);
});

test('the chat opens in a class or session category when there is one', () => {
  assert.equal(C.category([{ name: 'General' }, { name: 'Live sessions' }]).name, 'Live sessions');
  assert.equal(C.category([{ name: 'Ideas' }, { name: 'General' }]).name, 'General');
  assert.equal(C.category([]), null);
  assert.equal(C.weekTitle({ number: 3 }), 'Week 3, in class');
});

test('the panel takes a GitHub token only from the window it opened, on this site', () => {
  const opened = {}, origin = 'https://humanshaped.org', token = 'gho_' + 'a'.repeat(36);
  const ev = (o) => Object.assign({ origin, source: opened, data: C.tokenMessage(token) }, o);
  assert.equal(C.acceptToken(ev({}), origin, opened), token);
  assert.equal(C.acceptToken(ev({ origin: 'https://evil.example' }), origin, opened), null);
  assert.equal(C.acceptToken(ev({ source: {} }), origin, opened), null);
  assert.equal(C.acceptToken(ev({ data: { type: 'hs-github', token: 'bad token!' } }), origin, opened), null);
  assert.equal(C.tokenMessage('short'), null);
});
