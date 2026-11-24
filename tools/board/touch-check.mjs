// Fingers and pencils: real touch and pen events in Chrome, on a phone and on
// a tablet. Tap, draw, drag, resize, pinch, two-finger pan, double-tap to edit,
// vote, add a note, and a pencil with pressure. Same stand-in as the others.
//
//   cd tools/board && npm ci && node touch-check.mjs [screenshot folder]
import { hub, live, check, until, open, shots, browser, server, results, pages } from './stand-in.mjs';
import { join } from 'node:path';
const ev = (p, f, a) => p.evaluate(f, a), els = (p) => ev(p, () => window.__board.api.getSceneElements().map((e) => JSON.parse(JSON.stringify(e)))), st = (p, k) => ev(p, (k) => window.__board.api.getAppState()[k], k);
const at = (p, x, y) => ev(p, ([x, y]) => { const s = window.__board.api.getAppState(), c = document.querySelector('[data-canvas]').getBoundingClientRect(); return { x: c.left + (x + s.scrollX) * s.zoom.value, y: c.top + (y + s.scrollY) * s.zoom.value }; }, [x, y]);
const other = await open('ben', '?c=stand-in&s=week-1&view=stage&light', { width: 816, height: 460 });
for (const [name, size] of [['phone', { width: 390, height: 760 }], ['tablet', { width: 1024, height: 700 }]]) {
  const p = await open('bea', '?c=stand-in&s=week-1&view=stage&light', size, null, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await until(async () => await live(p) && await live(other), 20000); await p.waitForTimeout(500);
  const cdp = await p.context().newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((t, i) => ({ x: t.x, y: t.y, id: i, radiusX: 6, radiusY: 6, force: 0.5 })) });
  const swipe = async (a, b, hold = 0) => { await touch('touchStart', [a]); if (hold) await p.waitForTimeout(hold); for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 }]); await p.waitForTimeout(12); } await touch('touchEnd', []); await p.waitForTimeout(250); };
  const two = async (a1, b1, a2, b2) => { await touch('touchStart', [a1, b1]); for (let i = 1; i <= 10; i++) { const m = (x, y) => ({ x: x.x + (y.x - x.x) * i / 10, y: x.y + (y.y - x.y) * i / 10 }); await touch('touchMove', [m(a1, a2), m(b1, b2)]); await p.waitForTimeout(16); } await touch('touchEnd', []); await p.waitForTimeout(250); };
  const tool = (t) => ev(p, (t) => window.__board.api.setActiveTool({ type: t }), t), clear = () => ev(p, () => window.__board.api.updateScene({ appState: { selectedElementIds: {} } }));
  // Right of the style panel where there is one.
  const X = size.width > 900 ? 260 : 0;
  const reached = (f) => until(async () => (await els(other)).some(f), 6000);
  await p.tap('[data-notes] input'); await p.fill('[data-notes] input', 'By finger'); await p.tap('[data-notes] button');
  check(name + ': a note is added by finger, and reaches others', await reached((e) => e.originalText === 'By finger'));
  await p.waitForTimeout(400); const note = async () => (await els(p)).find((e) => e.type === 'rectangle' && e.customData && e.customData.note);
  let n = await note(); let c = await at(p, n.x + n.width * 0.3, n.y + n.height - 12);
  if (shots) await p.screenshot({ path: join(shots, name + '.png') });
  await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(300); check(name + ': a tap selects it', !!(await st(p, 'selectedElementIds'))[n.id]);
  if (shots) await p.screenshot({ path: join(shots, name + '-selected.png') });
  const corner = await at(p, n.x + n.width, n.y + n.height); await swipe({ x: corner.x + 5, y: corner.y + 5 }, { x: corner.x + 65, y: corner.y + 55 });
  check(name + ': its corner resizes it', (await note()).width > n.width + 25); n = await note();
  c = await at(p, n.x + n.width * 0.3, n.y + 20); await swipe(c, { x: c.x + 30, y: c.y + 60 }); check(name + ': a finger moves it', (await note()).y > n.y + 30);
  await clear(); n = await note(); await p.locator('.board-card button').first().tap(); check(name + ': a tap votes', await until(async () => /1 vote/.test(await p.locator('.board-card button').first().textContent()))); await p.locator('.board-card button').first().tap();
  c = await at(p, n.x + n.width / 2, n.y + n.height / 2); await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(90); await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(500);
  const editing = await ev(p, () => !!document.querySelector('.excalidraw-wysiwyg')); if (editing) { await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.type('Edited by finger'); await p.touchscreen.tap(size.width - 30, 420); await p.waitForTimeout(400); }
  if (shots) await p.screenshot({ path: join(shots, name + '-edit.png') });
  check(name + ': a double tap edits its words', editing && await reached((e) => e.originalText === 'Edited by finger')); await clear();
  await tool('freedraw'); await swipe({ x: X + 80, y: 430 }, { x: X + 240, y: 500 }); check(name + ': a finger draws', await reached((e) => e.type === 'freedraw'));
  await tool('rectangle'); await swipe({ x: X + 100, y: 540 }, { x: X + 200, y: 590 }); check(name + ': a finger draws a shape', await reached((e) => e.type === 'rectangle' && !e.customData));
  await tool('selection'); await clear(); const z0 = (await st(p, 'zoom')).value; await two({ x: X + 160, y: 400 }, { x: X + 230, y: 470 }, { x: X + 90, y: 330 }, { x: X + 310, y: 550 }); check(name + ': a pinch zooms the board, not the page', (await st(p, 'zoom')).value > z0 * 1.3 && await ev(p, () => window.visualViewport.scale === 1));
  const s0 = await st(p, 'scrollX'); await two({ x: X + 120, y: 400 }, { x: X + 180, y: 400 }, { x: X + 200, y: 400 }, { x: X + 260, y: 400 }); check(name + ': two fingers move the board', Math.abs((await st(p, 'scrollX')) - s0) > 20);
  const count = (await els(p)).length; check(name + ': neither left a mark', count === (await els(other)).length && !(await els(p)).some((e) => e.type === 'freedraw' && e.points.length < 2));
  // A pencil, with pressure, and a palm that should not draw.
  await ev(p, () => window.__board.api.updateScene({ appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 } } })); await tool('freedraw');
  const pen = (type, x, y, force) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'pen', force });
  await pen('mousePressed', X + 60, 440, 0.2); for (let i = 1; i <= 12; i++) { await pen('mouseMoved', X + 60 + i * 12, 440 + (i % 2) * 14, 0.1 + i * 0.07); await p.waitForTimeout(10); } await pen('mouseReleased', X + 204, 440, 0); await p.waitForTimeout(400);
  const stroke = (await els(p)).filter((e) => e.type === 'freedraw').slice(-1)[0];
  check(name + ': a pencil draws with its pressure, not a guess', !!stroke && stroke.simulatePressure === false && new Set(stroke.pressures.map((x) => x.toFixed(2))).size > 3);
  check(name + ': the pencil turns on palm rejection', await st(p, 'penMode') === true);
  const marks = (await els(p)).filter((e) => e.type === 'freedraw').length; await swipe({ x: X + 250, y: 480 }, { x: X + 330, y: 560 }); check(name + ': and then a finger or palm moves the board without drawing', (await els(p)).filter((e) => e.type === 'freedraw').length === marks);
  check(name + ': others see the pencil stroke as drawn', await until(async () => { const s = (await els(other)).find((e) => e.id === stroke.id); return !!s && s.pressures.length === stroke.pressures.length; }));
  if (shots) await p.screenshot({ path: join(shots, name + '-end.png') });
  await ev(other, () => { const { api } = window.__board; api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map((e) => ({ ...e, isDeleted: true, version: e.version + 1, versionNonce: 1 })) }); }); await until(async () => !(await els(p)).length);
  check(name + ': no error', !pages.get(p).errors.length || (console.log(pages.get(p).errors), false)); pages.delete(p); await p.context().close();
}
await browser.close(); server.close();
const failed = results.filter((r) => !r[1]); console.log(`\n${results.length - failed.length} of ${results.length} passed`); process.exit(failed.length ? 1 : 0);
