// Using the board the way a class does, with a real mouse and keyboard, on
// the Meet stage's own size: notes added, resized from every side, edited,
// moved, copied, erased, voted on; every drawing tool; undo; and nothing
// anyone is doing undone by what arrives from someone else. Same stand-in
// as sync-check.mjs.
//
//   cd tools/board && npm ci && node use-check.mjs [screenshot folder]
import { hub, live, check, until, open, shots, browser, server, results, pages, deliver, BoardLib, drawRect } from './stand-in.mjs';
import { join } from 'node:path';
// A laptop's Meet stage beside the panel, measured November 24, 2026.
const W = { width: 816, height: 460 }, q = '?c=stand-in&s=week-1&view=stage&light';
const ben = await open('ben', q, W), bea = await open('bea', q, W);
await until(async () => await live(ben) && await live(bea), 20000);
const snap = async (p, n) => { if (shots) await p.screenshot({ path: join(shots, n + '.png') }); };
const els = (p) => p.evaluate(() => window.__board.api.getSceneElements().map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, w: e.width, h: e.height, fs: e.fontSize, v: e.version, text: e.text, said: e.originalText, box: e.containerId, data: e.customData })));
const notes = async (p) => (await els(p)).filter((e) => e.type === 'rectangle' && e.data && e.data.note);
const get = async (p, id) => (await els(p)).find((e) => e.id === id);
const at = (p, x, y) => p.evaluate(([x, y]) => { const s = window.__board.api.getAppState(), c = document.querySelector('[data-canvas]').getBoundingClientRect(); return { x: c.left + (x + s.scrollX) * s.zoom.value, y: c.top + (y + s.scrollY) * s.zoom.value }; }, [x, y]);
const clear = async (p) => { await p.evaluate(() => window.__board.api.updateScene({ appState: { selectedElementIds: {}, selectedGroupIds: {} } })); await p.waitForTimeout(80); };
const add = async (p, t) => { await p.fill('[data-notes] input', t); await p.press('[data-notes] input', 'Enter'); await p.waitForTimeout(350); };
async function drag(p, a, b, opt = {}) { await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 }); await p.mouse.move(b.x, b.y, { steps: 6 }); if (opt.during) await opt.during(); await p.mouse.up(); await p.waitForTimeout(150); }
const pick = async (p, id) => { const c = await get(p, id); const m = await at(p, c.x + c.w * 0.35, c.y + c.h - 14); await p.mouse.click(m.x, m.y); await p.waitForTimeout(120); return c; };
const same = async (id, f) => until(async () => { const a = await get(ben, id), b = await get(bea, id); return !!a && !!b && Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1 && Math.abs(a.x - b.x) < 1 && (!f || f(b)); }, 9000);

await add(ben, 'Learners should be able to try the app themselves');
await add(ben, 'A second idea'); await add(ben, 'A third idea'); await add(bea, 'One from Bea');
await until(async () => (await notes(ben)).length === 4 && (await notes(bea)).length === 4);
const ns = await notes(ben);
check('four notes from two people, and none covers another', ns.length === 4 && ns.every((a) => ns.every((b) => a === b || a.x >= b.x + b.w || b.x >= a.x + a.w || a.y >= b.y + b.h || b.y >= a.y + a.h)));
check('each note holds its own words, and they fit inside it', (await els(ben)).filter((e) => e.box).length === 4 && (await els(ben)).filter((e) => e.box).every((t) => { const c = ns.find((n) => n.id === t.box); return t.x >= c.x - 1 && t.x + t.w <= c.x + c.w + 1 && t.y >= c.y - 1 && t.y + t.h <= c.y + c.h + 1; }));
await snap(ben, 'notes');
check('the note bar covers none of Excalidraw’s buttons', await ben.evaluate(() => { const b = document.querySelector('[data-notes] form').getBoundingClientRect(); return [...document.querySelectorAll('.excalidraw button')].filter((x) => !x.closest('.board-cards')).every((x) => { const r = x.getBoundingClientRect(); return !r.width || r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom; }); }));

