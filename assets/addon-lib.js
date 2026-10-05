// Pure helpers for the Meet add-on (/addon/ and /addon/stage/): which
// cohort and room a call belongs to, from its meeting code; what the side
// panel puts first in each part of the session; what the main stage may
// show (it is screen-shared, so nothing with a name or an answer on it);
// and the shape of the messages between the panel, the stage, and the
// sign-in window. Tested in tools/test/addon-lib.test.mjs.
(function (root) {
  // A Meet code is three letters, four, and three (Google: "in the form of
  // aaa-bbbb-ccc"). People paste it many ways: the whole link, the link
  // with ?authuser=1 or ?pli=1, the code alone, upper case, or without its
  // dashes. Every one of them reads as the same code here.
  var CODE = /^([a-z]{3})-?([a-z]{4})-?([a-z]{3})$/;
  function meetingCode(text) {
    var s = String(text || '').trim().toLowerCase();
    if (!s) return null;
    if (/^https?:\/\//.test(s) || /^meet\.google\.com\//.test(s)) {
      var u;
      try { u = new URL(/^https?:\/\//.test(s) ? s : 'https://' + s); } catch (e) { return null; }
      if (u.hostname !== 'meet.google.com') return null;
      s = u.pathname.replace(/^\/+|\/+$/g, '');
    }
    var m = s.match(CODE);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }

  // Which cohort, and which group's room, a meeting code belongs to. The
  // main room is every session's meet_url (a recurring event keeps one
  // code for every week); a group's room is its own meet_url. A group's
  // room wins, since it is the more particular answer. If two cohorts
  // share a code (they should not), the one this person teaches wins, and
  // the answer says it was ambiguous so the panel can say so.
  function findRoom(code, rows) {
    var c = meetingCode(code);
    if (!c) return null;
    rows = rows || {};
    var teaching = rows.teaching || [];
    function same(url) { return meetingCode(url) === c; }
    var groups = (rows.groups || []).filter(function (g) { return same(g.meet_url); });
    var sessions = (rows.sessions || []).filter(function (s) { return same(s.meet_url); });
    var cohorts = [];
    groups.forEach(function (g) { if (cohorts.indexOf(g.cohort_id) < 0) cohorts.push(g.cohort_id); });
    sessions.forEach(function (s) { if (cohorts.indexOf(s.cohort_id) < 0) cohorts.push(s.cohort_id); });
    if (!cohorts.length) return null;
    var chosen = cohorts.filter(function (id) { return teaching.indexOf(id) >= 0; })[0] || cohorts[0];
    var group = groups.filter(function (g) { return g.cohort_id === chosen; })[0] || null;
    return { code: c, cohortId: chosen, groupId: group ? group.id : null, room: group ? 'group' : 'main', ambiguous: cohorts.length > 1 };
  }

  // The side panel is a small launcher of activities (the session now,
  // the queue, the checks, and room for more later), and this chooses
  // which one opens, by the part of the session (CohortLib.PARTS keys),
  // and what "the session now" leads with. The panel is narrow, so it
  // shows one activity at a time and never hides the others.
  //   arrive  the session now, with the teacher's "what I heard"
  //   show    the session now, with each group's order
  //   check   the checks, with the two closing questions ready to ask
  //   others  the queue
  // In a group's room, that group's order leads whatever the clock says.
  function panelPlan(partKey, room) {
    if (room === 'group') return { open: 'now', lead: 'groups', closingFirst: false };
    if (partKey === 'arrive') return { open: 'now', lead: 'heard', closingFirst: false };
    if (partKey === 'show') return { open: 'now', lead: 'groups', closingFirst: false };
    if (partKey === 'check') return { open: 'checks', lead: null, closingFirst: true };
    return { open: 'queue', lead: null, closingFirst: false };
  }

  // Seconds left on a timer that ends at endsAt (milliseconds), or null
  // when no timer is running.
  function timeLeft(endsAt, now) {
    if (num(endsAt) == null) return null;
    return Math.max(0, Math.round((endsAt - now) / 1000));
  }

  // LiveLib is loaded beside this file on the page, and required in node.
  function live() {
    if (root.LiveLib) return root.LiveLib;
    try { return typeof require === 'function' ? require('./live-lib.js') : null; } catch (e) { return null; }
  }

  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null; }

  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // What the main stage shows, made from what the teacher's panel knows.
  // The stage is meant to be screen-shared to the whole cohort, so it only
  // ever carries what everyone may see: the part and its timer, a check's
  // question and choices (never an answer, never a name on an answer),
  // the anonymous count only when the teacher chose to show it, and an
  // item from the queue, which the cohort already sees with its owner's
  // name on /live/.
  //   state.part     { key, name, endsAt }   endsAt in ms, or null
  //   state.onStage  { kind: 'check', id } or { kind: 'item', id } or null
  //   state.checks   live_checks rows; state.results { [checkId]: check_results }
  //                  (or, from a page before R4, state.tallies { [checkId]: check_tally rows })
  //   state.items    live_queue rows;  state.names { [userId]: name }
  //   state.welcome  CohortLib.welcome(), shown when the teacher puts it
  //                  on the stage, and before any part has begun
  function stageView(state) {
    state = state || {};
    var part = state.part ? { key: cut(state.part.key, 20), name: cut(state.part.name, 80), endsAt: num(state.part.endsAt) } : null;
    var on = state.onStage || null;
    var w = welcomeOf(state.welcome);
    if (w && ((on && on.kind === 'welcome') || (!on && !part))) return { mode: 'welcome', part: part, welcome: w };
    if (on && on.kind === 'check') {
      var k = (state.checks || []).filter(function (x) { return x.id === on.id; })[0];
      if (k && k.state === 'open') {
        var L = live();
        var kind = L ? L.kindOf(k) : (k.choices ? 'choice' : 'short');
        var labels = kind === 'scale' && L ? L.scaleLabels(k) : kind === 'short' || kind === 'words' ? null : k.choices;
        var view = { mode: 'check', part: part, kind: kind, prompt: cut(k.prompt, 500), choices: labels ? labels.map(function (c) { return cut(c, 120); }) : null, count: null };
        if (k.show_tally && kind !== 'short' && L) {
          var summary = (state.results || {})[k.id];
          if (!summary && state.tallies) {
            var t = L.tally(k, state.tallies[k.id] || []);
            summary = { total: t.total, counts: t.rows.map(function (r) { return r.count; }) };
          }
          var r = L.results(k, summary);
          view.count = {
            total: r.total,
            rows: r.rows.map(function (x) { return { label: cut(x.label, 120), count: x.count, share: x.share, text: cut(x.text, 20) }; }),
            words: r.words.slice(0, 30).map(function (w) { return { word: cut(w.word, 60), size: w.size }; }),
            note: r.note ? cut(r.note, 200) : null
          };
        }
        return view;
      }
    }
    if (on && on.kind === 'item') {
      var i = (state.items || []).filter(function (x) { return x.id === on.id; })[0];
      if (i) {
        var label = live() ? live().itemLabel(i) : i.url;
        var itemView = { mode: 'item', part: part, who: cut((state.names || {})[i.user_id] || 'Someone', 80), what: cut(label, 200), note: i.note ? cut(i.note, 300) : null };
        // The audience's part, from the current presenter scene (R7).
        if (typeof state.audience === 'string' && state.audience) itemView.audience = cut(state.audience, 300);
        return itemView;
      }
    }
    // The run of show (R3): a stage the teacher cleared, or the current
    // scene as the class builder previews it (ShowLib.stagePreview).
    if (on && on.kind === 'blank') return { mode: 'blank', part: part };
    // Where everyone said they are on the path (R11): counts, never names.
    if (on && on.kind === 'path') return { mode: 'path', part: part, path: pathOf(state.path) };
    // Every rehearsal room at a glance (R12): its name, where its turns
    // are, its step's clock, and whether it asked for the teacher.
    if (on && on.kind === 'rooms') return { mode: 'rooms', part: part, rooms: roomsOf(state.rooms) };
    if (!on && state.scene) { var sc = sceneOf(state.scene); if (sc) return { mode: 'scene', part: part, scene: sc }; }
    return { mode: 'part', part: part };
  }

  // A scene for the stage, read back with every field checked and cut to
  // size: its kind's name, its title, a few lines, a list (a question's
  // choices, a room's own scenes), and a note.
  function sceneOf(p) {
    if (!p || typeof p.title !== 'string' || !p.title) return null;
    function lines(a, n, len) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x; }).slice(0, n).map(function (x) { return cut(x, len); }) : []; }
    var out = {
      eyebrow: typeof p.eyebrow === 'string' ? cut(p.eyebrow, 40) : '', title: cut(p.title, 120),
      lines: lines(p.lines, 4, 300), items: lines(p.items, 8, 120), note: typeof p.note === 'string' && p.note ? cut(p.note, 200) : null
    };
    // The design stage (R5): the board itself, on the main stage.
    if (typeof p.board === 'string' && STAGE_BOARD.test(p.board)) out.board = p.board;
    return out;
  }

  // A welcome, read back with every field checked and cut to size.
  function welcomeOf(w) {
    if (!w || typeof w.cohort !== 'string' || !w.cohort) return null;
    var first = w.first && typeof w.first.name === 'string' ? { name: cut(w.first.name, 80), what: w.first.what ? cut(w.first.what, 300) : null } : null;
    return {
      cohort: cut(w.cohort, 120), week: num(w.week), title: w.title ? cut(w.title, 120) : null,
      challenge: w.challenge ? cut(w.challenge, 400) : null, first: first
    };
  }

  // Messages from the panel to the stage, through the SDK's
  // notifyMainStage (a string). The stage trusts nothing it cannot read
  // back into one of the views above.
  var STAGE = 'hs-stage';
  function stageMessage(view) { return JSON.stringify({ type: STAGE, v: 1, view: view }); }
  function readStageMessage(payload) {
    var m;
    try { m = typeof payload === 'string' ? JSON.parse(payload) : payload; } catch (e) { return null; }
    if (!m || m.type !== STAGE || m.v !== 1 || !m.view) return null;
    var v = m.view;
    var part = v.part && typeof v.part.name === 'string' ? { key: String(v.part.key || ''), name: cut(v.part.name, 80), endsAt: num(v.part.endsAt) } : null;
    if (v.mode === 'check' && typeof v.prompt === 'string') {
      var choices = Array.isArray(v.choices) ? v.choices.slice(0, 10).map(function (c) { return cut(c, 120); }) : null;
      var kinds = ['choice', 'multi', 'short', 'scale', 'words', 'rank'];
      var count = null;
      if (v.count && num(v.count.total) != null && Array.isArray(v.count.rows)) {
        count = {
          total: Number(v.count.total),
          rows: v.count.rows.slice(0, 10).map(function (r) {
            return { label: cut(r.label, 120), count: Number(r.count) || 0, share: Math.max(0, Math.min(100, Number(r.share) || 0)), text: cut(r.text == null ? String(Number(r.count) || 0) : r.text, 20) };
          }),
          words: Array.isArray(v.count.words) ? v.count.words.slice(0, 30).filter(function (w) { return w && typeof w.word === 'string'; }).map(function (w) {
            return { word: cut(w.word, 60), size: Math.max(1, Math.min(5, Math.round(Number(w.size) || 1))) };
          }) : [],
          note: typeof v.count.note === 'string' && v.count.note ? cut(v.count.note, 200) : null
        };
      }
      return { mode: 'check', part: part, kind: kinds.indexOf(v.kind) >= 0 ? v.kind : 'choice', prompt: cut(v.prompt, 500), choices: choices, count: count };
    }
    if (v.mode === 'item' && typeof v.what === 'string') {
      var iv = { mode: 'item', part: part, who: cut(v.who || 'Someone', 80), what: cut(v.what, 200), note: v.note ? cut(v.note, 300) : null };
      if (typeof v.audience === 'string' && v.audience) iv.audience = cut(v.audience, 300);
      return iv;
    }
    if (v.mode === 'welcome') { var w = welcomeOf(v.welcome); return w ? { mode: 'welcome', part: part, welcome: w } : null; }
    if (v.mode === 'part') return { mode: 'part', part: part };
    if (v.mode === 'blank') return { mode: 'blank', part: part };
    if (v.mode === 'path') return { mode: 'path', part: part, path: pathOf(v.path) };
    if (v.mode === 'rooms') return { mode: 'rooms', part: part, rooms: roomsOf(v.rooms) };
    if (v.mode === 'scene') { var sc = sceneOf(v.scene); return sc ? { mode: 'scene', part: part, scene: sc } : null; }
    return null;
  }
  // The path view's rows (RosterLib.pathView): a label, a count, and a
  // share of the longest bar, for each stage, and how many are sharing.
  function pathOf(p) {
    var rows = p && Array.isArray(p.rows) ? p.rows.slice(0, 12).filter(function (r) { return r && typeof r.label === 'string'; }).map(function (r) {
      return { label: cut(r.label, 40), count: Math.max(0, Number(r.count) | 0), share: Math.max(0, Math.min(100, Number(r.share) | 0)) };
    }) : [];
    return { rows: rows, sharing: Math.max(0, Number(p && p.sharing) | 0) };
  }

  // The rooms view's rows, from RoomBoard's onChange: at most twelve.
  function roomsOf(list) {
    return (Array.isArray(list) ? list : []).slice(0, 12).filter(function (r) { return r && typeof r.name === 'string'; }).map(function (r) {
      return { name: cut(r.name, 60), text: cut(r.text || '', 160), endsAt: num(r.endsAt), asking: !!r.asking, done: !!r.done };
    });
  }

  // The stage asks the panel for what to show when it opens, because a
  // message only reaches a frame that is already listening.
  var HELLO = JSON.stringify({ type: STAGE + '-hello', v: 1 });
  function isHello(payload) {
    try { var m = JSON.parse(payload); return !!m && m.type === STAGE + '-hello'; } catch (e) { return false; }
  }

  // The sign-in window hands the session back with postMessage. The panel
  // takes it only from the window it opened, only from this site's own
  // origin, and only in this exact shape: the two tokens Supabase needs to
  // restore a session, and nothing else (not the GitHub token).
  var HANDOFF = 'hs-session';
  function handoff(session) {
    if (!session || !session.access_token || !session.refresh_token) return null;
    return { type: HANDOFF, access_token: String(session.access_token), refresh_token: String(session.refresh_token) };
  }
  function acceptHandoff(event, origin, opened) {
    if (!event || event.origin !== origin) return null;
    if (!opened || event.source !== opened) return null;
    var d = event.data;
    if (!d || d.type !== HANDOFF || typeof d.access_token !== 'string' || typeof d.refresh_token !== 'string') return null;
    if (!d.access_token || !d.refresh_token || d.access_token.length > 8000 || d.refresh_token.length > 1000) return null;
    return { access_token: d.access_token, refresh_token: d.refresh_token };
  }

  // The drawing board for this call (H4): the group's own board in a
  // group's room, the session's board in the main room, and that board's
  // stage view, the tab a teacher presents. The board opens in its own tab,
  // because it needs the hub's sign-in and Meet keeps the panel's and the
  // stage's storage apart from the site's (board-lib.js reads these links).
  var BOARD_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // A design scene's template (R5, BoardLib.TEMPLATES) rides along, so
  // the board is laid with it the first time it opens.
  var TEMPLATE_KEY = /^[a-z][a-z-]{0,39}$/;
  function boardLinks(cohort, session, groupId, template) {
    if (!cohort || !cohort.slug || !session || session.number == null) return null;
    var q = '/board/?c=' + encodeURIComponent(cohort.slug) + '&s=week-' + Number(session.number);
    var g = groupId && BOARD_UUID.test(groupId) ? groupId.toLowerCase() : null;
    if (g) q += '&g=' + g;
    var t = template && template !== 'blank' && TEMPLATE_KEY.test(template) ? '&t=' + template : '';
    return { board: q + t, stage: q + '&view=stage' + t, group: !!g };
  }

  // The only board a stage message may put on the main stage: a stage
  // view of a board on this site, in exactly the shape boardLinks makes.
  var STAGE_BOARD = /^\/board\/\?c=[A-Za-z0-9%._~-]{1,120}&s=week-\d{1,2}(&g=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?&view=stage(&t=[a-z][a-z-]{0,39})?$/;

  var lib = {
    meetingCode: meetingCode, findRoom: findRoom, panelPlan: panelPlan, timeLeft: timeLeft,
    stageView: stageView, sceneOf: sceneOf, stageMessage: stageMessage, readStageMessage: readStageMessage, HELLO: HELLO, isHello: isHello,
    handoff: handoff, acceptHandoff: acceptHandoff, boardLinks: boardLinks
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.AddonLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
