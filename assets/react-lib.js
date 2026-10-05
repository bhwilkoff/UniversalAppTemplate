// Reactions and stance in a live session (R10,
// research/notes/active-learning-notes.md). A reaction is something a
// person chooses to send while someone presents ("see everybody and their
// reactions to what's being talked about"); a stance is where they stand
// on what is being said, held until they change it. Both travel on the
// cohort's private class channel and are never stored or counted against
// anyone. Tested in tools/test/react-lib.test.mjs.
(function (root) {
  // Each reaction has a number key, so it is one press away while the
  // panel has focus.
  var REACTIONS = [
    { id: 'smile', emoji: '🙂', label: 'Smile', key: '1' },
    { id: 'laugh', emoji: '😂', label: 'Laughing', key: '2' },
    { id: 'love', emoji: '❤️', label: 'Love', key: '3' },
    { id: 'clap', emoji: '👏', label: 'Clap', key: '4' },
    { id: 'snaps', emoji: '🫰', label: 'Snaps', key: '5' },
    { id: 'ponder', emoji: '🤔', label: 'Pondering', key: '6' },
    { id: 'mind', emoji: '🤯', label: 'Mind blown', key: '7' },
    { id: 'frown', emoji: '🙁', label: 'Frown', key: '8' }
  ];
  var STANCES = [
    { id: 'agree', label: 'Agree', key: 'a' },
    { id: 'unsure', label: 'Not sure', key: 'u' },
    { id: 'disagree', label: 'Disagree', key: 'd' }
  ];
  function reaction(id) { return REACTIONS.filter(function (r) { return r.id === id; })[0] || null; }
  function stance(id) { return STANCES.filter(function (s) { return s.id === id; })[0] || null; }

  // What a key press means, or null. Never while someone is typing, and
  // never with a modifier, so the panel's shortcuts never take a key a
  // person meant for a field or for Meet.
  function keyFor(e) {
    if (!e || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return null;
    var k = String(e.key || '').toLowerCase();
    for (var i = 0; i < REACTIONS.length; i++) if (REACTIONS[i].key === k) return { reaction: REACTIONS[i].id };
    for (var j = 0; j < STANCES.length; j++) if (STANCES[j].key === k) return { stance: STANCES[j].id };
    return null;
  }

  function cut(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // A reaction on the wire: which one, and the first name of who sent it.
  function message(id, name) {
    if (!reaction(id)) return null;
    return { r: id, n: cut(String(name || '').split(' ')[0], 24) || null };
  }
  function read(payload) {
    if (!payload || typeof payload !== 'object' || !reaction(payload.r)) return null;
    return { r: payload.r, n: typeof payload.n === 'string' && payload.n ? cut(payload.n, 24) : null };
  }

  // A sender may send a few reactions quickly, and no more: at most
  // LIMIT within WINDOW milliseconds. Senders check themselves, and every
  // receiver checks each sender too, so a stuck key cannot fill the stage.
  var LIMIT = 5, WINDOW = 3000;
  function allow(times, now) {
    var recent = (times || []).filter(function (t) { return now - t < WINDOW; });
    var ok = recent.length < LIMIT;
    if (ok) recent.push(now);
    return { ok: ok, times: recent };
  }

  // How many hold each stance, from the channel's presence state (each
  // person tracks { stance } when they hold one). Counted, never named.
  function stanceCounts(presence) {
    var out = { agree: 0, unsure: 0, disagree: 0, total: 0 };
    Object.keys(presence || {}).forEach(function (k) {
      var p = (presence[k] || [])[0] || {};
      if (stance(p.stance)) { out[p.stance]++; out.total++; }
    });
    return out;
  }

  // What a panel sends its own main stage: the reactions since the last
  // send (at most twelve), and the stance counts. The stage takes only
  // this exact shape (readStage).
  var STAGE = 'hs-react';
  function stageMessage(floats, counts) {
    return JSON.stringify({
      type: STAGE, v: 1,
      floats: (floats || []).slice(-12).map(function (f) { return message(f.r, f.n); }).filter(Boolean),
      stance: counts && counts.total ? { agree: counts.agree | 0, unsure: counts.unsure | 0, disagree: counts.disagree | 0 } : null
    });
  }
  function readStage(payload) {
    var m;
    try { m = JSON.parse(payload); } catch (e) { return null; }
    if (!m || m.type !== STAGE || m.v !== 1 || !Array.isArray(m.floats)) return null;
    var floats = m.floats.slice(0, 12).map(read).filter(Boolean);
    var st = null;
    if (m.stance && typeof m.stance === 'object') {
      var a = Math.max(0, m.stance.agree | 0), u = Math.max(0, m.stance.unsure | 0), d = Math.max(0, m.stance.disagree | 0);
      if (a + u + d > 0) st = { agree: a, unsure: u, disagree: d, total: a + u + d };
    }
    return { floats: floats, stance: st };
  }

  // Each stance's share of the bar, in whole percents that add to 100.
  function shares(counts) {
    var t = counts && counts.total;
    if (!t) return null;
    var a = Math.round(100 * counts.agree / t), d = Math.round(100 * counts.disagree / t);
    return { agree: a, unsure: Math.max(0, 100 - a - d), disagree: d };
  }

  var lib = {
    REACTIONS: REACTIONS, STANCES: STANCES, reaction: reaction, stance: stance, keyFor: keyFor,
    message: message, read: read, allow: allow, LIMIT: LIMIT, WINDOW: WINDOW,
    stanceCounts: stanceCounts, stageMessage: stageMessage, readStage: readStage, shares: shares
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ReactLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
