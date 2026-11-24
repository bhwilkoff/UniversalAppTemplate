// Every part of Excalidraw the board turns on, as two people, with a real
// mouse and keyboard: pictures pasted, dropped, and cropped; websites and
// videos; links; the library; following and gathering; others' selections;
// files; export; grouping, aligning, order, locks, flips, styles, charts and
// diagrams pasted in, search, grid, snapping, zen, view mode, theme, pages.
//
//   cd tools/board && npm ci && node feature-check.mjs [screenshot folder]
import { origin, hub, live, check, until, open, shots, browser, server, results, pages, BoardLib } from './stand-in.mjs';
import { join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
const W = { width: 1200, height: 700 }, q = '?c=stand-in&s=week-1&view=stage&light', tmp = mkdtempSync(join(tmpdir(), 'hs-board-'));
const ben = await open('ben', q, W), bea = await open('bea', q, W);
await until(async () => await live(ben) && await live(bea), 20000);
const snap = async (p, n) => { if (shots) await p.screenshot({ path: join(shots, n + '.png') }); };
const ev = (p, f, a) => p.evaluate(f, a);
const els = (p) => ev(p, () => window.__board.api.getSceneElements().map((e) => JSON.parse(JSON.stringify(e))));
const st = (p, k) => ev(p, (k) => { const v = window.__board.api.getAppState()[k]; return v instanceof Set ? [...v] : v; }, k);
const tool = (p, t) => ev(p, (t) => window.__board.api.setActiveTool({ type: t }), t);
const reset = async () => { await ev(ben, () => { const { api } = window.__board; api.setActiveTool({ type: 'selection' }); api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map((e) => e.isDeleted ? e : ({ ...e, isDeleted: true, version: e.version + 1, versionNonce: 1, updated: Date.now() })), appState: { selectedElementIds: {}, selectedGroupIds: {}, scrollX: 0, scrollY: 0, zoom: { value: 1 }, openMenu: null, openSidebar: null, openDialog: null } }); }); await until(async () => !(await els(bea)).length, 5000); };
const at = (p, x, y) => ev(p, ([x, y]) => { const s = window.__board.api.getAppState(), c = document.querySelector('[data-canvas]').getBoundingClientRect(); return { x: c.left + (x + s.scrollX) * s.zoom.value, y: c.top + (y + s.scrollY) * s.zoom.value }; }, [x, y]);
const drag = async (p, a, b) => { await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 }); await p.mouse.move(b.x, b.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150); };
const rect = async (x, y, w = 90, h = 60) => { await tool(ben, 'rectangle'); await drag(ben, { x, y }, { x: x + w, y: y + h }); await tool(ben, 'selection'); };
const focus = (p) => ev(p, () => document.querySelector('.excalidraw').focus());
const selectAll = async () => { await focus(ben); await ben.keyboard.press('ControlOrMeta+a'); await ben.waitForTimeout(100); };
const settle = (f, ms = 6000) => until(async () => { const a = await els(ben), b = await els(bea); return f(b) && JSON.stringify(a.map((e) => [e.id, e.version]).sort()) === JSON.stringify(b.map((e) => [e.id, e.version]).sort()); }, ms);
const menu = async (p, label) => { await p.locator('[data-testid="main-menu-trigger"]').click(); await p.waitForTimeout(200); await p.locator('.dropdown-menu').getByText(label, { exact: true }).first().click(); await p.waitForTimeout(300); };
// A person's own clipboard, as a paste event with these parts in it.
const paste = (p, parts) => ev(p, async (parts) => {
  const dt = new DataTransfer();
  for (const x of parts) { if (x.file) { const b = Uint8Array.from(atob(x.file), (c) => c.charCodeAt(0)); dt.items.add(new File([b], x.name, { type: x.type })); } else dt.setData(x.type, x.text); }
  document.querySelector('.excalidraw').focus();
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 350, bubbles: true }));
  document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, parts);
const PNG = await ev(ben, () => { const c = document.createElement('canvas'); c.width = 200; c.height = 120; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 100, 120); g.fillStyle = '#36c'; g.fillRect(100, 0, 100, 120); return c.toDataURL('image/png').split(',')[1]; });
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="green"/></svg>').toString('base64');
await ben.mouse.move(600, 350);

