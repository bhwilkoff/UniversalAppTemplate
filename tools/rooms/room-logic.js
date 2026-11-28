// What a room is and what each message does to it, with no network in it, so
// every rule is tested (tools/test/room-logic.test.mjs). worker.js carries the
// messages. A room is one Meet call's slides, question, board, and page, and
// it is erased when it ends.

export const LIMITS = { talk: 42000, html: 100000, title: 120, name: 60, prompt: 500, choice: 120, choices: 8, note: 280, notes: 200, notesEach: 20, answer: 1000, card: 400, people: 300, clock: 7200, url: 2000, mstate: 20000, strokes: 200, element: 60000, drawing: 4000, drawingBytes: 1500000, workbook: 40000, wbValue: 4000, wbPerson: 30000 };

export const REACTIONS = ['smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown'];
export const STANCES = ['agree', 'unsure', 'disagree'];
const SHOWS = ['welcome', 'slides', 'question', 'board', 'page', 'card', 'blank', 'draw', 'workbook'];
const KINDS = ['choice', 'multi', 'scale', 'words', 'short'];
export const TAKE_OVER_MS = 60000;

function text(v, n) { return String(v == null ? '' : v).replace(/\u0000/g, '').slice(0, n); }
function line(v, n) { return text(v, n * 2).replace(/\s+/g, ' ').trim().slice(0, n); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function int(v, lo, hi) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; }

export function blank() {
  return { on: false, host: null, hostName: '', hostLeft: null, title: '', talk: '', talkV: 0, at: 0, shown: 0, show: 'welcome', question: null, answers: {}, notes: [], board: '', page: null, html: '', htmlV: 0, card: '', clock: null, stances: {}, works: {}, worksOpen: false, groups: null, drawing: {}, drawingBytes: 0, workbook: null, wbAnswers: {}, seq: 0 };
}

// A website a host shows by its address: https only, and never this site or the
// room service, whose pages would run with this site's own rights.
// An Ideas at Play model at a pinned version, the only page a call can share.
const MODEL = /^https:\/\/ideasatplay\.org\/play\/[a-z0-9-]{1,140}\?v=\d{1,4}$/;
const OURS = /(^|\.)humanshaped\.org$|(^|\.)benwilkoff\.workers\.dev$/i;
export function siteOk(u) {
  let x;
  try { x = new URL(String(u || '')); } catch (e) { return null; }
  if (x.protocol !== 'https:' || x.username || x.password || OURS.test(x.hostname) || x.href.length > LIMITS.url) return null;
  return x.href;
}

// A Meet call's own address, the only place a breakout room can send people.
const MEETLINK = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/;
export function meetOk(u) { const x = MEETLINK.exec(String(u || '').trim()); return x ? 'https://meet.google.com/' + x[1] : null; }

// A workbook's blocks as a room carries them (session-plan.js blocks() makes
// the same shape): words, an answer in words, a choice, or a table whose
// empty cells are filled in.
export function workbookBlocks(list) {
  let n = 0;
  const out = (Array.isArray(list) ? list : []).slice(0, 60).map((b) => {
    if (!b || !['text', 'free', 'choice', 'table'].includes(b.type)) return null;
    const t = text(b.text, 3000).trim();
    if (!t) return null;
    const o = { key: 'b' + (n + 1), type: b.type, text: t };
    if (b.type === 'choice') {
      o.multiple = b.multiple === true;
      o.choices = (Array.isArray(b.choices) ? b.choices : []).map((c) => line(c, 200)).filter(Boolean).slice(0, 12);
      if (o.choices.length < 2) return null;
    }
    if (b.type === 'table') {
      o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 20).map((r) => (Array.isArray(r) ? r : []).slice(0, 8).map((c) => { const x = line(c && c.text, 300); return { text: x, fill: !x }; })).filter((r) => r.length);
      if (!o.rows.length) return null;
    }
    n += 1;
    return o;
  }).filter(Boolean);
  return JSON.stringify(out).length > LIMITS.workbook ? [] : out;
}

