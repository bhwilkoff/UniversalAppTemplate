#!/usr/bin/env node
// How every page holds up as a desktop browser window is made wider and
// narrower. It opens each page in headless Chrome, then for each width:
//
//   1. loads the page fresh at that width, and
//   2. drags the same open page there from the widest width (the way
//      someone resizes a window), and compares the two.
//
// It reports a page that scrolls sideways, anything poking past the right
// edge, and any element whose size after a live resize differs from a fresh
// load at the same width (layout that was fixed by script at load and never
// follows the window). Screenshots of each width land in --out.
//
//   node tools/responsive/check.mjs                      (humanshaped.org)
//   node tools/responsive/check.mjs --base http://localhost:8080 --only exchange
//   node tools/responsive/check.mjs --shots              (also save PNGs)
//
// It signs no one in: pages are seen as a visitor. The exits are 0 when
// every page is clean, 1 when something overflows or fails to follow.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'https://humanshaped.org').replace(/\/$/, '');
const ONLY = opt('--only', '');
const OUT = opt('--out', join(tmpdir(), 'hs-responsive'));
const SHOTS = args.includes('--shots');
const CHROME = opt('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
// Fresh loads at a few widths; the live resize steps through all of them.
const FRESH = [1440, 1024, 880, 640, 375];
const WIDTHS = [1600, 1440, 1280, 1100, 1024, 960, 896, 880, 800, 720, 640, 560, 480, 414, 375, 320];
const HEIGHT = Number(opt('--height', 900));
const WAIT = Number(opt('--wait', 3000));

// Three open exchanges on the live site, one per shape the page draws.
const PAGES = [
  '/', '/?public', '/about/', '/principles/', '/cohorts/', '/apps/', '/apps/app/?r=archive-watch',
  '/events/', '/account/', '/teach/', '/teach/times/', '/teach/guide/', '/teach/guide/week-1/',
  '/connect/', '/path/', '/path/01/', '/path/setup/', '/stuck/', '/stuck/playing/same-bug/',
  '/start/', '/start/sheets/', '/start/brand/', '/showcase/', '/support/', '/privacy/', '/terms/',
  '/times/', '/cohort/', '/live/', '/board/', '/credential/', '/card/',
  '/exchange/#26323fa0349b491daddd23c2f8d90fd5',
  '/exchange/#87d5d9378fa2419387a7389a66c3a1bd',
  '/exchange/#188c2c72029741de9680acebc98cc4d5',
  '/404.html'
].filter((p) => !ONLY || p.includes(ONLY));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chrome() {
  const dir = mkdtempSync(join(tmpdir(), 'hs-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws = await new Promise((res, rej) => {
    let buf = '';
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\S+)/.exec(buf); if (m) res(m[1]); });
    proc.on('exit', () => rej(new Error('Chrome exited before it was ready.')));
  });
  return { ws, async close() { const gone = new Promise((r) => proc.once('exit', r)); proc.kill(); await gone; rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); } };
}

function cdp(url) {
  const sock = new WebSocket(url);
  let id = 0; const wait = new Map(); const listeners = [];
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else listeners.forEach((l) => l(m));
  };
  return new Promise((res) => sock.onopen = () => res({
    send(method, params = {}, sessionId) { const n = ++id; sock.send(JSON.stringify({ id: n, method, params, sessionId })); return new Promise((r, j) => wait.set(n, { res: r, rej: j })); },
    on(fn) { listeners.push(fn); },
    close() { sock.close(); }
  }));
}

// Runs in the page: what overflows, and the box of every visible element
// keyed by its path, so two layouts at the same width can be compared.
const MEASURE = `(() => {
  const W = document.documentElement.clientWidth;
  const path = (el) => { const p = []; for (let e = el; e && e !== document.body; e = e.parentElement) { const i = [...e.parentElement.children].indexOf(e); p.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ':' + i); } return p.join('>'); };
  const clipped = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return true; } return false; };
  const over = []; const boxes = {};
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.position === 'fixed') continue;
    const k = path(el);
    boxes[k] = [Math.round(r.width), Math.round(r.height)];
    if ((r.right > W + 1 || r.left < -1) && !clipped(el) && !el.closest('.skip')) over.push({ el: k.split('>').slice(-3).join(' > '), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
  }
  return { W, scrollW: document.documentElement.scrollWidth, over: over.slice(0, 12), boxes };
})()`;

async function main() {
  const c = await chrome();
  const b = await cdp(c.ws);
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  let loaded = null;
  b.on((m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired' && loaded) loaded(); });
  const size = (w) => s('Emulation.setDeviceMetricsOverride', { width: w, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  const go = async (url) => { const p = new Promise((r) => loaded = r); await s('Page.navigate', { url: 'about:blank' }); await s('Page.navigate', { url }); await Promise.race([p, sleep(15000)]); await sleep(WAIT); };
  const measure = async () => (await s('Runtime.evaluate', { expression: MEASURE, returnByValue: true })).result.value;
  if (SHOTS) mkdirSync(OUT, { recursive: true });

  let bad = 0;
  for (const page of PAGES) {
    const url = BASE + page;
    const problems = [];
    const fresh = {};
    for (const w of FRESH) {
      await size(w); await go(url);
      const m = await measure(); fresh[w] = m;
      if (m.scrollW > m.W + 1) problems.push(`${w}px fresh: the page scrolls sideways (${m.scrollW} wide).`);
      for (const o of m.over) problems.push(`${w}px fresh: ${o.el} reaches ${o.left}..${o.right}.`);
      if (SHOTS) { const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(join(OUT, `${page.replace(/[^a-z0-9]+/gi, '_')}-${w}.png`), Buffer.from(shot.data, 'base64')); }
    }
    // The live resize: one load at the widest width, then narrower and back.
    await size(WIDTHS[0]); await go(url);
    for (const w of [...WIDTHS.slice(1), ...WIDTHS.slice(0, -1).reverse()]) {
      await size(w); await sleep(350);
      const m = await measure();
      if (m.scrollW > m.W + 1) problems.push(`${w}px resized: the page scrolls sideways (${m.scrollW} wide).`);
      for (const o of m.over) problems.push(`${w}px resized: ${o.el} reaches ${o.left}..${o.right}.`);
      if (!fresh[w]) continue;
      const f = fresh[w].boxes; const diffs = [];
      for (const k of Object.keys(m.boxes)) {
        if (!f[k]) continue;
        const [a, h] = m.boxes[k]; const [fa, fh] = f[k];
        if (Math.abs(a - fa) > 2 || Math.abs(h - fh) > 2) diffs.push(`${k.split('>').slice(-2).join(' > ')} is ${a}x${h}, fresh ${fa}x${fh}`);
      }
      if (diffs.length) problems.push(`${w}px resized differs from fresh: ${diffs.slice(0, 4).join('; ')}${diffs.length > 4 ? ` (+${diffs.length - 4} more)` : ''}`);
    }
    const uniq = [...new Set(problems)];
    console.log(`${uniq.length ? 'FAIL' : 'ok  '} ${page}`);
    uniq.slice(0, 30).forEach((p) => console.log('     ' + p));
    if (uniq.length) bad++;
  }
  b.close(); await c.close();
  if (SHOTS) console.log(`Screenshots: ${OUT}`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