// ---------------- pictures
await paste(ben, [{ file: PNG, name: 'photo.png', type: 'image/png' }]);
check('a pasted picture is on the board, and reaches the other screen', await settle((b) => b.length === 1 && b[0].type === 'image', 9000));
const img = (await els(ben))[0] || {};
check('it is kept in the board’s own storage', hub.files.size === 1 && [...hub.files.keys()][0].startsWith(hub.cohort.id + '/' + hub.boards[0].id + '/'));
check('the other person really has the picture', await until(() => ev(bea, (id) => { const f = window.__board.api.getFiles()[id]; return !!f && f.dataURL.length > 100; }, img.fileId), 9000));
await snap(bea, 'picture');
await paste(ben, [{ file: SVG, name: 'drawing.svg', type: 'image/svg+xml' }]);
check('an SVG is kept as a picture, for everyone', await settle((b) => b.filter((e) => e.type === 'image').length === 2, 9000) && await until(() => ev(bea, () => window.__board.api.getSceneElements().filter((e) => e.type === 'image').every((e) => !!window.__board.api.getFiles()[e.fileId])), 9000));
await reset();
writeFileSync(join(tmp, 'pick.png'), Buffer.from(PNG, 'base64'));
{
  const [fc] = await Promise.all([ben.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null), tool(ben, 'image')].concat([]));
  if (fc) await fc.setFiles(join(tmp, 'pick.png'));
  await ben.waitForTimeout(1200); if (!(await els(ben)).some((e) => e.type === 'image' && e.status === 'saved')) await ben.mouse.click(600, 350);
  check('the picture tool asks for a file and places it', !!fc && await settle((b) => b.some((e) => e.type === 'image'), 9000));
}
{
  const e = (await els(ben)).find((x) => x.type === 'image') || { x: 0, y: 0, width: 0, height: 0 }; await ev(ben, (id) => window.__board.api.updateScene({ appState: { selectedElementIds: {} } }), 0);
  const c = await at(ben, e.x + e.width / 2, e.y + e.height / 2); await ben.mouse.dblclick(c.x, c.y); await ben.waitForTimeout(300);
  const cropping = await st(ben, 'croppingElementId'); const r = await at(ben, e.x + e.width, e.y + e.height / 2);
  await drag(ben, { x: r.x - 2, y: r.y }, { x: r.x - 60, y: r.y }); await ben.keyboard.press('Enter'); await ben.waitForTimeout(300);
  const after = (await els(ben)).find((x) => x.id === e.id);
  check('double-click crops a picture, and the crop reaches the other screen', !!cropping && !!after && !!after.crop && after.width < e.width - 20 && await settle((b) => b.some((x) => x.id === e.id && x.crop)));
}
hub.uploadFails = 9; await paste(ben, [{ file: PNG, name: 'nope.png', type: 'image/png' }]);
check('a picture that cannot be kept is taken back and says so, and is never sent as an empty frame', await until(async () => (await els(ben)).filter((e) => e.type === 'image').length === 1 && /could not be kept/.test((await st(ben, 'toast') || {}).message || ''), 12000) && (await els(bea)).filter((e) => e.type === 'image').length === 1);
hub.uploadFails = 0; await reset();

