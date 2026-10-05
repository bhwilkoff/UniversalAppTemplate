import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const lib = createRequire(import.meta.url)('../../assets/principles-lib.js');

const md = `# The Human-Shaped Principles

## The principles

Human-shaped software should:

1. **Start from a human-shaped problem,** one that affects real people
   in the real world.
2. **Increase what people are able to do,** rather than how much profit
   can be made from them.
15. **Bring joy to at least one person** in the form it ships today,
    even if that person is the builder.

## What each principle means
`;

test('the principles are read from the template’s own list, lead and sentence', () => {
  const p = lib.parse(md);
  assert.equal(p.length, 3);
  assert.deepEqual(p[0], { n: 1, lead: 'Start from a human-shaped problem', rest: 'one that affects real people in the real world.', anchor: null });
  assert.equal(p[2].n, 15);
  assert.equal(p[2].lead, 'Bring joy to at least one person');
  assert.deepEqual(lib.parse('nothing here'), []);
});

test('the live PRINCIPLES.md on main parses to fifteen principles', (t) => {
  let text;
  try { text = execSync('git show origin/main:docs/human-shaped/PRINCIPLES.md', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch (e) { t.skip('no origin/main here'); return; }
  const p = lib.parse(text);
  assert.equal(p.length, 15);
  assert.deepEqual(p.map((x) => x.n), Array.from({ length: 15 }, (_, i) => i + 1));
  assert.equal(p[0].anchor, '1-a-humanshaped-problem'.replace('humanshaped', 'human-shaped'));
  assert.equal(p[12].anchor, '13-the-builders-own-voice');
});
