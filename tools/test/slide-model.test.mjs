import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../../assets/slide-model.js');

const DECK = `## :target: A first version {.build}

- Someone else can open it
- They can do a thing

> Not end to end.

---

## Two sides {.two}

- Now

|

- Later
`;

test('a deck survives the round trip untouched', () => {
  assert.equal(M.join(M.slides(DECK)), DECK);
});

test('a fence with its own dashes stays one slide', () => {
  const d = '## A chart\n\n```sheet\n---\nchart: bar\n---\nName | Count:number\n--- | ---\nFirst | 3\n```\n';
  assert.equal(M.slides(d).length, 1);
  assert.equal(M.join(M.slides(d)), d);
});

test('only words can be typed on, and they keep their marks', () => {
  const s = M.slides(DECK);
  assert.deepEqual(M.editable(s[0]).map((x) => x.words), ['A first version', 'Someone else can open it', 'They can do a thing']);
  assert.deepEqual(M.editable(s[1]).map((x) => x.column), [0, 0, 1]);
  assert.equal(M.setWords(s[0], 0, 'New words')[0], '## :target: New words {.build}');
  assert.equal(M.setWords(s[0], 2, 'A point')[2], '- A point');
  assert.equal(M.setWords(s[0], 2, 'two\nlines')[2], '- two lines');
});

test('Enter makes the next point, from a point or a headline', () => {
  const s = M.slides(DECK)[0];
  const a = M.addAfter(s, 2);
  assert.equal(a.line, 3);
  assert.equal(a.lines[3], '- ');
  const b = M.addAfter(['## Head'], 0);
  assert.deepEqual(b.lines, ['## Head', '', '- ']);
  assert.equal(b.line, 2);
});

test('wrapped lines are found, and things that are not words are skipped', () => {
  const items = [{ words: 'A long headline that wraps' }, { words: 'A **bold** point' }, { words: 'Missing' }];
  assert.deepEqual(M.match(items, ['A long headline', 'that wraps', 'Cell', 'A bold point']), [[0, 1], [3], []]);
});

test('layouts change the marks and leave the rest', () => {
  const s = ['## Head {.build}', '', '- One'];
  assert.equal(M.layoutOf(s), 'slide');
  const two = M.setLayout(s, 'two');
  assert.equal(M.layoutOf(two), 'two');
  assert.equal(two[0], '## Head {.two .build}');
  assert.ok(two.includes('|'));
  const back = M.setLayout(two, 'slide');
  assert.equal(back[0], '## Head {.build}');
  assert.ok(!back.includes('|'));
  assert.equal(M.setLayout(['## Head'], 'icon')[0], '## :lightbulb: Head {.icon}');
});

test('point by point and the icon are switches', () => {
  assert.equal(M.revealed(['## H {.build}']), true);
  assert.equal(M.setRevealed(['## H {.build}'], false)[0], '## H');
  assert.equal(M.setRevealed(['## H {.two}'], true)[0], '## H {.two .build}');
  assert.equal(M.iconOf(['## :target: H']), 'target');
  assert.equal(M.setIcon(['## :target: H {.icon}'], 'zap')[0], '## :zap: H {.icon}');
  assert.equal(M.setIcon(['## :target: H'], '')[0], '## H');
});

test('notes stay on their slide and never touch the words', () => {
  const s = ['## H', '', '- One', '', '> Old'];
  assert.equal(M.noteOf(s), 'Old');
  assert.deepEqual(M.setNote(s, 'New\nSecond'), ['## H', '', '- One', '', '> New', '> Second']);
  assert.deepEqual(M.setNote(s, ''), ['## H', '', '- One']);
});

test('a table becomes a grid and comes back', () => {
  const lines = ['## T', '', '```sheet', 'Name | Count', '--- | ---', 'First | 3', '```'];
  const b = M.block(lines);
  assert.equal(b.app, 'sheet');
  const g = M.grid(b.body);
  assert.deepEqual(g.rows, [['Name', 'Count'], ['First', '3']]);
  g.rows[1][1] = '4';
  g.rows.push(['Second', '5']);
  const out = M.setBlock(lines, M.ungrid(g));
  assert.deepEqual(out.slice(3, 7), ['Name | Count', '--- | ---', 'First | 4', 'Second | 5']);
});

test('a chart keeps its head', () => {
  const body = '---\nchart: bar\n---\nName | Count:number\n--- | ---\nFirst | 3';
  const g = M.grid(body);
  assert.equal(g.chart, 'bar');
  assert.equal(M.ungrid(g), body);
});

test('slides move', () => {
  assert.deepEqual(M.move(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
});

test('a diagram label changes in place and keeps its depth', () => {
  const body = '---\nkind: mind\n---\n- The center\n  - One branch';
  assert.deepEqual(M.outline(body).map((x) => x.words), ['The center', 'One branch']);
  assert.equal(M.setOutline(body, 4, 'New'), '---\nkind: mind\n---\n- The center\n  - New');
});

test('every row of a table comes out the same width', () => {
  assert.deepEqual(M.even([['a', 'b'], ['c']]), [['a', 'b'], ['c', '']]);
});

test('a GitHub fence is a block a leader can point at a repository', () => {
  const lines = ['## H', '', '```github', 'repo: a/b', 'show: issues', '```'];
  assert.equal(M.block(lines).app, 'github');
  assert.deepEqual(M.editable(lines).map((x) => x.words), ['H']);
});

test('a headline with one # can be typed on and keeps its one #', () => {
  const s = ['# What are we building today?', '', '> A note'];
  assert.deepEqual(M.editable(s), [{ line: 0, kind: 'head', words: 'What are we building today?', column: 0 }]);
  assert.equal(M.setWords(s, 0, 'A reading app')[0], '# A reading app');
  assert.equal(M.setLayout(s, 'title')[0], '# What are we building today? {.title}');
  assert.equal(M.setLayout(s, 'title').filter((l) => /^#/.test(l)).length, 1);
  assert.equal(M.setIcon(s, 'lightbulb')[0], '# :lightbulb: What are we building today?');
  assert.equal(M.iconOf(M.setIcon(s, 'lightbulb')), 'lightbulb');
});

test('a slide holds one picture: added before the notes, kept out of the words, replaced, and removed', () => {
  const lines = ['## Hi', '', '- a', '', '> say this'];
  const withPic = M.setPicture(lines, 'https://x.org/p.jpg', 'A [form]\nwith words');
  assert.deepEqual(withPic, ['## Hi', '', '- a', '', '![A form with words](https://x.org/p.jpg)', '', '> say this']);
  assert.deepEqual(M.editable(withPic).map((x) => x.words), ['Hi', 'a']);
  assert.deepEqual(M.picture(withPic), { line: 4, alt: 'A form with words', url: 'https://x.org/p.jpg' });
  const again = M.setPicture(withPic, 'https://x.org/q.jpg', 'Another');
  assert.equal(again.filter((l) => l.startsWith('![')).length, 1);
  assert.equal(M.picture(M.removePicture(again)), null);
  // Only an https picture counts.
  assert.equal(M.picture(['![x](http://x.org/p.jpg)']), null);
});
