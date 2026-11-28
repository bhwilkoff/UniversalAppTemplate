// Whether the deployed rooms worker knows show your work: opens a throwaway
// room, asks for work, and ends it. node tools/rooms/check-works.mjs wss://…/room/abc-defg-hij
const url = process.argv[2];
const ws = new WebSocket(url);
const secret = 'x'.repeat(8) + Math.random().toString(36).slice(2).padEnd(24, 'q');
let step = 0;
ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', secret, name: 'Check (delete me)', role: 'panel' }));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.t === 'welcome' && step === 0) { step = 1; ws.send(JSON.stringify({ t: 'start', title: 'worker check' })); setTimeout(() => ws.send(JSON.stringify({ t: 'works', open: true })), 600); }
  if (m.t === 'error') { console.log('error:', m.text); finish(); }
  if (m.t === 'room' && m.room.worksOpen) { console.log('new worker: worksOpen true'); finish(); }
};
function finish() { try { ws.send(JSON.stringify({ t: 'end' })); } catch (e) {} setTimeout(() => process.exit(0), 400); }
setTimeout(() => { console.log('timeout'); finish(); }, 8000);