// The words as drawn: wider than the card means they spill out of it.
check('the words are measured in the board’s own lettering', await ben.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); c.font = '18px Excalifont'; return document.fonts.check('20px Excalifont') && window.__board.api.getSceneElements().filter((e) => e.containerId).every((t) => t.text.split('\n').every((l) => c.measureText(l).width <= 180)); }));
await ben.evaluate(() => window.__board.api.updateScene({ appState: { scrollX: 90, scrollY: 40 } })); await ben.waitForTimeout(200);
const id = ns[0].id, words = async (p) => (await els(p)).find((e) => e.box === id);
async function resize(side, dx, dy) {
  await clear(ben); const c = await pick(ben, id);
  const px = { w: c.x, e: c.x + c.w }, py = { n: c.y, s: c.y + c.h };
  const hx = side.includes('e') ? px.e : side.includes('w') ? px.w : c.x + c.w * 0.7, hy = side.includes('s') ? py.s : side.includes('n') ? py.n : c.y + c.h * 0.7;
  const s = await at(ben, hx, hy), o = side.length === 2 ? 5 : 2;
  const p0 = { x: s.x + (side.includes('e') ? o : side.includes('w') ? -o : 0), y: s.y + (side.includes('s') ? o : side.includes('n') ? -o : 0) };
  await drag(ben, p0, { x: p0.x + dx, y: p0.y + dy });
  return [c, await get(ben, id)];
}
for (const [side, dx, dy, ok] of [
  ['e', 70, 0, (a, b) => b.w > a.w + 40 && Math.abs(b.h - a.h) < 2], ['s', 0, 50, (a, b) => b.h > a.h + 25 && Math.abs(b.w - a.w) < 2],
  ['se', -60, -30, (a, b) => b.w < a.w - 30], ['w', -40, 0, (a, b) => b.w > a.w + 20 && b.x < a.x - 20], ['n', 0, -30, (a, b) => b.h > a.h + 15 && b.y < a.y - 15], ['nw', 30, 20, (a, b) => b.w < a.w]]) {
  const [a, b] = await resize(side, dx, dy);
  check('a note resizes from its ' + side + ' side', ok(a, b) || (console.log(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h), false)); if (!ok(a, b)) await snap(ben, 'fail-' + side);
}
check('resizing never stretches the words', (await words(ben)).fs === 18);
check('the words stay inside the card', await (async () => { const t = await words(ben), c = await get(ben, id); return t.x >= c.x - 1 && t.x + t.w <= c.x + c.w + 1 && t.y >= c.y - 1 && t.y + t.h <= c.y + c.h + 1; })());
check('the resized note is the same on the other screen', await same(id));
await snap(ben, 'resized');

// What arrives from others while a card is resized.
{
  await clear(ben); const c = await pick(ben, id), s = await at(ben, c.x + c.w, c.y + c.h);
  const old = JSON.parse(JSON.stringify(hub.boards[0].scene.elements));
  const topic = pages.get(ben).topic;
  await drag(ben, { x: s.x + 5, y: s.y + 5 }, { x: s.x + 85, y: s.y + 65 }, { during: async () => { for (let i = 0; i < 4; i++) { await ben.evaluate(([t, e]) => window.__fakeDeliver(t, 'scene', { gen: 0, elements: e }), [topic, old]); await ben.evaluate((t) => window.__fakeDeliver(t, 'board', { why: 'saved' }), topic); await ben.waitForTimeout(120); } } });
  const mid = await get(ben, id);
  check('an older copy arriving mid-resize does not pull the card back', mid.w > c.w + 50);
  await ben.evaluate(([t, e]) => window.__fakeDeliver(t, 'scene', { gen: 0, elements: e }), [topic, old]);
  await ben.evaluate((t) => window.__fakeDeliver(t, 'board', { why: 'saved' }), topic);
  await ben.waitForTimeout(600);
  check('nor one arriving just after', (await get(ben, id)).w === mid.w);
  const other = (await notes(ben)).find((n) => n.id !== id && n.data.by !== ns[0].data.by);
  const moving = (async () => { const o = await get(bea, other.id), m = await at(bea, o.x + o.w * 0.35, o.y + 14); await bea.mouse.click(m.x, m.y); await drag(bea, m, { x: m.x + 60, y: m.y + 40 }); })();
  const c2 = await get(ben, id), s2 = await at(ben, c2.x + c2.w, c2.y + c2.h);
  await drag(ben, { x: s2.x + 5, y: s2.y + 5 }, { x: s2.x - 60, y: s2.y - 40 }); await moving;
  const done = await get(ben, id);
  check('two people working on two cards at once both keep their work', done.w < c2.w - 20 && await same(id) && await same(other.id));
  await ben.waitForTimeout(BoardLib.SAVE_EVERY + BoardLib.CATCH_UP_AFTER);
  check('and it is still there after the board is saved and read again', (await get(ben, id)).w === done.w && await same(id));
}

