// What a room is and what each message does to it, with no network in it, so
// every rule is tested (tools/test/room-logic.test.mjs). worker.js carries the
// messages. A room is one Meet call's slides, question, board, and page, and
// it is erased when it ends.

export const LIMITS = { talk: 42000, html: 100000, title: 120, name: 60, prompt: 500, choice: 120, choices: 8, note: 280, notes: 200, notesEach: 20, answer: 1000, card: 400, people: 300, clock: 7200, url: 2000 };

export const REACTIONS = ['smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown'];
export const STANCES = ['agree', 'unsure', 'disagree'];
const SHOWS = ['welcome', 'slides', 'question', 'board', 'page', 'card', 'blank'];
const KINDS = ['choice', 'multi', 'scale', 'words', 'short'];
export const TAKE_OVER_MS = 60000;

function text(v, n) { return String(v == null ? '' : v).replace(/\u0000/g, '').slice(0, n); }
function line(v, n) { return text(v, n * 2).replace(/\s+/g, ' ').trim().slice(0, n); }
function int(v, lo, hi) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; }

export function blank() {
  return { on: false, host: null, hostName: '', hostLeft: null, title: '', talk: '', talkV: 0, at: 0, shown: 0, show: 'welcome', question: null, answers: {}, notes: [], board: '', page: null, html: '', htmlV: 0, card: '', clock: null, stances: {}, seq: 0 };
}

// A website a host shows by its address: https only, and never this site or the
// room service, whose pages would run with this site's own rights.
const OURS = /(^|\.)humanshaped\.org$|(^|\.)benwilkoff\.workers\.dev$/i;
export function siteOk(u) {
  let x;
  try { x = new URL(String(u || '')); } catch (e) { return null; }
  if (x.protocol !== 'https:' || x.username || x.password || OURS.test(x.hostname) || x.href.length > LIMITS.url) return null;
  return x.href;
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
  const page = room.page ? { owner: room.page.owner || null, repo: room.page.repo || null, sha: room.page.sha || null, htmlV: room.page.owner || room.page.url ? 0 : room.htmlV, url: room.page.url || null, path: room.page.path || null, v: room.page.v || 0, name: room.page.name || null } : null;
  return {
    on: room.on, host: room.host, hostName: room.hostName, title: room.title, talkV: room.talkV, at: room.at, shown: room.shown, show: room.show,
    question: q ? { id: q.id, kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points || null, reveal: q.reveal, open: q.open } : null,
    summary: summary(room),
    notes: room.notes, board: room.board, page, card: room.card, clock: room.clock, stance: stanceCounts(room), stancesOpen: room.stancesOpen === true,
    people: here.people.slice(0, LIMITS.people), here: here.count, hostHere: here.hostHere, stages: here.stages,
    canTakeOver: room.on && !here.hostHere && room.hostLeft != null
  };
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

const HOST_ONLY = new Set(['stances', 'talk', 'go', 'show', 'ask', 'reveal', 'close', 'clear', 'unnoteAny', 'page', 'site', 'board', 'pasted', 'card', 'clock', 'hand', 'title']);

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
      room.html = ''; room.show = 'page';
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
    case 'stance':
      if (m.stance == null) delete room.stances[who.pid];
      else if (STANCES.includes(m.stance)) { if (room.stances[who.pid] === m.stance) delete room.stances[who.pid]; else room.stances[who.pid] = m.stance; }
      return { room: true };
    // A cohort's leader opens and closes stances, and each opening starts at zero.
    case 'stances':
      room.stances = {}; room.stancesOpen = m.open === true;
      return { room: true };
    default:
      return { error: 'That message was not understood.' };
  }
}
