// Open rooms: one Durable Object per Meet call, holding that call's slides,
// question, board, and page while it runs (ADDON-DESIGN.md, "Open rooms").
// It keeps no accounts, and a room is erased when its host ends it or a day
// after its last change. Sockets hibernate, so an idle room costs nothing.
import { DurableObject } from 'cloudflare:workers';
import { apply, blank, publicRoom, hostWords, siteOk, REACTIONS, LIMITS } from './room-logic.js';

const CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
const DAY = 86400000, MAX_SOCKETS = 600;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('Human Shaped rooms', { headers: { 'content-type': 'text/plain' } });
    if (url.pathname === '/frame') return frameCheck(req, env, url);
    const m = /^\/room\/([a-z-]+)$/.exec(url.pathname);
    if (!m || !CODE.test(m[1])) return new Response('Not found', { status: 404 });
    if (req.headers.get('upgrade') !== 'websocket') return new Response('A room is a WebSocket', { status: 426 });
    const origin = req.headers.get('origin');
    if (origin && !String(env.ORIGINS || '').split(' ').includes(origin)) return new Response('Not from here', { status: 403 });
    return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
  }
};

// Whether a website lets itself be shown inside another page, asked before the
// host puts it on everyone's stage. A browser cannot read these headers across
// sites, so the room asks for it. Anything unclear is a no.
async function frameCheck(req, env, url) {
  const origin = req.headers.get('origin') || '';
  const ok = String(env.ORIGINS || '').split(' ').includes(origin);
  const head = { 'content-type': 'application/json', 'access-control-allow-origin': ok ? origin : 'null', vary: 'origin' };
  if (!ok) return new Response('{"ok":false}', { status: 403, headers: head });
  const href = siteOk(url.searchParams.get('url'));
  if (!href) return new Response('{"ok":false,"why":"address"}', { headers: head });
  let res;
  try { res = await fetch(href, { redirect: 'follow', headers: { 'user-agent': 'HumanShapedRooms/1 (frame check)' }, signal: AbortSignal.timeout(6000) }); }
  catch (e) { return new Response('{"ok":false,"why":"unreachable"}', { headers: head }); }
  try { res.body && res.body.cancel(); } catch (e) {}
  if (!res.ok) return new Response('{"ok":false,"why":"unreachable"}', { headers: head });
  const xfo = (res.headers.get('x-frame-options') || '').trim();
  const fa = /(?:^|;)\s*frame-ancestors\s+([^;]*)/i.exec(res.headers.get('content-security-policy') || '');
  const anywhere = !fa || /(^|\s)(\*|https:)(\s|$)/.test(fa[1]);
  const framed = (!xfo || !!fa) && anywhere;
  return new Response(JSON.stringify({ ok: framed, why: framed ? null : 'refuses', url: siteOk(res.url) || href }), { headers: head });
}