// ---------------- websites, videos, links
await ev(ben, () => window.__board.api.setToast(null));
await paste(ben, [{ type: 'text/plain', text: 'https://eardrama.org/' }]);
check('a pasted web address becomes a page on the board, for everyone', await settle((b) => b.length === 1 && b[0].type === 'embeddable' && b[0].link === 'https://eardrama.org/'));
check('it is framed in the same sandbox as an app on the stage', await until(() => ev(bea, () => { const f = document.querySelector('iframe.excalidraw__embeddable'); return !!f && /eardrama/.test(f.src) && /allow-same-origin/.test(f.getAttribute('sandbox')) && !/allow-top-navigation/.test(f.getAttribute('sandbox')); })));
await reset();
await paste(ben, [{ type: 'text/plain', text: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' }]);
check('a pasted video address becomes its player', await settle((b) => b.length === 1 && b[0].type === 'embeddable') && await until(() => ev(bea, () => /youtube\.com\/embed/.test((document.querySelector('iframe.excalidraw__embeddable') || {}).src || ''))));
await reset();
await paste(ben, [{ type: 'text/plain', text: 'https://humanshaped.org/account/' }]); await ben.waitForTimeout(500);
check('this site’s own pages and GitHub stay words', !(await els(ben)).some((e) => e.type === 'embeddable'));
await reset();
await rect(400, 200); await rect(800, 450);
{
  const [a, b] = (await els(ben)); await ev(ben, (id) => window.__board.api.updateScene({ appState: { selectedElementIds: { [id]: true } } }), a.id);
  await ev(ben, ([a, b]) => { const { api, state } = window.__board; const link = state.tools.props.generateLinkForSelection(b); api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map((e) => e.id === a ? { ...e, link, version: e.version + 1, versionNonce: 5 } : e), captureUpdate: 'IMMEDIATELY' }); }, [a.id, b.id]);
  await settle((x) => x.some((e) => e.link));
  const moved = await ev(bea, ([a]) => { const { api, state } = window.__board; api.updateScene({ appState: { scrollX: 4000, scrollY: 4000 } }); let stopped = false; state.tools.props.onLinkOpen(api.getSceneElements().find((e) => e.id === a), { preventDefault() { stopped = true; } }); return stopped; }, [a.id]);
  await bea.waitForTimeout(900);
  check('a link to another thing on the board goes to it, and the board stays', moved && Math.abs(await st(bea, 'scrollX')) < 2000 && /\/board\//.test(bea.url()));
  await ev(bea, () => window.__board.api.updateScene({ appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 } } }));
}
await reset();

