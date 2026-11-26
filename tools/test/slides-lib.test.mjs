import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/slides-lib.js');

const deck = '## One\n\n- a\n\n> say this\n\n---\n\n## Two\n\n```sheet\n---\nchart: bar\n---\nA | B:number\n--- | ---\nx | 1\n```\n\n---\n\n## Three\n\n> and this\n> and that\n';

test('a dash line inside a fence is not a new slide', () => {
  assert.equal(lib.count(deck), 3);
  assert.equal(lib.count(''), 0);
});
test('speaker notes come out of what learners can read', () => {
  assert.equal(/say this|and this/.test(lib.withoutNotes(deck)), false);
  assert.match(lib.withoutNotes(deck), /## Three/);
});
test('each slide keeps its own notes', () => {
  assert.deepEqual(lib.notes(deck), ['say this', '', 'and this\nand that']);
});
test('a step stays in the deck until it runs out', () => {
  assert.equal(lib.step(3, 0, 1), 1);
  assert.equal(lib.step(3, 2, 1), null);
  assert.equal(lib.step(3, 0, -1), null);
  assert.equal(lib.step(0, 0, 1), null);
});
test('going back lands on the last slide of the part before', () => {
  assert.equal(lib.arrive(4, -1), 3);
  assert.equal(lib.arrive(4, 1), 0);
  assert.equal(lib.arrive(0, -1), 0);
});
test('a new slide lands after the one the caret is in', () => {
  const t = '## A\n\n---\n\n## B\n';
  const r = lib.insert(t, 2, '## New\n');
  assert.deepEqual(lib.split(r.text).map((s) => s.join('').trim()), ['## A', '## New', '## B']);
  assert.equal(lib.insert('', 0, '## New\n').text, '## New\n');
});
test('every toolbar part is one slide', () => {
  lib.ADD.forEach((a) => assert.equal(lib.count(a.text), 1, a.key));
});
test('a slide can be found in the text, and the text from a slide', () => {
  assert.equal(deck.slice(lib.offset(deck, 2)).startsWith('## Three'), true);
  assert.equal(deck.slice(lib.offset(deck, 1)).startsWith('## Two'), true);
  assert.equal(lib.slideAt(deck, deck.indexOf('## Two') + 3), 1);
  assert.equal(lib.slideAt(deck, 0), 0);
});
test('a note goes under the line the caret is on', () => {
  const r = lib.insertNote('## A\n\n---\n\n## B\n', 2);
  assert.deepEqual(lib.notes(r.text).map((n) => !!n), [true, false]);
});
test('a slide marked to build stops at each line, and the mark never reaches the renderer', () => {
  const t = '## Plain\n\n- a\n- b\n\n---\n\n## Step {.build}\n\n- one\n- two\n\n> a note\n\n---\n\n## Both {.two .build}\n\n- l\n\n|\n\n- r\n';
  assert.deepEqual(lib.frames(t), [
    { slide: 0, shown: Infinity }, { slide: 1, shown: 1 }, { slide: 1, shown: Infinity }, { slide: 2, shown: 1 }, { slide: 2, shown: Infinity }
  ]);
  assert.equal(/build/.test(lib.deck(t)), false);
  assert.match(lib.deck(t), /## Both \{\.two\}/);
  assert.match(lib.deck(t), /## Step\n/);
  assert.equal(lib.frameOf(t, 1), 2);
  assert.equal(lib.frameOf(t, 0), 0);
});

test('what a slide shows from GitHub becomes the deck\'s own words', () => {
  const t = '## Issues\n\n```github\nrepo: a/b\nshow: issues\n```\n';
  assert.deepEqual(lib.ghSpecs(t).map((x) => x.key), ['a/b|issues']);
  assert.match(lib.deck(t), /Reading a\/b on GitHub/);
  lib.ghHold('a/b|issues', { rows: [{ n: 7, title: 'A | pipe', by: 'bea' }] });
  assert.match(lib.deck(t), /#7 \| A \/ pipe \| bea/);
  lib.ghHold('a/b|issues', { error: 'Not found' });
  assert.match(lib.deck(t), /- Not found/);
});

test('a GitHub read that failed can be tried again', () => {
  lib.ghHold('x/y|issues', { error: 'no' });
  assert.equal(lib.ghHas('x/y|issues'), true);
  lib.ghDrop('x/y|issues');
  assert.equal(lib.ghHas('x/y|issues'), false);
});
test('a blank to fill in stays a blank, two to a line included, and code is left as written', () => {
  assert.equal(lib.blanks('- helps ___ to ___'), '- helps \\_\\_\\_ to \\_\\_\\_');
  assert.equal(lib.blanks('- It must never ___'), '- It must never \\_\\_\\_');
  assert.equal(lib.blanks('- __bold__ and snake_case'), '- __bold__ and snake_case');
  assert.equal(lib.blanks('- already \\_\\_\\_'), '- already \\_\\_\\_');
  assert.equal(lib.blanks('```\nx = a___b\n```'), '```\nx = a___b\n```');
  assert.ok(lib.deck('## A\n\n- helps ___ to ___').includes('helps \\_\\_\\_ to \\_\\_\\_'));
});

test('a slide that is only a picture draws the picture, fitted to the slide', () => {
  const text = lib.deck('![Page one](https://example.org/p1.jpg)\n\n---\n\n## Heading\n\n![Page two](https://example.org/p2.jpg)\n\n---\n\n> a note\n![Page three](https://example.org/p3.jpg)\n\n---\n\n![Not https](http://example.org/p4.jpg)');
  const pics = lib.pictures(text);
  assert.deepEqual(pics.map((p) => p && p.url), ['https://example.org/p1.jpg', null, 'https://example.org/p3.jpg', null]);
  const kit = { render: (t) => lib.split(t.slice(lib.HEAD.length)).map(() => '<svg viewBox="0 0 1600 900"><text>words</text></svg>') };
  const out = lib.render(kit, text);
  assert.equal(out.length, 4);
  assert.match(out[0], /<image href="https:\/\/example\.org\/p1\.jpg" x="0" y="0" width="1600" height="900" preserveAspectRatio="xMidYMid meet"\/>/);
  assert.match(out[0], /aria-label="Page one"/);
  assert.match(out[1], /<text>words<\/text>/);
  assert.match(out[3], /<text>words<\/text>/);
});

// Slides that move (DECISIONS.md, "Slides that move").
const MOVING = '## How we built it\n\n```motion\n---\nkind: pile\n---\n- One\n- Two\n- Three\n```\n\n> Say why\n\n---\n\n## Plain\n\n- a';
test('a moving slide stops at each of its points, and a plain slide after it is untouched', () => {
  assert.deepEqual(lib.frames(MOVING), [{ slide: 0, shown: 1 }, { slide: 0, shown: 2 }, { slide: 0, shown: Infinity }, { slide: 1, shown: Infinity }]);
});
test('a moving slide is read from the deck the stage is sent, head and all', () => {
  const m = lib.motionAt(lib.deck(MOVING), 0);
  assert.equal(m.kind, 'pile');
  assert.deepEqual(m.beats, ['One', 'Two', 'Three']);
  assert.equal(m.title, 'How we built it');
  assert.equal(lib.motionAt(lib.deck(MOVING), 1), null);
});
test('a kind nobody knows moves as blocks, and no more points than a stage can hold', () => {
  const many = '## A\n\n```motion\n---\nkind: spin\n---\n' + Array.from({ length: 12 }, (_, i) => '- P' + i).join('\n') + '\n```';
  const m = lib.motionAt(many, 0);
  assert.equal(m.kind, 'stack');
  assert.equal(m.beats.length, lib.MOTION_MOST);
  assert.equal(lib.motionAt('## A\n\n```motion\n- Only\n```', 0).kind, 'stack');
});
test('where nothing can move, the slide is its headline, its points, and its notes', () => {
  const s = lib.still(lib.deck(MOVING));
  assert.ok(s.startsWith(lib.HEAD));
  assert.match(s, /## How we built it\n\n- One\n- Two\n- Three\n\n> Say why/);
  assert.doesNotMatch(s, /motion|kind:/);
  assert.match(s, /## Plain\n\n- a/);
  assert.equal(lib.still('## A\n\n- b'), '## A\n\n- b');
});
test('the kit wrapper draws moving slides still, once per kit', () => {
  const seen = [];
  const K = { render: (t) => { seen.push(t); return []; }, words: (t) => { seen.push(t); return []; }, frame: (t) => { seen.push(t); return ''; } };
  const w = lib.kit(K);
  assert.equal(lib.kit(K), w);
  assert.equal(lib.kit(w), w);
  w.render(MOVING); w.words(MOVING); w.frame(MOVING, 0, 1);
  assert.ok(seen.every((t) => !/```motion/.test(t)));
});
