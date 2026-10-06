import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const lib = createRequire(import.meta.url)('../../assets/principles-lib.js');

const md = `# The Human-Shaped Principles

## The principles

Each principle starts with what human-shaped software does.

Human-shaped software:

1. **Starts from a human-shaped problem,** one that affects real people
   in the real world.
2. **Increases what people are able to do,** rather than how much profit
   can be made from them.
15. **Brings joy to at least one person** in the form it ships today,
    even if that person is the builder.

## What each principle means
`;

test('the principles are read from the template’s own list, lead and sentence', () => {
  const p = lib.parse(md);
  assert.equal(p.length, 3);
  assert.deepEqual(p[0], { n: 1, lead: 'Starts from a human-shaped problem', rest: 'one that affects real people in the real world.', anchor: null });
  assert.equal(p[2].n, 15);
  assert.equal(p[2].lead, 'Brings joy to at least one person');
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

test('the principles page reads every principle whole, the same way for all fifteen', async () => {
  const { execSync } = await import('node:child_process');
  let md;
  try { md = execSync('git -C ../template-main show HEAD:docs/human-shaped/PRINCIPLES.md', { cwd: new URL('../../', import.meta.url).pathname, encoding: 'utf8' }); }
  catch { md = null; }
  const sample = `# The Human-Shaped Principles

*Version 0.6, October 5, 2026. Written by Ben Wilkoff.*

I want anyone to be able to say it.

## The principles

Each principle starts with what it does.

Human-shaped software:

1. **Starts from a problem,** one that matters.

## What each principle means

The principles stand on their own. Not every principle will be met on the first day. Silence is not.

## 1. A human-shaped problem

**Starts from a human-shaped problem, one that affects real people in
the real world.**

Some problems are computer-shaped.

A second paragraph, with [a link](computer-shaped-problems.md).

**How you can tell:** the builder has written down
what the problem is.

## Declaring software human-shaped

Not a principle.
`;
  const p = lib.page(sample);
  assert.equal(p.version, '0.6');
  assert.equal(p.intro, 'I want anyone to be able to say it.');
  assert.equal(p.stem, 'Human-shaped software:');
  assert.equal(p.notYet, 'Not every principle will be met on the first day. Silence is not.');
  assert.equal(p.principles.length, 1);
  const one = p.principles[0];
  assert.equal(one.anchor, '1-a-human-shaped-problem');
  assert.equal(one.statement, 'Starts from a human-shaped problem, one that affects real people in the real world.');
  assert.equal(one.body, 'Some problems are computer-shaped.\n\nA second paragraph, with [a link](computer-shaped-problems.md).');
  assert.equal(one.tell, 'the builder has written down what the problem is.');
  if (md) {
    const real = lib.page(md);
    assert.equal(real.principles.length, 15);
    assert.ok(real.principles.every(x => x.statement && x.tell && x.body && !/\*/.test(x.statement)));
    assert.equal(real.stem, 'Human-shaped software:');
  }
});
