// The rules in DESIGN-KIT.md that a test can check. A rule that cannot be
// checked here is still binding; this catches the ones that can.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SKIP = /^(research|tools|design|supabase|node_modules|\.git|assets\/vendor)\//;
function files(dir, ext, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = dir ? dir + '/' + name : name;
    if (SKIP.test(rel + '/')) continue;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) files(rel, ext, out);
    else if (rel.endsWith(ext)) out.push(rel);
  }
  return out;
}
const scripts = files('assets', '.js');
const pages = files('', '.html');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const kit = read('DESIGN-KIT.md');
function listUnder(heading) {
  const start = kit.indexOf(heading);
  const block = kit.slice(start, kit.indexOf('\n### ', start + 1));
  return block;
}
const STATUS_WORDS = new Set([...listUnder('### Status label').matchAll(/^  - [^:]+: (.+)$/gm)]
  .flatMap((m) => m[1].split(',').map((w) => w.trim())));
const AUDIENCES = new Set(listUnder('### Visibility marker').match(/\*\*Audiences\*\*: ([\s\S]*?)\.\n/)[1]
  .replace(/\s+/g, ' ').split(' · ').map((w) => w.trim()));

function problems(text, file) {
  const out = [];
  if (/window\.(confirm|alert|prompt)\s*\(/.test(text)) out.push(file + ': a browser dialog instead of the confirm step or inline status');
  if (/class="role-line"|'role-line'/.test(text)) out.push(file + ': a role sentence instead of the interface');
  for (const m of text.matchAll(/\bUI?\.status\(\s*'(\w+)'\s*,\s*'([^']+)'\s*\)/g)) {
    if (!STATUS_WORDS.has(m[2])) out.push(file + ': status word "' + m[2] + '" is not in DESIGN-KIT.md');
  }
  for (const m of text.matchAll(/class="ui-visibility">[\s\S]*?<span>([^<]+)<\/span>/g)) {
    if (!AUDIENCES.has(m[1].trim())) out.push(file + ': visibility words "' + m[1].trim() + '" are not an audience in DESIGN-KIT.md');
  }
  return out;
}

test('the checks catch what they look for (negative control)', () => {
  assert.equal(problems("if (!window.confirm('Sure?')) return;", 'x').length, 1);
  assert.equal(problems("UI.status('off', 'Visible only to you')", 'x').length, 1);
  assert.equal(problems('<span class="ui-visibility"><svg></svg><span>Only you and the cohort</span></span>', 'x').length, 1);
  assert.equal(problems("UI.status('off', 'Draft')", 'x').length, 0);
  assert.equal(problems('<span class="ui-visibility"><svg></svg><span>Only teachers</span></span>', 'x').length, 0);
});

test('the kit lists its status words and audiences', () => {
  assert.ok(STATUS_WORDS.has('Draft') && STATUS_WORDS.has('Signed'));
  assert.ok(AUDIENCES.has('Only you') && AUDIENCES.has('Your cohort'));
});

test('no page or script breaks a rule the kit can check', () => {
  const all = scripts.concat(pages).flatMap((f) => problems(read(f), f));
  assert.deepEqual(all, []);
});
