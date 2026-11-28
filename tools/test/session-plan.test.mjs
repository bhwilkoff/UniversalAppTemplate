import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../../assets/session-plan.js');

test('clean keeps parts a room can run and drops the rest', () => {
  const parts = P.clean([
    { kind: 'talk', title: 'Open', slides: '# Hi' },
    { kind: 'talk', slides: '   ' },
    { kind: 'question', prompt: 'Which?', ask: 'choice', choices: ['A'] },
    { kind: 'question', prompt: 'Why?', ask: 'bogus' },
    { kind: 'model', url: 'https://ideasatplay.org/play/x-1a2b3c?v=2', together: true },
    { kind: 'model', url: 'https://example.org/' },
    { kind: 'site', url: 'javascript:alert(1)' },
    { kind: 'clock', minutes: 500 },
    { kind: 'card', body: 'Pair up' }
  ]);
  assert.deepEqual(parts.map(p => p.kind), ['talk', 'question', 'model', 'card']);
  assert.equal(parts[1].ask, 'short');
  assert.equal(parts[2].together, true);
});

test('each part becomes the room messages that run it', () => {
  assert.deepEqual(P.messages({ kind: 'clock', title: 'Write', minutes: 5 }), [{ t: 'clock', seconds: 300, label: 'Write' }]);
  assert.deepEqual(P.messages({ kind: 'question', prompt: 'Which?', ask: 'choice', choices: ['A', 'B'] }), [{ t: 'ask', kind: 'choice', prompt: 'Which?', choices: ['A', 'B'] }]);
  assert.deepEqual(P.messages({ kind: 'model', title: 'M', url: 'u', together: false }), [{ t: 'site', url: 'u', name: 'M', together: false }]);
  assert.deepEqual(P.messages(null), []);
});

test('a cohort session plan becomes a file a room can run', () => {
  const scenes = [
    { id: 's1', kind: 'talk', title: 'Leaves', config: {} },
    { id: 's2', kind: 'question', title: 'Check', config: { prompt: 'Which color?', options: ['Red', 'Green'] } },
    { id: 's3', kind: 'rooms', title: 'In groups', config: { prompt: 'Compare notes' } },
    { id: 's4', kind: 'talk', title: 'Model', config: { show: { url: 'https://ideasatplay.org/play/x-1a2b3c?v=2', name: 'X' } } },
    { id: 's5', kind: 'break', title: 'Break', minutes: 5, config: {} }
  ];
  const parts = P.fromScenes(scenes, { s1: '# Leaves\n> say hi' });
  assert.deepEqual(parts.map(p => p.kind), ['talk', 'question', 'card', 'model', 'clock']);
  assert.equal(parts[1].ask, 'choice');
  assert.equal(P.session('', parts).title, 'A session');
});
