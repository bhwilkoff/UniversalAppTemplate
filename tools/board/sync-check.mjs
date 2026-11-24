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
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { shots, hub, stats, pages, browser, results, scene, sceneAll, live, check, until, open, canvasBox, ready, drawRect, drawLine, BoardLib, AddonLib, server } from './stand-in.mjs';

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
// Realtime may drop a message, so the screens may settle through the
// saved board instead: after the next save and the catch-up read.
check('when both draw at once, both screens settle on the same four elements', await until(async () => {
  const a = await sceneAll(ben), b = await sceneAll(bea);
  return a === b && (await scene(ben)).length === 4;
}, BoardLib.SAVE_EVERY + BoardLib.CATCH_UP_AFTER + 4000));

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
// Ben's strokes may take a while on a busy computer; once he has them
// all, Bea, with no connection, must not.
const missed = await until(async () => (await scene(ben)).length === 6, 10000) && (await scene(bea)).length === 4;
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
check('a locked board says so on the student\'s page', /locked/.test(await bea.textContent('[data-say]')));
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
await bea.click('.board-download summary');
const [png] = await Promise.all([bea.waitForEvent('download'), bea.click('[data-download="png"]')]);
const [svg] = await Promise.all([bea.waitForEvent('download'), bea.click('[data-download="svg"]')]);
check('a student can download the board as PNG and SVG',
  png.suggestedFilename() === 'stand-in-week-1-board.png' && svg.suggestedFilename() === 'stand-in-week-1-board.svg');

// A design scene's template (R5): two people open the same empty board
// from the scene at once, and it is laid once, saved, and never laid
// again over what anyone drew or erased.
const tq = '?c=stand-in&s=week-2&t=prompt';
const [tBen, tBea] = await Promise.all([open('ben', tq), open('bea', tq)]);
await until(async () => (await live(tBen)) && (await live(tBea)), 20000);
const tIds = (page) => page.evaluate(() => window.__board.api.getSceneElements().filter(e => e.id.startsWith('tpl-')).map(e => e.id).sort().join());
const want = BoardLib.templateElements('prompt').map(e => e.id).sort().join();
check('a template is laid once on an empty board, even when two people open it at once',
  await until(async () => (await tIds(tBen)) === want && (await tIds(tBea)) === want));
const week2 = () => hub.boards.find(b => b.session_id === hub.sessions[1].id && !b.group_id);
check('the template is saved with the board',
  await until(() => week2() && week2().scene.elements.filter(e => e.id.startsWith('tpl-')).length === want.split(',').length, 10000));
check('its frames are locked, so drawing never moves them',
  await tBea.evaluate(() => window.__board.api.getSceneElements().filter(e => e.id.startsWith('tpl-')).every(e => e.locked)));
check('the template’s titles are the course’s words',
  await tBea.evaluate(() => window.__board.api.getSceneElements().some(e => e.type === 'text' && e.text === 'The real prompt')));
await drawRect(tBea, 300, 520, 420, 600);
await until(() => week2().scene.elements.length > want.split(',').length, 10000);
const count = week2().scene.elements.length;
const again = await open('ben', '?c=stand-in&s=week-2&t=moves');
await until(() => live(again), 20000);
await new Promise(r => setTimeout(r, 1500));
check('a board that already has something on it is never laid with a template again',
  !(await again.evaluate(() => window.__board.api.getSceneElements().some(e => e.id.startsWith('tpl-moves'))))
  && week2().scene.elements.length === count);
for (const p of [tBen, tBea, again]) { pages.delete(p); await p.context().close(); }

// The main stage (R5): the Meet add-on's stage, framed as Meet frames
// it, told by its panel that the current scene is a design stage, shows
// that live board, with its template, where the scene's words would be.
const stagePage = await open('bea', null, { width: 1280, height: 720 },
  '<!doctype html><body style="margin:0"><iframe src="/addon/stage/" style="border:0;width:100vw;height:100vh"></iframe></body>');
const stageFrame = () => stagePage.frames().find(f => /\/addon\/stage\//.test(f.url()));
await until(async () => stageFrame() && await stageFrame().evaluate(() => !!window.__stageMessage).catch(() => false), 15000);
const view = AddonLib.stageView({ part: { key: 's', name: 'Design stage', endsAt: null },
  scene: { eyebrow: 'Design stage', title: 'The three questions', lines: ['Where is it going?'], items: [], board: AddonLib.boardLinks(hub.cohort, { number: 3 }, null, 'questions').stage } });
hub.sessions.push({ id: randomUUID(), cohort_id: hub.cohort.id, number: 3, starts_at: new Date(Date.now() + 13 * 86400000).toISOString(), title: 'Week 3' });
await stageFrame().evaluate((m) => window.__stageMessage({ payload: m }), AddonLib.stageMessage(view));
const boardInStage = () => stagePage.frames().find(f => /\/board\/\?.*view=stage/.test(f.url()));
check('a design scene puts its live board on the main stage',
  await until(async () => boardInStage() && await boardInStage().evaluate(() => !!(window.__board && window.__board.api)).catch(() => false), 20000));
check('and the board there is laid with the scene’s template',
  await until(async () => (await boardInStage().evaluate(() => window.__board.api.getSceneElements().filter(e => e.id.startsWith('tpl-questions')).length)) === BoardLib.templateElements('questions').length));
check('the scene’s own lines step aside for the board',
  await stageFrame().evaluate(() => getComputedStyle(document.querySelector('[data-s-lines]')).display === 'none'));
const src = await stageFrame().evaluate(() => document.querySelector('[data-s-board] iframe').src);
await stageFrame().evaluate((m) => window.__stageMessage({ payload: m }), AddonLib.stageMessage({ ...view, part: { ...view.part, name: 'Design stage, edited' } }));
await new Promise(r => setTimeout(r, 500));
check('a new message for the same scene keeps the board as it is, without reloading it',
  await stageFrame().evaluate(() => document.querySelectorAll('[data-s-board] iframe').length) === 1
  && await stageFrame().evaluate(() => document.querySelector('[data-s-board] iframe').src) === src
  && await boardInStage().evaluate(() => !!window.__board));
if (shots) await stagePage.screenshot({ path: join(shots, 'main-stage-design-1280.png') });
await stageFrame().evaluate((m) => window.__stageMessage({ payload: m }), AddonLib.stageMessage({ mode: 'scene', part: null, scene: { eyebrow: 'Talk', title: 'Arrive', lines: ['Welcome back.'], items: [] } }));
check('moving on to a talk scene takes the board off the stage',
  await until(() => stageFrame().evaluate(() => document.querySelector('[data-s-board]').hidden && !document.querySelector('[data-s-board] iframe'))));
pages.delete(stagePage); await stagePage.context().close();

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
