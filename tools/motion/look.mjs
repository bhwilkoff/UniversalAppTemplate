// Draws every kind of kinetic slide at every step in headless Chrome, with the
// still slide beside it, and saves a picture of each, so a change to
// assets/kinetic-kit.js is looked at before it ships. It also steps back, draws
// one point and eight, and a picture on a point, and fails on any error.
// --thumbs writes the studio's pictures of each kind to assets/kinetic/.
// Uses the board's copy of playwright-core (cd tools/board && npm ci first).
//
//   node tools/motion/look.mjs <folder for the pictures> [--thumbs] [kind ...]
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
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
