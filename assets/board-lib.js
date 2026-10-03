// Pure helpers for the board (/board/): which session and group a link
// means, which drawn elements still need sending, how two copies of an
// element settle, how a change is cut to fit a Realtime message, and how
// often to send. Nothing here touches the page, the network, or
// Excalidraw, so all of it is tested in tools/test/board-lib.test.mjs.
(function (root) {
  var DAY = 86400000;
  // Realtime's free plan carries broadcast messages up to 256 KB
  // (supabase.com/docs/guides/realtime/limits); this leaves room for the
  // envelope around the elements.
  var MAX_MESSAGE_BYTES = 200000;
  // Each page saves this often while someone is drawing, and again when
  // the person leaves.
  var SAVE_EVERY = 5000;
  // The free plan allows 100 messages a second across the project, so
  // the board keeps a cohort's strokes and pointers well under half of it.
  var MESSAGES_PER_SECOND = 40;

  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ?c=<slug>&s=<session id or week-N>&g=<group id>&view=stage
  function params(search) {
    var q = new URLSearchParams(search || '');
    var s = (q.get('s') || '').trim().toLowerCase();
    var week = /^week-(\d{1,2})$/.exec(s);
    var g = (q.get('g') || '').trim();
    var view = (q.get('view') || '').trim().toLowerCase();
    return {
      slug: (q.get('c') || '').trim().toLowerCase(),
      week: week ? Number(week[1]) : null,
      sessionId: UUID.test(s) ? s : null,
      group: UUID.test(g) ? g.toLowerCase() : null,
      stage: view === 'stage' || q.has('stage')
    };
  }

  // The session a link means: the one it names (by id or week), or else
  // the one the page would show now (the caller's choice, usually
  // CohortLib.currentAndNext).
  function pickSession(sessions, p, fallback) {
    var list = sessions || [];
    if (p && p.sessionId) return list.filter(function (s) { return s.id === p.sessionId; })[0] || null;
    if (p && p.week != null) return list.filter(function (s) { return s.number === p.week; })[0] || null;
    return fallback || null;
  }

  function topic(boardId) { return 'board:' + boardId; }

  // A link to a board, for /live/, the cohort page, and the add-on.
  function link(slug, session, group, stage) {
    var u = '/board/?c=' + encodeURIComponent(slug) + '&s=week-' + session.number;
    if (group) u += '&g=' + encodeURIComponent(group);
    if (stage) u += '&view=stage';
    return u;
  }

  // The elements that changed since this page last sent or received them,
  // by each element's version, the way Excalidraw's own collaboration
  // sends only what changed (excalidraw-app/collab/Portal.tsx).
  function unsent(elements, seen) {
    return (elements || []).filter(function (e) {
      return e && e.id && (!(e.id in seen) || e.version > seen[e.id]);
    });
  }
  function markSeen(seen, elements) {
    (elements || []).forEach(function (e) {
      if (e && e.id && (!(e.id in seen) || e.version > seen[e.id])) seen[e.id] = e.version;
    });
    return seen;
  }

  // What is worth sending and saving: everything, except elements erased
  // more than a day ago (excalidraw-app/data/index.ts keeps the same day).
  function syncable(elements, now) {
    var t = now == null ? Date.now() : now;
    return (elements || []).filter(function (e) {
      return e && e.id && !(e.isDeleted && typeof e.updated === 'number' && e.updated < t - DAY);
    });
  }

  // Which copy of one element wins, the same rule Excalidraw uses
  // (packages/excalidraw/data/reconcile.ts) and save_board() uses in the
  // database: an element someone is in the middle of editing stays as it
  // is on their screen; otherwise the higher version, and for equal
  // versions the lower versionNonce, so every copy settles the same way.
  function keepLocal(local, remote, editing) {
    if (!local) return false;
    if (editing && editing[local.id]) return true;
    if (local.version !== remote.version) return local.version > remote.version;
    return local.versionNonce <= remote.versionNonce;
  }

  function byIndex(a, b) {
    var x = a.index == null ? null : String(a.index), y = b.index == null ? null : String(b.index);
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      return x < y ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  // Two lists of elements made into one, every element settled by
  // keepLocal and ordered by Excalidraw's fractional index (its z-order).
  function merge(local, remote, editing) {
    var mine = {}, out = {};
    (local || []).forEach(function (e) { if (e && e.id) mine[e.id] = e; });
    (remote || []).forEach(function (r) {
      if (!r || !r.id || out[r.id]) return;
      out[r.id] = keepLocal(mine[r.id], r, editing) ? mine[r.id] : r;
    });
    (local || []).forEach(function (e) { if (e && e.id && !out[e.id]) out[e.id] = e; });
    return Object.keys(out).map(function (k) { return out[k]; }).sort(byIndex);
  }

  function bytes(value) {
    var s = typeof value === 'string' ? value : JSON.stringify(value);
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length;
  }

  // A change cut into messages that each fit under Realtime's limit. An
  // element too large for any message on its own (a very long freehand
  // line) is left for the save, which tells the others to read it.
  function batches(elements, maxBytes) {
    var max = maxBytes || MAX_MESSAGE_BYTES;
    var out = [], tooBig = [], cur = [], size = 2;
    (elements || []).forEach(function (e) {
      var n = bytes(e) + 1;
      if (n + 2 > max) { tooBig.push(e); return; }
      if (size + n > max && cur.length) { out.push(cur); cur = []; size = 2; }
      cur.push(e); size += n;
    });
    if (cur.length) out.push(cur);
    return { batches: out, tooBig: tooBig };
  }

  // How long a page waits between sending its strokes, so that a whole
  // cohort drawing at once stays under the message budget: a tenth of a
  // second alone, about three quarters of a second with thirty people.
  function sendInterval(people) {
    var n = Math.max(1, people || 1);
    return Math.max(100, Math.ceil((n * 1000) / MESSAGES_PER_SECOND));
  }
  // Pointers move more than strokes change, and matter less, so they get
  // a quarter of the budget.
  function pointerInterval(people) { return sendInterval(people) * 4; }

  // Run fn at most once every wait milliseconds, at once and then with the
  // latest call at the end of the wait. flush() runs a waiting call now
  // (for the page closing); cancel() drops it. The clock is passed in so
  // the tests can move time by hand.
  function throttle(fn, wait, clock) {
    // Wrapped, because a browser refuses setTimeout called as a method of
    // another object ("Illegal invocation").
    var c = clock || {
      now: function () { return Date.now(); },
      set: function (f, ms) { return setTimeout(f, ms); },
      clear: function (t) { clearTimeout(t); }
    };
    var last = -Infinity, timer = null, pending = null;
    function run() {
      timer = null; last = c.now();
      var args = pending; pending = null;
      fn.apply(null, args);
    }
    function call() {
      pending = Array.prototype.slice.call(arguments);
      var w = typeof wait === 'function' ? wait() : wait;
      var left = last + w - c.now();
      if (left <= 0 && !timer) run();
      else if (!timer) timer = c.set(run, Math.max(0, left));
    }
    call.flush = function () { if (timer) { c.clear(timer); run(); } };
    call.cancel = function () { if (timer) c.clear(timer); timer = null; pending = null; };
    call.waiting = function () { return !!timer; };
    return call;
  }

  // A message from another page belongs to this board's current drawing
  // only if it comes from the same generation (a clear starts a new one).
  function sameGeneration(message, board) {
    return !!message && !!board && message.gen === board.generation;
  }

  // Who may draw right now. Agents never reach the page, and the
  // database refuses them anyway.
  function canDraw(board, teaching) { return !!board && (teaching || !board.locked); }

  // A pointer's color, the same for one person on every screen.
  var COLORS = ['#A23F22', '#2F6D8C', '#6A5A8C', '#3F7A4F', '#8C6A1F', '#8C3F6A', '#3F6F7A', '#5A5F66'];
  function colorFor(id) {
    var h = 0, s = String(id || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }

  // A file name for a download: the cohort, the week, and the group.
  function fileName(cohortSlug, session, groupName, ext) {
    var parts = [cohortSlug || 'board', 'week-' + (session && session.number != null ? session.number : 'x')];
    if (groupName) parts.push(String(groupName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    return parts.filter(Boolean).join('-') + '-board.' + ext;
  }

  var lib = {
    DAY: DAY, MAX_MESSAGE_BYTES: MAX_MESSAGE_BYTES, SAVE_EVERY: SAVE_EVERY, MESSAGES_PER_SECOND: MESSAGES_PER_SECOND,
    params: params, pickSession: pickSession, topic: topic, link: link,
    unsent: unsent, markSeen: markSeen, syncable: syncable, keepLocal: keepLocal, merge: merge,
    bytes: bytes, batches: batches, sendInterval: sendInterval, pointerInterval: pointerInterval, throttle: throttle,
    sameGeneration: sameGeneration, canDraw: canDraw, colorFor: colorFor, fileName: fileName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BoardLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