async function pidOf(secret) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = blank();
    this.timer = null; this.floats = []; this.floatTimer = null; this.dirty = false; this.alarmAt = 0;
    this.rates = new WeakMap();
    ctx.blockConcurrencyWhile(async () => {
      const kept = await ctx.storage.get('room');
      if (kept) this.room = Object.assign(blank(), kept);
      this.room.html = (await ctx.storage.get('html')) || '';
      this.alarmAt = (await ctx.storage.getAlarm()) || 0;
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  fetch() {
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return new Response('This room is full', { status: 503 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ pid: null, name: '', role: 'panel' });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  sockets() { return this.ctx.getWebSockets().map((ws) => ({ ws, who: ws.deserializeAttachment() || {} })).filter((s) => s.who.pid); }

  here() {
    const all = this.sockets(), people = {}, host = this.room.host;
    all.forEach((s) => { if (s.who.role !== 'stage' || !people[s.who.pid]) people[s.who.pid] = { id: s.who.pid, name: s.who.name || (people[s.who.pid] || {}).name || '' }; });
    return {
      people: Object.values(people), count: Object.keys(people).length,
      hostHere: !!host && all.some((s) => s.who.pid === host),
      stages: [...new Set(all.filter((s) => s.who.role === 'stage').map((s) => s.who.pid))]
    };
  }

  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch (e) { /* it has gone */ } }

  // Many answers at once reach everyone as one message.
  soon() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 150);
  }
  flush() {
    const out = JSON.stringify({ t: 'room', room: publicRoom(this.room, this.here()) });
    const words = hostWords(this.room);
    this.sockets().forEach((s) => {
      try { s.ws.send(out); } catch (e) { /* it has gone */ }
      if (words && s.who.pid === this.room.host) this.send(s.ws, Object.assign({ t: 'words' }, words));
    });
    if (this.dirty) this.save();
    this.dirty = false;
  }
  save() {
    if (!this.room.on) return;
    const { html, ...kept } = this.room;
    this.ctx.storage.put('room', kept);
    const now = Date.now();
    if (this.alarmAt < now + DAY - 3600000) { this.alarmAt = now + DAY; this.ctx.storage.setAlarm(this.alarmAt); }
  }
  async alarm() {
    for (const s of this.sockets()) this.send(s.ws, { t: 'ended' });
    this.room = blank();
    await this.ctx.storage.deleteAll();
  }

  allowed(ws, host) {
    const now = Date.now(), r = (this.rates.get(ws) || []).filter((t) => now - t < 10000);
    if (r.length >= (host ? 200 : 40)) return false;
    r.push(now); this.rates.set(ws, r);
    return true;
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > LIMITS.html + LIMITS.talk) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const me = ws.deserializeAttachment() || {};

    if (m.t === 'hello') {
      if (typeof m.secret !== 'string' || m.secret.length < 16 || m.secret.length > 128) return this.send(ws, { t: 'error', text: 'This device could not be recognized.' });
      me.pid = await pidOf(m.secret);
      me.name = String(m.name || '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.name);
      me.role = m.role === 'stage' ? 'stage' : 'panel';
      ws.serializeAttachment(me);
      if (me.pid === this.room.host) this.room.hostLeft = null;
      const a = this.room.answers[me.pid], q = this.room.question;
      this.send(ws, { t: 'welcome', you: me.pid, mine: q && a ? { id: q.id, answer: a } : null });
      if (this.room.talk) this.send(ws, { t: 'talk', v: this.room.talkV, text: this.room.talk });
      if (this.room.html) this.send(ws, { t: 'html', v: this.room.htmlV, html: this.room.html });
      this.send(ws, { t: 'room', room: publicRoom(this.room, this.here()) });
      const words = hostWords(this.room);
      if (words && me.pid === this.room.host) this.send(ws, Object.assign({ t: 'words' }, words));
      this.soonQuiet();
      return;
    }
    if (!me.pid) return;
    if (!this.allowed(ws, me.pid === this.room.host)) return;

    if (m.t === 'name') {
      const name = String(m.name || '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.name);
      this.sockets().forEach((s) => { if (s.who.pid === me.pid) { s.who.name = name; s.ws.serializeAttachment(s.who); } });
      if (this.room.host === me.pid) { this.room.hostName = name; this.soon(); } else this.soonQuiet();
      return;
    }
    if (m.t === 'react') {
      if (!REACTIONS.includes(m.r)) return;
      this.floats.push({ r: m.r, n: me.name ? me.name.split(' ')[0].slice(0, 24) : null });
      if (!this.floatTimer) this.floatTimer = setTimeout(() => {
        this.floatTimer = null;
        const out = JSON.stringify({ t: 'floats', floats: this.floats.slice(-12) });
        this.floats = [];
        this.sockets().forEach((s) => { try { s.ws.send(out); } catch (e) { /* it has gone */ } });
      }, 250);
      return;
    }
    if (m.t === 'end') {
      if (me.pid !== this.room.host) return;
      const out = this.sockets();
      this.room = blank();
      await this.ctx.storage.deleteAll();
      this.alarmAt = 0; this.dirty = false;
      out.forEach((s) => this.send(s.ws, { t: 'ended' }));
      this.soonQuiet();
      return;
    }

    const here = this.here();
    const pids = new Set(here.people.map((p) => p.id));
    const did = apply(this.room, { pid: me.pid, name: me.name, hostHere: here.hostHere, isHere: (id) => pids.has(id) }, m, Date.now(), { blocked: String(this.env.BLOCKED_REPOS || '').toLowerCase().split(' ').filter(Boolean) });
    if (did.error) return this.send(ws, { t: 'error', text: did.error });
    if (did.talk) { const out = JSON.stringify({ t: 'talk', v: this.room.talkV, text: this.room.talk }); this.sockets().forEach((s) => { try { s.ws.send(out); } catch (e) { /* gone */ } }); }
    if (did.html) {
      await this.ctx.storage.put('html', this.room.html);
      const out = JSON.stringify({ t: 'html', v: this.room.htmlV, html: this.room.html });
      this.sockets().forEach((s) => { try { s.ws.send(out); } catch (e) { /* gone */ } });
    }
    if (did.mine) this.sockets().forEach((s) => { if (s.who.pid === me.pid) this.send(s.ws, { t: 'mine', mine: did.mine }); });
    if (did.room) this.soon();
  }

  // Who is here changed, and the room did not.
  soonQuiet() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 150);
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch (e) { /* closed */ }
    this.left(ws);
  }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    const me = ws.deserializeAttachment() || {};
    if (!me.pid) return;
    if (me.pid === this.room.host && !this.sockets().some((s) => s.ws !== ws && s.who.pid === me.pid)) { this.room.hostLeft = Date.now(); this.soon(); return; }
    this.soonQuiet();
  }
}