// ---------------- together
await rect(400, 250); await settle((b) => b.length === 1); await selectAll();
check('others see what a person has selected', await until(() => ev(bea, () => [...window.__board.api.getAppState().collaborators.values()].some((c) => c.username === 'Ben' && c.selectedElementIds && Object.keys(c.selectedElementIds).length === 1))));
check('everyone on the board is listed by name', await until(() => ev(bea, () => { const l = [...window.__board.api.getAppState().collaborators.values()]; return l.length === 2 && l.some((c) => c.username === 'Ben') && l.some((c) => c.isCurrentUser); })));
{
  await bea.locator('.UserList .Avatar, .UserList [class*=avatar i]').first().click({ timeout: 4000 }).catch(() => {});
  const follows = await until(() => st(bea, 'userToFollow'), 1500) || await ev(bea, () => { const c = [...window.__board.api.getAppState().collaborators.values()].find((x) => x.username === 'Ben'); window.__board.api.updateScene({ appState: { userToFollow: { socketId: c.socketId, username: 'Ben' } } }); return false; });
  check('pressing a face follows that person', !!follows);
  await until(async () => ((await st(ben, 'followedBy')) || []).length === 1);
  await ev(ben, () => window.__board.api.updateScene({ appState: { scrollX: -900, scrollY: -300, zoom: { value: 0.8 } } }));
  check('and their view goes where the other’s does', await until(async () => Math.abs((await st(bea, 'scrollX')) + 900) < 80, 5000));
  await snap(bea, 'following');
  await ev(bea, () => window.__board.api.updateScene({ appState: { userToFollow: null } }));
  check('and stops when they stop', await until(async () => ((await st(ben, 'followedBy')) || []).length === 0));
  await ev(ben, () => window.__board.api.updateScene({ appState: { scrollX: 700, scrollY: 200, zoom: { value: 1 } } })); await ben.waitForTimeout(200);
  await menu(ben, 'Bring everyone here');
  check('a leader brings everyone to where they are looking', await until(async () => Math.abs((await st(bea, 'scrollX')) - 700) < 60 && Math.abs((await st(bea, 'scrollY')) - 200) < 60, 4000));
  await bea.locator('[data-testid="main-menu-trigger"]').click(); check('a learner cannot', !/Bring everyone/.test(await bea.locator('.dropdown-menu').innerText())); await bea.keyboard.press('Escape'); await bea.mouse.click(600, 600);
  const x0 = await st(ben, 'scrollX'); await ev(bea, () => window.__board.state.channel.send({ type: 'broadcast', event: 'gather', payload: { id: window.__board.state.me.id, bounds: [5000, 5000, 5400, 5200] } })); await ben.waitForTimeout(500);
  check('and a made-up one from a learner moves nobody', (await st(ben, 'scrollX')) === x0);
  await ev(bea, () => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check('someone who looks away shows as away', await until(() => ev(ben, () => [...window.__board.api.getAppState().collaborators.values()].some((c) => c.username === 'Bea' && c.userState === 'away'))));
  await ev(bea, () => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
}
await reset();

// ---------------- the library
await rect(400, 250); await selectAll();
await ben.mouse.click(440, 252, { button: 'right' }); await ben.waitForTimeout(250);
await ben.locator('.context-menu').getByText('Add to library').click().catch(() => {}); await ben.waitForTimeout(400);
check('a shape can be kept in a person’s own library', await until(() => (hub.libraries[Object.keys(hub.libraries)[0]] || []).length === 1, 5000));
{
  const again = await open('ben', '?c=stand-in&s=week-2&view=stage&light', W); await until(() => live(again), 20000); await again.waitForTimeout(800);
  await again.locator('.default-sidebar-trigger').click(); await again.waitForTimeout(700); await snap(again, 'library');
  check('and is there on another board', await again.locator('.library-unit__dragger').count() === 1);
  await again.locator('.library-unit__dragger').first().click(); await again.waitForTimeout(500);
  check('and can be put on it', (await els(again)).length === 1);
  pages.delete(again); await again.context().close();
  const other = await open('bea', '?c=stand-in&s=week-2&view=stage&light', W); await until(() => live(other), 20000); await other.waitForTimeout(600); await other.locator('.default-sidebar-trigger').click(); await other.waitForTimeout(600);
  check('and nobody else sees it', await other.locator('.library-unit__dragger').count() === 0); pages.delete(other); await other.context().close();
}
{
  const ctxLib = { type: 'excalidrawlib', version: 2, source: 'x', libraryItems: [{ id: 'L1', status: 'published', created: 1, elements: [(await els(ben))[0]] }] };
  const p = await open('bea', '?c=stand-in&s=week-1&light', W); await until(() => live(p), 20000); await p.waitForTimeout(600);
  await p.route('https://libraries.excalidraw.com/**', (r) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ctxLib) }));
  p.on('dialog', (d) => d.accept());
  await ev(p, () => { location.hash = '#addLibrary=' + encodeURIComponent('https://libraries.excalidraw.com/libraries/a/b.excalidrawlib') + '&token=x'; });
  check('“Add to Excalidraw” on libraries.excalidraw.com adds to their library', await until(() => Object.values(hub.libraries).filter((l) => l.length === 1).length === 2, 8000));
  await ev(p, () => { location.hash = '#addLibrary=' + encodeURIComponent('https://evil.example/x.excalidrawlib'); }); await p.waitForTimeout(400);
  check('and a library from anywhere else is refused', Object.values(hub.libraries).every((l) => l.length === 1)); pages.delete(p); await p.context().close();
}
await reset();

