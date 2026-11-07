// Open rooms (ADDON-DESIGN.md, "Open rooms"): what the panel, the stage, and
// the room's own page need to know, with no page or network in it. Tested in
// tools/test/room-lib.test.mjs. The room's rules are in tools/rooms.
(function (root) {
  var CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  var TEMPLATE = 'https://github.com/new?template_owner=humanshaped&template_name=stage-template';
  var STARTER = '# What are we building today?\n\n> Say why you called this group together.\n\n---\n\n# One thing we want to be true by the end\n\n> Ask the room, and let them answer on the board.\n\n---\n\n# Try it\n\n> Show your page on the main stage. Everyone gets their own copy to use.\n'; // kit: content

  function code(s) { s = String(s == null ? '' : s).trim().toLowerCase(); return CODE.test(s) ? s : null; }
  // The room's address carries its code as the whole query: /room/?abc-defg-hij.
  function codeOfSearch(search) {
    var q = String(search || '').replace(/^\?/, '');
    var named = /(?:^|&)room=([a-z-]+)/.exec(q);
    return code(named ? named[1] : q.split('&')[0]);
  }
  function link(origin, c) { return origin + '/room/?' + c; }
  function socket(base, c) { return String(base).replace(/^http/, 'ws').replace(/\/$/, '') + '/room/' + c; }

  // owner/name from what a person pasted: the pair, or any GitHub address.
  function repoOf(text) {
    var t = String(text || '').trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
    var m = /^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/.exec(t);
    return m && !/^\.+$/.test(m[2]) ? { owner: m[1], repo: m[2], name: m[1] + '/' + m[2] } : null;
  }
  function commitUrl(r) { return 'https://api.github.com/repos/' + r.owner + '/' + r.repo + '/commits/HEAD'; }
  function rawUrl(r, sha, file) { return 'https://raw.githubusercontent.com/' + r.owner + '/' + r.repo + '/' + sha + '/' + file; }
  function editUrl(r, file) { return 'https://github.com/' + r.owner + '/' + r.repo + '/edit/HEAD/' + file; }
  // raw.githubusercontent.com will not serve a script or a style as one, and
  // jsDelivr will, so a page's own files load from there at the same commit.
  function assetBase(r, sha) { return 'https://cdn.jsdelivr.net/gh/' + r.owner + '/' + r.repo + '@' + sha + '/'; }
  function withBase(html, base) {
    var tag = '<base href="' + base + '">';
    var s = String(html || '');
    if (/<head[^>]*>/i.test(s)) return s.replace(/<head[^>]*>/i, function (m) { return m + tag; });
    return tag + s;
  }

  // A deck as the room holds it, without the theme lines the stage adds.
  function deckBody(d) { return String(d || '').replace(/^---\n[\s\S]*?\n---\n/, ''); }

  // The first heading of a talk, for its title.
  function titleOf(text) {
    var m = /^#{1,3}\s+(.+?)\s*(\{.*\})?\s*$/m.exec(String(text || ''));
    return m ? m[1].slice(0, 120) : '';
  }

  // A stop in the talk: { slide, shown }, with shown 0 for the whole slide, the
  // way the stage reads it.
  function stops(frames) {
    return (frames || []).map(function (f) { return { slide: f.slide, shown: isFinite(f.shown) ? f.shown : 0 }; });
  }
  function stopAt(list, at, shown) {
    for (var i = 0; i < list.length; i++) if (list[i].slide === at && list[i].shown === shown) return i;
    return 0;
  }

  // What the host's one button does next.
  function nextStep(room, s) {
    s = s || {};
    if (!s.stageOn) return { label: 'Open the main stage', act: 'stage' };
    if (room.show === 'question') return { label: 'Close the question', act: 'close' };
    var list = s.stops || [];
    if (room.show !== 'slides') {
      if (!list.length) return { label: 'Write your slides', act: 'talk' };
      return { label: room.at > 0 || room.shown ? 'Back to the slides' : 'Start the slides', act: 'slides' };
    }
    if (!list.length) return { label: 'Write your slides', act: 'talk' };
    var i = stopAt(list, room.at, room.shown);
    if (i >= list.length - 1) return { label: 'Last slide', act: null, disabled: true };
    return { label: 'Next slide', act: 'next', to: list[i + 1] };
  }

  function people(room) { return (room && room.people) || []; }
  function here(n) { return n + ' here'; }

  // What a stage draws for a room. A person who has not answered sees no count
  // until they have, so nobody answers with the crowd; the host always sees it.
  function toView(room, c) {
    c = c || {};
    var A = c.addon, part = room.clock ? { key: 'clock', name: room.clock.label || 'Clock', endsAt: room.clock.endsAt } : null;
    if (!room.on) return { mode: 'roomwelcome', part: null, waiting: true, title: '', host: '' };
    if (room.show === 'slides' && c.talk) return { mode: 'slides', part: part, slides: { text: c.talk, at: room.at, shown: room.shown } };
    if (room.show === 'question' && room.question && room.question.open && A) {
      var q = room.question, isHost = room.host === c.you;
      var hide = !isHost && !c.mine;
      var results = {}; results[q.id] = room.summary || { total: 0 };
      var v = A.stageView({
        part: part, onStage: { kind: 'check', id: q.id }, answerable: !isHost, results: results,
        mineOf: function () { return c.mine || null; },
        checks: [{ id: q.id, state: 'open', kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points, show_tally: q.reveal && !hide }]
      });
      v.host = isHost;
      return v;
    }
    if (room.show === 'board') return { mode: 'roomboard', part: part, notes: room.notes || [], you: c.you, host: room.host === c.you };
    if (room.show === 'page' && room.page) return { mode: 'page', part: null, page: room.page, html: room.page.owner ? null : (c.html || '') };
    if (room.show === 'card' && room.card) return { mode: 'card', part: null, card: { body: room.card, endsAt: part ? part.endsAt : null } };
    if (room.show === 'blank') return { mode: 'blank', part: part };
    return { mode: 'roomwelcome', part: part, title: room.title, host: room.hostName };
  }

  var lib = { CODE: CODE, TEMPLATE: TEMPLATE, STARTER: STARTER, code: code, codeOfSearch: codeOfSearch, link: link, socket: socket, repoOf: repoOf, commitUrl: commitUrl, rawUrl: rawUrl, editUrl: editUrl, assetBase: assetBase, withBase: withBase, titleOf: titleOf, deckBody: deckBody, stops: stops, stopAt: stopAt, nextStep: nextStep, people: people, here: here, toView: toView };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RoomLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
