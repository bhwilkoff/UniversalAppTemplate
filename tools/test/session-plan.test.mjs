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

test('a workbook part keeps its blocks in the cohort workbook shape, and runs as one message', () => {
  const p = P.clean([{ kind: 'workbook', title: 'Notice', blocks: [{ type: 'free', text: 'What do you notice?' }, { type: 'file', text: 'Upload' }, { type: 'choice', text: 'Pick', choices: ['A', 'B'], multiple: true }] }, { kind: 'workbook', title: 'Empty', blocks: [{ type: 'free', text: ' ' }] }]);
  assert.equal(p.length, 1);
  assert.deepEqual(p[0].blocks, [{ key: 'b1', type: 'free', text: 'What do you notice?' }, { key: 'b2', type: 'choice', text: 'Pick', multiple: true, choices: ['A', 'B'] }]);
  assert.deepEqual(P.messages(p[0]), [{ t: 'workbook', title: 'Notice', blocks: p[0].blocks }]);
});

test('a workbook’s answers become a CSV for the host and Markdown for each person', () => {
  const blocks = P.clean([{ kind: 'workbook', title: 'W', blocks: [
    { type: 'text', text: 'Read this.' },
    { type: 'free', text: 'Notice?' },
    { type: 'choice', text: 'Pick', choices: ['Left', 'Right'], multiple: true },
    { type: 'table', text: 'Count', rows: [[{ text: 'Stars' }, { text: '' }]] }
  ] }])[0].blocks;
  const csv = P.answersCsv({ blocks, people: [{ name: 'Bo', a: { b2: 'Clumps, mostly', b3: [0, 1], b4: { '0,1': '=12' } } }, { name: '', a: {} }] });
  assert.equal(csv, 'Name,Notice?,Pick,"Count (Stars, column 2)"\r\nBo,"Clumps, mostly",Left; Right,"\'=12"\r\nSomeone,,,\r\n');
  const md = P.myCopy({ title: 'W', blocks }, { b2: 'Clumps', b3: [1], b4: { '0,1': '12' } });
  assert.equal(md, '# W\n\nRead this.\n\n**Notice?**\n\nClumps\n\n**Pick**\n\n- [ ] Left\n- [x] Right\n\n**Count**\n\n| Stars | 12 |\n| --- | --- |\n');
});