// One person's answer to one block, or null when it does not fit the block.
function wbValue(b, v) {
  if (b.type === 'free') { const s = text(v, LIMITS.wbValue); return typeof v === 'string' ? s : null; }
  if (b.type === 'choice') {
    if (!Array.isArray(v)) return null;
    const picks = [...new Set(v.map(Number))].filter((c) => Number.isInteger(c) && c >= 0 && c < b.choices.length).sort((x, y) => x - y);
    return b.multiple ? picks : picks.slice(0, 1);
  }
  if (b.type === 'table') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const out = {};
    for (const k of Object.keys(v).slice(0, 200)) {
      const m = /^(\d{1,2}),(\d{1,2})$/.exec(k);
      const cell = m && b.rows[+m[1]] && b.rows[+m[1]][+m[2]];
      if (cell && cell.fill) out[k] = text(v[k], 500);
    }
    return out;
  }
  return null;
}

// Everyone's answers, for the host to keep: names and answers, never shown to anyone else.
export function workbookAnswers(room) {
  const w = room.workbook;
  if (!w) return null;
  const all = room.wbAnswers || {};
  return { id: w.id, title: w.title, blocks: w.blocks, people: Object.keys(all).map((id) => ({ name: all[id].name, a: all[id].a, at: all[id].at })).sort((x, y) => x.at - y.at) };
}

export function repoOk(owner, repo) { return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner || '') && /^[A-Za-z0-9._-]{1,100}$/.test(repo || '') && !/^\.+$/.test(repo); }

// What everyone may see. Who answered what never leaves the room.
export function summary(room) {
  const q = room.question;
  if (!q) return null;
  const all = Object.values(room.answers);
  const out = { total: all.length };
  if (q.kind === 'choice' || q.kind === 'multi' || q.kind === 'scale') {
    const n = q.kind === 'scale' ? q.points : q.choices.length;
    const counts = new Array(n).fill(0);
    all.forEach((a) => (a.picks || (a.choice ? [a.choice] : [])).forEach((c) => { if (c >= 1 && c <= n) counts[c - 1] += 1; }));
    out.counts = counts;
  }
  if (q.kind === 'words') {
    const by = {};
    all.forEach((a) => { const w = line(a.body, 60).toLowerCase(); if (w) by[w] = (by[w] || 0) + 1; });
    out.words = Object.keys(by).map((w) => ({ word: w, count: by[w] })).sort((a, b) => b.count - a.count).slice(0, 30);
  }
  return out;
}

export function stanceCounts(room) {
  const out = { agree: 0, unsure: 0, disagree: 0, total: 0 };
  Object.values(room.stances).forEach((s) => { if (STANCES.includes(s)) { out[s] += 1; out.total += 1; } });
  return out;
}

export function publicRoom(room, here) {
  here = here || { people: [], count: 0, hostHere: false, stages: [] };
  const q = room.question;
  const page = room.page ? { owner: room.page.owner || null, repo: room.page.repo || null, sha: room.page.sha || null, htmlV: room.page.owner || room.page.url ? 0 : room.htmlV, url: room.page.url || null, path: room.page.path || null, v: room.page.v || 0, name: room.page.name || null, together: room.page.together === true } : null;
  return {
    on: room.on, host: room.host, hostName: room.hostName, title: room.title, talkV: room.talkV, at: room.at, shown: room.shown, show: room.show,
    question: q ? { id: q.id, kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points || null, reveal: q.reveal, open: q.open } : null,
    summary: summary(room),
    notes: room.notes, board: room.board, page, mstate: room.page && room.page.together && room.mstate ? room.mstate : null, card: room.card, clock: room.clock, stance: stanceCounts(room), stancesOpen: room.stancesOpen === true,
    people: here.people.slice(0, LIMITS.people), here: here.count, hostHere: here.hostHere, stages: here.stages,
    canTakeOver: room.on && !here.hostHere && room.hostLeft != null, worksOpen: room.worksOpen === true,
    workbook: room.workbook ? { id: room.workbook.id, title: room.workbook.title, blocks: room.workbook.blocks, open: room.workbook.open } : null,
    wbCount: room.workbook ? Object.keys(room.wbAnswers || {}).length : 0,
    groups: room.groups ? room.groups.map((g) => ({ link: g.link, members: g.members.slice() })) : null
  };
}

