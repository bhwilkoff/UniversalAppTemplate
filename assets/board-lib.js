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
  // While live, a page reads the saved board this long after the last
  // stroke from someone else arrives (after their next save), and this
  // often in any case, so a lost broadcast message is made good.
  var CATCH_UP_AFTER = SAVE_EVERY + 1500;
  var CATCH_UP_EVERY = 30000;
  // The free plan allows 100 messages a second across the project, so
  // the board keeps a cohort's strokes and pointers well under half of it.
  var MESSAGES_PER_SECOND = 40;

  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ?c=<slug>&s=<session id or week-N>&g=<group id>&view=stage&t=<template>
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
      stage: view === 'stage' || q.has('stage'),
      template: template(q.get('t')) ? q.get('t') : null
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
  function link(slug, session, group, stage, templateKey) {
    var u = '/board/?c=' + encodeURIComponent(slug) + '&s=week-' + session.number;
    if (group) u += '&g=' + encodeURIComponent(group);
    if (stage) u += '&view=stage';
    if (template(templateKey) && templateKey !== 'blank') u += '&t=' + templateKey;
    return u;
  }

  // ------------------------------------------------------------------
  // Templates for the design stage (R5): a few frames with the course's
  // own words in them, laid on an empty board when a design scene opens
  // it. Each comes from the template repository: the fourth part of a
  // session (COURSE.md, "Read one real prompt together, trying it
  // first"), the three moves, write, play, publish (docs/path/
  // 00-why-we-build.md, renamed October 5, 2026), and the
  // three questions partners answer (COURSE.md, "Showing your work").
  // Words by Claude, awaiting Ben's review.
  // ------------------------------------------------------------------

  var TEMPLATES = [
    { key: 'blank', name: 'Blank', line: 'An empty board.', frames: [] },
    { key: 'prompt', name: 'Read one real prompt', line: 'The situation, the prompt each person would send, a partner’s, and then the real one.',
      frames: [
        { title: 'The situation', hint: 'The screenshot, the bug, or what the agent said.' },
        { title: 'The prompt I would send', hint: 'Written on your own, first.' },
        { title: 'My partner’s prompt', hint: 'Compared after.' },
        { title: 'The real prompt', hint: 'What the builder wanted, what the agent got wrong, and how the prompt fixed it.' }
      ] },
    { key: 'moves', name: 'Write, play, publish', line: 'The three moves of every round, side by side.',
      frames: [
        { title: 'Write', hint: 'What do you value, and what do you want it to do?' },
        { title: 'Play', hint: 'What happened when you used it on a real device?' },
        { title: 'Publish', hint: 'Who will play with it next, and what did they tell you?' }
      ] },
    // Problem tests (week 1, the template's docs/research/curriculum/
    // 06-instructional-design.md, round 1): one candidate problem from the
    // student's own life, in Ben's form (a first-person situation, then "I
    // need something that..."), held to the tests Ben states in his own
    // writing, one frame each as a plain question, and what two
    // conversations with real people showed. It never asks anyone to sort
    // Ben's published examples, which he has already labeled. The tests,
    // in the template: docs/human-shaped/computer-shaped-problems.md:26-34
    // (better or happier, wondered about often, unsolved for months, cannot
    // do it yourself) and :64-68 (stories, not data points);
    // docs/human-shaped/PRINCIPLES.md:64-65 and :78-81 (real people you
    // can name), :83-84 (why a computer cannot simply solve it), :251-262
    // (no new problem made), and :297-309 (one person glad of it as it
    // ships); shared by many, the site's DECISIONS.md, "The method is
    // Write, Play, Publish." Words by Claude, awaiting Ben's review.
    { key: 'problem-tests', name: 'Problem tests', line: 'Your own problem, held to Ben’s tests one at a time, and what real people told you.',
      frames: [
        { title: 'My problem', hint: 'In your own words: I... and then, I need something that... Name a part of your life, not an app or a technology.' },
        { title: 'Would solving it make my life better?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Do I keep wondering about it?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Has it gone unsolved for months or years?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Is it something I cannot do with the tools I have now?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Who else has it, and can I name them?', hint: 'Real people, by name or by who they are to you.' },
        { title: 'Do many people have it?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Why can’t a computer simply solve it for them?', hint: 'What part only people can do.' },
        { title: 'Does it see people as stories, not data points?', hint: 'Yes, not yet, or I don’t know, and why.' },
        { title: 'Would solving it make a new problem for someone?', hint: 'Who might it hurt, and how would you know?' },
        { title: 'Would one person be glad of it as it ships?', hint: 'Who, and what would they do with it first?' },
        { title: 'What the conversations showed', hint: 'What two people told you about the last time it happened to them.' }
      ] },
    { key: 'questions', name: 'The three questions', line: 'Where is it going, how is it going, and what is next.',
      frames: [
        { title: 'Where is it going?', hint: '' },
        { title: 'How is it going?', hint: '' },
        { title: 'What is next?', hint: '' }
      ] }
  ];
  function template(key) {
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].key === key) return TEMPLATES[i];
    return null;
  }

  // A template's elements, for Excalidraw's restoreElements to finish:
  // a frame for each part in a row (two rows for four), its title, and
  // its hint, all locked so drawing never moves them (a teacher can
  // unlock one from its menu). Their ids are fixed, so two people laying
  // the same template on the same empty board at once make one copy.
  function templateElements(key, now) {
    var t = template(key);
    if (!t || !t.frames.length) return [];
    var at = now == null ? 0 : now;
    var W = 420, H = 320, GAP = 40;
    var perRow = t.frames.length === 4 ? 2 : t.frames.length > 4 ? 4 : t.frames.length;
    var out = [], n = 0;
    var DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    function base(type, x, y, w, h) {
      var id = 'tpl-' + t.key + '-' + n;
      var e = {
        id: id, type: type, x: x, y: y, width: w, height: h, angle: 0,
        strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
        roughness: 1, opacity: 100, groupIds: ['tpl-' + t.key], frameId: null, roundness: type === 'rectangle' ? { type: 3 } : null,
        seed: 1000 + n, version: 1, versionNonce: 2000 + n, isDeleted: false, boundElements: null, updated: at,
        link: null, locked: true, index: 'a' + DIGITS[n]
      };
      n++;
      return e;
    }
    function text(x, y, words, size, color) {
      var lines = wrap(words, Math.floor((W - 40) / (size * 0.55)));
      var e = base('text', x, y, Math.min(W - 40, Math.max.apply(null, lines.map(function (l) { return l.length; })) * size * 0.55), lines.length * size * 1.25);
      e.strokeColor = color;
      return Object.assign(e, {
        text: lines.join('\n'), originalText: lines.join('\n'), fontSize: size, fontFamily: 5, textAlign: 'left', verticalAlign: 'top',
        containerId: null, autoResize: true, lineHeight: 1.25
      });
    }
    t.frames.forEach(function (f, i) {
      var x = (i % perRow) * (W + GAP), y = Math.floor(i / perRow) * (H + GAP);
      out.push(base('rectangle', x, y, W, H));
      out.push(text(x + 20, y + 18, f.title, 28, '#1f4d3a'));
      if (f.hint) out.push(text(x + 20, y + 62, f.hint, 18, '#5a5f66'));
    });
    return out;
  }

  // Words broken into lines of at most `width` characters.
  // Wraps each line the words already have (a hint may list things, one
  // to a line) to the frame's width.
  function wrap(words, width) {
    var lines = [];
    String(words).split('\n').forEach(function (para) {
      var cur = '';
      para.split(/\s+/).filter(Boolean).forEach(function (w) {
        if (cur && (cur + ' ' + w).length > width) { lines.push(cur); cur = w; }
        else cur = cur ? cur + ' ' + w : w;
      });
      if (cur) lines.push(cur);
    });
    return lines.length ? lines : [''];
  }

  // Whether a board should be laid with its template: only a board that
  // has never had anything on it, so nothing anyone drew, and nothing
  // anyone erased, is ever drawn over.
  function needsTemplate(sceneElements, key) {
    return !!template(key) && key !== 'blank' && !(sceneElements || []).length;
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
  var COLORS = ['#1F4D3A', '#2F6D8C', '#6A5A8C', '#3F7A4F', '#8C6A1F', '#8C3F6A', '#3F6F7A', '#5A5F66'];
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
    DAY: DAY, MAX_MESSAGE_BYTES: MAX_MESSAGE_BYTES, SAVE_EVERY: SAVE_EVERY, CATCH_UP_AFTER: CATCH_UP_AFTER, CATCH_UP_EVERY: CATCH_UP_EVERY, MESSAGES_PER_SECOND: MESSAGES_PER_SECOND,
    params: params, pickSession: pickSession, topic: topic, link: link,
    TEMPLATES: TEMPLATES, template: template, templateElements: templateElements, needsTemplate: needsTemplate,
    unsent: unsent, markSeen: markSeen, syncable: syncable, keepLocal: keepLocal, merge: merge,
    bytes: bytes, batches: batches, sendInterval: sendInterval, pointerInterval: pointerInterval, throttle: throttle,
    sameGeneration: sameGeneration, canDraw: canDraw, colorFor: colorFor, fileName: fileName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BoardLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
