// Two people drawing on one board at once, in two headless Chrome pages,
// against a stand-in for Supabase (fake-supabase.js): the real /board/
// page, the real vendored Excalidraw, and the real BoardLib, with the
// database and the Realtime channel kept here in memory. It checks that a
// stroke drawn in one page appears in the other, that both converge when
// they draw at once, that a dropped connection catches up when it comes
// back, that a change too large for one message is saved and read
// instead, that saves land in the stand-in database, and that a teacher's
// lock and clear reach the other page. It also takes screenshots.
//
//   cd tools/board && npm ci && node sync-check.mjs [screenshot folder]
//
// Uses the Google Chrome installed on this computer (playwright-core
// downloads no browser). Set CHROME to its path if it lives elsewhere.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '../..');
const BoardLib = createRequire(import.meta.url)('../../assets/board-lib.js');
const shots = process.argv[2] ? resolve(process.argv[2]) : null;
if (shots) mkdirSync(shots, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------------
// The site, served from this folder
// ---------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(site, p));
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;

// ---------------------------------------------------------------------
// The stand-in hub
// ---------------------------------------------------------------------
const BEN = randomUUID(), BEA = randomUUID(), GROUP = randomUUID();
const people = {
  ben: { id: BEN, user_metadata: { user_name: 'bhwilkoff', full_name: 'Ben' } },
  bea: { id: BEA, user_metadata: { user_name: 'bea', full_name: 'Bea' } }
};
const hub = {
  cohort: { id: randomUUID(), slug: 'stand-in', title: 'Stand-in cohort (delete me)', session_minutes: 75, status: 'running' },
  sessions: [], groups: [{ id: GROUP, name: 'Trio A', group_members: [{ user_id: BEA }] }], boards: []
};
hub.sessions.push({ id: randomUUID(), cohort_id: hub.cohort.id, number: 1, starts_at: new Date(Date.now() - 600000).toISOString(), title: 'Week 1' });
const copy = (v) => JSON.parse(JSON.stringify(v));
const teaches = (uid) => uid === BEN;
const seesBoard = (uid, b) => teaches(uid) || !b.group_id || hub.groups.some(g => g.id === b.group_id && g.group_members.some(m => m.user_id === uid));
const stats = { messages: 0, largest: 0, saves: 0, joinsNotPrivate: 0 };

function answer(uid, q) {
  if (q.rpc === 'open_board') {
    const { c, s, g } = q.args;
    let b = hub.boards.find(x => x.session_id === s && (x.group_id || null) === (g || null));
    if (!b && (!g || teaches(uid))) {
      b = { id: randomUUID(), cohort_id: c, session_id: s, group_id: g || null, scene: { elements: [] }, generation: 0, locked: false };
      hub.boards.push(b);
    }
    return { data: b && seesBoard(uid, b) ? [copy(b)] : [], error: null };
  }
  if (q.rpc === 'save_board') {
    const { b: id, gen, elements } = q.args;
    const b = hub.boards.find(x => x.id === id);
    if (!b || !seesBoard(uid, b) || (b.locked && !teaches(uid))) return { data: [{ generation: null, saved: false }], error: null };
    if (b.generation !== gen) return { data: [{ generation: b.generation, saved: false }], error: null };
    b.scene.elements = BoardLib.syncable(BoardLib.merge(b.scene.elements, elements));
    stats.saves++;
    return { data: [{ generation: b.generation, saved: true }], error: null };
  }
  const f = Object.fromEntries(q.filters.filter(x => x[0] === 'eq').map(x => [x[1], x[2]]));
  const one = (rows) => ({ data: q.single ? (rows[0] ? copy(rows[0]) : null) : copy(rows), error: null });
  switch (q.table) {
    case 'cohorts': return one(f.slug === hub.cohort.slug ? [hub.cohort] : []);
    case 'sessions': return one(hub.sessions);
    case 'cohort_teachers': return one([{ user_id: BEN }]);
    case 'groups': return one(hub.groups);
    case 'boards': {
      let rows = hub.boards.filter(b => seesBoard(uid, b) && (!f.id || b.id === f.id) && (!f.session_id || b.session_id === f.session_id));
      if (q.op === 'update') {
        if (!teaches(uid) && ('locked' in q.values || 'generation' in q.values)) return { data: null, error: { message: 'Only a teacher of this cohort can lock or clear the board.' } };
        rows.forEach(b => Object.assign(b, copy(q.values)));
      }
      return one(rows);
    }
  }
  return { data: q.single ? null : [], error: null };
}

// ---------------------------------------------------------------------
// The stand-in Realtime channel, shared by the pages
// ---------------------------------------------------------------------
const pages = new Map();          // page -> { who, topic, dropped }
const presence = {};              // topic -> { userId: [meta] }
async function deliver(from, topic, event, payload) {
  for (const [page, info] of pages) {
    if (page === from || info.topic !== topic || info.dropped) continue;
    await page.evaluate(([t, e, p]) => window.__fakeDeliver(t, e, p), [topic, event, payload]).catch(() => {});
  }
}
async function presenceSync(topic) {
  for (const [page, info] of pages) {
    if (info.topic === topic && !info.dropped) await page.evaluate(([t, s]) => window.__fakePresence(t, s), [topic, presence[topic] || {}]).catch(() => {});
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function open(who, query, size = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport: size });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, async route => {
    route.fulfill({ contentType: 'text/javascript', body: await readFile(join(here, 'fake-supabase.js'), 'utf8') });
  });
  await ctx.addInitScript((s) => { window.__FAKE_SESSION = s; }, { access_token: 'stand-in-' + who, user: people[who] });
  const page = await ctx.newPage();
  const info = { who, topic: null, dropped: false, errors: [] };
  pages.set(page, info);
  page.on('pageerror', e => info.errors.push(e.message));
  await page.exposeBinding('__fakeDb', (src, q) => answer(people[who].id, q));
  await page.exposeBinding('__fakeJoin', (src, topic, isPrivate) => { info.topic = topic; if (!isPrivate) stats.joinsNotPrivate++; return !!isPrivate; });
  await page.exposeBinding('__fakeSend', async (src, topic, event, payload) => {
    const size = Buffer.byteLength(JSON.stringify(payload));
    stats.messages++; stats.largest = Math.max(stats.largest, size);
    if (size > 256 * 1024) throw new Error('A message over 256 KB, which Realtime would refuse: ' + size);
    await deliver(page, topic, event, payload);
  });
  await page.exposeBinding('__fakeTrack', async (src, topic, meta) => {
    (presence[topic] = presence[topic] || {})[people[who].id] = [meta];
    await presenceSync(topic);
  });
  await page.goto(origin + '/board/' + query);
  return page;
}

