// Draws every kind of moving slide at every step in headless Chrome, with the
// still slide beside it, and saves a picture of each, so a change to
// assets/motion-kit.js is looked at before it ships. Uses the board's copy of
// playwright-core (cd tools/board && npm ci first).
//
//   node tools/motion/look.mjs <folder for the pictures> [kind ...]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(SITE, 'tools/board/package.json'));
const { chromium } = require('playwright-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const out = process.argv[2];
if (!out) { console.log('Say where the pictures go: node tools/motion/look.mjs <folder> [kind ...]'); process.exit(1); }
const kinds = process.argv.slice(3).length ? process.argv.slice(3) : ['stack', 'pile', 'forward'];
await mkdir(out, { recursive: true });

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let body;
  try { body = await readFile(join(SITE, path)); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1928, height: 608 } });
const said = [];
page.on('console', (m) => said.push(m.text()));
page.on('pageerror', (e) => said.push('error: ' + e.message));
let failed = 0;
for (const kind of kinds) {
  for (const shown of [1, 2, 3, 0]) {
    await page.goto(origin + '/tools/motion/check.html?kind=' + kind + '&shown=' + shown);
    await page.waitForFunction(() => { const c = document.querySelector('.motion-canvas'); return c && !c.hidden; }, null, { timeout: 15000 }).catch(() => { failed += 1; said.push(kind + ' ' + shown + ': the canvas never showed'); });
    await page.waitForTimeout(4500);
    const seen = await page.evaluate(() => { const st = document.getElementById('m').__motion, c = st && st.canvas; return c ? { w: c.width, h: c.height, css: c.getBoundingClientRect().width, calls: st.renderer && st.renderer.info.render.calls, tris: st.renderer && st.renderer.info.render.triangles, broken: st.broken } : null; });
    if (!seen || !seen.calls) { failed += 1; said.push(kind + ' ' + shown + ': nothing drawn ' + JSON.stringify(seen)); }
    await page.screenshot({ path: join(out, kind + '-' + (shown || 'all') + '.png') });
  }
}
await browser.close();
server.close();
if (said.length) console.log(said.join('\n'));
console.log(failed ? failed + ' did not draw' : 'every kind drew at every step; pictures in ' + out);
process.exit(failed ? 1 : 0);