// ---------------- arranging
await rect(300, 200); await rect(480, 260); await rect(700, 340); await settle((b) => b.length === 3); await selectAll();
const press = async (k) => { await focus(ben); await ben.keyboard.press(k); await ben.waitForTimeout(200); };
await press('ControlOrMeta+g'); check('group', await settle((b) => b.every((e) => e.groupIds.length === 1 && e.groupIds[0] === b[0].groupIds[0])));
await press('ControlOrMeta+Shift+g'); check('ungroup', await settle((b) => b.every((e) => !e.groupIds.length)));
await selectAll(); await press('ControlOrMeta+Shift+ArrowUp'); check('align', await settle((b) => new Set(b.map((e) => Math.round(e.y))).size === 1));
await selectAll(); await press('Alt+h'); check('distribute', await settle((b) => { const s = b.map((e) => e.x).sort((x, y) => x - y); return Math.abs((s[1] - s[0]) - (s[2] - s[1])) < 2; }));
{ const before = (await els(ben)).map((e) => e.x).sort(); await selectAll(); await press('Shift+h'); check('flip', JSON.stringify((await els(ben)).map((e) => Math.round(e.x)).sort()) === JSON.stringify(before.map(Math.round))); }
{ const list = await els(ben), first = list[0], c = await at(ben, first.x + 2, first.y + first.height / 2); const ctx = async (label) => { await ben.mouse.click(c.x, c.y); await ben.mouse.click(c.x, c.y, { button: 'right' }); await ben.waitForTimeout(250); await ben.locator('.context-menu').getByText(label, { exact: true }).click({ timeout: 3000 }).catch((e) => console.log(e.message.split('\n')[0])); await ben.waitForTimeout(200); };
  await ctx('Bring to front'); check('bring to front, on both screens', await settle((b) => b[b.length - 1].id === first.id)); await ctx('Send to back'); check('send to back, on both screens', await settle((b) => b[0].id === first.id)); }
await selectAll(); await press('ControlOrMeta+Shift+l'); check('lock a thing in place, on both screens', await settle((b) => b.every((e) => e.locked)));
await ev(ben, () => window.__board.api.updateScene({ appState: { selectedElementIds: {} } })); await ben.mouse.click(1000, 560, { button: 'right' }); await ben.waitForTimeout(300); await snap(ben, 'context'); await ben.locator('.context-menu').getByText('Unlock all', { exact: true }).click({ timeout: 3000 }).catch(() => {}); check('unlock everything', await settle((b) => b.every((e) => !e.locked)));
await selectAll(); await ben.locator('.App-menu__left [title*="#ffc9c9"], .App-menu__left [data-testid="color-top-pick-#ffc9c9"]').first().click().catch(() => {}); await ben.waitForTimeout(200);
check('color, on both screens', await settle((b) => b.every((e) => e.backgroundColor === '#ffc9c9')));
await selectAll(); await press('ControlOrMeta+Alt+c'); await rect(300, 480); await ev(ben, () => { const { api } = window.__board, e = api.getSceneElements().slice(-1)[0]; api.updateScene({ appState: { selectedElementIds: { [e.id]: true } } }); }); await press('ControlOrMeta+Alt+v'); check('copy and paste styles', await settle((b) => b.length === 4 && b[3].backgroundColor === '#ffc9c9'));
await ev(ben, () => { const { api } = window.__board; api.updateScene({ appState: { selectedElementIds: { [api.getSceneElements()[0].id]: true } } }); }); await press('ControlOrMeta+k'); check('the link box opens', await until(() => ev(ben, () => !!document.querySelector('.excalidraw-hyperlinkContainer')))); await ben.keyboard.press('Escape');
await selectAll(); await press('ControlOrMeta+d'); check('duplicate', await settle((b) => b.length === 8)); await press('ControlOrMeta+z'); check('undo', await settle((b) => b.length === 4)); await press('ControlOrMeta+Shift+z'); check('redo', await settle((b) => b.length === 8));
await reset();
await rect(400, 250); await selectAll(); await press('ControlOrMeta+ArrowRight'); await ben.keyboard.up('Meta'); await ben.keyboard.up('Control'); await ben.waitForTimeout(300); await focus(ben);
check('a flowchart grows from a shape', await settle((b) => b.length >= 3 && b.some((e) => e.type === 'arrow'))); await ben.keyboard.press('Escape'); await reset();
{ await tool(ben, 'frame'); await drag(ben, { x: 300, y: 150 }, { x: 800, y: 500 }); await rect(400, 250); check('a shape drawn in a frame belongs to it', await settle((b) => b.length === 2 && b.find((e) => e.type === 'rectangle').frameId === b.find((e) => e.type === 'frame').id)); await reset(); }
{ await rect(400, 250, 200, 100); await selectAll(); await ben.keyboard.press('Enter'); await ben.waitForTimeout(200); await ben.keyboard.type('In a shape'); await ben.keyboard.press('Escape'); check('words in any shape', await settle((b) => b.some((e) => e.type === 'text' && e.containerId && e.originalText === 'In a shape'))); }
{ await ev(ben, () => { const t = window.__board.api.getSceneElements().find((e) => e.type === 'text'); window.__board.api.updateScene({ appState: { selectedElementIds: { [t.containerId]: true } } }); }); await ben.locator('[data-testid="font-family-code"]').click().catch(() => {}); await ben.waitForTimeout(500); check('fonts', await settle((b) => b.find((e) => e.type === 'text').fontFamily !== 5)); await press('ControlOrMeta+Shift+Period'); check('text size', await settle((b) => b.find((e) => e.type === 'text').fontSize > 20)); }
await reset();