// ---------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name); }
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); }
  return false;
}
const scene = (page) => page.evaluate(() => window.__board ? window.__board.api.getSceneElements().map(e => [e.id, e.version, e.type]).sort() : null);
const sceneAll = (page) => page.evaluate(() => window.__board.api.getSceneElementsIncludingDeleted().map(e => e.id + '@' + e.version).sort().join());
const live = (page) => page.evaluate(() => !!(window.__board && window.__board.state.live));
async function canvasBox(page) {
  await page.evaluate(() => document.querySelector('[data-canvas]').scrollIntoView({ block: 'start' }));
  return page.locator('[data-canvas]').boundingBox();
}
// Excalidraw focuses its own container on the first click, which can
// scroll the page, so each stroke finds the canvas again just before it.
// Strokes stay right of x 260, where the shape panel opens on the left.
async function ready(page, key) {
  let box = await canvasBox(page);
  await page.keyboard.press('v');
  await page.mouse.click(box.x + box.width / 2, box.y + 90); // an empty spot, with the selection tool
  await page.waitForTimeout(150);
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
  return canvasBox(page);
}
async function drawRect(page, x0, y0, x1, y1) {
  const box = await ready(page, 'r');
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  await page.mouse.move(box.x + (x0 + x1) / 2, box.y + (y0 + y1) / 2, { steps: 4 });
  await page.mouse.move(box.x + x1, box.y + y1, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('Escape');
}
async function drawLine(page, x0, y0, x1, y1) {
  const box = await ready(page, 'p');
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + x0 + (x1 - x0) * i / 12, box.y + y0 + (y1 - y0) * i / 12 + (i % 2 ? 6 : -6));
  await page.mouse.up();
  await page.keyboard.press('Escape');
}

