// The rules in DESIGN-KIT.md that a test can check (research/notes/
// design-kit-research.md, section 7). A rule that cannot be checked here is
// still binding; this catches the ones that can, on every page and script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = new URL('../../', import.meta.url).pathname;
const SKIP = /^(research|tools|design|supabase|node_modules|\.git|assets\/vendor|addon\/stage)\//;
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
const scripts = files('assets', '.js').filter((f) => f !== 'assets/ui.js');
const pages = files('', '.html');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
// What a person sees: code comments and HTML comments are not interface.
const shown = (f) => read(f).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
// Reading pages explain on purpose: the privacy notice and the terms.
const READING = new Set(['privacy/index.html', 'terms/index.html']);
const kit = read('DESIGN-KIT.md');

// ui.js runs here without a page: give it just enough of one.
globalThis.HTMLElement = function () {};
const sandbox = {};
new Function('window', read('assets/ui.js'))(sandbox);
const UI = sandbox.UI;

// The registry as DESIGN-KIT.md writes it: "- thing: Word (tone), ...".
function kitRegistry() {
  const start = kit.indexOf('The registry is the only source of status words');
  const block = kit.slice(start, kit.indexOf('\n### ', start));
  const out = {};
  for (const m of block.matchAll(/^- ([a-z ]+): (.+)$/gm)) {
    out[m[1].trim()] = m[2].split(/,\s*/).map((x) => { const r = /^(.+) \((\w+)\)$/.exec(x.trim()); return r ? [r[1], r[2]] : null; });
  }
  return out;
}
const KIT_NAME = { cohort: 'cohort', session: 'session', poll: 'poll', request: 'request to teach', credential: 'credential', app: 'app', invitation: 'invitation', exchange: 'exchange', task: 'task', connection: 'connection', key: 'key', work: 'work', showing: 'showing', right: 'right', action: 'action' };

const PRIVACY = [/only you and (the|your)/i, /only the people in/i, /anyone with its link/i, /seen only by/i, /stays yours alone|yours alone until/i, /for you alone/i, /only you can see/i, /only the teacher sees/i];
const LOADING = [/Checking whether you are signed in/, /Opening the (cohort|session|board|card|exchange)/, /Finding the poll/, /Reading this /];