// ---------------- votes are never part of a selection
await ben.fill('[data-notes] input', 'Voted on'); await ben.press('[data-notes] input', 'Enter'); await ben.waitForTimeout(700);
await ben.locator('.board-card button').first().click(); await settle((b) => b.length === 3);
await ben.mouse.click(1000, 560, { button: 'right' }); await ben.waitForTimeout(300); await ben.locator('.context-menu').getByText('Unlock all', { exact: true }).click({ timeout: 3000 }).catch(() => {}); await ben.waitForTimeout(500);
check('“Unlock all” leaves a vote locked', (await els(ben)).filter((e) => e.customData && e.customData.vote).every((e) => e.locked));
await selectAll(); check('and it is never selected', !Object.keys(await st(ben, 'selectedElementIds')).some((k) => /^vote-/.test(k))); check('and still counts', /1 vote/.test(await ben.locator('.board-card button').first().textContent()));
await reset();

// ---------------- pasted in
await paste(ben, [{ type: 'text/plain', text: 'Week\tPeople\nOne\t4\nTwo\t7\nThree\t9' }]); await ben.waitForTimeout(700);
check('a pasted table offers charts', await ben.locator('.PasteChartDialog').count() === 1); await snap(ben, 'chart'); await ben.locator('.PasteChartDialog .ChartPreview').first().click().catch(() => {}); await ben.waitForTimeout(400); await ben.mouse.click(600, 400);
check('and draws one, for everyone', await settle((b) => b.length > 6, 7000)); await reset();
await paste(ben, [{ type: 'text/plain', text: 'flowchart TD\n A[Write] --> B[Play]\n B --> C[Publish]' }]);
check('a pasted Mermaid diagram is drawn, for everyone', await settle((b) => b.filter((e) => e.type === 'rectangle').length === 3 && b.filter((e) => e.type === 'arrow').length === 2, 20000)); await snap(ben, 'mermaid'); await reset();
await paste(ben, [{ type: 'text/plain', text: 'Plain words\nover two lines' }]); check('pasted words', await settle((b) => b.length >= 1 && b.every((e) => e.type === 'text'))); await reset();

// ---------------- looking
await rect(400, 250); await selectAll(); await ben.keyboard.press('Enter'); await ben.keyboard.type('findme'); await ben.keyboard.press('Escape'); await press('ControlOrMeta+f'); await ben.waitForTimeout(400);
await ben.keyboard.type('findme'); await ben.waitForTimeout(900); await snap(ben, 'find'); check('find on canvas', await until(() => ev(ben, () => /1 (match|result)/i.test((document.querySelector('.layer-ui__search') || document.body).innerText)), 4000)); await ben.keyboard.press('Escape'); await ben.keyboard.press('Escape'); await ev(ben, () => window.__board.api.toggleSidebar({ name: 'default', force: false }));
await press("ControlOrMeta+'"); check('grid', await st(ben, 'gridModeEnabled')); await press("ControlOrMeta+'");
await press('Alt+s'); check('snap to objects', await st(ben, 'objectsSnapModeEnabled')); await press('Alt+s');
await press('Alt+z'); check('zen mode', await st(ben, 'zenModeEnabled')); await press('Alt+z');
await press('Alt+r'); check('view mode, for one person only', await st(ben, 'viewModeEnabled') && !(await st(bea, 'viewModeEnabled'))); await press('Alt+r');
await press('Alt+/'); check('stats', (await st(ben, 'stats')).open); await press('Alt+/');
await ev(ben, () => window.__board.api.updateScene({ appState: { scrollX: 3000 } })); await press('Shift+1'); check('zoom to fit', Math.abs(await st(ben, 'scrollX')) < 1500); await press('ControlOrMeta+0'); check('reset zoom', (await st(ben, 'zoom')).value === 1);
await press('?'); check('help', await until(() => ben.locator('.HelpDialog').count().then((n) => n > 0))); await ben.keyboard.press('Escape');
await ben.locator('[data-testid="main-menu-trigger"]').click(); await snap(ben, 'menu'); await ben.locator('.dropdown-menu [title*="ark"], .dropdown-menu label:has([value="dark"])').first().click().catch(() => {}); check('dark, for one person only', await until(async () => (await st(ben, 'theme')) === 'dark') && (await st(bea, 'theme')) === 'light'); await ben.keyboard.press('Escape'); await ben.mouse.click(900, 620);