const q = '?c=stand-in&s=week-1';
const ben = await open('ben', q);
const bea = await open('bea', q);
check('both pages open the board and go live on a private channel',
  await until(async () => (await live(ben)) && (await live(bea)), 20000) && stats.joinsNotPrivate === 0);
const board = hub.boards[0];

await drawRect(ben, 400, 160, 560, 260);
check('a rectangle Ben draws appears on Bea\'s screen', await until(async () => {
  const a = await scene(ben), b = await scene(bea);
  return a.length === 1 && JSON.stringify(a) === JSON.stringify(b);
}));

await drawLine(bea, 620, 180, 820, 300);
check('a freehand line Bea draws appears on Ben\'s screen', await until(async () => {
  const a = await scene(ben), b = await scene(bea);
  return a.length === 2 && JSON.stringify(a) === JSON.stringify(b) && a.some(e => e[2] === 'freedraw');
}));

// Ben moves his rectangle: a newer version of the same element.
{
  const box = await ready(ben, 'v');
  await ben.mouse.move(box.x + 400, box.y + 210);
  await ben.mouse.down();
  await ben.mouse.move(box.x + 460, box.y + 330, { steps: 6 });
  await ben.mouse.up();
}
check('moving a shape reaches the other screen as the newer version', await until(async () => {
  const a = await scene(ben), b = await scene(bea);
  return JSON.stringify(a) === JSON.stringify(b) && a.find(e => e[2] === 'rectangle')[1] > 1;
}));

// Both draw at the same moment.
await Promise.all([drawRect(ben, 320, 420, 420, 500), drawRect(bea, 900, 420, 1020, 520)]);
check('when both draw at once, both screens settle on the same four elements', await until(async () => {
  const a = await sceneAll(ben), b = await sceneAll(bea);
  return a === b && (await scene(ben)).length === 4;
}));

check('the board is saved, element by element, within a few seconds', await until(async () => {
  const saved = board.scene.elements.filter(e => !e.isDeleted).map(e => e.id + '@' + e.version).sort().join();
  const shown = (await scene(ben)).map(e => e[0] + '@' + e[1]).sort().join();
  return saved === shown;
}, 12000));

// Bea's connection drops; Ben keeps drawing; she comes back.
const beaInfo = pages.get(bea);
beaInfo.dropped = true;
await bea.evaluate((t) => window.__fakeStatus(t, 'CHANNEL_ERROR'), beaInfo.topic);
await drawRect(ben, 700, 120, 800, 170);
await drawLine(ben, 300, 560, 380, 600);
const missed = await until(async () => (await scene(bea)).length === 4 && (await scene(ben)).length === 6, 3000);
await until(async () => board.scene.elements.filter(e => !e.isDeleted).length === 6, 12000);
beaInfo.dropped = false;
await bea.evaluate((t) => window.__fakeStatus(t, 'SUBSCRIBED'), beaInfo.topic);
check('a dropped connection misses strokes, then catches up from the saved board when it comes back',
  missed && await until(async () => (await sceneAll(ben)) === (await sceneAll(bea)), 8000));

