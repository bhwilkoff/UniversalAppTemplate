// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/sheet-lib.js');

// The template sits beside this worktree; read its real files when present.
const T = new URL('../../../UniversalAppTemplate/', import.meta.url);
const real = (p) => existsSync(new URL(p, T)) ? readFileSync(new URL(p, T), 'utf8') : null;

test('wrapped principle lines join, and the bold lead splits from the rest', () => {
  const md = '*Version 0.4, Oct*\n\n## The principles\n\nEach principle says what it does,\nso it can be measured.\n\n1. **Start here,** one that\n   wraps.\n2. **Then this.**\n\n## Next\n3. **Not this.**\n';
  const p = lib.parsePrinciples(md);
  assert.equal(p.version, '0.4');
  assert.equal(p.intro, 'Each principle says what it does, so it can be measured.');
  assert.deepEqual(p.items, [
    { n: 1, lead: 'Start here,', rest: 'one that wraps.' },
    { n: 2, lead: 'Then this.', rest: '' }
  ]);
});

test('the four questions come from the nested list, with the first sentence after it', () => {
  const md = '2. **The four questions** (skill). Before:\n\n   1. Does it A?\n   2. Does it B?\n\n   A "no" is a redesign, and it happens early. The questions came from X.\n\n3. Next\n';
  assert.deepEqual(lib.parseQuestions(md), {
    questions: ['Does it A?', 'Does it B?'],
    after: 'A "no" is a redesign, and it happens early.'
  });
});

test('the real PRINCIPLES.md gives fifteen principles, each with a bold lead', { skip: !real('docs/human-shaped/PRINCIPLES.md') }, () => {
  const p = lib.parsePrinciples(real('docs/human-shaped/PRINCIPLES.md'));
  assert.equal(p.items.length, 15);
  assert.deepEqual(p.items.map((i) => i.n), Array.from({ length: 15 }, (_, i) => i + 1));
  p.items.forEach((i) => { assert.ok(i.lead.length > 5); assert.ok(!i.rest.includes('**')); });
});

test('the real stage 00 gives the four questions', { skip: !real('docs/path/00-why-we-build.md') }, () => {
  const q = lib.parseQuestions(real('docs/path/00-why-we-build.md'));
  assert.equal(q.questions.length, 4);
  assert.equal(q.questions[0], 'Does it deepen understanding?');
  assert.match(q.after, /redesign/);
});
