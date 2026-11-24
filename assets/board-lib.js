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

  // A note on the board: one card whose words belong to it, the way Excalidraw
  // keeps words inside a shape, so it resizes from any side or corner and its
  // words wrap to fit (Ben, November 24, 2026: a board "that doesn't struggle to
  // resize cards"). It was a card, its words, and its writer's name grouped as
  // three shapes, which Excalidraw can only stretch together. The name and the
  // votes are drawn over the card by the page, so nothing rides in a group.
  var NOTE_W = 220, NOTE_H = 120, IN_FRAME = { w: 180, h: 90 }, PAD = 12;
  var NOTE_COLORS = ['#FFE08A', '#B7E4C7', '#DCC4F0', '#A9D6F5', '#F9C5B5', '#E6E6A8'];
  function noteColor(id) {
    var h = 0;
    String(id).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return NOTE_COLORS[h % NOTE_COLORS.length];
  }
  function shape(type, id, x, y, w, h, now, extra) {
    return Object.assign({
      id: id, type: type, x: x, y: y, width: w, height: h, angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
      strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: type === 'rectangle' ? { type: 3 } : null,
      seed: 1, version: 1, versionNonce: 1, isDeleted: false, boundElements: null, updated: now, link: null, locked: false
    }, extra || {});
  }
  function noteElements(o) {
    var id = o.id, W = o.w || NOTE_W, H = o.h || NOTE_H, said = String(o.text).slice(0, 200);
    var lines = wrap(said, Math.max(4, Math.floor((W - 2 * PAD) / 11))), th = lines.length * 25;
    H = Math.max(H, th + 2 * PAD);
    return [
      shape('rectangle', id, o.x, o.y, W, H, o.now, {
        backgroundColor: o.color || noteColor(o.by), strokeColor: 'transparent', boundElements: [{ type: 'text', id: id + '-t' }],
        customData: { note: id, by: o.by, name: String(o.name || '').slice(0, 40) }
      }),
      shape('text', id + '-t', o.x + PAD, o.y + (H - th) / 2, W - 2 * PAD, th, o.now, {
        text: said, originalText: said, fontSize: 20, fontFamily: 5, textAlign: 'center', verticalAlign: 'middle',
        containerId: id, autoResize: true, lineHeight: 1.25
      })
    ];
  }
  // Once Excalidraw has measured the words: the card grows to hold them, and
  // they sit in its middle.
  function settleNote(card, text) {
    var h = Math.max(card.height, text.height + 2 * PAD);
    return [Object.assign({}, card, { height: h }), Object.assign({}, text, {
      x: card.x + (card.width - text.width) / 2, y: card.y + (h - text.height) / 2
    })];
  }
  function isNote(e) { return !!e && !e.isDeleted && e.type === 'rectangle' && !!e.customData && !!e.customData.note; }
  // A note made before November 24, 2026 becomes one card: its words move
  // inside it, its name is kept on the card, and its votes leave the group.
  // The same answer on every screen, so two people opening a board at once
  // settle on one copy.
  function upgradeNotes(elements, now) {
    var by = {}, change = {};
    (elements || []).forEach(function (e) { by[e.id] = e; });
    function set(e, fields) { change[e.id] = Object.assign({}, e, fields, { version: e.version + 1, versionNonce: 1, updated: now }); }
    (elements || []).forEach(function (e) {
      if (!isNote(e)) return;
      var t = by[e.id + '-t'], n = by[e.id + '-n'];
      if (!t || t.isDeleted || t.containerId) return;
      var words = t.originalText && t.originalText.indexOf('\n') < 0 ? t.originalText : String(t.text || '').replace(/\s*\n\s*/g, ' ');
      var th = wrap(words, Math.max(4, Math.floor((e.width - 2 * PAD) / 11))).length * 25;
      set(e, { groupIds: [], boundElements: [{ type: 'text', id: t.id }], height: Math.max(e.height, th + 2 * PAD),
        customData: Object.assign({}, e.customData, { name: n ? String(n.originalText || n.text || '').replace(/\s*\n\s*/g, ' ') : '' }) });
      set(t, { groupIds: [], containerId: e.id, text: words, originalText: words, textAlign: 'center', verticalAlign: 'middle', fontSize: t.fontSize || 20 });
      if (n && !n.isDeleted) set(n, { isDeleted: true, groupIds: [] });
    });
    (elements || []).forEach(function (e) {
      if (e.isDeleted || !e.customData || !e.customData.vote || (e.opacity === 0 && e.locked)) return;
      set(e, { groupIds: [], opacity: 0, locked: true });
    });
    var ids = Object.keys(change);
    return { changed: ids.length > 0, ids: ids, elements: (elements || []).map(function (e) { return change[e.id] || e; }) };
  }
  // Where a new note goes, so that it covers nothing. On a board with a
  // template: the first frame, where every template begins, unless the person
  // has zoomed in on one frame (their view is narrower than two frames), and
  // then that one. With no template, the free place nearest the middle of view.
  function overlaps(e, x, y, w, h) {
    var l = Math.min(e.x, e.x + e.width), t = Math.min(e.y, e.y + e.height);
    return x < l + Math.abs(e.width) && x + w > l && y < t + Math.abs(e.height) + 8 && y + h + 8 > t;
  }
  function noteSpot(elements, view) {
    var shown = (elements || []).filter(function (e) { return !e.isDeleted; });
    var frames = shown.filter(function (e) { return e.type === 'rectangle' && /^tpl-/.test(String(e.id)); })
      .sort(function (a, b) { return Number(String(a.id).split('-').pop()) - Number(String(b.id).split('-').pop()); });
    function inside(f, x, y) { return x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height; }
    var taken = shown.filter(function (e) { return !/^tpl-/.test(String(e.id)) && !(e.customData && e.customData.vote) && !e.containerId; });
    function free(x, y, w, h) { return !taken.some(function (e) { return overlaps(e, x, y, w, h); }); }
    if (frames.length) {
      var close = view && view.w && view.w < frames[0].width * 2;
      var f = (close && frames.filter(function (r) { return inside(r, view.x, view.y); })[0]) || frames[0];
      var w = IN_FRAME.w, h = IN_FRAME.h;
      for (var y = f.y + 96; y + h <= f.y + f.height; y += h + 36) {
        for (var x = f.x + 20; x + w <= f.x + f.width; x += w + 16) if (free(x, y, w, h)) return { x: x, y: y, w: w, h: h };
      }
      var k = taken.filter(function (e) { return isNote(e) && inside(f, e.x + e.width / 2, e.y + e.height / 2); }).length;
      return { x: f.x + 30 + (k % 6) * 26, y: f.y + 110 + (k % 6) * 22, w: w, h: h };
    }
    var W = NOTE_W, H = NOTE_H, sx = W + 24, sy = H + 52, mid = view || { x: 0, y: 0 }, best = null, far = Infinity;
    // In line with the notes already there, so a class's notes make rows.
    var first = shown.filter(isNote)[0];
    var ox = first ? first.x + W / 2 + Math.round((mid.x - first.x - W / 2) / sx) * sx : mid.x, oy = first ? first.y + H / 2 + Math.round((mid.y - first.y - H / 2) / sy) * sy : mid.y;
    for (var r = -12; r <= 12; r++) for (var c = -12; c <= 12; c++) {
      var cx = ox + c * sx, cy = oy + r * sy, px = cx - W / 2, py = cy - H / 2;
      // Places in view first, then the nearest.
      var out = view && view.w && (Math.abs(cx - mid.x) + W / 2 > view.w / 2 || Math.abs(cy - mid.y) + H / 2 > (view.h || view.w) / 2);
      var d = Math.hypot(cx - mid.x, cy - mid.y) + (out ? 1e6 : 0);
      if (d < far && free(px, py, W, H)) { far = d; best = { x: px, y: py, w: W, h: H }; }
    }
    return best || { x: mid.x - W / 2, y: mid.y - H / 2, w: W, h: H };
  }
  // A vote is an element of its own, one per person per note, so a class voting
  // at once never overwrites one another (a shared count would: a board settles
  // element by element). It is not drawn; the page counts them onto the card.
  function votesOn(elements, note) {
    return elements.filter(function (e) { return !e.isDeleted && e.customData && e.customData.vote === note; });
  }
  function voteDot(o) {
    var card = o.elements.filter(function (e) { return e.id === o.note; })[0];
    if (!card) return null;
    return shape('ellipse', 'vote-' + o.note + '-' + o.by, card.x + card.width / 2, card.y + card.height / 2, 1, 1, o.now, {
      opacity: 0, locked: true, customData: { vote: o.note, by: o.by }
    });
  }
  // What is drawn on the board: everything but the votes.
  function drawn(elements) { return (elements || []).filter(function (e) { return !e.isDeleted && !(e.customData && e.customData.vote); }); }
  function cardLine(card, votes) {
    return [card.customData.name || '', votes ? votes + (votes === 1 ? ' vote' : ' votes') : ''].filter(Boolean).join(', ');
  }
  // The board as a picture: each card's name and votes as words beneath it.
  function forPicture(elements, now) {
    var out = drawn(elements);
    out.filter(isNote).forEach(function (c) {
      var line = cardLine(c, votesOn(elements, c.id).length);
      if (line) out.push(shape('text', c.id + '-line', c.x, c.y + c.height + 4, line.length * 8, 18, now, {
        strokeColor: '#4e5b55', text: line, originalText: line, fontSize: 14, fontFamily: 5, textAlign: 'left', verticalAlign: 'top', containerId: null, autoResize: true, lineHeight: 1.25
      }));
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
    TEMPLATES: TEMPLATES, template: template, templateElements: templateElements, noteColor: noteColor, noteElements: noteElements, settleNote: settleNote, isNote: isNote, upgradeNotes: upgradeNotes, noteSpot: noteSpot, votesOn: votesOn, voteDot: voteDot, drawn: drawn, cardLine: cardLine, forPicture: forPicture, needsTemplate: needsTemplate,
    unsent: unsent, markSeen: markSeen, syncable: syncable, keepLocal: keepLocal, merge: merge,
    bytes: bytes, batches: batches, sendInterval: sendInterval, pointerInterval: pointerInterval, throttle: throttle,
    sameGeneration: sameGeneration, canDraw: canDraw, colorFor: colorFor, fileName: fileName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BoardLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
