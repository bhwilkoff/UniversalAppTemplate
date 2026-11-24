// A class on one board at once: twelve people adding, voting, drawing, moving,
// and resizing together, someone joining late, someone dropping, a leader
// gathering everyone, and the message budget (Realtime's free plan allows 100
// a second across every board). Same stand-in as the others.
//
//   cd tools/board && npm ci && node many-check.mjs [screenshot folder]
import { hub, live, check, until, open, shots, browser, server, results, pages, stats, people } from './stand-in.mjs';
import { join } from 'node:path';
const N = Number(process.env.PEOPLE || 12), q = '?c=stand-in&s=week-1&view=stage&light', W = { width: 816, height: 460 };
const ev = (p, f, a) => p.evaluate(f, a), els = (p) => ev(p, () => window.__board.api.getSceneElements().map((e) => JSON.parse(JSON.stringify(e))));
const all = []; all.push(await open('ben', q, W));
for (let i = 1; i < N; i++) all.push(await open('p' + i, q, W));
check(N + ' people open one board, and it is live for all of them', await until(async () => (await Promise.all(all.map(live))).every(Boolean), 60000));
check('everyone sees everyone', await until(async () => (await Promise.all(all.map((p) => ev(p, () => window.__board.api.getAppState().collaborators.size)))).every((n) => n === N), 15000));
const same = async () => { const v = await Promise.all(all.map((p) => ev(p, () => JSON.stringify(window.__board.api.getSceneElementsIncludingDeleted().filter((e) => !e.isDeleted).map((e) => [e.id, e.version, e.versionNonce]).sort())))); return v.every((x) => x === v[0]); };
const diff = async () => { const v = await Promise.all(all.map((p) => ev(p, () => Object.fromEntries(window.__board.api.getSceneElementsIncludingDeleted().map((e) => [e.id, [e.version, e.versionNonce, e.index, e.isDeleted, Math.round(e.x)].join('/')]))))); const ids = new Set(v.flatMap(Object.keys)); for (const id of ids) { const set = new Map(); v.forEach((x, i) => { const k = x[id] || 'none'; set.set(k, (set.get(k) || []).concat(i)); }); if (set.size > 1) console.log('  ', id, JSON.stringify([...set])); } const saved = hub.boards[0].scene.elements.length; console.log('   saved', saved, 'fields', JSON.stringify(await Promise.all(all.map((p) => ev(p, () => [window.__board.state.saving, window.__board.state.live, document.querySelector('[data-notes] input').value]))))); };
const add = (p, t) => p.fill('[data-notes] input', t).then(() => p.press('[data-notes] input', 'Enter'));
const t0 = Date.now(), m0 = stats.messages;
await Promise.all(all.map((p, i) => add(p, 'Idea ' + i)));
{ const ok = await until(async () => (await els(all[0])).filter((e) => e.type === 'rectangle').length === N && await same(), 30000); check('every note from everyone at the same moment arrives everywhere', ok); if (!ok) await diff(); }
const notes = async (p) => (await els(p)).filter((e) => e.type === 'rectangle' && e.customData && e.customData.note);
const over = (list) => { let n = 0; list.forEach((a, i) => list.forEach((b, j) => { if (i < j && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) n++; })); return n; };
await until(async () => over(await notes(all[0])) === 0 && await same(), 14000);
const stacked = over(await notes(all[0]));
check('notes added at the same moment do not land on one another (' + stacked + ' overlaps)', stacked === 0);
const first = (await notes(all[0]))[0].id;
await Promise.all(all.map((p) => ev(p, (id) => [...document.querySelectorAll('.board-card button')].find((b) => b.parentNode.dataset.note === id).click(), first)));
check('everyone votes for one note at once, and every vote counts', await until(async () => (await Promise.all(all.map((p) => ev(p, (id) => [...document.querySelectorAll('.board-card')].find((c) => c.dataset.note === id).lastChild.textContent, first)))).every((t) => t === N + ' votes'), 20000));
// Each person draws, then moves and resizes their own note, all together.
await Promise.all(all.map(async (p, i) => {
  await ev(p, () => window.__board.api.updateScene({ appState: { selectedElementIds: {}, scrollX: 0, scrollY: 0, zoom: { value: 1 } } }));
  await ev(p, () => window.__board.api.setActiveTool({ type: 'freedraw' }));
  await p.mouse.move(60 + i * 10, 330); await p.mouse.down(); for (let k = 0; k < 15; k++) await p.mouse.move(60 + i * 10 + k * 8, 330 + (k % 2 ? 12 : -12)); await p.mouse.up();
}));
check('everyone drawing at once is kept, everywhere', await until(async () => (await els(all[0])).filter((e) => e.type === 'freedraw').length === N && await same(), 40000));
await Promise.all(all.map((p, i) => ev(p, async (me) => {
  const { api, state } = window.__board; const mine = api.getSceneElements().find((e) => e.customData && e.customData.note && e.customData.by === state.me.id);
  for (let k = 1; k <= 20; k++) {
    api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map((e) => e.id === mine.id ? { ...e, width: 180 + k * 4, x: mine.x + k, version: e.version + 1, versionNonce: Math.floor(Math.random() * 1e9), updated: Date.now() } : e), captureUpdate: 'IMMEDIATELY' });
    await new Promise((r) => setTimeout(r, 60));
  }
}, i)));
check('everyone resizing their own note at once keeps every size', await until(async () => (await notes(all[0])).every((n) => n.width === 260) && await same(), 40000));
// Two people on the same note: one answer, the same everywhere.
await Promise.all(all.slice(0, 2).map((p, i) => ev(p, async ([id, i]) => {
  const { api } = window.__board; for (let k = 1; k <= 10; k++) { api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map((e) => e.id === id ? { ...e, height: 100 + i * 100 + k, version: e.version + 1, versionNonce: Math.floor(Math.random() * 1e9), updated: Date.now() } : e) }); await new Promise((r) => setTimeout(r, 50)); }
}, [first, i])));
check('two people on one note settle on the same note everywhere', await until(same, 40000));
const late = await open('p99', q, W); all.push(late);
check('someone who joins late has all of it', await until(async () => await live(late) && await same(), 30000));
const gone = all[3], info = pages.get(gone); info.dropped = true; await ev(gone, (t) => window.__fakeStatus(t, 'CHANNEL_ERROR'), info.topic);
await add(all[5], 'While you were out'); await gone.waitForTimeout(7000); info.dropped = false; await ev(gone, (t) => window.__fakeStatus(t, 'SUBSCRIBED'), info.topic);
check('someone who drops out and returns has what they missed', await until(same, 30000));
await ev(all[0], () => window.__board.api.updateScene({ appState: { scrollX: -700, scrollY: -300, zoom: { value: 1 } } })); await all[0].waitForTimeout(200);
await all[0].locator('[data-testid="main-menu-trigger"]').click(); await all[0].locator('.dropdown-menu').getByText('Bring everyone here', { exact: true }).click();
check('a leader brings all ' + (N + 1) + ' to one place', await until(async () => (await Promise.all(all.slice(1).map((p) => ev(p, () => window.__board.api.getAppState().scrollX)))).every((x) => Math.abs(x + 700) < 60), 10000));
const follow = all.slice(1, 5); for (const p of follow) await ev(p, () => { const c = [...window.__board.api.getAppState().collaborators.values()].find((x) => x.username === 'Ben'); window.__board.api.updateScene({ appState: { userToFollow: { socketId: c.socketId, username: 'Ben' } } }); });
await until(() => ev(all[0], () => window.__board.api.getAppState().followedBy.size === 4));
await ev(all[0], () => window.__board.api.updateScene({ appState: { scrollX: 250, scrollY: 100 } }));
check('several people follow one person at once', await until(async () => (await Promise.all(follow.map((p) => ev(p, () => window.__board.api.getAppState().scrollX)))).every((x) => Math.abs(x - 250) < 60), 10000));
check('the saved board is what everyone sees', await until(async () => JSON.stringify(hub.boards[0].scene.elements.filter((e) => !e.isDeleted).map((e) => [e.id, e.version]).sort()) === JSON.stringify((await els(all[0])).map((e) => [e.id, e.version]).sort()), 20000));
const rate = (stats.messages - m0) / ((Date.now() - t0) / 1000);
check('the messages stay well inside Realtime’s hundred a second (' + rate.toFixed(0) + ' a second, at most ' + stats.peak + ' in one)', stats.peak <= 100);
if (shots) { await ev(all[1], () => { const a = window.__board.api; a.updateScene({ appState: { userToFollow: null } }); a.scrollToContent(a.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.8 }); }); await all[1].waitForTimeout(800); await all[1].screenshot({ path: join(shots, 'many.png') }); }
check('no page threw an error', [...pages.values()].every((i) => !i.errors.length) || (console.log([...pages.values()].map((i) => i.errors).filter((e) => e.length)), false));
await browser.close(); server.close();
const failed = results.filter((r) => !r[1]); console.log(`\n${results.length - failed.length} of ${results.length} passed`); process.exit(failed.length ? 1 : 0);
