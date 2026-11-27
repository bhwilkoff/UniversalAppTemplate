// Draws every kind of kinetic slide at every step in headless Chrome, with the
// still slide beside it, and saves a picture of each, so a change to
// assets/kinetic-kit.js is looked at before it ships. It also steps back, draws
// one point and eight, and a picture on a point, and fails on any error. First
// it checks reduced motion, the lighter drawing for a slow computer, and fifty
// trips through every kind for anything that grows.
// --thumbs writes the studio's pictures of each kind to assets/kinetic/.
// Uses the board's copy of playwright-core (cd tools/board && npm ci first).
//
//   node tools/motion/look.mjs <folder for the pictures> [--thumbs] [--only-checks] [kind ...]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(SITE, 'tools/board/package.json'));
const { chromium } = require('playwright-core');
const L = require(join(SITE, 'assets/slides-lib.js'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const args = process.argv.slice(2), out = args[0], thumbs = args.includes('--thumbs');
if (!out) { console.log('Say where the pictures go: node tools/motion/look.mjs <folder> [--thumbs] [kind ...]'); process.exit(1); }
const named = args.slice(1).filter((a) => !a.startsWith('--'));
const kinds = named.length ? named : L.KINETIC_KINDS.map((k) => k.key);
await mkdir(out, { recursive: true });

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let body;
  try { body = await readFile(join(SITE, path)); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'access-control-allow-origin': '*' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 1928, height: 608 } });
const said = [];
page.on('console', (m) => { if (!/GL Driver|status of 404/.test(m.text())) said.push(m.text()); });
page.on('pageerror', (e) => said.push('error: ' + e.message));
let failed = 0;
async function look(kind, query, name, wait = 4500) {
  await page.goto(origin + '/tools/motion/check.html?kind=' + kind + '&' + query);
  const ok = await page.waitForFunction(() => { const c = document.querySelector('.kinetic-canvas'); return c && !c.hidden; }, null, { timeout: 15000 }).then(() => true, () => false);
  await page.waitForTimeout(wait);
  const seen = await page.evaluate(() => { const st = document.getElementById('m').__kinetic; return st ? { calls: st.renderer && st.renderer.info.render.calls, broken: st.broken } : null; });
  if (!ok || !seen || !seen.calls || seen.broken) { failed += 1; said.push(kind + ' ' + query + ': nothing drawn ' + JSON.stringify(seen)); }
  await page.screenshot({ path: join(out, name + '.png'), clip: { x: 0, y: 0, width: 960, height: 600 } });
}
// Reduced motion: each piece is placed at once and nothing keeps drawing.
await page.emulateMedia({ reducedMotion: 'reduce' });
for (const kind of ['stack', 'forward', 'gather']) {
  await page.goto(origin + '/tools/motion/check.html?kind=' + kind + '&shown=2');
  await page.waitForFunction(() => { const c = document.querySelector('.kinetic-canvas'); return c && !c.hidden; }, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const st = document.getElementById('m').__kinetic; return { raf: st.raf, busy: st.kind.update(0, 0, true) }; });
  if (r.raf || r.busy) { failed += 1; said.push(kind + ' with reduced motion kept moving ' + JSON.stringify(r)); }
  await page.screenshot({ path: join(out, kind + '-calm.png'), clip: { x: 0, y: 0, width: 960, height: 600 } });
}
await page.emulateMedia({ reducedMotion: 'no-preference' });
// A slow computer: lighter drawing, still every piece in place.
for (const kind of ['pile', 'gather']) {
  await page.goto(origin + '/tools/motion/check.html?kind=' + kind + '&shown=0&q=low');
  await page.waitForFunction(() => { const c = document.querySelector('.kinetic-canvas'); return c && !c.hidden; }, null, { timeout: 15000 });
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => { const st = document.getElementById('m').__kinetic; return { low: st.low, shadows: st.renderer.shadowMap.enabled, ratio: st.renderer.getPixelRatio() }; });
  if (!r.low || r.shadows || r.ratio !== 1) { failed += 1; said.push(kind + ' did not draw lighter ' + JSON.stringify(r)); }
  await page.screenshot({ path: join(out, kind + '-low.png'), clip: { x: 0, y: 0, width: 960, height: 600 } });
}
// On its own, a computer this slow (software WebGL) steps down within a few
// steps, and the steps keep coming.
{
  await page.goto(origin + '/tools/motion/check.html?kind=stack&shown=1&q=auto&n=8');
  await page.waitForFunction(() => { const c = document.querySelector('.kinetic-canvas'); return c && !c.hidden; }, null, { timeout: 15000 });
  const r = await page.evaluate(async () => {
    const box = document.getElementById('m'), t = SlidesLib.deck(document.title && window.__raw || '');
    for (let s = 2; s <= 8; s++) { at(s); await new Promise((ok) => setTimeout(ok, 1800)); }
    const st = box.__kinetic; return { low: st.low, beat: st.want.beat, shadows: st.renderer.shadowMap.enabled, times: st.times.map((x) => Math.round(x * 1000)) };
  });
  if (!r.low || r.beat !== 8) { failed += 1; said.push('a slow computer did not step down on its own ' + JSON.stringify(r)); }
  else said.push('stepped down on its own: ' + JSON.stringify(r));
}
// Fifty trips through every kind in one box: nothing the 3D holds may grow.
{
  await page.goto(origin + '/tools/motion/check.html?kind=stack&shown=1');
  await page.waitForFunction(() => { const c = document.querySelector('.kinetic-canvas'); return c && !c.hidden; }, null, { timeout: 15000 });
  const trips = await page.evaluate(() => window.cycle(50));
  const first = trips[11], last = trips[trips.length - 1 - ((trips.length - 12) % 12)];
  const grew = last.geometries > first.geometries + 2 || last.textures > first.textures + 2;
  said.push('after 12 trips: ' + JSON.stringify(first) + '; after ' + (trips.indexOf(last) + 1) + ': ' + JSON.stringify(last));
  if (grew) { failed += 1; said.push('the 3D grew across fifty trips'); }
}
if (args.includes('--only-checks')) { await browser.close(); server.close(); console.log([...new Set(said)].join('\n')); console.log(failed ? failed + ' failed' : 'reduced motion, lighter drawing, and fifty trips all passed'); process.exit(failed ? 1 : 0); }
for (const kind of kinds) {
  for (const shown of [1, 2, 3, 0]) await look(kind, 'shown=' + shown, kind + '-' + (shown || 'all'));
  await look(kind, 'shown=2&back=1', kind + '-back', 6500);
  await look(kind, 'shown=0&n=1', kind + '-one');
  await look(kind, 'shown=0&n=8', kind + '-eight');
  await look(kind, 'shown=1&pic=1', kind + '-picture');
  if (thumbs) {
    await mkdir(join(SITE, 'assets/kinetic'), { recursive: true });
    execFileSync('sips', ['-z', '200', '320', join(out, kind + '-all.png'), '--out', join(SITE, 'assets/kinetic', kind + '.png')], { stdio: 'ignore' });
  }
}
await browser.close();
server.close();
if (said.length) console.log([...new Set(said)].join('\n'));
console.log(failed ? failed + ' did not draw' : 'every kind drew at every step, back, with one point, eight, and a picture; pictures in ' + out);
process.exit(failed ? 1 : 0);