// What people offered to show, for the host only: each person's name and
// address. Offers are erased when the host stops asking or the room ends.
export function hostWorks(room) {
  if (!room.worksOpen) return null;
  const w = room.works || {};
  return { works: Object.keys(w).map((id) => ({ id, name: w[id].name, url: w[id].url, at: w[id].at })).sort((a, b) => a.at - b.at) };
}

// The words behind a question's count, for the host, with no names.
export function hostWords(room) {
  const q = room.question;
  if (!q || (q.kind !== 'short' && q.kind !== 'words')) return null;
  return { id: q.id, words: Object.values(room.answers).map((a) => a.body).filter(Boolean) };
}

function cleanAnswer(q, m) {
  if (q.kind === 'choice' || q.kind === 'scale') {
    const max = q.kind === 'scale' ? q.points : q.choices.length;
    const c = Number(m.choice);
    return Number.isInteger(c) && c >= 1 && c <= max ? { choice: c } : null;
  }
  if (q.kind === 'multi') {
    if (!Array.isArray(m.picks)) return null;
    const picks = [...new Set(m.picks.map(Number))].filter((c) => Number.isInteger(c) && c >= 1 && c <= q.choices.length);
    return { picks };
  }
  const body = text(m.body, q.kind === 'words' ? 60 : LIMITS.answer).trim();
  return body ? { body } : null;
}

const HOST_ONLY = new Set(['stances', 'talk', 'go', 'show', 'ask', 'reveal', 'close', 'clear', 'unnoteAny', 'page', 'site', 'board', 'pasted', 'card', 'clock', 'clockAdd', 'hand', 'title', 'works', 'feature', 'groups', 'draw', 'workbook', 'wbCollect']);

