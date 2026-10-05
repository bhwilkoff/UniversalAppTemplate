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
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var P = B.params(location.search);
  var VENDOR = '/assets/vendor/excalidraw-0.18.1/excalidraw.js';
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
  function status(m) { $('[data-status]').textContent = m; }

  function theme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ------------------------------------------------------------------
  // Opening the board
  // ------------------------------------------------------------------

  function load() {
    if (!P.slug) return fail('This page needs to know which cohort’s board to open. Open it from the session page.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) {
        // On the Meet add-on's main stage (R5), the board reads the sign-in
        // the panel made; there is nowhere to sign in inside the stage.
        if (P.stage) {
          var out = root.querySelector('[data-state="signed-out"]');
          out.replaceChildren();
          var h = document.createElement('h1'); h.textContent = 'The board opens here once you are signed in.';
          var p = document.createElement('p'); p.textContent = 'Sign in from the Human Shaped panel beside the call, then come back to this scene. The board is also in its own tab from the panel.';
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
          db.from('groups').select('id, name, group_members(user_id)').eq('cohort_id', S.cohort.id).order('name')
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('The board could not be opened: ' + bad.error.message);
          var sessions = res[0].data || [];
          S.teaching = (res[1].data || []).some(function (t) { return t.user_id === S.me.id; });
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
          $('[data-not-member-text]').textContent = 'Your teacher has not made a board for ' + S.group.name + ' yet. The session’s board is open to everyone in the cohort.';
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
    $('[data-kicker]').textContent = c.title + ', week ' + s.number + (S.teaching ? '. You are teaching it.' : '');
    $('[data-title]').textContent = S.group ? 'The board for ' + S.group.name : 'The board';
    var back = $('[data-back]');
    back.href = '/live/?c=' + encodeURIComponent(c.slug);
    $('[data-teach]').hidden = !S.teaching;
    $('[data-lock]').textContent = S.board.locked ? 'Unlock the board' : 'Lock the board';
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
    if (S.board.locked) parts.push(S.teaching ? 'The board is locked, so only teachers can draw on it.' : 'Your teacher has locked the board, so it is here to look at and download.');
    if (S.X) parts.push(S.live ? 'Live with everyone on the board.' : 'Not live right now, so the board checks for changes every ten seconds.');
    if (S.here.length > 1) parts.push('Here now: ' + S.here.join(', ') + '.');
    if (S.savedAt) parts.push('Saved at ' + S.savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.');
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
    var X = S.X;
    return {
      // window.__board is read by tools/board/sync-check.mjs, the two-page test.
      excalidrawAPI: function (api) {
        if (api && !S.api) {
          S.api = api; window.__board = { api: api, state: S }; syncLine();
          // A template laid on an empty board goes to everyone and is saved.
          if (S.seeded) setTimeout(function () { sendScene(); saveSoon(); }, 0);
          // On the main stage, or with a template just laid, everything on
          // the board fits the screen when it opens (once, so no one's view
          // jumps while they draw).
          S.fitPending = !!(S.seeded || P.stage);
        }
      },
      initialData: S.initial,
      onChange: onChange,
      onPointerUpdate: onPointer,
      isCollaborating: true,
      // No AI in the board: the cohort's own agents are where AI belongs.
      aiEnabled: false,
      viewModeEnabled: !canDraw(),
      theme: theme(),
      name: B.fileName(S.cohort.slug, S.session, S.group && S.group.name, 'x').replace(/-board\.x$/, ''),
      langCode: 'en',
      UIOptions: {
        tools: { image: false },
        canvasActions: {
          loadScene: false, clearCanvas: false, saveToActiveFile: false, toggleTheme: false,
          changeViewBackgroundColor: canDraw(), export: { saveFileToDisk: true }, saveAsImage: true
        }
      }
    };
  }

  function mount() {
    var X = S.X;
    var existing = X.restoreElements(sceneOf(S.board), null);
    B.markSeen(S.seen, existing);
    B.markSeen(S.saved, existing);
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
  function render() { if (S.reactRoot) S.reactRoot.render(S.X.createElement(S.X.Excalidraw, props())); }
  function sceneOf(board) { return (board && board.scene && board.scene.elements) || []; }

  function onChange(elements) {
    if (!S.api) return;
    if (S.fitPending && S.api.scrollToContent && elements.some(function (e) { return !e.isDeleted; })) {
      S.fitPending = false;
      setTimeout(function () { S.api.scrollToContent(S.api.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.8 }); }, 50);
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
  function hasUnsent(elements) { return B.unsent(B.syncable(elements), S.seen).length > 0; }

  // Elements from someone else, merged the way Excalidraw's own
  // collaboration merges them. Marking them seen first keeps this page
  // from sending them straight back.
  function applyRemote(remote) {
    if (!S.api || !remote || !remote.length) return;
    var X = S.X;
    var local = S.api.getSceneElementsIncludingDeleted();
    var restored = X.restoreElements(remote, local);
    B.markSeen(S.seen, restored);
    var merged = X.reconcileElements(local, restored, S.api.getAppState());
    S.lastVersion = X.getSceneVersion(merged);
    S.api.updateScene({ elements: merged, captureUpdate: X.CaptureUpdateAction.NEVER });
    // An edit of this page's own that the merge carried along still goes
    // to everyone and is saved.
    if (canDraw() && hasUnsent(merged)) { sendScene(); saveSoon(); }
  }

  // ------------------------------------------------------------------
  // Live: Realtime broadcast and presence
  // ------------------------------------------------------------------

  var sendScene = B.throttle(function () {
    if (!S.api || !canDraw()) return;
    var changed = B.unsent(B.syncable(S.api.getSceneElementsIncludingDeleted()), S.seen);
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
    sendPointer({ id: S.me.id, name: myName(), x: e.pointer.x, y: e.pointer.y, tool: e.pointer.tool, button: e.button });
  }
  function myName() {
    var m = (S.me && S.me.user_metadata) || {};
    return m.full_name || m.name || m.user_name || m.preferred_username || 'Someone';
  }

  function showPointer(p) {
    if (!S.api || !p || p.id === S.me.id) return;
    var color = B.colorFor(p.id);
    S.collaborators.set(p.id, {
      id: p.id, socketId: p.id, username: p.name,
      pointer: { x: p.x, y: p.y, tool: p.tool === 'laser' ? 'laser' : 'pointer' },
      button: p.button === 'down' ? 'down' : 'up', color: { background: color, stroke: color }
    });
    S.api.updateScene({ collaborators: new Map(S.collaborators) });
  }

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
      .on('presence', { event: 'sync' }, function () {
        var state = S.channel.presenceState(), names = [], ids = {};
        Object.keys(state).forEach(function (k) {
          var p = state[k][0] || {};
          ids[k] = true;
          names.push(k === S.me.id ? 'you' : (p.name || 'someone'));
        });
        S.here = names;
        S.collaborators.forEach(function (_, id) { if (!ids[id]) S.collaborators.delete(id); });
        if (S.api) S.api.updateScene({ collaborators: new Map(S.collaborators) });
        syncLine();
      });
    poll(true);
    S.channel.subscribe(function (state) {
      if (state === 'SUBSCRIBED') {
        S.live = true;
        poll(false);
        S.channel.track({ name: myName() });
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
      if (was.locked !== r.data.locked) { render(); drawHead(); }
      syncLine();
    });
  }

  // ------------------------------------------------------------------
  // Saving
  // ------------------------------------------------------------------

  function toSave() {
    return S.api ? B.unsent(B.syncable(S.api.getSceneElementsIncludingDeleted()), S.saved) : [];
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
