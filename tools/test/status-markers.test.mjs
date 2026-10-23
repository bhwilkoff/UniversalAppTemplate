// Every data-status marker in a page names a status the design kit knows,
// because ui.js turns each one into a status and an unknown one used to
// throw before window.UI existed, taking the page down (the time poll,
// the board, and app pages, October 23, 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis; globalThis.document = undefined;
const root = new URL('../../', import.meta.url).pathname;
const UI = (() => { const g = {}; new Function('window', readFileSync(join(root, 'assets/ui.js'), 'utf8').replace(/\}\)\(typeof window[^;]*;\s*$/, '})(window);'))(g); return g.UI; })();

function pages(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules' || n === 'tools' || n === 'supabase' || n === 'research' || n === 'design') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out); else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}

test('every status marker in a page is one the kit knows', () => {
  const bad = [];
  for (const p of pages(root)) {
    const html = readFileSync(p, 'utf8');
    for (const m of html.matchAll(/data-status(?:="([^"]*)")?(?=[\s>])/g)) {
      const [thing, state] = String(m[1] || '').split('.');
      if (!UI.STATUS[thing] || !UI.STATUS[thing][state]) bad.push(p.replace(root, '') + ': data-status="' + (m[1] || '') + '"');
    }
  }
  assert.deepEqual(bad, []);
});

// A page whose scripts call the design kit loads it (the Meet add-on's
// panel did not, and a leader's question card threw the moment it drew,
// October 23, 2026).
test('every page that uses window.UI loads ui.js', () => {
  const bad = [];
  for (const p of pages(root)) {
    const html = readFileSync(p, 'utf8');
    const srcs = [...html.matchAll(/<script src="\/assets\/([^"?]+)/g)].map((m) => m[1]);
    if (srcs.includes('ui.js')) continue;
    const users = srcs.filter((s) => { try { return /window\.UI\b/.test(readFileSync(join(root, 'assets', s), 'utf8')); } catch { return false; } });
    if (users.length) bad.push(p.replace(root, '') + ' (' + users.join(', ') + ')');
  }
  assert.deepEqual(bad, []);
});