// who: { pid, name, here(pid) }. Returns what changed: { room?, talk?, html?,
// to?, error?, ended? }; no result means nothing did.
export function apply(room, who, m, now, opts) {
  opts = opts || {};
  const t = m && m.t;
  if (!who || !who.pid || typeof t !== 'string') return { error: 'That message was not understood.' };
  const isHost = room.on && room.host === who.pid;
  if (HOST_ONLY.has(t) && !isHost) return { error: 'Only the host can do that.' };

  switch (t) {
    case 'start': {
      if (room.on) return isHost ? {} : { error: 'Someone has already started this room.' };
      room.on = true; room.host = who.pid; room.hostName = who.name || ''; room.hostLeft = null;
      room.title = line(m.title, LIMITS.title);
      return { room: true };
    }
    case 'claim': {
      if (!room.on) return {};
      if (who.hostHere || room.hostLeft == null || now - room.hostLeft < TAKE_OVER_MS) return { error: 'The host is still here.' };
      room.host = who.pid; room.hostName = who.name || ''; room.hostLeft = null;
      return { room: true };
    }
    case 'hand': {
      const to = line(m.to, 40);
      if (!to || !who.isHere(to)) return { error: 'That person has left.' };
      room.host = to; room.hostName = line(m.name, LIMITS.name);
      return { room: true };
    }
    case 'title': room.title = line(m.title, LIMITS.title); return { room: true };
    case 'talk': {
      room.talk = text(m.text, LIMITS.talk); room.talkV += 1;
      if (m.title != null) room.title = line(m.title, LIMITS.title);
      room.at = int(m.at, 0, 999); room.shown = int(m.shown, 0, 999);
      if (m.show) room.show = 'slides';
      return { room: true, talk: true };
    }
    case 'go':
      room.at = int(m.at, 0, 999); room.shown = int(m.shown, 0, 999); room.show = 'slides'; room.stances = {};
      return { room: true };
    case 'show': {
      if (!SHOWS.includes(m.show)) return { error: 'There is nothing like that to show.' };
      if (m.show === 'question' && !room.question) return { error: 'Ask a question first.' };
      if (m.show === 'page' && !room.page) return { error: 'Choose a page first.' };
      if (m.show === 'board' && !room.board) return { error: 'Say what everyone should add first.' };
      room.show = m.show;
      return { room: true };
    }
    case 'ask': {
      const kind = KINDS.includes(m.kind) ? m.kind : null;
      const prompt = line(m.prompt, LIMITS.prompt);
      if (!kind || !prompt) return { error: 'Write the question first.' };
      const choices = Array.isArray(m.choices) ? m.choices.map((c) => line(c, LIMITS.choice)).filter(Boolean).slice(0, LIMITS.choices) : [];
      if ((kind === 'choice' || kind === 'multi') && choices.length < 2) return { error: 'Give at least two choices, one on each line.' };
      room.seq += 1;
      room.question = { id: 'q' + room.seq, kind, prompt, choices: kind === 'words' || kind === 'short' ? null : choices, points: kind === 'scale' ? int(m.points, 2, 10) : null, reveal: m.reveal === true, open: true };
      room.answers = {}; room.show = 'question';
      return { room: true };
    }
    case 'reveal':
      if (!room.question) return {};
      room.question.reveal = m.on === true;
      return { room: true };
    case 'close':
      if (!room.question) return {};
      room.question.open = false;
      room.show = room.talk ? 'slides' : 'welcome';
      return { room: true };
    case 'answer': {
      const q = room.question;
      if (!q || !q.open || q.id !== m.id) return { error: 'That question has closed.' };
      const a = cleanAnswer(q, m);
      if (!a) return { error: 'That answer could not be read.' };
      room.answers[who.pid] = a;
      return { room: true, mine: { id: q.id, answer: a } };
    }
    case 'note': {
      const body = line(m.text, LIMITS.note);
      if (!body) return {};
      if (room.notes.length >= LIMITS.notes) return { error: 'The board is full.' };
      if (room.notes.filter((n) => n.by === who.pid).length >= LIMITS.notesEach) return { error: 'That is as many notes as one person can add.' };
      room.seq += 1;
      room.notes.push({ id: 'n' + room.seq, by: who.pid, name: who.name || '', text: body, votes: [] });
      return { room: true };
    }
    case 'vote': {
      const n = room.notes.find((x) => x.id === m.id);
      if (!n) return {};
      const at = n.votes.indexOf(who.pid);
      if (at >= 0) n.votes.splice(at, 1); else n.votes.push(who.pid);
      return { room: true };
    }
    case 'unnote': {
      const n = room.notes.find((x) => x.id === m.id);
      if (!n) return {};
      if (n.by !== who.pid && !isHost) return { error: 'Only its writer or the host can take a note down.' };
      room.notes = room.notes.filter((x) => x !== n);
      return { room: true };
    }
    case 'clear': room.notes = []; return { room: true };
    case 'board': {
      const prompt = line(m.prompt, LIMITS.prompt);
      if (!prompt) return { error: 'Say what everyone should add first.' };
      if (prompt !== room.board) room.notes = [];
      room.board = prompt; room.show = 'board';
      return { room: true };
    }
    case 'site': {
      const href = siteOk(m.url);
      if (!href) return { error: 'That address cannot be shown here.' };
      const again = room.page && room.page.url === href ? (room.page.v || 0) + 1 : 0;
      room.page = { url: href, v: again, name: line(m.name, 80) || new URL(href).hostname };
      // One model everyone in the call changes together: its shared state
      // starts empty each time it goes up.
      if (m.together === true && MODEL.test(href)) { room.page.together = true; room.mstate = { state: '', seq: 0, by: null }; } else delete room.mstate;
      room.html = ''; room.show = 'page';
      return { room: true };
    }
    case 'mstate': {
      if (!room.on || room.show !== 'page' || !room.page || !room.page.together) return { error: 'No shared model is up.' };
      const state = text(m.state, LIMITS.mstate + 1);
      if (state.length > LIMITS.mstate) return { error: 'That is too much to share.' };
      try { JSON.parse(state); } catch (e) { return { error: 'That could not be shared.' }; }
      if (room.mstate && room.mstate.state === state) return {};
      room.mstate = { state, seq: ((room.mstate && room.mstate.seq) || 0) + 1, by: who.pid };
      return { room: true };
    }
    case 'page': {
      if (!repoOk(m.owner, m.repo) || !/^[0-9a-f]{40}$/.test(m.sha || '')) return { error: 'That repository could not be read.' };
      if ((opts.blocked || []).includes((m.owner + '/' + m.repo).toLowerCase())) return { error: 'That repository cannot be shown here.' };
      const path = m.path == null || m.path === '' ? 'index.html' : String(m.path);
      if (path.length > 200 || !/^[A-Za-z0-9._/-]+\.html?$/.test(path) || path.split('/').some((x) => x === '..' || x === '')) return { error: 'That page could not be read.' };
      room.page = { owner: m.owner, repo: m.repo, sha: m.sha, path, name: m.owner + '/' + m.repo };
      room.html = ''; room.show = 'page';
      return { room: true };
    }
    case 'pasted': {
      const html = text(m.html, LIMITS.html + 1);
      if (!html.trim()) return { error: 'Paste a page first.' };
      if (html.length > LIMITS.html) return { error: 'That page is too long to show here.' };
      room.html = html; room.htmlV += 1; room.page = { name: line(m.name, 80) || null }; room.show = 'page';
      return { room: true, html: true };
    }
    case 'card':
      room.card = line(m.body, LIMITS.card); room.show = room.card ? 'card' : (room.talk ? 'slides' : 'welcome');
      return { room: true };
    case 'clock': {
      const s = int(m.seconds, 0, LIMITS.clock);
      room.clock = s ? { endsAt: now + s * 1000, label: line(m.label, 80) } : null;
      return { room: true };
    }
    // A running clock moves by up to five minutes either way, never into the past.
    case 'clockAdd': {
      if (!room.clock) return { error: 'There is no clock running.' };
      const d = Number.isFinite(Number(m.seconds)) ? int(m.seconds, -300, 300) : 0;
      room.clock = { ...room.clock, endsAt: Math.max(now, room.clock.endsAt + d * 1000) };
      return { room: true };
    }
    case 'stance':
      if (m.stance == null) delete room.stances[who.pid];
      else if (STANCES.includes(m.stance)) { if (room.stances[who.pid] === m.stance) delete room.stances[who.pid]; else room.stances[who.pid] = m.stance; }
      return { room: true };
    // A cohort's leader opens and closes stances, and each opening starts at zero.
    case 'stances':
      room.stances = {}; room.stancesOpen = m.open === true;
      return { room: true };
    // Show your work: the host asks, each person offers one address (again
    // to change it, empty to take it back), and the host puts one on the stage.
    case 'works':
      room.works = {}; room.worksOpen = m.open === true;
      return { room: true };
    case 'work': {
      if (!room.on || !room.worksOpen) return { error: 'The host is not asking for work right now.' };
      room.works = room.works || {};
      if (m.url == null || m.url === '') { delete room.works[who.pid]; return { room: true, myWork: null }; }
      const href = siteOk(m.url);
      if (!href) return { error: 'That address cannot be shown here. Use a page that starts with https://.' };
      if (!room.works[who.pid] && Object.keys(room.works).length >= LIMITS.people) return { error: 'The list is full.' };
      room.works[who.pid] = { url: href, name: line(who.name, LIMITS.name), at: now };
      return { room: true, myWork: href };
    }
    case 'feature': {
      const w = room.works && room.works[m.id];
      if (!w) return { error: 'That offer was taken back.' };
      const again = room.page && room.page.url === w.url ? (room.page.v || 0) + 1 : 0;
      room.page = { url: w.url, v: again, name: w.name ? w.name + '’s work' : 'Someone’s work' };
      delete room.mstate; room.html = ''; room.show = 'page';
      return { room: true };
    }
    // Breakout rooms: the host brings Meet links (each made with meet.new),
    // and everyone here but the host is dealt into them in a shuffled order.
    // Who is in which room is shown to everyone, as Meet's own breakouts do.
    case 'groups': {
      if (m.open === false) { room.groups = null; return { room: true }; }
      const links = [...new Set((Array.isArray(m.links) ? m.links : []).map(meetOk).filter(Boolean))].slice(0, 20);
      if (links.length < 2) return { error: 'Add at least two Meet links.' };
      const people = (who.present || []).filter((id) => id !== room.host);
      const order = (opts.shuffle || shuffle)(people.slice());
      room.groups = links.map((link) => ({ link, members: [] }));
      order.forEach((id, i) => room.groups[i % links.length].members.push(id));
      return { room: true };
    }
    // Drawing together: a drawing on every stage that anyone in the call can
    // add to. Elements merge the way Excalidraw's own collaboration merges
    // them: a higher version wins, and of two equal versions the lower
    // versionNonce. The drawing lives only in the room and goes when it ends.
    case 'draw': {
      if (m.clear === true || !room.drawing) { room.drawing = {}; room.drawingBytes = 0; }
      room.show = 'draw';
      return { room: true, drawing: m.clear === true };
    }
    case 'strokes': {
      if (!room.on || room.show !== 'draw') return { error: 'Nothing is being drawn right now.' };
      const list = Array.isArray(m.elements) ? m.elements.slice(0, LIMITS.strokes) : [];
      room.drawing = room.drawing || {};
      const took = [];
      for (const e of list) {
        if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(e.id)) continue;
        if (!Number.isInteger(e.version) || !Number.isInteger(e.versionNonce)) continue;
        const json = JSON.stringify(e);
        if (json.length > LIMITS.element) continue;
        const had = room.drawing[e.id];
        if (had && (had.e.version > e.version || (had.e.version === e.version && had.e.versionNonce <= e.versionNonce))) continue;
        if (!had && Object.keys(room.drawing).length >= LIMITS.drawing) return took.length ? { strokes: took } : { error: 'The drawing is full.' };
        const bytes = (room.drawingBytes || 0) - (had ? had.n : 0) + json.length;
        if (bytes > LIMITS.drawingBytes) return took.length ? { strokes: took } : { error: 'The drawing is full.' };
        room.drawing[e.id] = { e, n: json.length };
        room.drawingBytes = bytes;
        took.push(e);
      }
      return took.length ? { strokes: took } : {};
    }
    // A workbook: each person answers in their own panel, block by block,
    // and sees only their own answers; the host collects everyone's to keep.
    case 'workbook': {
      if (m.close === true) { if (room.workbook) room.workbook.open = false; if (room.show === 'workbook') room.show = room.talk ? 'slides' : 'welcome'; return { room: true }; }
      if (m.open === true && room.workbook) { room.workbook.open = true; room.show = 'workbook'; return { room: true }; }
      const blocks = workbookBlocks(m.blocks);
      if (!blocks.length) return { error: 'That workbook has nothing to answer.' };
      room.seq += 1;
      room.workbook = { id: 'w' + room.seq, title: line(m.title, LIMITS.title) || 'A workbook', blocks, open: true };
      room.wbAnswers = {}; room.show = 'workbook';
      return { room: true };
    }
    case 'wbAnswer': {
      const w = room.workbook;
      if (!room.on || !w || !w.open || w.id !== m.id) return { error: 'That workbook has closed.' };
      const b = w.blocks.find((x) => x.key === m.key);
      if (!b || b.type === 'text') return { error: 'That answer could not be read.' };
      const v = wbValue(b, m.value);
      if (v == null) return { error: 'That answer could not be read.' };
      room.wbAnswers = room.wbAnswers || {};
      const had = room.wbAnswers[who.pid] || { name: '', a: {}, at: now };
      const next = { name: line(who.name, LIMITS.name), a: { ...had.a, [b.key]: v }, at: had.at };
      if (JSON.stringify(next.a).length > LIMITS.wbPerson) return { error: 'That is more than a workbook can hold.' };
      room.wbAnswers[who.pid] = next;
      return { room: true, wbMine: { id: w.id, a: next.a } };
    }
    case 'wbCollect': {
      const all = workbookAnswers(room);
      return all ? { reply: Object.assign({ t: 'wbAll' }, all) } : { error: 'There is no workbook to collect.' };
    }
    default:
      return { error: 'That message was not understood.' };
  }
}
