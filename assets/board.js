// The board (/board/?c=<slug>&s=<week-N or session id>&g=<group id>):
// an Excalidraw drawing space the cohort shares during a live session
// (research/notes/meet-classroom-design.md, Wish 2 and C4).
//
// How it stays the same on every screen. Each page sends the elements
// that changed (by Excalidraw's per-element version) through a private
// Supabase Realtime broadcast channel, 'board:<board id>', which only
// people who can read the board may join and only people who can draw on
// it may send to (migration 20261003150000). Each page merges what
// arrives with Excalidraw's own reconcileElements, the rule its own
// collaboration uses. What survives the session is the boards row: every
// few seconds while someone draws, and when they leave, the page saves
// what changed through save_board(), which merges element by element in
// the database, so no one's save erases anyone else's work. If Realtime
// cannot connect, the page reads the saved board every ten seconds.
//
// Excalidraw (MIT) and React come from one bundle served by this site
// (assets/vendor/, built by tools/board/build.mjs); research/notes/
// board-notes.md says why it is not loaded from a CDN.
(function () {
  var root = document.querySelector('[data-board]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib || !window.BoardLib) return;
  var B = window.BoardLib;
  var lib = window.CohortLib;
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var P = B.params(location.search);
  var VENDOR = '/assets/vendor/excalidraw-0.18.1/excalidraw.js?v=20261124d';
  // Excalidraw's fonts, from the same version on jsDelivr (fixed files).
  window.EXCALIDRAW_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.18.1/dist/prod/';
  var POLL = 10000;

  var S = {
    me: null, auth: null, cohort: null, session: null, group: null, groups: [], teaching: false, board: null,
    X: null, api: null, reactRoot: null, initial: null,
    channel: null, live: false, poller: null,
    seen: {},       // the newest version of each element sent or received
    saved: {},      // the newest version of each element this page saved
    lastVersion: -1, here: [], collaborators: new Map(), savedAt: null, saving: false
  };

  function $(s) { return root.querySelector(s); }
  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
    root.querySelector('.board-states').hidden = state === 'ready';
  }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function status(m) { $('[data-say]').textContent = m; }

  function theme() {
    if (S.theme && S.theme !== 'system') return S.theme;
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ------------------------------------------------------------------
  // Opening the board
  // ------------------------------------------------------------------

  // On the main stage, Meet frames the board, so its own storage is apart
  // from humanshaped.org's. The panel signs in with the browser's storage
  // access, which this frame may then use too without asking again (found
  // in the live Meet test: the board said to sign in while the leader was).
  function stageSignIn() {
    if (!document.requestStorageAccess) return Promise.resolve(false);
    return document.requestStorageAccess({ localStorage: true }).then(function (handle) {
      if (!handle || !handle.localStorage) return false;
      db = window.supabase.createClient(window.HUB.url, window.HUB.key, { auth: { storage: handle.localStorage } });
      return true;
    }, function () { return false; });
  }

  function load() {
    if (!P.slug) return fail('This page needs to know which cohort’s board to open. Open it from the session page.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if ((!s.data || !s.data.session) && P.stage) return stageSignIn().then(function (got) { return got ? db.auth.getSession() : s; });
      return s;
    }).then(function (s) {
      if (!s.data || !s.data.session) {
        // On the Meet add-on's main stage (R5), the board reads the sign-in
        // the panel made; there is nowhere to sign in inside the stage.
        if (P.stage) {
          var out = root.querySelector('[data-state="signed-out"]');
          out.replaceChildren();
          var h = document.createElement('h1'); h.textContent = 'The board opens here once you are signed in.';
          var p = document.createElement('p'); p.textContent = 'Sign in from the Human Shaped panel beside the call.';
          out.appendChild(h); out.appendChild(p);
        }
        return show('signed-out');
      }
      S.auth = s.data.session;
      S.me = S.auth.user;
      return db.from('cohorts').select('*').eq('slug', P.slug).maybeSingle().then(function (c) {
        if (c.error) return fail('The board could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        S.cohort = c.data;
        return Promise.all([
          db.from('sessions').select('*').eq('cohort_id', S.cohort.id).order('number'),
          db.from('cohort_teachers').select('user_id').eq('cohort_id', S.cohort.id),
          db.from('groups').select('id, name, group_members(user_id)').is('ended_at', null).eq('cohort_id', S.cohort.id).order('name')
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('The board could not be opened: ' + bad.error.message);
          var sessions = res[0].data || [];
          S.leaders = {}; (res[1].data || []).forEach(function (t) { S.leaders[t.user_id] = true; });
          S.teaching = !!S.leaders[S.me.id];
          S.groups = res[2].data || [];
          if (!sessions.length) return show('not-member');
          var t = lib.currentAndNext(sessions, new Date(), S.cohort.session_minutes);
          S.session = B.pickSession(sessions, P, t.live ? t.next : (t.next || t.current));
          if (!S.session) return fail('This cohort has no session ' + (P.week != null ? 'in week ' + P.week : 'by that name') + '.');
          S.group = P.group ? S.groups.filter(function (g) { return g.id === P.group; })[0] || null : null;
          if (P.group && !S.group) {
            $('[data-not-member-text]').textContent = 'This board belongs to a group you are not in. Your own group’s board is linked from the session’s board.';
            return show('not-member');
          }
          return openBoard();
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  function openBoard() {
    return db.rpc('open_board', { c: S.cohort.id, s: S.session.id, g: S.group ? S.group.id : null }).then(function (r) {
      if (r.error) return fail('The board could not be opened: ' + r.error.message);
      var row = (r.data || [])[0];
      if (!row) {
        if (S.group) {
          $('[data-not-member-text]').textContent = 'Your leader has not made a board for ' + S.group.name + ' yet. The session’s board is open to everyone in the cohort.';
        }
        return show('not-member');
      }
      S.board = row;
      drawHead();
      show('ready');
      status('Loading the drawing tools…');
      return import(VENDOR).then(function (X) {
        S.X = X;
        mount();
        listen();
        otherBoards();
      }, function () {
        fail('The drawing tools did not load. Check the connection and try again.');
      });
    });
  }

  // ------------------------------------------------------------------
  // The parts of the page around the canvas
  // ------------------------------------------------------------------

  function drawHead() {
    var c = S.cohort, s = S.session;
    $('[data-kicker]').textContent = c.title + ', ' + (window.CohortLib ? window.CohortLib.sessionName(s.number, c) : 'week ' + s.number) + (S.teaching ? '. You are leading it.' : '');
    $('[data-title]').textContent = S.group ? 'The board for ' + S.group.name : 'The board';
    var back = $('[data-back]');
    back.href = '/session/?c=' + encodeURIComponent(c.slug);
    $('[data-teach]').hidden = !S.teaching;
    $('[data-lock]').textContent = S.board.locked ? 'Unlock the board' : 'Lock the board';
    if (S.pages) S.pages.refresh();
    if (S.teaching && !S.group && S.groups.length) {
      var sel = $('[data-group-select]');
      sel.replaceChildren();
      S.groups.forEach(function (g) { var o = document.createElement('option'); o.value = g.id; o.textContent = g.name; sel.appendChild(o); });
      $('[data-group-pick]').hidden = false;
      $('[data-group-open]').hidden = false;
    }
    syncLine();
  }

  // What the line under the buttons says: who is here, whether the board
  // is live and saved, and whether it is locked.
  function syncLine() {
    if (!S.board) return;
    var parts = [];
    if (S.board.locked) parts.push(S.teaching ? 'The board is locked, so only leaders can draw on it.' : 'Your leader has locked the board, so it is here to look at and download.');
    // On the main stage only what someone needs to know: locked, not live,
    // and saved (found in a real call: the line ran to three sentences).
    if (S.X && !S.live) parts.push('Not live right now, so the board checks for changes every ten seconds.');
    else if (S.X && !P.stage) parts.push('Live with everyone on the board.');
    if (S.here.length > 1 && !P.stage) parts.push('Here now: ' + S.here.join(', ') + '.');
    if (S.savedAt && !P.stage) parts.push('Saved at ' + S.savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.');
    status(parts.join(' '));
  }

  // Links to the other boards of this session that this person can see:
  // the session's board from a group's, and each group's board.
  function otherBoards() {
    db.from('boards').select('id, group_id').eq('session_id', S.session.id).then(function (r) {
      if (r.error || !r.data) return;
      var line = $('[data-other]');
      line.replaceChildren();
      var links = [];
      if (S.group) links.push({ text: 'The session’s board', href: B.link(S.cohort.slug, S.session, null, P.stage, P.template) });
      r.data.forEach(function (b) {
        if (!b.group_id || (S.group && b.group_id === S.group.id)) return;
        var g = S.groups.filter(function (x) { return x.id === b.group_id; })[0];
        if (g) links.push({ text: 'The board for ' + g.name, href: B.link(S.cohort.slug, S.session, g.id, P.stage, P.template) });
      });
      if (!links.length) { line.hidden = true; return; }
      line.append('Also this session: ');
      links.forEach(function (l, i) {
        var a = document.createElement('a'); a.href = l.href; a.textContent = l.text;
        if (i) line.append(i === links.length - 1 ? (links.length > 2 ? ', and ' : ' and ') : ', ');
        line.appendChild(a);
      });
      line.append('.');
      line.hidden = false;
    });
  }

  // ------------------------------------------------------------------
  // Excalidraw
  // ------------------------------------------------------------------

  function canDraw() { return B.canDraw(S.board, S.teaching); }

  function props() {
    var X = S.X, T = S.tools ? S.tools.props : {};
    return {
      // window.__board is read by tools/board/sync-check.mjs, the two-page test.
      excalidrawAPI: function (api) {
        if (api && !S.api) {
          S.api = api; window.__board = { api: api, state: S }; syncLine();
          // Pages on the board (R13): PDFs and pictures, placed and fetched.
          if (window.BoardPages && $('[data-pages]')) try {
            S.pages = window.BoardPages.start({
              db: db, X: S.X, api: function () { return S.api; }, board: function () { return S.board; }, cohort: S.cohort,
              canDraw: canDraw, teaching: S.teaching, mount: $('[data-pages]'), status: status
            });
            setTimeout(function () { S.pages.sync(api.getSceneElements()); }, 0);
          } catch (e) { S.pages = null; }
          // A template laid on an empty board goes to everyone and is saved.
          if (S.seeded) setTimeout(function () { sendScene(); saveSoon(); }, 0);
          // On the main stage, or with a template just laid, everything on
          // the board fits the screen when it opens (once, so no one's view
          // jumps while they draw).
          S.fitPending = !!(S.seeded || P.stage) && S.initial.elements.some(function (e) { return !e.isDeleted; });
          drawNotes();
          drawCardsSoon();
          setTimeout(render, 0);
          if (S.tools) S.tools.ready();
          api.onUserFollow(onFollow);
          api.onScrollChange(function () { drawCardsSoon(); shareView(); });
          if (S.upgraded) setTimeout(function () { sendScene(); saveSoon(); }, 0);
        }
      },
      initialData: S.initial,
      onChange: onChange,
      onPointerUpdate: onPointer,
      generateIdForFile: T.generateIdForFile, validateEmbeddable: T.validateEmbeddable, renderEmbeddable: T.renderEmbeddable,
      generateLinkForSelection: T.generateLinkForSelection, onLinkOpen: T.onLinkOpen, onLibraryChange: T.onLibraryChange, libraryReturnUrl: T.libraryReturnUrl,
      isCollaborating: true,
      // No AI in the board: the cohort's own agents are where AI belongs.
      aiEnabled: false,
      // Locked is look-only; otherwise each person may choose view mode themselves.
      viewModeEnabled: canDraw() ? undefined : true,
      theme: theme(),
      name: B.fileName(S.cohort.slug, S.session, S.group && S.group.name, 'x').replace(/-board\.x$/, ''),
      langCode: 'en',
      UIOptions: {
        tools: { image: !!S.tools },
        canvasActions: {
          loadScene: false, clearCanvas: false, saveToActiveFile: false, toggleTheme: true,
          changeViewBackgroundColor: canDraw(), export: { saveFileToDisk: true }, saveAsImage: true
        }
      }
    };
  }

  // Keys handed over by the stage reach Excalidraw only through its own box.
  window.addEventListener('focus', function () {
    var box = document.querySelector('.excalidraw');
    if (box && (!document.activeElement || document.activeElement === document.body)) box.focus();
  });

  // Notes: what a class does most on a board.
  // What is in view, clear of the tools along its edges.
  function view() {
    var st = S.api.getAppState(), z = st.zoom.value;
    var small = !!$('[data-canvas]').querySelector('.excalidraw--mobile');
    var l = st.width >= 1000 ? 232 : 20, r = small ? 44 : 20, t = 76, b = small ? 116 : 100;
    return { x: (l + (st.width - l - r) / 2) / z - st.scrollX, y: (t + (st.height - t - b) / 2) / z - st.scrollY, w: (st.width - l - r) / z, h: (st.height - t - b) / z };
  }
  function fit(elements, animate) {
    S.api.scrollToContent(B.drawn(elements), { fitToViewport: true, maxZoom: 1, viewportZoomFactor: 0.96, animate: !!animate, canvasOffsets: { top: 76, right: 20, bottom: 96, left: 20 } });
  }
  // Measured by Excalidraw itself, so the words wrap the way they will when
  // the card is resized.
  function ready(els) { return S.X.restoreElements(els, null, { refreshDimensions: true, repairBindings: true }); }
  function settled(els) {
    var by = {}; els.forEach(function (e) { by[e.id] = e; });
    els.forEach(function (e) {
      if (!B.isNote(e) || !by[e.id + '-t']) return;
      var pair = B.settleNote(e, by[e.id + '-t']);
      by[e.id] = pair[0]; by[e.id + '-t'] = pair[1];
    });
    return els.map(function (e) { return by[e.id]; });
  }
  function drawNotes() {
    var bar = $('[data-notes]');
    if (!bar) return;
    bar.hidden = !canDraw();
    if (S.notesWired) return;
    S.notesWired = true;
    // Someone tied to a member writes as that member.
    db.from('call_guests').select('member_id').eq('cohort_id', S.cohort.id).eq('user_id', S.me.id).maybeSingle().then(function (g) {
      var id = g.data && g.data.member_id;
      if (!id) return;
      S.asMember = id;
      db.from('profiles').select('display_name, github_login').eq('id', id).maybeSingle().then(function (p) { if (p.data) S.asName = p.data.display_name || p.data.github_login; });
    });
    var form = bar.querySelector('form'), input = form.querySelector('input');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var text = input.value.trim();
      if (!text || !S.api || !canDraw()) return;
      input.value = '';
      // Measured in the board's own lettering, or the first note's words ran
      // past its edges until the font arrived.
      lettering().then(function () { addNote(text); });
    });
  }
  function lettering() {
    var wait = new Promise(function (r) { setTimeout(r, 2000); });
    var font = document.fonts && document.fonts.load ? document.fonts.load('20px Excalifont', 'Aa').catch(function () {}) : null;
    return Promise.race([Promise.resolve(font), wait]);
  }
  function addNote(text) {
    var now = Date.now(), v = view(), spot = B.noteSpot(S.api.getSceneElements(), v);
    var id = 'n' + now.toString(36) + Math.random().toString(36).slice(2, 6);
    var made = settled(ready(B.noteElements({ id: id, by: S.asMember || S.me.id, name: myName(), text: text, x: spot.x, y: spot.y, w: spot.w, h: spot.h, now: now })));
    S.api.updateScene({ elements: S.api.getSceneElementsIncludingDeleted().concat(made), appState: { selectedElementIds: {} }, captureUpdate: S.X.CaptureUpdateAction.IMMEDIATELY });
    // The view moves only when the new card would be out of it.
    var c = made[0], inView = c.x >= v.x - v.w / 2 && c.x + c.width <= v.x + v.w / 2 && c.y >= v.y - v.h / 2 && c.y + c.height <= v.y + v.h / 2;
    if (!inView) setTimeout(function () { fit(S.api.getSceneElements(), true); }, 0);
  }
  function bump(e, fields) { return Object.assign({}, e, fields, { version: e.version + 1, versionNonce: Math.floor(Math.random() * 1e9), updated: Date.now() }); }
  function voteFor(note) {
    if (!S.api || !canDraw()) return;
    var all = S.api.getSceneElementsIncludingDeleted();
    var mine = B.votesOn(all, note).filter(function (e) { return e.customData.by === S.me.id; })[0], next;
    if (mine) next = all.map(function (e) { return e.id === mine.id ? bump(e, { isDeleted: true }) : e; });
    else {
      var gone = all.filter(function (e) { return e.id === 'vote-' + note + '-' + S.me.id; })[0];
      var dot = B.voteDot({ note: note, by: S.me.id, elements: all, now: Date.now() });
      if (!dot) return;
      next = gone ? all.map(function (e) { return e === gone ? bump(e, { x: dot.x, y: dot.y, isDeleted: false, opacity: 0, locked: true, groupIds: [] }) : e; }) : all.concat(S.X.restoreElements([dot], null));
    }
    S.api.updateScene({ elements: next, captureUpdate: S.X.CaptureUpdateAction.NEVER });
  }

  // Each card's writer and votes, drawn over the board just under the card, at
  // the board's own scroll and zoom. Between Excalidraw's canvas and its tools.
  var cards = {}, cardLayer = null, cardFrame = 0;
  function drawCardsSoon() { cancelAnimationFrame(cardFrame); cardFrame = requestAnimationFrame(drawCards); }
  function drawCards() {
    var host = $('[data-canvas]').querySelector('.excalidraw');
    if (!host || !S.api) return;
    if (!cardLayer || cardLayer.parentNode !== host) {
      if (!cardLayer) { cardLayer = document.createElement('div'); cardLayer.className = 'board-cards'; }
      host.appendChild(cardLayer);
    }
    var els = S.api.getSceneElements(), st = S.api.getAppState(), z = st.zoom.value, live = {};
    var editing = st.editingTextElement && st.editingTextElement.containerId;
    els.forEach(function (e) {
      if (!B.isNote(e)) return;
      live[e.id] = true;
      var n = cards[e.id];
      if (!n) {
        n = cards[e.id] = document.createElement('div');
        n.className = 'board-card';
        n.appendChild(document.createElement('span'));
        var b = document.createElement('button'); b.type = 'button';
        b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
        b.addEventListener('click', function (ev) { ev.stopPropagation(); voteFor(e.id); });
        n.appendChild(b);
        cardLayer.appendChild(n);
      }
      var votes = B.votesOn(els, e.id), mine = votes.some(function (x) { return x.customData.by === S.me.id; });
      n.firstChild.textContent = e.customData.name || '';
      var btn = n.lastChild;
      btn.textContent = votes.length ? votes.length + (votes.length === 1 ? ' vote' : ' votes') : 'Vote';
      btn.setAttribute('aria-pressed', String(mine));
      btn.setAttribute('aria-label', (mine ? 'Take my vote back. ' : 'Vote for this. ') + votes.length + ' so far.');
      btn.disabled = !canDraw();
      btn.hidden = !canDraw() && !votes.length;
      var s = Math.max(0.55, Math.min(1.25, z));
      n.style.width = (e.width * z / s) + 'px';
      n.style.transform = 'translate(' + ((e.x + st.scrollX) * z) + 'px,' + ((e.y + e.height + st.scrollY) * z + 10) + 'px) scale(' + s + ')';
      n.style.visibility = editing === e.id || e.angle ? 'hidden' : '';
    });
    Object.keys(cards).forEach(function (id) { if (!live[id]) { cards[id].remove(); delete cards[id]; } });
  }

  // What the board offers beyond drawing, in the one menu the stage has too
  // (it was all in the page's head, which the stage hides).
  function menu() {
    var X = S.X, M = X.MainMenu;
    function item(key, label, fn) { return X.createElement(M.Item, { key: key, onSelect: fn }, label); }
    var out = [item('fit', 'Show everything', function () { fit(S.api.getSceneElements(), true); })];
    if (S.teaching) out.push(item('gather', 'Bring everyone here', gather));
    if (canDraw() && S.pages && S.pages.pick) out.push(item('pages', 'Add a PDF or pictures', function () { S.pages.pick(); }));
    if (canDraw() && S.tools) out.push(item('open', 'Add a saved board', function () { S.tools.openFile(); }));
    out.push(X.createElement(M.Separator, { key: 's0' }), item('png', 'Download with names and votes', function () { exportAs('png'); }), X.createElement(M.DefaultItems.SaveAsImage, { key: 'img' }), item('file', 'Download the board', function () { exportAs('excalidraw'); }));
    out.push(X.createElement(M.Separator, { key: 's1' }), X.createElement(M.DefaultItems.SearchMenu, { key: 'find' }), X.createElement(M.DefaultItems.Help, { key: 'help' }));
    out.push(X.createElement(M.DefaultItems.ToggleTheme, { key: 'theme', allowSystemTheme: true, theme: S.theme || 'system', onSelect: function (t) { S.theme = t; render(); } }));
    if (canDraw()) out.push(X.createElement(M.DefaultItems.ChangeCanvasBackground, { key: 'bg' }));
    if (S.teaching) out.push(X.createElement(M.Separator, { key: 's2' }),
      item('lock', S.board.locked ? 'Unlock the board' : 'Lock the board', function () { $('[data-lock]').click(); }),
      item('clear', 'Clear the board', function () { $('[data-clear]').click(); }));
    return X.createElement(M, null, out);
  }

  function mount() {
    var X = S.X;
    if (window.BoardTools) S.tools = window.BoardTools.start({
      db: db, X: X, api: function () { return S.api; }, board: function () { return S.board; }, cohort: S.cohort, session: S.session,
      groupId: S.group ? S.group.id : null, me: S.me, canDraw: canDraw, changed: function () { sendScene(); saveSoon(); }
    });
    var existing = X.restoreElements(sceneOf(S.board), null);
    B.markSeen(S.seen, existing);
    B.markSeen(S.saved, existing);
    // Notes from before they were one card become one, by anyone who may draw.
    var up = canDraw() ? B.upgradeNotes(existing, Date.now()) : { changed: false };
    if (up.changed) { S.upgraded = true; existing = settled(ready(up.elements)); }
    // A design scene's template (R5), laid only on a board that has never
    // had anything on it, by anyone who may draw. Its ids are fixed, so
    // two people opening the same empty board make one copy.
    S.seeded = canDraw() && B.needsTemplate(sceneOf(S.board), P.template);
    var elements = S.seeded ? existing.concat(X.restoreElements(B.templateElements(P.template, Date.now()), null)) : existing;
    S.initial = { elements: elements, appState: { viewBackgroundColor: '#ffffff' }, scrollToContent: true };
    S.reactRoot = X.createRoot($('[data-canvas]'));
    render();
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  }
  function render() { if (S.reactRoot) S.reactRoot.render(S.X.createElement(S.X.Excalidraw, props(), menu())); }
  function sceneOf(board) { return (board && board.scene && board.scene.elements) || []; }

  function onChange(elements, appState, files) {
    if (!S.api) return;
    if (S.tools) S.tools.onFiles(files);
    // "Unlock all" reaches the votes too, which nobody can see to leave alone:
    // they lock again, and are never part of a selection.
    if (canDraw() && elements.some(function (e) { return !e.isDeleted && e.customData && e.customData.vote && !e.locked; })) {
      var again = B.upgradeNotes(S.api.getSceneElementsIncludingDeleted(), Date.now()), keepIds = {};
      Object.keys(appState.selectedElementIds || {}).forEach(function (id) { if (again.ids.indexOf(id) < 0) keepIds[id] = true; });
      setTimeout(function () { S.api.updateScene({ elements: again.elements, appState: { selectedElementIds: keepIds }, captureUpdate: S.X.CaptureUpdateAction.NEVER }); }, 0);
      return;
    }
    shareSelection(appState);
    if (S.pages) S.pages.sync(elements);
    drawCardsSoon();
    root.querySelector('.board-frame').classList.toggle('has-selection', Object.keys(S.api.getAppState().selectedElementIds || {}).length > 0);
    if (S.fitPending && S.api.scrollToContent && elements.some(function (e) { return !e.isDeleted; })) {
      S.fitPending = false;
      setTimeout(function () { fit(S.api.getSceneElements()); }, 50);
    }
    var v = S.X.getSceneVersion(elements);
    var same = v === S.lastVersion;
    S.lastVersion = v;
    if (!canDraw()) return;
    // The same version can still hold a change of this page's own: when
    // someone else's stroke is merged in the same moment as this page's
    // last edit, the merge counts that edit in the version before this
    // page has sent it. So an unchanged version still checks for unsent
    // elements (found October 4: two people drawing at once could settle
    // a version apart and stay that way).
    if (same && !hasUnsent(elements)) return;
    sendScene();
    saveSoon();
  }
  // Everything but a picture still being kept, which goes once it is.
  function sharable(elements) { return B.syncable(elements).filter(function (e) { return !(S.tools && S.tools.waiting(e)); }); }
  function hasUnsent(elements) { return B.unsent(sharable(elements), S.seen).length > 0; }

  // Elements from someone else, merged the way Excalidraw's own
  // collaboration merges them. restoreElements is given no local copy, as
  // there: with one, it raises an older element's version above the one here,
  // so reading the saved board undid whatever was being resized (found
  // November 24, 2026). Marking them seen first keeps this page from sending
  // them straight back, and a message with nothing newer changes nothing.
  function applyRemote(remote) {
    if (!S.api || !remote || !remote.length) return;
    var X = S.X;
    var local = S.api.getSceneElementsIncludingDeleted(), mine = {};
    local.forEach(function (e) { mine[e.id] = e; });
    B.markSeen(S.seen, remote);
    var newer = remote.filter(function (r) { return r && r.id && !B.keepLocal(mine[r.id], r); });
    if (newer.length) {
      var merged = X.reconcileElements(local, X.restoreElements(newer, null), S.api.getAppState());
      S.lastVersion = X.getSceneVersion(merged);
      S.api.updateScene({ elements: merged, captureUpdate: X.CaptureUpdateAction.NEVER });
      local = merged;
    }
    // An edit of this page's own that the merge carried along still goes
    // to everyone and is saved.
    if (canDraw() && hasUnsent(local)) { sendScene(); saveSoon(); }
  }

  // ------------------------------------------------------------------
  // Live: Realtime broadcast and presence
  // ------------------------------------------------------------------

  var sendScene = B.throttle(function () {
    if (!S.api || !canDraw()) return;
    var changed = B.unsent(sharable(S.api.getSceneElementsIncludingDeleted()), S.seen);
    if (!changed.length) return;
    var cut = B.batches(changed);
    if (S.live) {
      cut.batches.forEach(function (els) {
        S.channel.send({ type: 'broadcast', event: 'scene', payload: { gen: S.board.generation, elements: els } });
      });
    }
    B.markSeen(S.seen, changed);
    // Too large for a message: saved now, and the others read it.
    if (cut.tooBig.length) saveNow().then(function () { nudge('saved'); });
  }, function () { return B.sendInterval(S.here.length); });

  var sendPointer = B.throttle(function (p) {
    if (!S.live || !p) return;
    S.channel.send({ type: 'broadcast', event: 'pointer', payload: p });
  }, function () { return B.pointerInterval(S.here.length); });

  function onPointer(e) {
    if (!e || !e.pointer || !S.me) return;
    sendPointer({ id: S.me.id, name: myName(), x: e.pointer.x, y: e.pointer.y, tool: e.pointer.tool, button: e.button, sel: selection() });
  }
  // What this person has selected, which the others see outlined in their color.
  function selection() {
    var ids = S.api ? S.api.getAppState().selectedElementIds || {} : {};
    return Object.keys(ids).filter(function (k) { return ids[k]; }).slice(0, 40);
  }
  function shareSelection() {
    var key = selection().join();
    if (key === S.selKey) return;
    S.selKey = key;
    sendPointer(Object.assign({ id: S.me.id, name: myName(), sel: selection() }, {}));
  }
  function myName() {
    if (S.asName) return S.asName;
    var m = (S.me && S.me.user_metadata) || {};
    return m.full_name || m.name || m.user_name || m.preferred_username || 'Someone';
  }
  function myFace() {
    var m = (S.me && S.me.user_metadata) || {};
    return /^https:\/\//.test(m.avatar_url || '') ? m.avatar_url : null;
  }

  // Everyone on the board, as Excalidraw's own list of people: pressing a face
  // follows that person's view.
  function person(id, fields) {
    var was = S.collaborators.get(id) || {}, color = B.colorFor(id);
    S.collaborators.set(id, Object.assign({}, was, { id: id, socketId: id, color: { background: color, stroke: color } }, fields));
  }
  function showPeople() { if (S.api) S.api.updateScene({ collaborators: new Map(S.collaborators) }); }
  function showPointer(p) {
    if (!S.api || !p || !p.id || p.id === S.me.id) return;
    var f = { username: p.name, selectedElementIds: (p.sel || []).reduce(function (m, k) { m[k] = true; return m; }, {}) };
    if (typeof p.x === 'number') { f.pointer = { x: p.x, y: p.y, tool: p.tool === 'laser' ? 'laser' : 'pointer' }; f.button = p.button === 'down' ? 'down' : 'up'; }
    person(p.id, f);
    showPeople();
  }

  // Following: the person followed sends what they can see while anyone
  // follows them, and each follower's view goes there.
  function onFollow(e) {
    if (!e || !e.userToFollow || !S.live) return;
    S.channel.send({ type: 'broadcast', event: 'follow', payload: { from: S.me.id, to: e.userToFollow.socketId, on: e.action === 'FOLLOW' } });
  }
  var sendView = B.throttle(function () {
    if (!S.live || !S.api || !S.followers || !S.followers.size) return;
    S.channel.send({ type: 'broadcast', event: 'view', payload: { id: S.me.id, bounds: S.X.getVisibleSceneBounds(S.api.getAppState()) } });
  }, function () { return B.pointerInterval(S.here.length); });
  function shareView() { if (S.followers && S.followers.size) sendView(); }
  function heardFollow(m) {
    if (!m || m.to !== S.me.id || m.from === S.me.id) return;
    S.followers = S.followers || new Set();
    if (m.on) S.followers.add(m.from); else S.followers.delete(m.from);
    S.api.updateScene({ appState: { followedBy: new Set(S.followers) } });
    if (m.on) sendView();
  }
  function goTo(bounds, animate) {
    if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(isFinite)) return;
    var st = S.api.getAppState(), to = S.X.zoomToFitBounds({ appState: st, bounds: bounds, fitToViewport: true, viewportZoomFactor: 1 }).appState;
    S.api.updateScene({ appState: { scrollX: to.scrollX, scrollY: to.scrollY, zoom: to.zoom } });
    drawCardsSoon();
  }
  function heardView(m) {
    var st = S.api && S.api.getAppState();
    if (!m || !st || !st.userToFollow || st.userToFollow.socketId !== m.id) return;
    if (st.followedBy && st.followedBy.has(m.id)) return;
    goTo(m.bounds);
  }
  // A leader brings everyone's view to what they are looking at, once.
  function gather() {
    if (!S.live) return S.api.setToast({ message: 'Not live right now, so nobody’s view was moved.', duration: 4000 });
    S.channel.send({ type: 'broadcast', event: 'gather', payload: { id: S.me.id, bounds: S.X.getVisibleSceneBounds(S.api.getAppState()) } });
    S.api.setToast({ message: 'Everyone is looking where you are.', duration: 2500 });
  }
  function heardGather(m) { if (m && S.leaders && S.leaders[m.id] && m.id !== S.me.id && S.api) goTo(m.bounds); }

  // Away, or idle for a minute, the way Excalidraw shows it on a face.
  var idleTimer = null, idleNow = null;
  function idle(state) {
    if (state === idleNow) return;
    idleNow = state;
    if (S.live) S.channel.send({ type: 'broadcast', event: 'idle', payload: { id: S.me.id, state: state } });
  }
  function awake() { clearTimeout(idleTimer); idle('active'); idleTimer = setTimeout(function () { idle('idle'); }, 60000); }
  ['pointermove', 'keydown'].forEach(function (ev) { document.addEventListener(ev, awake, { passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(idleTimer); idle('away'); } else awake(); });

  // A small message that tells everyone to read the board again: after a
  // teacher locks, unlocks, or clears it, or after a save too large to send.
  function nudge(why) {
    if (S.live) S.channel.send({ type: 'broadcast', event: 'board', payload: { why: why, gen: S.board.generation } });
  }

  function listen() {
    if (S.channel || !db.channel) return poll(true);
    if (db.realtime && db.realtime.setAuth && S.auth) db.realtime.setAuth(S.auth.access_token);
    S.channel = db.channel(B.topic(S.board.id), {
      config: { private: true, broadcast: { self: false }, presence: { key: S.me.id } }
    });
    S.channel
      .on('broadcast', { event: 'scene' }, function (m) {
        var msg = m.payload || {};
        if (B.sameGeneration(msg, S.board)) applyRemote(msg.elements);
        else if (msg.gen > S.board.generation) reread();
        catchUpSoon();
      })
      .on('broadcast', { event: 'pointer' }, function (m) { showPointer(m.payload); })
      .on('broadcast', { event: 'board' }, function () { reread(); })
      .on('broadcast', { event: 'follow' }, function (m) { if (S.api) heardFollow(m.payload); })
      .on('broadcast', { event: 'view' }, function (m) { heardView(m.payload); })
      .on('broadcast', { event: 'gather' }, function (m) { heardGather(m.payload); })
      .on('broadcast', { event: 'idle' }, function (m) { var p = m.payload || {}; if (p.id && p.id !== S.me.id && S.collaborators.has(p.id)) { person(p.id, { userState: p.state }); showPeople(); } })
      .on('presence', { event: 'sync' }, function () {
        var state = S.channel.presenceState(), names = [], ids = {};
        Object.keys(state).forEach(function (k) {
          var p = state[k][0] || {};
          ids[k] = true;
          names.push(k === S.me.id ? 'you' : (p.name || 'someone'));
        });
        S.here = names;
        S.collaborators.forEach(function (_, id) { if (!ids[id]) S.collaborators.delete(id); });
        Object.keys(ids).forEach(function (id) {
          var p = state[id][0] || {};
          person(id, { username: p.name || 'Someone', avatarUrl: p.face || undefined, isCurrentUser: id === S.me.id });
        });
        if (S.followers) S.followers.forEach(function (id) { if (!ids[id]) S.followers.delete(id); });
        showPeople();
        syncLine();
      });
    poll(true);
    S.channel.subscribe(function (state) {
      if (state === 'SUBSCRIBED') {
        S.live = true;
        poll(false);
        S.channel.track({ name: myName(), face: myFace() });
        awake();
        reread();   // whatever was drawn while this page was not listening
        sendScene();
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
        S.live = false;
        poll(true);
      }
      syncLine();
    });
  }

  // Realtime broadcast does not promise every message arrives, so a lost
  // stroke would leave two screens a version apart for good (found
  // October 4). Each page reads the saved board once when the strokes
  // from others stop, after the sender's next save has landed, and every
  // half minute while live: about one read a second for twenty people.
  var catchUpTimer = null;
  function catchUpSoon() {
    clearTimeout(catchUpTimer);
    catchUpTimer = setTimeout(function () { if (S.live) reread(); }, B.CATCH_UP_AFTER);
  }
  setInterval(function () { if (S.live && !document.hidden) reread(); }, B.CATCH_UP_EVERY);

  function poll(on) {
    if (on && !S.poller) S.poller = setInterval(reread, POLL);
    if (!on && S.poller) { clearInterval(S.poller); S.poller = null; }
  }

  // Read the saved board again: for a lock or a clear, after
  // reconnecting, and every ten seconds when not live.
  function reread() {
    if (!S.board) return Promise.resolve();
    return db.from('boards').select('*').eq('id', S.board.id).maybeSingle().then(function (r) {
      if (r.error) return;
      if (!r.data) { fail('This board has been deleted, as boards are when a cohort finishes.'); return; }
      var was = S.board;
      S.board = r.data;
      if (was.generation !== r.data.generation && S.api) {
        // Cleared: start again from what is saved, which is nothing.
        S.seen = {}; S.saved = {};
        var fresh = S.X.restoreElements(sceneOf(r.data), null);
        B.markSeen(S.seen, fresh); B.markSeen(S.saved, fresh);
        S.lastVersion = S.X.getSceneVersion(fresh);
        S.api.updateScene({ elements: fresh, captureUpdate: S.X.CaptureUpdateAction.NEVER });
        if (S.api.history && S.api.history.clear) S.api.history.clear();
      } else {
        applyRemote(sceneOf(r.data));
        B.markSeen(S.saved, sceneOf(r.data));
      }
      if (was.locked !== r.data.locked) { render(); drawHead(); drawNotes(); drawCardsSoon(); }
      syncLine();
    });
  }

  // ------------------------------------------------------------------
  // Saving
  // ------------------------------------------------------------------

  function toSave() {
    return S.api ? B.unsent(sharable(S.api.getSceneElementsIncludingDeleted()), S.saved) : [];
  }

  function saveNow() {
    if (!S.api || !canDraw() || S.saving) return Promise.resolve();
    var els = toSave();
    if (!els.length) return Promise.resolve();
    S.saving = true;
    return db.rpc('save_board', { b: S.board.id, gen: S.board.generation, elements: els }).then(function (r) {
      S.saving = false;
      if (r.error) { status('The board was not saved just now: ' + r.error.message + '. It will try again.'); return; }
      var row = (r.data || [])[0];
      if (row && row.saved) { B.markSeen(S.saved, els); S.savedAt = new Date(); syncLine(); }
      else reread();   // locked or cleared since this page last looked
    }, function () { S.saving = false; });
  }
  var saveSoon = B.throttle(saveNow, B.SAVE_EVERY);

  // Leaving: whatever is not saved yet goes in one request that the
  // browser finishes even as the page closes.
  function saveOnLeave() {
    saveSoon.cancel();
    var els = toSave();
    if (!els.length || !canDraw() || !S.auth) return;
    var body = JSON.stringify({ b: S.board.id, gen: S.board.generation, elements: els });
    if (body.length < 60000) {
      try {
        fetch(window.HUB.url + '/rest/v1/rpc/save_board', {
          method: 'POST', keepalive: true, body: body,
          headers: { 'Content-Type': 'application/json', apikey: window.HUB.key, Authorization: 'Bearer ' + S.auth.access_token }
        });
        B.markSeen(S.saved, els);
        return;
      } catch (e) { /* fall through */ }
    }
    saveNow();
  }
  window.addEventListener('pagehide', saveOnLeave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saveOnLeave(); });
  db.auth.onAuthStateChange(function (event, session) { if (session) S.auth = session; });

  // ------------------------------------------------------------------
  // Downloads, for everyone who can see the board
  // ------------------------------------------------------------------

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function exportAs(kind) {
    if (!S.api) return;
    var X = S.X;
    var elements = S.api.getSceneElements(), files = S.api.getFiles();
    if (kind !== 'excalidraw') elements = X.restoreElements(B.forPicture(elements, Date.now()), null);
    var appState = Object.assign({}, S.api.getAppState(), { exportBackground: true, exportWithDarkMode: false });
    var name = B.fileName(S.cohort.slug, S.session, S.group && S.group.name, kind);
    if (kind === 'excalidraw') {
      download(new Blob([X.serializeAsJSON(elements, appState, files, 'local')], { type: 'application/json' }), name);
    } else if (kind === 'svg') {
      X.exportToSvg({ elements: elements, appState: appState, files: files }).then(function (svg) {
        download(new Blob([svg.outerHTML], { type: 'image/svg+xml' }), name);
      });
    } else {
      X.exportToBlob({ elements: elements, appState: appState, files: files, mimeType: 'image/png' }).then(function (blob) { download(blob, name); });
    }
  }
  root.querySelectorAll('[data-download]').forEach(function (b) {
    b.addEventListener('click', function () { exportAs(b.getAttribute('data-download')); });
  });

  // ------------------------------------------------------------------
  // Teachers: lock, clear, and a board for a group
  // ------------------------------------------------------------------

  $('[data-lock]').addEventListener('click', function () {
    var locking = !S.board.locked;
    saveNow().then(function () {
      return db.from('boards').update({ locked: locking }).eq('id', S.board.id).select().maybeSingle();
    }).then(function (r) {
      if (r.error) return status('Not changed: ' + r.error.message);
      nudge(locking ? 'locked' : 'unlocked');
      reread();
    });
  });

  var clearDialog = document.querySelector('[data-clear-dialog]');
  $('[data-clear]').addEventListener('click', function () {
    if (clearDialog && clearDialog.showModal) clearDialog.showModal();
  });
  if (clearDialog) clearDialog.addEventListener('close', function () {
    if (clearDialog.returnValue !== 'clear') return;
    saveSoon.cancel(); sendScene.cancel();
    db.from('boards').update({ generation: S.board.generation + 1, scene: { elements: [] } }).eq('id', S.board.id).select().maybeSingle().then(function (r) {
      if (r.error) return status('Not cleared: ' + r.error.message);
      // The pages placed on it (R13) go too.
      if (db.storage) {
        var store = db.storage.from('board-files'), folder = S.cohort.id + '/' + S.board.id;
        store.list(folder, { limit: 1000 }).then(function (l) {
          var names = ((l && l.data) || []).map(function (f) { return folder + '/' + f.name; });
          if (names.length) store.remove(names);
        }).catch(function () {});
      }
      nudge('cleared');
      reread();
    });
  });

  $('[data-group-open]').addEventListener('click', function () {
    var g = $('[data-group-select]').value;
    if (!g) return;
    db.rpc('open_board', { c: S.cohort.id, s: S.session.id, g: g }).then(function (r) {
      if (r.error || !(r.data || []).length) return status('That group’s board could not be made: ' + (r.error ? r.error.message : 'no board came back') + '.');
      location.href = B.link(S.cohort.slug, S.session, g, P.stage, P.template);
    });
  });

  $('[data-reload]').addEventListener('click', load);
  load();
})();
