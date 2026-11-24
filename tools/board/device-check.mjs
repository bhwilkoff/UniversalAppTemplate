// The board on a real Android phone: its own Chrome, its own touch screen and
// keyboard, over adb, with another person on this computer. Nobody signs in:
// the phone's page talks to the stand-in here. It opens one tab and closes it.
//
//   node device-check.mjs <adb serial> <screenshot folder>
import { hub, live, check, until, open, origin, browser, server, results, pages, presence, people, deliver, presenceSync, answer, stats } from './stand-in.mjs';
import { createServer } from 'node:http'; import { readFile, writeFile } from 'node:fs/promises'; import { execFileSync } from 'node:child_process'; import { join } from 'node:path';
const serial = process.argv[2], out = process.argv[3], adb = (...a) => execFileSync('adb', ['-s', serial, ...a], { maxBuffer: 5e7 }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WHO = 'bea', info = { who: WHO, topic: null, dropped: false, errors: [] }; let sse = [];
const phone = { evaluate: async (fn, arg) => { const s = 'data: ' + JSON.stringify(`(${fn})(${JSON.stringify(arg)})`) + '\n\n'; sse.forEach((r) => r.write(s)); } };
pages.set(phone, info);
const calls = {
  db: ([q]) => answer(people[WHO].id, q), join: ([t, p]) => { info.topic = t; return !!p; },
  send: async ([t, e, p]) => { stats.messages++; await deliver(phone, t, e, p); }, track: async ([t, m]) => { (presence[t] = presence[t] || {})[people[WHO].id] = [m]; await presenceSync(t); },
  upload: ([path, body, type]) => { hub.files.set(path, { body, type }); return { data: { path }, error: null }; }, download: ([path]) => hub.files.get(path) || null
};
const web = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__sse') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' }); sse.push(res); req.on('close', () => { sse = sse.filter((x) => x !== res); }); return; }
  if (u.pathname.startsWith('/__rpc/')) { let b = ''; for await (const c of req) b += c; const r = await calls[u.pathname.slice(7)](JSON.parse(b)); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(r === undefined ? null : r)); }
  if (u.pathname === '/__supabase.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(`window.__FAKE_SESSION=${JSON.stringify({ access_token: 'stand-in', user: people[WHO] })};${Object.keys(calls).map((k) => `window.__fake${k[0].toUpperCase() + k.slice(1)}=function(){return fetch('/__rpc/${k}',{method:'POST',body:JSON.stringify([].slice.call(arguments))}).then(function(r){return r.json()})};`).join('')}new EventSource('/__sse').onmessage=function(e){try{(0,eval)(JSON.parse(e.data))}catch(x){console.error(x)}};` + await readFile('fake-supabase.js', 'utf8')); }
  const r = await fetch(origin + req.url); let body = Buffer.from(await r.arrayBuffer());
  if (u.pathname === '/board/') body = Buffer.from(body.toString().replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"]*/, '/__supabase.js'));
  res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/octet-stream' }); res.end(body);
});
await new Promise((r) => web.listen(0, '127.0.0.1', r)); const port = web.address().port;
adb('reverse', 'tcp:' + port, 'tcp:' + port); adb('forward', 'tcp:9333', 'localabstract:chrome_devtools_remote');
const url = `http://127.0.0.1:${port}/board/?c=stand-in&s=week-1&view=stage&light`;
const ben = await open('ben', '?c=stand-in&s=week-1&view=stage&light', { width: 816, height: 460 });
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`, '-n', 'com.android.chrome/com.google.android.apps.chrome.Main'); await sleep(5000);
// Only our own tab is ever looked at.
const tab = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.url.includes('127.0.0.1:' + port)); if (!tab) throw new Error('the tab did not open');
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r); let n = 0; const wait = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) { wait.get(m.id)(m); wait.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') info.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((r) => { const id = ++n; wait.set(id, r); ws.send(JSON.stringify({ id, method, params })); }); await send('Runtime.enable');
const ev = async (f, a) => { const r = await send('Runtime.evaluate', { expression: `(${f})(${JSON.stringify(a === undefined ? null : a)})`, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description); return r.result.result.value; };
const shot = async (name) => writeFile(join(out, name + '.png'), adb('exec-out', 'screencap', '-p'));
const els = () => ev(() => window.__board.api.getSceneElements()), st = (k) => ev((k) => window.__board.api.getAppState()[k], k), theirs = (f) => until(async () => (await ben.evaluate(() => window.__board.api.getSceneElements().map((e) => JSON.parse(JSON.stringify(e))))).some(f), 9000);
const at = (x, y) => ev(([x, y]) => { const s = window.__board.api.getAppState(), c = document.querySelector('[data-canvas]').getBoundingClientRect(); return { x: c.left + (x + s.scrollX) * s.zoom.value, y: c.top + (y + s.scrollY) * s.zoom.value }; }, [x, y]);
const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((t, i) => ({ x: t.x, y: t.y, id: i, force: 0.6 })) });
const tap = async (p) => { await touch('touchStart', [p]); await sleep(40); await touch('touchEnd', []); await sleep(300); };
const swipe = async (a, b) => { await touch('touchStart', [a]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 }]); await sleep(16); } await touch('touchEnd', []); await sleep(350); };
const two = async (a, b, c, d) => { await touch('touchStart', [a, b]); for (let i = 1; i <= 10; i++) { const m = (x, y) => ({ x: x.x + (y.x - x.x) * i / 10, y: x.y + (y.y - x.y) * i / 10 }); await touch('touchMove', [m(a, c), m(b, d)]); await sleep(16); } await touch('touchEnd', []); await sleep(350); };
const box = (sel) => ev((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, b: r.bottom, w: r.width }; }, sel), tool = (t) => ev((t) => window.__board.api.setActiveTool({ type: t }), t), clear = () => ev(() => window.__board.api.updateScene({ appState: { selectedElementIds: {} } }));
let restore = () => {};
try {
  check('the phone opens the board and it is live', await until(() => ev(() => !!(window.__board && window.__board.state.live)), 40000)); await sleep(1500); await shot('pixel-open');
  console.log('   ' + await ev(() => [innerWidth + 'x' + innerHeight, devicePixelRatio, navigator.userAgent.match(/Chrome\/[\d.]+/)[0], document.querySelector('.excalidraw').className].join('  ')));
  check('nothing runs off the side of the screen', await ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await tap(await box('[data-notes] input')); await sleep(1500); await shot('pixel-keyboard');
  const typing = await ev(() => { const r = document.querySelector('[data-notes]').getBoundingClientRect(); return { b: r.bottom, v: visualViewport.height + visualViewport.offsetTop, f: document.activeElement.tagName, h: innerHeight }; });
  check('the note box stays above the phone’s own keyboard (' + JSON.stringify(typing) + ')', typing.f === 'INPUT' && typing.b <= typing.v + 2);
  adb('shell', 'input', 'text', 'From%sthe%sPixel'); await sleep(700); adb('shell', 'input', 'keyevent', '66');
  check('a note typed on the phone reaches the other person', await theirs((e) => e.originalText === 'From the Pixel')); await sleep(400); adb('shell', 'input', 'keyevent', '111'); await sleep(1200); await shot('pixel-note');
  await ev(() => document.activeElement.blur()); await sleep(800);
  const note = async () => (await els()).find((e) => e.type === 'rectangle' && e.customData && e.customData.note); let k = await note();
  let c = await at(k.x + k.width * 0.3, k.y + k.height - 12); await tap(c); check('a tap selects a note', !!(await st('selectedElementIds'))[k.id]); await shot('pixel-selected');
  const q = await at(k.x + k.width, k.y + k.height); await swipe({ x: q.x + 5, y: q.y + 5 }, { x: q.x + 55, y: q.y + 55 }); check('its corner resizes it', (await note()).width > k.width + 20); k = await note();
  const s = await at(k.x + k.width, k.y + k.height / 2); await swipe({ x: s.x + 5, y: s.y }, { x: s.x + 45, y: s.y }); check('so does its side', (await note()).width > k.width + 15); k = await note();
  c = await at(k.x + k.width * 0.3, k.y + 20); await swipe(c, { x: c.x + 20, y: c.y + 70 }); check('a finger moves it', (await note()).y > k.y + 30); await clear();
  await tap(await box('.board-card button')); check('a tap votes, and it counts for the other person', await until(async () => /1 vote/.test(await ben.locator('.board-card button').first().textContent()), 6000));
  await tool('freedraw'); await swipe({ x: 70, y: 420 }, { x: 260, y: 470 }); check('a finger draws', await theirs((e) => e.type === 'freedraw' && e.points.length > 4));
  await tool('arrow'); await swipe({ x: 80, y: 520 }, { x: 240, y: 560 }); await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); check('a finger draws an arrow', await theirs((e) => e.type === 'arrow'));
  await tool('selection'); await clear(); const z = (await st('zoom')).value; await two({ x: 160, y: 450 }, { x: 220, y: 500 }, { x: 90, y: 360 }, { x: 310, y: 600 }); check('a pinch zooms the board, not the page', (await st('zoom')).value > z * 1.2 && await ev(() => Math.abs(visualViewport.scale - 1) < 0.01));
  await ben.evaluate(() => { const a = window.__board.api; a.updateScene({ appState: { scrollX: 40, scrollY: 40, zoom: { value: 1 } } }); }); await ben.waitForTimeout(200); await ben.locator('[data-testid="main-menu-trigger"]').click(); await ben.locator('.dropdown-menu').getByText('Bring everyone here', { exact: true }).click(); await sleep(1500); check('the leader brings the phone along too', (await st('zoom')).value < 0.8); await shot('pixel-gathered');
  const spin = adb('shell', 'settings', 'get', 'system', 'accelerometer_rotation').toString().trim(); restore = () => adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', spin); adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'); const was = adb('shell', 'settings', 'get', 'system', 'user_rotation').toString().trim(); adb('shell', 'settings', 'put', 'system', 'user_rotation', '1'); await sleep(3000); await shot('pixel-landscape');
  check('turned sideways, it fits, with the note box in reach, and is still live', await ev(() => innerWidth > innerHeight && document.querySelector('[data-notes]').getBoundingClientRect().bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1 && window.__board.state.live)); adb('shell', 'settings', 'put', 'system', 'user_rotation', was || '0'); restore(); await sleep(1500);
  adb('shell', 'input', 'keyevent', '3'); await sleep(2500); await ben.fill('[data-notes] input', 'While the phone was away'); await ben.press('[data-notes] input', 'Enter'); await sleep(3000); adb('shell', 'am', 'start', '-n', 'com.android.chrome/com.google.android.apps.chrome.Main'); await sleep(2500);
  check('back from another app, it has what it missed', await until(async () => (await els()).some((e) => e.originalText === 'While the phone was away'), 40000));
  check('no error on the phone', !info.errors.length || (console.log(info.errors), false));
} finally {
  restore();
  await fetch('http://127.0.0.1:9333/json/close/' + tab.id).catch(() => {}); adb('shell', 'input', 'keyevent', '3'); adb('reverse', '--remove', 'tcp:' + port); adb('forward', '--remove', 'tcp:9333');
}
await browser.close(); server.close(); web.close();
const failed = results.filter((r) => !r[1]); console.log(`\n${results.length - failed.length} of ${results.length} passed`); process.exit(failed.length ? 1 : 0);