// ---------------- a save that is slow to answer
{
  await reset(); await ben.waitForTimeout(6000); hub.saveDelay = 1500;
  await tool(ben, 'rectangle'); await ben.mouse.move(300, 250); await ben.mouse.down(); await ben.mouse.move(305, 255);
  await until(() => hub.boards[0].scene.elements.some((e) => e.type === 'rectangle' && !e.isDeleted), 9000);
  await ben.mouse.move(520, 420, { steps: 8 }); await ben.mouse.up();
  const id = (await els(ben))[0].id, w = (await els(ben))[0].width;
  check('a shape still being drawn while a save is out is saved as it ended up', await until(() => { const e = hub.boards[0].scene.elements.find((x) => x.id === id); return e && Math.abs(e.width - w) < 1; }, 12000));
  hub.saveDelay = 0;
  const p = await open('bea', q, { width: 816, height: 460 }); await until(() => live(p), 20000); await ev(p, () => window.__board.api.updateScene({ appState: { scrollX: 5000 } }));
  await ev(p, () => { const a = window.__board.api; a.updateScene({ appState: { selectedElementIds: { [a.getSceneElements()[0].id]: true } } }); }); await p.waitForTimeout(400); await focus(p); await p.keyboard.press('Shift+1'); await p.waitForTimeout(400); await snap(p, 'fit');
  const z = await st(p, 'zoom'), b = (await els(p)).find((e) => e.id === id), s = await at(p, b.x, b.y), t = await at(p, b.x + b.width, b.y + b.height);
  check('zoom to fit stays clear of the style panel on the stage', z.value > 0.3 && s.x >= 0 && t.x <= 620 && s.y >= 50 && t.y <= 400); pages.delete(p); await p.context().close();
  await reset(); await rect(400, 250); await selectAll(); await ben.keyboard.press('Enter'); await ben.keyboard.type('kept'); await ben.keyboard.press('Escape');
}