// Words.
{
  await clear(ben); const c = await get(ben, id), m = await at(ben, c.x + c.w / 2, c.y + c.h / 2);
  await ben.mouse.dblclick(m.x, m.y); await ben.waitForTimeout(250);
  await ben.keyboard.press('ControlOrMeta+a'); await ben.keyboard.type('Changed words, long enough that they wrap over several lines in the card'); await ben.keyboard.press('Escape'); await ben.waitForTimeout(300);
  const t = await words(ben), k = await get(ben, id);
  check('double-click changes a note’s words, and the card grows to hold them', /^Changed words/.test(t.said) && t.y + t.h <= k.y + k.h + 1);
  check('the new words reach the other screen', await until(async () => /^Changed words/.test((await words(bea)).said || '')));
}
// Votes.
{
  for (const p of [ben, bea]) { await clear(p); await p.evaluate(() => window.__board.api.scrollToContent(window.__board.api.getSceneElements(), { fitToViewport: true, maxZoom: 1, viewportZoomFactor: 0.6 })); await p.waitForTimeout(300); }
  const btn = (p) => p.locator('.board-card button').nth(0);
  await clear(ben);
  await btn(ben).click(); await bea.locator('.board-card button').nth(0).click();
  check('a vote is one press on the card, from each person', await until(async () => /2 votes/.test(await btn(ben).textContent()) && /2 votes/.test(await btn(bea).textContent())));
  await snap(bea, 'votes');
  await btn(ben).click();
  check('and pressing again takes it back', await until(async () => /1 vote$/.test(await btn(bea).textContent())));
  await clear(ben); const before = await get(ben, id), m = await at(ben, before.x + before.w * 0.35, before.y + before.h - 14);
  await drag(ben, m, { x: m.x - 50, y: m.y + 30 });
  const c = await get(ben, id), p = await at(ben, c.x, c.y + c.h), r = await btn(ben).evaluate((b) => { const x = b.parentNode.getBoundingClientRect(); return { x: x.left, y: x.top }; });
  check('a card’s name and votes move with it', c.x < before.x - 30 && Math.abs(r.x - p.x) < 3 && Math.abs(r.y - p.y - 10) < 4);
}
// Undo, copies, erasing.
{
  const n0 = (await notes(ben)).length; await add(ben, 'To undo');
  await ben.locator('.excalidraw [data-testid="button-undo"]').click().catch(() => {}); await ben.waitForTimeout(300);
  check('undo takes back the note just added, and only that', (await notes(ben)).length === n0);
  await clear(ben); const c = await pick(ben, id); await ben.keyboard.press('ControlOrMeta+d'); await ben.waitForTimeout(300);
  check('a note can be copied, and the copy has no votes of its own', (await notes(ben)).length === n0 + 1 && await ben.evaluate(() => [...document.querySelectorAll('.board-card button')].filter((b) => /^1 vote/.test(b.textContent)).length === 1));
  await ben.keyboard.press('Delete'); await ben.waitForTimeout(300);
  check('delete removes the copy on both screens, words and all', await until(async () => (await notes(bea)).length === n0 && !(await els(bea)).some((e) => e.box && !(e.box === id) && false)));
  await ben.keyboard.press('Escape');
}
// Every tool.
{
  const box = await ben.locator('[data-canvas]').boundingBox(); let y = 74; for (const p of [ben, bea]) await p.evaluate(() => window.__board.api.updateScene({ appState: { scrollX: 60, scrollY: 900, zoom: { value: 1 } } })); await ben.waitForTimeout(200);
  for (const [key, type] of [['r', 'rectangle'], ['d', 'diamond'], ['o', 'ellipse'], ['a', 'arrow'], ['l', 'line'], ['p', 'freedraw']]) {
    const had = (await els(ben)).length; await clear(ben); await ben.locator('.excalidraw canvas.interactive').focus().catch(() => {});
    await ben.evaluate((t) => window.__board.api.setActiveTool({ type: t }), type);
    await drag(ben, { x: box.x + 60, y: box.y + y }, { x: box.x + 130, y: box.y + y + 34 }); if (type === 'line' || type === 'arrow') await ben.keyboard.press('Escape'); y += 52;
    check('the ' + type + ' tool draws, and it reaches the other screen', await until(async () => (await els(ben)).length === had + 1 && (await els(bea)).length === had + 1 && (await els(bea)).some((e) => e.type === type), 4000));
  }
  await clear(ben); await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'text' }));
  await ben.mouse.click(box.x + 300, box.y + 130); await ben.waitForTimeout(150); await ben.keyboard.type('Typed'); await ben.keyboard.press('Escape');
  check('the text tool types, and it reaches the other screen', await until(async () => (await els(bea)).some((e) => e.text === 'Typed')));
  const target = (await els(ben)).find((e) => e.type === 'diamond'), p = await at(ben, target.x + target.w / 2, target.y + 1);
  await clear(ben); await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'eraser' })); await drag(ben, { x: p.x - 14, y: p.y + 2 }, { x: p.x + 14, y: p.y + 6 });
  check('the eraser erases, on both screens', await until(async () => !(await els(bea)).some((e) => e.id === target.id), 4000));
  await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'frame' })); await drag(ben, { x: box.x + 400, y: box.y + 200 }, { x: box.x + 490, y: box.y + 250 });
  check('the frame tool draws, on both screens', await until(async () => (await els(bea)).some((e) => e.type === 'frame'), 4000));
  await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'laser' })); await drag(ben, { x: box.x + 260, y: box.y + 200 }, { x: box.x + 360, y: box.y + 240 });
  check('the laser pointer shows on the other screen', await until(() => bea.evaluate(() => [...window.__board.api.getAppState().collaborators.values()].some((c) => c.pointer && c.pointer.tool === 'laser')), 4000));
  await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'selection' }));
  // An arrow tied to a card follows it.
  await ben.evaluate(() => { const a = window.__board.api; a.scrollToContent(a.getSceneElements().filter((e) => e.customData && e.customData.note), { fitToViewport: true, maxZoom: 1, viewportZoomFactor: 0.5 }); }); await ben.waitForTimeout(300);
  const a = await get(ben, id), b = (await notes(ben)).find((n) => n.id !== id);
  await clear(ben); await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'arrow' }));
  await drag(ben, await at(ben, a.x + a.w + 4, a.y + a.h / 2), await at(ben, b.x + b.w / 2, b.y - 4)); await ben.keyboard.press('Escape');
  check('an arrow ties to a card', await ben.evaluate((x) => window.__board.api.getSceneElements().some((e) => e.type === 'arrow' && ((e.startBinding && e.startBinding.elementId === x[0]) || (e.endBinding && e.endBinding.elementId === x[1]))), [id, b.id]));
}
// Menu.
{
  await ben.evaluate(() => window.__board.api.setActiveTool({ type: 'selection' })); await clear(ben);
  await ben.locator('[data-testid="main-menu-trigger"]').click(); await ben.waitForTimeout(300); await snap(ben, 'menu');
  const said = await ben.locator('.dropdown-menu').innerText();
  check('a leader’s menu on the stage has lock, clear, download, and pages', /Lock the board/.test(said) && /Clear the board/.test(said) && /Download/.test(said) && /Add a PDF/.test(said));
  await ben.locator('.dropdown-menu').getByText('Lock the board', { exact: true }).click();
  check('lock from the stage stops the learner, and hides their note bar', await until(() => bea.evaluate(() => window.__board.api.getAppState().viewModeEnabled && document.querySelector('[data-notes]').hidden)));
  await ben.locator('[data-testid="main-menu-trigger"]').click(); await ben.locator('.dropdown-menu').getByText('Unlock the board', { exact: true }).click();
  check('and unlock gives it back', await until(() => bea.evaluate(() => !window.__board.api.getAppState().viewModeEnabled && !document.querySelector('[data-notes]').hidden)));
  await bea.locator('[data-testid="main-menu-trigger"]').click(); await bea.waitForTimeout(300);
  check('a learner’s menu has neither', !/Lock the board|Clear the board/.test(await bea.locator('.dropdown-menu').innerText())); await bea.keyboard.press('Escape');
}
// Zoomed, and a board from before.
await ben.evaluate(() => window.__board.api.updateScene({ appState: { zoom: { value: 0.6 } } })); await ben.waitForTimeout(300); await snap(ben, 'zoomed');
{
  const base = { angle: 0, strokeColor: '#1e1e1e', backgroundColor: '#B7E4C7', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: ['note-old'], frameId: null, roundness: null, seed: 1, version: 3, versionNonce: 7, isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false, customData: { note: 'old', by: 'u' } };
  const t = { ...base, type: 'text', fontSize: 20, fontFamily: 5, textAlign: 'left', verticalAlign: 'top', containerId: null, autoResize: true, lineHeight: 1.25, backgroundColor: 'transparent' };
  hub.boards.push({ id: 'b-old', cohort_id: hub.cohort.id, session_id: hub.sessions[1].id, group_id: null, generation: 0, locked: false, scene: { elements: [
    { ...base, id: 'old', type: 'rectangle', x: 0, y: 0, width: 240, height: 160, index: 'a0' }, { ...t, id: 'old-t', x: 12, y: 32, width: 216, height: 50, text: 'An older\nnote', originalText: 'An older\nnote', index: 'a1' },
    { ...t, id: 'old-n', x: 12, y: 134, width: 100, height: 18, fontSize: 14, text: 'Bea', originalText: 'Bea', index: 'a2' }] } });
  const p = await open('ben', '?c=stand-in&s=week-2&view=stage&light', W), p2 = await open('bea', '?c=stand-in&s=week-2&view=stage&light', W);
  await until(async () => await live(p) && await live(p2), 20000); await p.waitForTimeout(800);
  const old = (await els(p)).filter((e) => /^old/.test(e.id));
  check('a note made before becomes one card, with its name', old.length === 2 && old.find((e) => e.id === 'old-t').box === 'old' && await p.locator('.board-card span').first().textContent() === 'Bea');
  await snap(p, 'old-note');
  check('two people opening it settle on the same copy', await until(async () => JSON.stringify(await els(p)) === JSON.stringify(await els(p2)), 12000));
}
// Small stage (a laptop beside the panel) and dark.
for (const [n, w, h, extra] of [['phone', 390, 600, ''], ['large', 1300, 720, ''], ['dark', 816, 460, '&dark']]) {
  const p = await open('bea', q.replace('&light', extra || '&light'), { width: w, height: h }); await until(() => live(p), 20000); await p.waitForTimeout(1200); await snap(p, n); pages.delete(p); await p.context().close();
}
check('no page threw an error', [...pages.values()].every((i) => !i.errors.length) || (console.log([...pages.values()].map((i) => i.errors)), false));
await browser.close(); server.close();
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