function problems(text, file) {
  const out = [];
  const add = (why) => out.push(file + ': ' + why);
  if (/window\.(confirm|alert|prompt)\s*\(/.test(text)) add('a browser dialog instead of UI.confirm or UI.say');
  if (/class="role-line"|'role-line'/.test(text)) add('a role sentence instead of the interface');
  if (/Click again to|data-armed/.test(text)) add('an arming button instead of UI.confirm');
  if (/\b(toast|snackbar)\b/i.test(text) && !/no toasts?/i.test(text)) add('a toast instead of inline status');
  for (const m of text.matchAll(/\bUI?\.status\(\s*'([a-z]+)'\s*,\s*'([a-z]+)'\s*\)/g)) {
    if (!(UI.STATUS[m[1]] && UI.STATUS[m[1]][m[2]])) add('status ' + m[1] + '.' + m[2] + ' is not in the registry');
  }
  for (const m of text.matchAll(/\bUI?\.visibility\(\s*'([a-z]+)'/g)) {
    if (!UI.AUDIENCES[m[1]]) add('audience ' + m[1] + ' is not in the kit');
  }
  for (const m of text.matchAll(/data-vis="([a-z]+)"/g)) if (!UI.AUDIENCES[m[1]]) add('audience ' + m[1] + ' is not in the kit');
  for (const m of text.matchAll(/data-status="([a-z]+)\.([a-z]+)"/g)) if (!(UI.STATUS[m[1]] && UI.STATUS[m[1]][m[2]])) add('status ' + m[1] + '.' + m[2] + ' is not in the registry');
  if (/class="ui-visibility"|class="ui-status /.test(text)) add('a part drawn by hand instead of data-vis / data-status or ui.js');
  for (const re of PRIVACY) if (re.test(text)) add('who can see something, said in a sentence (' + re.source + ')');
  for (const re of LOADING) if (re.test(text)) add('a loading sentence instead of the skeleton (' + re.source + ')');
  // A hub page (one the hub draws: it has sign-in states) opens with its
  // name and its parts, never an intro paragraph or a slogan. A lead the
  // page fills from data (data-lead) is the thing's own words, not ours.
  if (/data-state="(loading|teacher|ready|signed-in)"/.test(text)) {
    for (const m of text.matchAll(/<p class="lead"(?![^>]*data-)[^>]*>([^<]{1,})/g)) add('an intro paragraph on a hub page: ' + m[1].trim().slice(0, 60));
    // Long paragraphs explain; a part does the job. Words inside a notice
    // (warnings, refusals) or a closed disclosure are allowed.
    const bare = text.replace(/<details[\s\S]*?<\/details>/g, '').replace(/<[a-z]+ class="[^"]*notice[^"]*"[\s\S]*?<\/(p|div|section)>/g, '');
    for (const m of bare.matchAll(/<p(?![^>]*data-)[^>]*>([\s\S]*?)<\/p>/g)) {
      const words = m[1].replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (words.length > 20) add('a paragraph of ' + words.length + ' words on a hub page: ' + words.slice(0, 8).join(' '));
    }
    for (const m of text.matchAll(/<h1(?![^>]*data-)[^>]*>([^<]+)<\/h1>/g)) {
      if (/\.$/.test(m[1].trim())) add('a heading that is a sentence, not a name: ' + m[1].trim());
    }
  }
  for (const m of text.matchAll(/UI\.empty\(\s*'([^']+)'/g)) {
    if (m[1].split(/\s+/).length > 8) add('empty state longer than eight words: ' + m[1]);
    if (/will be (listed )?here|when one opens|, so /i.test(m[1])) add('empty state explains instead of stating: ' + m[1]);
  }
  return out;
}

test('the checks catch what they look for (negative control)', () => {
  assert.equal(problems("if (!window.confirm('Sure?')) return;", 'x').length, 1);
  assert.equal(problems("UI.status('cohort', 'visible')", 'x').length, 1);
  assert.equal(problems("U.visibility('everyone')", 'x').length, 1);
  assert.equal(problems('<p>Only you and the cohort\'s teachers can read these.</p>', 'x').length, 1);
  assert.equal(problems('<p>Checking whether you are signed in…</p>', 'x').length, 1);
  assert.equal(problems("b.textContent = 'Click again to delete it'", 'x').length, 1);
  assert.equal(problems("UI.status('cohort', 'draft'); U.visibility('cohort'); <span data-vis=\"link\"></span>", 'x').length, 0);
  assert.equal(problems('<section data-state="teacher"></section><h1>Run a cohort.</h1><p class="lead">A cohort is something you make here.</p>', 'x').length, 2);
  assert.equal(problems('<section data-state="teacher"></section><h1>Teaching</h1><p class="lead" data-lead></p>', 'x').length, 0);
});

test('ui.js and DESIGN-KIT.md list the same status words and tones', () => {
  const k = kitRegistry();
  for (const [thing, states] of Object.entries(UI.STATUS)) {
    const listed = k[KIT_NAME[thing]];
    assert.ok(listed, 'DESIGN-KIT.md lists ' + thing);
    const words = Object.values(states).map((s) => s[1] + ' (' + s[0] + ')').sort();
    assert.deepEqual(listed.map((x) => x[0] + ' (' + x[1] + ')').sort(), words, thing);
  }
});

test('status words are short, sentence case, and never a verb from the action set', () => {
  const verbs = /^(Remove|Delete|Hide|Show|Leave|Take back|Save|Make|Open the|Send)\b/;
  for (const states of Object.values(UI.STATUS)) {
    for (const [tone, word] of Object.values(states)) {
      assert.ok(['done', 'active', 'waiting', 'off', 'problem'].includes(tone), word);
      assert.ok(word.split(' ').length <= 4, word);
      assert.equal(word[0], word[0].toUpperCase(), word);
      assert.equal(word.slice(1), word.slice(1).replace(/[A-Z]/g, (c) => c), word);
      assert.ok(!verbs.test(word), word);
    }
  }
});

test('the stylesheet gives status and count no box, and nothing a colored stripe', () => {
  const css = read('assets/site.css');
  for (const m of css.matchAll(/\.ui-(status|count)[^{]*\{([^}]*)\}/g)) {
    assert.ok(!/background|border(?!-?collapse)|border-radius/.test(m[2]), '.ui-' + m[1] + ' must have no box: ' + m[2]);
  }
  // A grey rule beside a quotation is the ordinary quote mark; any other
  // color on a thick edge is a stripe.
  const stripes = [...css.matchAll(/border-(left|top):\s*(?:clamp\([^)]*\)|([2-9]|\d{2,})px)[^;]*;/g)].map((m) => m[0]).filter((d) => !/var\(--rule\)/.test(d));
  assert.deepEqual(stripes, [], 'no colored edge stripes');
});

// A generated sentence over 22 words is an explanation. Steps in someone
// else's app, a session plan's own words, and a query are content: their
// line carries "kit: content".
function longStrings(raw, file) {
  const out = [];
  raw.split('\n').forEach((line, i) => {
    if (/kit: content/.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
    for (const m of line.matchAll(/'((?:[^'\\]|\\.){120,})'/g)) {
      if (m[1].split(/\s+/).length > 22) out.push(file + ':' + (i + 1) + ': a generated sentence of ' + m[1].split(/\s+/).length + ' words: ' + m[1].slice(0, 50));
    }
  });
  return out;
}

test('no script generates a long explanation', () => {
  assert.deepEqual(scripts.flatMap((f) => longStrings(read(f), f)), []);
});

test('no page or script breaks a rule the kit can check', () => {
  const all = scripts.concat(pages.filter((f) => !READING.has(f))).flatMap((f) => problems(shown(f), f));
  assert.deepEqual(all, []);
});
