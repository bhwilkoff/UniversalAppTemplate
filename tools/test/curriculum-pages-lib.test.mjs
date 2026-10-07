import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const L = require('../../assets/curriculum-pages-lib.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every week from Prep to 5 leads with one of the three moves and asks one question', () => {
  assert.deepEqual(L.WEEKS.map(w => w.week), [0, 1, 2, 3, 4, 5]);
  for (const w of L.WEEKS) {
    assert.match(w.lead, /^(Write|Play|Publish)(, then (write|play|publish))?$/);
    assert.ok(['writing', 'playing', 'publishing'].includes(w.move));
    // The stuck page follows the move the week leads with (its first word).
    assert.equal(w.move.slice(0, 4), w.lead.toLowerCase().slice(0, 4));
    assert.match(w.question, /\?$/);
  }
  assert.equal(L.weekOf(1).question, 'What problem in your own life is worth building something for, and who else has it?');
});

test('a week is found from its session number, and nothing else is a week', () => {
  assert.equal(L.weekOf(0).name, 'Cohort Prep');
  assert.equal(L.weekOf('3').lead, 'Play, then write');
  for (const n of [null, undefined, '', 6, -1, 2.5, 'two']) assert.equal(L.weekOf(n), null);
});

test('"Stuck?" goes to the page for the move the week leads with, or the whole library', () => {
  assert.deepEqual(L.stuckFor(1), { url: '/stuck/writing/', label: 'Stuck writing', move: 'writing', lead: 'Write' });
  assert.equal(L.stuckFor(2).url, '/stuck/playing/');
  assert.equal(L.stuckFor(4).url, '/stuck/publishing/');
  assert.equal(L.stuckFor(5).url, '/stuck/writing/');
  assert.deepEqual(L.stuckFor(null), { url: '/stuck/', label: 'When you are stuck', move: null });
  assert.equal(L.stuckFor(9).url, '/stuck/');
});

test('"The question." is recognized as written, and nothing else is', () => {
  for (const t of ['The question.', 'the question', '  The   question. ']) assert.ok(L.isQuestionLabel(t), t);
  for (const t of ['The question is', 'Question.', 'The questions.', '', null]) assert.ok(!L.isQuestionLabel(t), String(t));
});

test('render.js sends every stuck library file to its page here, and only there', () => {
  const src = readFileSync(join(ROOT, 'assets', 'render.js'), 'utf8');
  const map = L.stuckSiteMap();
  for (const [doc, url] of Object.entries(map)) assert.ok(src.includes(`'${doc}': '${url}'`), doc);
  const inRender = [...src.matchAll(/'(docs\/stuck\/[^']*)': '([^']*)'/g)].map(m => m[1]);
  assert.deepEqual(inRender.sort(), Object.keys(map).sort());
});

test('every stuck page has its own folder that reads its file, and is in the sitemap', () => {
  const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  const urls = new Set();
  for (const p of L.STUCK) {
    assert.ok(!urls.has(p.url), 'one page per address: ' + p.url);
    urls.add(p.url);
    const file = join(ROOT, p.url.replace(/^\//, ''), 'index.html');
    assert.ok(existsSync(file), file);
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes(`data-doc="${p.doc}"`), p.url);
    assert.ok(html.includes(`<link rel="canonical" href="https://humanshaped.org${p.url}">`), p.url);
    assert.ok(sitemap.includes(`<loc>https://humanshaped.org${p.url}</loc>`), p.url);
    assert.ok(!/—/.test(html), 'no em dashes: ' + p.url);
  }
  assert.equal(L.STUCK.filter(p => p.move === null).length, 1);
  for (const m of ['writing', 'playing', 'publishing']) assert.ok(L.STUCK.some(p => p.url === L.MOVES[m].url), m);
});
