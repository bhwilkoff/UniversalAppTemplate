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