// ---------------- files
{
  await menu(ben, 'Export image...'); check('the export dialog opens, with its preview', await until(() => ben.locator('.ImageExportModal').count().then((n) => n > 0))); await snap(ben, 'export');
  const [d] = await Promise.all([ben.waitForEvent('download', { timeout: 8000 }).catch(() => null), ben.locator('.ImageExportModal').getByText('SVG', { exact: true }).click().catch(() => {})]); check('and saves', !!d); await ben.locator('.Modal__background').click({ position: { x: 5, y: 5 }, timeout: 3000 }).catch(() => {}); await ev(ben, () => window.__board.api.updateScene({ appState: { openDialog: null } })); await ben.waitForTimeout(400);
  const [f] = await Promise.all([ben.waitForEvent('download', { timeout: 8000 }).catch(() => null), menu(ben, 'Download the board')]); const file = join(tmp, 'board.excalidraw'); if (f) await f.saveAs(file);
  const had = (await els(ben)).length;
  const [fc] = await Promise.all([ben.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), menu(ben, 'Add a saved board')]); if (fc) await fc.setFiles(file);
  check('a saved board opens beside what is here, for everyone', !!fc && await settle((b) => b.length === had * 2 && new Set(b.map((e) => e.id)).size === had * 2, 8000));
  check('and its words stay in their shapes', (await els(bea)).filter((e) => e.containerId).every((t) => !!t.containerId) && (await els(bea)).filter((e) => e.containerId).length === 2 && new Set((await els(bea)).filter((e) => e.containerId).map((e) => e.containerId)).size === 2);
  const [pf] = await Promise.all([ben.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), menu(ben, 'Add a PDF or pictures')]); if (pf) await pf.setFiles(join(tmp, 'pick.png'));
  check('a picture as a page, locked under the drawing, for everyone', !!pf && await settle((b) => b.some((e) => e.type === 'image' && e.locked), 9000) && await until(() => ev(bea, () => window.__board.api.getSceneElements().filter((e) => e.type === 'image').every((e) => !!window.__board.api.getFiles()[e.fileId])), 9000));
}
// ---------------- saving and copying from inside a frame like Meet's
{
  const p = await open('ben', null, { width: 1000, height: 640 }, '<!doctype html><body style="margin:0"><iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" src="' + origin + '/board/?c=stand-in&s=week-1&view=stage&light" style="border:0;width:100vw;height:100vh"></iframe></body>', { }, 'localhost');
  const f = () => p.frames().find((x) => /\/board\/\?/.test(x.url())); await until(async () => f() && await f().evaluate(() => !!(window.__board && window.__board.state.live)).catch(() => false), 25000); await p.waitForTimeout(600);
  const pop = async (act) => { const [w] = await Promise.all([p.context().waitForEvent('page', { timeout: 8000 }).catch(() => null), act()]); return w; };
  const item = (label) => async () => { await f().locator('[data-testid="main-menu-trigger"]').click(); await p.waitForTimeout(250); await f().locator('.dropdown-menu').getByText(label, { exact: true }).click(); };
  for (const [label, want] of [['Download with names and votes', /\.png$/], ['Download the board', /\.excalidraw$/]]) {
    let got = null; const w = await pop(item(label)); if (w) { const d = await w.waitForEvent('download', { timeout: 8000 }).catch(() => null); got = d && d.suggestedFilename(); await w.waitForTimeout(300); if (shots) await w.screenshot({ path: join(shots, 'save-window.png') }); }
    check('in Meet’s frame, “' + label + '” saves from a window of its own (' + got + ')', !!got && want.test(got)); if (w) await w.close();
  }
  await item('Export image...')(); await p.waitForTimeout(800); if (shots) await p.screenshot({ path: join(shots, 'export-framed.png') });
  let got = null; const w = await pop(() => f().locator('.ImageExportModal').getByText('PNG', { exact: true }).click()); if (w) { const d = await w.waitForEvent('download', { timeout: 8000 }).catch(() => null); got = d && d.suggestedFilename(); await w.close(); }
  check('and so does the export window (' + got + ')', /\.png$/.test(got || ''));
  await p.context().grantPermissions([]); const c = await pop(() => f().locator('.ImageExportModal').getByText('Copy to clipboard', { exact: true }).click()); if (c) await c.waitForTimeout(1200);
  const said = c && await c.locator('[data-said]').textContent(); check('and copying, which Meet’s frame refuses, is offered there (' + said + ')', /Copied|Press Copy it/.test(said || '') && await c.locator('[data-copy]').isVisible()); if (c) await c.close();
  const alone = await p.context().newPage(); await alone.goto(origin + '/board/save/'); await alone.evaluate(() => window.postMessage({ hsSave: { blob: new Blob(['x'], { type: 'image/png' }), name: 'x.png' } }, '*')); await alone.waitForTimeout(300);
  check('that window takes nothing from anyone but the board that opened it', await alone.locator('[data-save]').isDisabled()); await alone.close(); pages.delete(p); await p.context().close();
}
check('no page threw an error', [...pages.values()].every((i) => !i.errors.length) || (console.log([...pages.values()].map((i) => i.errors)), false));
await browser.close(); server.close();
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