// A change too large for one Realtime message: a very long line.
await ben.evaluate(() => {
  const { api } = window.__board;
  const pts = []; for (let i = 0; i < 9000; i++) pts.push([i * 0.37, Math.sin(i / 40) * 80 + 0.123456789]);
  const big = { type: 'freedraw', id: 'giant-line', x: 50, y: 600, width: 3330, height: 160, angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent',
    fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null,
    seed: 7, version: 3, versionNonce: 11, isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false,
    points: pts, pressures: [], simulatePressure: true, lastCommittedPoint: null, index: 'b9' };
  api.updateScene({ elements: api.getSceneElementsIncludingDeleted().concat([big]) });
});
check('a change too large for a Realtime message is saved, and the other page reads it from there',
  await until(async () => (await scene(bea)).some(e => e[0] === 'giant-line'), 15000) && stats.largest <= 256 * 1024);

// Ben locks the board.
await ben.click('[data-lock]');
check('when the teacher locks the board, the student\'s board becomes look-only',
  await until(() => bea.evaluate(() => window.__board.api.getAppState().viewModeEnabled === true)) &&
  !(await ben.evaluate(() => window.__board.api.getAppState().viewModeEnabled)));
check('a locked board says so on the student\'s page', /locked/.test(await bea.textContent('[data-status]')));
check('a student never sees the teacher\'s controls', await bea.isHidden('[data-teach]'));
if (shots) {
  await bea.screenshot({ path: join(shots, 'locked-student-1280-light.png') });
}
await ben.click('[data-lock]');
await until(() => bea.evaluate(() => window.__board.api.getAppState().viewModeEnabled === false));

if (shots) {
  await ben.screenshot({ path: join(shots, 'teacher-1280-light.png') });
  await bea.screenshot({ path: join(shots, 'student-1280-light.png') });
}

// Ben clears it.
await ben.click('[data-clear]');
await ben.click('[data-clear-dialog] button[value="clear"]');
check('when the teacher clears the board, it empties on every screen and in the saved board',
  await until(async () => (await scene(bea)).length === 0 && (await scene(ben)).length === 0 && board.scene.elements.length === 0 && board.generation === 1));
await drawRect(bea, 500, 300, 600, 380);
check('drawing after a clear works for everyone, in the new generation',
  await until(async () => (await scene(ben)).length === 1 && JSON.stringify(await scene(ben)) === JSON.stringify(await scene(bea))));

// Downloads.
const [png] = await Promise.all([bea.waitForEvent('download'), bea.click('[data-download="png"]')]);
const [svg] = await Promise.all([bea.waitForEvent('download'), bea.click('[data-download="svg"]')]);
check('a student can download the board as PNG and SVG',
  png.suggestedFilename() === 'stand-in-week-1-board.png' && svg.suggestedFilename() === 'stand-in-week-1-board.svg');

check('no page threw an error', [...pages.values()].every(i => !i.errors.length) || (console.log([...pages.values()].map(i => i.errors)), false));
console.log(`\n${stats.messages} messages relayed, the largest ${stats.largest} bytes; ${stats.saves} saves.`);

// ---------------------------------------------------------------------
// Screenshots: 375 and 1280, light and dark, and the stage view
// ---------------------------------------------------------------------
if (shots) {
  await drawLine(ben, 320, 520, 620, 600);
  await new Promise(r => setTimeout(r, 1500));
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const t of ['light', 'dark']) {
      const p = await open('bea', q + '&' + t, { width: w, height: h });
      await until(() => live(p), 20000);
      await new Promise(r => setTimeout(r, 1200));
      await p.screenshot({ path: join(shots, `student-${w}-${t}.png`), fullPage: true });
      pages.delete(p);
      await p.context().close();
    }
  }
  const stage = await open('bea', q + '&view=stage', { width: 1280, height: 720 });
  await until(() => live(stage), 20000);
  await new Promise(r => setTimeout(r, 1200));
  await stage.screenshot({ path: join(shots, 'stage-1280.png') });
  const teacher375 = await open('ben', q, { width: 375, height: 812 });
  await until(() => live(teacher375), 20000);
  await new Promise(r => setTimeout(r, 1200));
  await teacher375.screenshot({ path: join(shots, 'teacher-375-light.png'), fullPage: true });
}

await browser.close();
server.close();
const failed = results.filter(r => !r[1]);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
