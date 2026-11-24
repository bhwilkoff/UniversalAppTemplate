// Real /board/ pages in headless Chrome against a stand-in for Supabase:
// the site served from this folder, the database and the Realtime channel
// kept in memory. Used by sync-check.mjs and use-check.mjs.
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
export const BoardLib = createRequire(import.meta.url)('../../assets/board-lib.js');
export const AddonLib = createRequire(import.meta.url)('../../assets/addon-lib.js');
export const shots = process.argv[2] ? resolve(process.argv[2]) : null;
if (shots) mkdirSync(shots, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------------
// The site, served from this folder
// ---------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
export const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(site, p));
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
export const origin = 'http://127.0.0.1:' + server.address().port;

// ---------------------------------------------------------------------
// The stand-in hub
// ---------------------------------------------------------------------
const BEN = randomUUID(), BEA = randomUUID(), GROUP = randomUUID();
export const people = {
  ben: { id: BEN, user_metadata: { user_name: 'bhwilkoff', full_name: 'Ben' } },
  bea: { id: BEA, user_metadata: { user_name: 'bea', full_name: 'Bea' } }
};
export const hub = {
  cohort: { id: randomUUID(), slug: 'stand-in', title: 'Stand-in cohort (delete me)', session_minutes: 75, status: 'running' },
  sessions: [], libraries: {}, files: new Map(), uploadFails: 0, groups: [{ id: GROUP, name: 'Trio A', group_members: [{ user_id: BEA }] }], boards: []
};
hub.sessions.push({ id: randomUUID(), cohort_id: hub.cohort.id, number: 1, starts_at: new Date(Date.now() - 600000).toISOString(), title: 'Week 1' });
hub.sessions.push({ id: randomUUID(), cohort_id: hub.cohort.id, number: 2, starts_at: new Date(Date.now() + 6 * 86400000).toISOString(), title: 'Week 2' });
const copy = (v) => JSON.parse(JSON.stringify(v));
const teaches = (uid) => uid === BEN;
const seesBoard = (uid, b) => teaches(uid) || !b.group_id || hub.groups.some(g => g.id === b.group_id && g.group_members.some(m => m.user_id === uid));
export const stats = { messages: 0, largest: 0, saves: 0, joinsNotPrivate: 0 };

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
    case 'board_libraries': {
      if (q.op === 'upsert') { hub.libraries[uid] = copy(q.values.items); return { data: null, error: null }; }
      return one(hub.libraries[uid] ? [{ items: hub.libraries[uid] }] : []);
    }
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
export const pages = new Map();          // page -> { who, topic, dropped }
export const presence = {};              // topic -> { userId: [meta] }
export async function deliver(from, topic, event, payload) {
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

export const browser = await chromium.launch({ executablePath: CHROME, headless: true });
export async function open(who, query, size = { width: 1280, height: 800 }, harness = null) {
  const ctx = await browser.newContext({ viewport: size });
  if (harness) {
    await ctx.route(origin + '/__harness', route => route.fulfill({ contentType: 'text/html', body: harness }));
    // A stand-in for Meet's add-on SDK: the main stage's client, whose
    // message handler the test calls the way the panel's notifyMainStage would.
    await ctx.addInitScript(() => {
      window.meet = { addon: { createAddonSession: async () => ({ createMainStageClient: async () => ({
        on: (e, cb) => { if (e === 'frameToFrameMessage') window.__stageMessage = cb; }, notifySidePanel: async () => {}
      }) }) } };
    });
    await ctx.route(/meetjs\/addons/, route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  }
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, async route => {
    route.fulfill({ contentType: 'text/javascript', body: await readFile(join(here, 'fake-supabase.js'), 'utf8') });
  });
  // Meet frames the stage from another site, where Chrome has no file pickers.
  await ctx.addInitScript(() => { try { delete Window.prototype.showOpenFilePicker; delete Window.prototype.showSaveFilePicker; delete window.showOpenFilePicker; delete window.showSaveFilePicker; } catch (e) {} });
  await ctx.addInitScript((s) => { window.__FAKE_SESSION = s; }, { access_token: 'stand-in-' + who, user: people[who] });
  const page = await ctx.newPage();
  const info = { who, topic: null, dropped: false, errors: [] };
  pages.set(page, info);
  page.on('pageerror', e => info.errors.push(e.message));
  await page.exposeBinding('__fakeDb', (src, q) => answer(people[who].id, q));
  await page.exposeBinding('__fakeUpload', (src, path, body, type) => {
    if (hub.uploadFails > 0) { hub.uploadFails--; return { data: null, error: { message: 'the stand-in refused it' } }; }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) return { data: null, error: { message: 'mime type ' + type + ' is not supported' } };
    hub.files.set(path, { body, type }); return { data: { path }, error: null };
  });
  await page.exposeBinding('__fakeDownload', (src, path) => hub.files.get(path) || null);
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
  await page.goto(harness ? origin + '/__harness' : origin + '/board/' + query);
  return page;
}

// ---------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------
export const results = [];
export function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name); }
export async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); }
  return false;
}
export const scene = (page) => page.evaluate(() => window.__board ? window.__board.api.getSceneElements().map(e => [e.id, e.version, e.type]).sort() : null);
export const sceneAll = (page) => page.evaluate(() => window.__board.api.getSceneElementsIncludingDeleted().map(e => e.id + '@' + e.version).sort().join());
export const live = (page) => page.evaluate(() => !!(window.__board && window.__board.state.live));
export async function canvasBox(page) {
  await page.evaluate(() => document.querySelector('[data-canvas]').scrollIntoView({ block: 'start' }));
  return page.locator('[data-canvas]').boundingBox();
}
// Excalidraw focuses its own container on the first click, which can
// scroll the page, so each stroke finds the canvas again just before it.
// Strokes stay right of x 260, where the shape panel opens on the left.
export async function ready(page, key) {
  let box = await canvasBox(page);
  await page.keyboard.press('v');
  await page.mouse.click(box.x + box.width / 2, box.y + 90); // an empty spot, with the selection tool
  await page.waitForTimeout(150);
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
  return canvasBox(page);
}
export async function drawRect(page, x0, y0, x1, y1) {
  const box = await ready(page, 'r');
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  await page.mouse.move(box.x + (x0 + x1) / 2, box.y + (y0 + y1) / 2, { steps: 4 });
  await page.mouse.move(box.x + x1, box.y + y1, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('Escape');
}
export async function drawLine(page, x0, y0, x1, y1) {
  const box = await ready(page, 'p');
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + x0 + (x1 - x0) * i / 12, box.y + y0 + (y1 - y0) * i / 12 + (i % 2 ? 6 : -6));
  await page.mouse.up();
  await page.keyboard.press('Escape');
}

