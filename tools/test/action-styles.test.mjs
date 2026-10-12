// The site's actions and links follow one standard (assets/site.css,
// "Actions"; research/notes/links-and-actions-notes.md; Ben, October 12,
// 2026: "We need a consistent design for links and actions within the
// site"). This fails if a retired style comes back, if a row of actions
// in a page has more than one filled button or a filled button that is not
// first, if a red button is not last in its row, or if a row holds a link
// or button with no button style. Script-built rows are not read here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tracked = (globs) => execSync(`git ls-files ${globs}`, { cwd: root, encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !/^(design|tools)\//.test(f) && !f.startsWith('assets/vendor/') && !f.includes('node_modules/'));
const pages = tracked("'*.html'");
const scripts = tracked("'assets/*.js'");

const RETIRED = [
  ['btn-github', /\bbtn-github\b/], ['btn-quiet', /\bbtn-quiet\b/], ['btn-link', /\bbtn-link\b/],
  ['link-btn', /\blink-btn\b/], ['go-text', /\bgo-text\b/], ['a.go', /class="go"/], ['hero a.text', /<a class="text"/]
];

export function retiredIn(text) {
  return RETIRED.filter(([, re]) => re.test(text)).map(([name]) => name);
}

// Each element with the class "actions" in a page, and the action classes
// of the buttons and links directly in it, in order.
export function rows(html) {
  const out = [];
  const open = /<(div|p)\b[^>]*class="(?:[^"]*\s)?actions(?:\s[^"]*)?"[^>]*>/g;
  let m;
  while ((m = open.exec(html))) {
    const tag = m[1];
    let depth = 1, i = open.lastIndex;
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
    re.lastIndex = i;
    let n;
    while (depth && (n = re.exec(html))) depth += n[1] ? -1 : 1;
    const inner = html.slice(i, n ? n.index : html.length);
    const kinds = [...inner.matchAll(/<(?:a|button)\b([^>]*)>/g)]
      .map((x) => ((x[1].match(/class="[^"]*\bbtn-(primary|secondary|danger)\b/) || [])[1]) || 'bare');
    out.push(kinds);
  }
  return out;
}

export function rowProblem(kinds) {
  if (kinds.includes('bare')) return 'a link or button without a button style';
  const primaries = kinds.filter((k) => k === 'primary').length;
  if (primaries > 1) return 'more than one filled button';
  if (primaries === 1 && kinds[0] !== 'primary') return 'the filled button is not first';
  const lastSafe = kinds.map((k) => k !== 'danger').lastIndexOf(true);
  const firstDanger = kinds.indexOf('danger');
  if (firstDanger !== -1 && firstDanger < lastSafe) return 'a red button is not last';
  return null;
}

test('the checks catch what they look for (negative control)', () => {
  assert.deepEqual(retiredIn('<a class="go-text" href="/">x</a><button class="link-btn">'), ['link-btn', 'go-text']);
  assert.equal(rowProblem(['primary', 'primary']), 'more than one filled button');
  assert.equal(rowProblem(['secondary', 'primary']), 'the filled button is not first');
  assert.equal(rowProblem(['danger', 'secondary']), 'a red button is not last');
  assert.equal(rowProblem(['primary', 'secondary', 'danger']), null);
  assert.equal(rowProblem(['primary', 'bare']), 'a link or button without a button style');
  assert.deepEqual(rows('<div class="header-actions"><a href="/">x</a></div>'), []);
  assert.deepEqual(rows('<div class="actions"><button class="btn-danger final">a</button><div><button class="btn-secondary">b</button></div></div>'), [['danger', 'secondary']]);
});

test('no page or script uses a retired link or button style', () => {
  const found = [];
  for (const f of [...pages, ...scripts]) {
    const names = retiredIn(readFileSync(path.join(root, f), 'utf8'));
    if (names.length) found.push(`${f}: ${names.join(', ')}`);
  }
  assert.deepEqual(found, []);
});

test('the stylesheet defines none of the retired styles', () => {
  const css = readFileSync(path.join(root, 'assets/site.css'), 'utf8');
  assert.deepEqual(retiredIn(css.replace(/class="/g, '')).filter((n) => n !== 'a.go' && n !== 'hero a.text'), []);
  assert.doesNotMatch(css, /\ba\.go\b|\.hero-actions a\.text/);
});

test('every row of actions in a page has at most one filled button, first, and red last', () => {
  const found = [];
  for (const f of pages) {
    rows(readFileSync(path.join(root, f), 'utf8')).forEach((kinds) => {
      const why = rowProblem(kinds);
      if (why) found.push(`${f}: ${why} (${kinds.join(', ')})`);
    });
  }
  assert.deepEqual(found, []);
});
