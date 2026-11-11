// The Meet add-on's side panel (/addon/), inside Google Meet.
//
// I want the teacher to be able to run a session from inside Meet,
// without a second window, and without the panel ever asking which
// cohort this is: Meet tells it the call's code (getMeetingInfo), and the
// code is in the meet_url of the cohort's sessions, or of one group's room
// (AddonLib.findRoom). The panel is laid out as the run of show (R1,
// research/notes/run-of-show-design.md): the session's scenes as a
// timeline, the current one open with what it needs, drawn by the same
// component as /live/ (ShowView), for the teacher's view or the student's.
//
// Signing in. Meet frames this page, so its storage is kept apart from
// humanshaped.org's (storage partitioning), and GitHub cannot be framed.
// So, in order: a session this panel already has; the Storage Access API,
// which lets the panel use the humanshaped.org sign-in this browser
// already has; a small window to /account/?handoff=meet that signs in and
// hands the session back with postMessage (this origin only, from the
// window it opened, and only the two Supabase tokens); and, if none of
// those work, a link to open the panel in a new tab.
//
// What it never does: record, measure, or join the call as a
// participant. It reads the meeting code and nothing else from Meet.
//
// Outside Meet, opened as /addon/?c=<slug>&s=<number>, it draws the same
// panel for that session, for learners until Google approves the add-on
// for everyone (Ben, October 23, 2026: "a button for learners ... that
// opens up a page with the features that will be available in the add-on
// once it [is] approved"). Leaders run sessions from the add-on in Meet.
(function () {
  var root = document.querySelector('[data-addon]');
  if (!root) return;
  var A = window.AddonLib, lib = window.CohortLib, L = window.LiveLib;
  var cfg = window.MEET_ADDON || {};
  var POLL = 15000;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-secondary', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function newTab(a) { a.target = '_blank'; a.rel = 'noopener'; return a; }

  if (!window.supabase || !window.HUB || !A || !lib || !L || !window.ShowView) return fail('The panel could not load all of its parts. Close it and open it again.');

  // ------------------------------------------------------------------
  // Inside Meet, or not
  // ------------------------------------------------------------------

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  // Meet always frames the panel from another site; a frame from this
  // site's own pages (a narrow preview) is the page outside Meet.
  if (framed) { try { if (window.top.location.origin === location.origin) framed = false; } catch (e) { /* another site: Meet */ } }
  var side = null;          // Meet's side panel client
  var query = new URLSearchParams(location.search);
  var standalone = !framed && !!query.get('c');
  var standaloneSlug = query.get('c') || '';
  var standaloneNumber = /^\d{1,2}$/.test(query.get('s') || '') ? Number(query.get('s')) : null;
  if (!standalone && (!framed || !window.meet || !window.meet.addon)) { show('outside'); return; }
  if (standalone) root.classList.add('addon-standalone');

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, ms); })]);
  }

  // ------------------------------------------------------------------
  // Signing in
  // ------------------------------------------------------------------

  // The panel's own storage first. A second client is made only when the
  // browser lends the panel humanshaped.org's own storage.
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var popup = null, popupWatch = null, borrowed = false;

  function siteStorage() {
    if (!document.requestStorageAccess) return Promise.resolve(null);
    return document.requestStorageAccess({ localStorage: true }).then(function (handle) {
      return handle && handle.localStorage ? handle.localStorage : null;
    }, function () { return null; });
  }
  function sessionOf(client) {
    return client.auth.getSession().then(function (s) { return s.data && s.data.session ? s.data.session : null; }, function () { return null; });
  }
  function useSiteSignIn(quiet) {
    var status = $('[data-signin-status]');
    return siteStorage().then(function (store) {
      if (!store) {
        if (!quiet) { status.textContent = 'Your browser did not let the panel use it, so sign in with GitHub in a small window instead.'; $('[data-fallback]').hidden = false; }
        return null;
      }
      var client = window.supabase.createClient(window.HUB.url, window.HUB.key, { auth: { storage: store } });
      return sessionOf(client).then(function (s) {
        if (s) { db = client; borrowed = true; return s; }
        if (!quiet) status.textContent = 'You are not signed in on humanshaped.org in this browser yet, so sign in with GitHub in a small window instead.';
        return null;
      });
    });
  }

  // After Sign out, the panel stays signed out until the person signs in
  // again, rather than quietly borrowing the site's sign-in.
  var OUT = 'hs-addon-signed-out';
  function signedOutOnPurpose() { try { return localStorage.getItem(OUT) === '1'; } catch (e) { return false; } }
  // A guest's own session gives way to a real sign-in once the browser has
  // lent the panel humanshaped.org's: a member should never stay a guest.
  function signIn() {
    return sessionOf(db).then(function (s) {
      if (s && !s.user.is_anonymous) return s;
      if (signedOutOnPurpose()) return s;
      return useSiteSignIn(true).then(function (site) { return site || s; });
    });
  }

  // Google sign-in beside GitHub (DECISIONS.md): signed out, the panel
  // offers Google's One Tap and its button (what Meet asks of add-ons),
  // beside GitHub. Someone signed in without GitHub links it once in a
  // small window, because cohorts work through GitHub.
  var GL = window.GoogleSignInLib;
  var current = null;      // the session to lend the link window
  function signedOut() {
    show('signed-out');
    $('[data-as-guest]').hidden = standalone;
    if (!window.HSGoogle || !GL) return;
    window.HSGoogle.mount({
      db: db, button: $('[data-google-signin]'), prompt: true,
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      onSession: function (s) { if (s) proceed(s); },
      onError: function (e) { $('[data-signin-status]').textContent = 'Google sign-in did not finish: ' + (e && e.message ? e.message : e) + '.'; }
    });
  }
  function proceed(session) {
    // Signing in after coming in as a guest: start over as that person.
    if (S.me && S.me.id !== session.user.id) { location.reload(); return; }
    current = session;
    try { localStorage.removeItem(OUT); } catch (e) {}
    // A tab without a GitHub token gets a fresh one first (GitHubToken).
    if (window.GitHubToken) window.GitHubToken.ensure(db, session);
    // In a call nothing stands between a person and the session.
    if (!GL || framed) return start(session);
    return db.from('profiles').select('github_login').eq('id', session.user.id).maybeSingle().then(function (p) {
      if (!p.error && GL.needsGitHub(p.data)) return show('link-github');
      start(session);
    }, function () { start(session); });
  }

  root.querySelectorAll('[data-sign-out]').forEach(function (b) {
    b.addEventListener('click', function () {
      try { localStorage.setItem(OUT, '1'); } catch (e) {}
      if (window.google && window.google.accounts && window.google.accounts.id) window.google.accounts.id.disableAutoSelect();
      // A sign-in borrowed from humanshaped.org is the site's own: the
      // panel lets go of it, and the site's tabs stay signed in (found
      // making the review screencast: the panel signed the site out).
      if (borrowed) { location.reload(); return; }
      // The session came from the site, so ending it would sign the site out
      // too (found testing): the panel only forgets its own copy.
      // The site's kept GitHub token stays: this is only the panel letting go.
      Promise.resolve().then(function () { db.auth.stopAutoRefresh(); localStorage.removeItem(db.auth.storageKey); }).catch(function () {})
        .then(function () { location.reload(); });
    });
  });

  // Without GitHub the panel still runs a session; what lives on GitHub
  // (the cohort's conversation) waits until it is linked.
  $('[data-github-later]').addEventListener('click', function () { if (current) start(current); });
  $('[data-link-github]').addEventListener('click', function () {
    var status = $('[data-link-status]');
    popup = window.open(GL.linkWindowUrl(location.origin), 'hs-link', 'popup,width=480,height=720');
    if (!popup) { status.textContent = 'Your browser blocked the small window.'; return; }
    status.textContent = 'Link your GitHub in the small window, and this panel will follow.';
  });
  // The link window asks for this panel's sign-in, to link GitHub to it.
  window.addEventListener('message', function (event) {
    if (!GL || !current || !GL.isWant(event, location.origin, popup)) return;
    var msg = A.handoff(current);
    if (msg) popup.postMessage(msg, location.origin);
  });

  $('[data-popup]').addEventListener('click', function () {
    var status = $('[data-signin-status]');
    // A name of its own each time: a window left open would only come to the front.
    popup = window.open('/account/?handoff=meet', 'hs-signin-' + Date.now(), 'popup,width=480,height=720');
    if (!popup) { status.textContent = 'Your browser blocked the small window.'; $('[data-fallback]').hidden = false; return; }
    status.textContent = 'Finish signing in in the small window, and this panel will follow.';
    clearInterval(popupWatch);
    popupWatch = setInterval(function () {
      if (popup && popup.closed) {
        clearInterval(popupWatch); popup = null;
        if (!S.me) {
          status.textContent = 'The window closed before it handed your sign-in back. If you finished signing in there, use your humanshaped.org sign-in above.';
          $('[data-fallback]').hidden = false;
        }
      }
    }, 1000);
  });

  window.addEventListener('message', function (event) {
    var tokens = A.acceptHandoff(event, location.origin, popup);
    if (!tokens) return;
    db.auth.setSession(tokens).then(function (r) {
      if (r.error || !r.data || !r.data.session) { $('[data-signin-status]').textContent = 'The sign-in could not be used here: ' + (r.error ? r.error.message : 'no session') + '.'; $('[data-fallback]').hidden = false; return; }
      clearInterval(popupWatch);
      proceed(r.data.session);
    });
  });

  // ------------------------------------------------------------------
  // What the panel knows
  // ------------------------------------------------------------------

  var S = { me: null, room: null, cohort: null, session: null, prev: null, teaching: false, names: {}, people: [], groups: [], brought: [],
    parts: [], autoAsked: {}, paused: {}, chosenPart: null, timerEnds: null, drawnPart: undefined, show: null,
    items: [], checks: [], answers: [], results: {}, onStage: null, stageOn: false, rooms: null, roomPlaces: {}, signals: null };
  var channel = null, poller = null, nudgeTimer = null, deferred = {}, drafts = {};
  var Q = window.QuestionView, askFields = null;  // the question bank (R4)

  function nameOf(id) { return S.me && (id === S.me.id || id === S.asMember) ? 'You' : (S.names[id] || 'Someone'); }

  function start(session) {
    S.me = session.user;
    show('loading');
    if (standalone) {
      return db.from('cohorts').select('id').eq('slug', standaloneSlug).maybeSingle().then(function (c) {
        if (c.error || !c.data) return fail('This session could not be opened. Open it again from your cohort’s session page.');
        S.room = { cohortId: c.data.id, groupId: null };
        return loadCohort(c.data.id);
      });
    }
    var info;
    try { info = side.getMeetingInfo(); } catch (e) { info = null; }
    Promise.resolve(info).then(function (m) {
      var code = A.meetingCode(m && m.meetingCode);
      if (!code) return fail('Meet did not say which call this is. Close the panel and open it again.');
      return findCohort(code);
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  // Only rows this person may read come back (the database's own rules),
  // so a teacher finds the cohorts they teach and a student their own.
  function findCohort(code, joined) {
    var like = '%' + code + '%';
    return Promise.all([
      db.from('sessions').select('id, cohort_id, meet_url').ilike('meet_url', like),
      db.from('groups').select('id, cohort_id, name, meet_url').ilike('meet_url', like),
      db.from('cohort_teachers').select('cohort_id').eq('user_id', S.me.id),
      db.from('cohorts').select('id').eq('details->>any_call', 'true'),
      db.from('call_runs').select('cohort_id, session_id').eq('code', code).gt('ends_at', new Date().toISOString()).maybeSingle()
    ]).then(function (res) {
      var bad = res.slice(0, 4).filter(function (r) { return r.error; })[0];
      if (bad) return fail('The panel could not look up this call: ' + bad.error.message);
      var room = A.findRoom(code, { sessions: res[0].data, groups: res[1].data, teaching: res[2].data.map(function (t) { return t.cohort_id; }),
        anyCall: res[3].data.map(function (c) { return c.id; }), run: res[4].error ? null : res[4].data });
      if (!room && !joined) {
        // The link is the way in (Ben, November 4, 2026: "If you have access
        // to the google meet link, you are a part of the cohort.").
        return db.rpc('join_call', { code: code }).then(function (j) {
          if (j.error) console.log('[addon] joining the call: ' + j.error.message);
          return findCohort(code, true);
        });
      }
      if (!room) return openRoom(code);
      S.room = room;
      return loadCohort(room.cohortId);
    });
  }

  // A leader can run any session of their cohort in a call (call_runs). Every
  // panel in the call watches which session that is and opens again when it
  // changes, once per change, so a refusal never becomes a loop.
  function reopenFor(code, key) {
    var mark = 'hs-call-run:' + code, seen = null;
    try { seen = JSON.parse(sessionStorage.getItem(mark) || 'null'); } catch (e) {}
    if (seen && seen.k === key) return;
    try { sessionStorage.setItem(mark, JSON.stringify({ k: key, t: Date.now() })); } catch (e) {}
    console.log('[addon] this call now runs ' + (key || 'its schedule') + '; opening again');
    location.reload();
  }
  function watchCallRun() {
    var code = S.room && S.room.code;
    if (standalone || !code || S.watchingRun) return;
    S.watchingRun = true;
    setInterval(function () {
      db.from('call_runs').select('session_id').eq('code', code).gt('ends_at', new Date().toISOString()).maybeSingle().then(function (r) {
        if (r.error) return;
        var key = (r.data && r.data.session_id) || '';
        if (key !== (S.callRun || '')) reopenFor(code, key);
      });
    }, 15000);
  }
  function runInCall(sessionId, said) {
    var code = (S.room && S.room.code) || openCode;
    return db.rpc('run_in_call', { code: code, session: sessionId }).then(function (r) {
      if (r.error) { if (said) said(r.error.message); return; }
      try { sessionStorage.removeItem('hs-call-run:' + code); } catch (e) {}
      location.reload();
    });
  }
  function stopCallRun(said) {
    var code = S.room && S.room.code;
    return db.rpc('stop_call_run', { code: code }).then(function (r) {
      if (r.error) { if (said) said(r.error.message); return; }
      try { sessionStorage.removeItem('hs-call-run:' + code); } catch (e) {}
      location.reload();
    });
  }
  // The sessions a signed-in leader could run here, from their open or running cohorts.
  function myCohortSessions() {
    if (!S.me || S.me.is_anonymous) return Promise.resolve([]);
    return db.from('cohort_teachers').select('cohort_id, cohorts(id, title, status, schedule)').eq('user_id', S.me.id).then(function (t) {
      var cohorts = (t.data || []).map(function (x) { return x.cohorts; }).filter(Boolean);
      if (!cohorts.length) return [];
      return db.from('sessions').select('id, cohort_id, number, title, starts_at').in('cohort_id', cohorts.map(function (c) { return c.id; })).order('number').then(function (s) {
        return cohorts.map(function (c) {
          return { id: c.id, title: c.title, sessions: (s.data || []).filter(function (x) { return x.cohort_id === c.id; }).map(function (x) { return { id: x.id, label: lib.sessionTitle(x, c) }; }) };
        }).filter(function (c) { return c.sessions.length; });
      });
    }, function () { return []; });
  }

  // Any other call is an open room (ADDON-DESIGN.md). Nobody needs an account
  // for it, and signing in only gives the room their name.
  var opened = null, openCode = null, openWatch = null;
  function openRoom(code) {
    openCode = code;
    // When a leader makes this call a cohort's, everyone here opens again into it.
    if (!openWatch && !standalone) openWatch = setInterval(function () {
      db.rpc('is_cohort_call', { code: code }).then(function (r) { if (!r.error && r.data === true) reopenFor(code, 'cohort'); });
    }, 15000);
    show('open');
    var meta = S.me && !S.me.is_anonymous ? S.me.user_metadata || {} : null;
    var gh = meta && S.me.app_metadata && S.me.app_metadata.provider === 'github' ? meta.user_name || '' : '';
    var who = { name: meta ? meta.full_name || meta.name || meta.user_name || '' : '', member: !!meta, github: gh };
    if (opened) { opened.person(who); myCohortSessions().then(function (l) { opened.cohorts(l); }); return; }
    root.classList.add('p2-panel');
    opened = window.OpenRoom.mount({ root: root, code: code, side: side, name: who.name, member: who.member, github: who.github, signIn: signedOut,
      runSession: function (id, said) { return runInCall(id, said); } });
    myCohortSessions().then(function (l) { opened.cohorts(l); });
  }

  function loadCohort(id) {
    return db.from('cohorts').select('*').eq('id', id).maybeSingle().then(function (c) {
      if (c.error || !c.data) return fail('This cohort could not be opened' + (c.error ? ': ' + c.error.message : '.'));
      var cohort = c.data;
      return Promise.all([
        db.from('sessions').select('*').eq('cohort_id', id).order('number'),
        db.from('enrollments').select('user_id, app_url, profiles(github_login, display_name)').eq('cohort_id', id).neq('status', 'left'),
        db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', id),
        db.from('groups').select('*, group_members(user_id)').eq('cohort_id', id).order('name'),
        db.from('call_guests').select('*').eq('cohort_id', id).order('joined_at', { ascending: false })
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) return fail('The session could not be loaded: ' + bad.error.message);
        var ss = res[0].data;
        if (!ss.length) return fail('This cohort has no sessions yet.');
        S.cohort = cohort;
        S.people = res[1].data;
        S.myApp = (S.people.filter(function (p) { return p.user_id === S.me.id; })[0] || {}).app_url || null;
        S.groups = res[3].data;
        S.teaching = res[2].data.some(function (t) { return t.user_id === S.me.id; });
        S.teacherIds = res[2].data.map(function (t) { return t.user_id; });
        S.people.concat(res[2].data).forEach(function (p) { if (p.profiles) S.names[p.user_id] = p.profiles.display_name || p.profiles.github_login; });
        useGuests(res[4].data);
        var t = lib.currentAndNext(ss, new Date(), cohort.session_minutes);
        var named = standalone && standaloneNumber != null ? ss.filter(function (x) { return x.number === standaloneNumber; })[0] : null;
        // A session a leader chose for this call runs instead of the schedule's.
        var chosen = S.room && S.room.sessionId ? ss.filter(function (x) { return x.id === S.room.sessionId; })[0] : null;
        S.sessions = ss;
        S.callRun = chosen ? chosen.id : null;
        S.session = named || chosen || (t.live ? t.next : (t.next || t.current));
        S.prev = ss.filter(function (x) { return x.number === S.session.number - 1; })[0] || null;
        S.parts = lib.agenda(cohort.session_minutes);
        var since = S.prev && S.prev.starts_at ? S.prev.starts_at : new Date(Date.now() - 8 * 86400000).toISOString();
        // Leaders' notes for each part, which only leaders can read (found
        // in Week 1: they were written on the session page and never reached
        // the panel, so a stage cut to its main points left the leader
        // without the rest).
        var notes = S.teaching ? db.from('scene_notes').select('scene_id, body').eq('cohort_id', id) : Promise.resolve({ data: [] });
        var decks = S.teaching ? db.from('scene_decks').select('scene_id, body').eq('cohort_id', id) : Promise.resolve({ data: [] });
        return Promise.all([
          db.from('shares').select('*').eq('cohort_id', id).eq('kind', 'bring-back').gte('created_at', since).order('created_at', { ascending: false }),
          notes, decks
        ]).then(function (got) {
          var sh = got[0];
          S.decks = {};
          (got[2].data || []).forEach(function (n) { S.decks[n.scene_id] = n.body; });
          if (got[1].error) console.log('[addon] leader notes did not load: ' + got[1].error.message);
          S.notes = {};
          (got[1].data || []).forEach(function (n) { S.notes[n.scene_id] = n.body; });
          S.brought = sh.data || [];
          drawFrame();
          watchCallRun();
          startShow();
          startRooms();
          startSignals(res[2].data);
          startClass();
          // Where this panel is, so the leader sees who reached their room.
          if (S.classChannel) S.classChannel.setPresence({ room: S.room.groupId || null });
          // Agree, Not sure, and Disagree wait a press away, so the bar stays small.
          if (S.newPanel) { var more = root.querySelector('.react-more'), st = root.querySelector('.stance-row'); if (more && st) more.insertBefore(st, more.children[1] || null); }
          startBreakouts();
          // Reactions and stance are for the people in the session, not
          // the leader running it.
          if (S.teaching) $('[data-react]').hidden = true;
          drawCode();
          startChat();
          startRecognition();
          drawGuest();
          drawPart(true);
          show('ready');
          return refreshLive().then(listen);
        });
      });
    });
  }

  // ------------------------------------------------------------------
  // The run of show (R1). Each part of the panel is drawn by its own code
  // below and handed to ShowView, which puts it in the current scene or
  // under "Any time in the show". Counts on a part say what is waiting.
  // ------------------------------------------------------------------

  function startShow() {
    S.list = S.parts;
    // The redesigned panel (ADDON-DESIGN.md), a cohort at a time until it is
    // proven. Everything below it is the same parts in a new frame.
    S.newPanel = !!window.PanelFrame && (S.cohort.details || {}).panel !== 'old' && query.get('panel') !== 'old';
    if (S.newPanel) startFrame();
    S.show = window.ShowView.mount({
      mount: $('[data-show]'), parts: S.list, teaching: S.teaching,
      nowBox: S.newPanel ? S.frame.pane('now') : null,
      anyBox: S.newPanel ? S.frameTools : null,
      notes: function (key) { return S.newPanel ? null : (S.notes || {})[key] || null; },
      deck: function (key) { return (S.decks || {})[key] || null; },
      editSlides: function (key) {
        // The real editor, on the leader's own stage; a window if the stage is closed.
        if (!S.stageOn) return window.open('/session/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number + '&t=plan&part=' + encodeURIComponent(key), 'hs-slides', 'popup,width=1280,height=820');
        S.studioKey = key; S.studioHeld = null;
        drawAsks(); sendStage();
      },
      // What does not apply to this cohort stays out of sight: rooms
      // without groups, a board without a board part (JOURNEYS.md).
      unavailable: function () {
        var off = [];
        off.push('cue-talk', 'cue-rooms');
        if (!S.groups.length) off.push('rooms', 'cue-rooms', 'brought');
        var list = S.list || S.parts || [];
        if (!list.some(function (x) { return x.kind === 'design' || x.key === 'prompt'; })) off.push('design');
        return off;
      },
      stuck: window.CurriculumPagesLib && S.session && S.cohort.schedule !== 'custom' ? window.CurriculumPagesLib.stuckFor(S.session.number) : null,
      onPick: function (key) {
        if (shared()) { S.run.go(key).then(afterMove); return; }
        S.chosenPart = key; S.timerEnds = null; drawPart(true);
      },
      run: S.teaching ? {
        onStep: function (d) { if (shared()) S.run.step(d).then(afterMove); else stepLocal(d); },
        // The database runs a clock only on a current part, so a clock
        // started before the show has begun begins it on the part shown
        // (found in a real Meet call: Start the clock did nothing).
        onClock: function (on) {
          if (!shared()) { $('[data-timer]').click(); return; }
          if (on && !S.run.current()) {
            var p = partNow() || (S.list || S.parts || [])[0];
            if (p) S.run.go(p.key).then(function () { return S.run.clock(true); });
            return;
          }
          // Stop, then Start, carries on from where it stopped (found in
          // the live Meet test: Start went back to the full time).
          var part = partNow();
          if (!on) {
            var left = A.timeLeft(endsNow(), Date.now());
            if (part && left) S.paused[part.key] = left;
            S.run.clock(false);
            return;
          }
          var kept = part && S.paused[part.key];
          if (part) delete S.paused[part.key];
          S.run.clock(true, kept ? new Date(Date.now() - (part.minutes * 60 - kept) * 1000) : null);
        },
        onFollow: function () { setPin(null); },
        canEdit: function (key) {
          if (!S.run) return null;
          var s = sceneOf(key);
          if (s && s.own) return 'own';
          return S.run.canOwn() ? 'parts' : null;
        },
        onDraft: function (key, fields) { S.draft = fields ? { key: key, fields: fields } : null; sendStage(); },
        // A question part's words, changed while its question is open,
        // change the question everyone is answering too (found in the live
        // Meet test: the stage took the new wording, learners kept the old).
        onSave: function (key, fields) {
          var before = sceneOf(key), asked = null;
          if (before && before.own && before.kind === 'question') {
            var q = L.fromScene(before.config);
            asked = q ? (S.checks || []).filter(function (k) { return k.state === 'open' && k.prompt === q.prompt; })[0] : null;
          }
          return S.run.save(key, fields).then(function (problem) {
            if (!problem && fields && fields.slides != null) S.decks[key] = fields.slides;
            var p = fields && typeof fields.prompt === 'string' ? fields.prompt.trim() : '';
            if (!problem && asked && p && p !== asked.prompt) changeCheck(asked, { prompt: p });
            // The plan redraws on save; keep the part just edited in view.
            if (!problem) setTimeout(function () { var it = root.querySelector('[data-show] [aria-current="step"]'); if (it && it.scrollIntoView) it.scrollIntoView({ block: 'start' }); }, 50);
            return problem;
          });
        },
        onStartOwn: function () { return S.run.startOwn(); }
      } : {}
    });
    // The show everyone follows (R3): the session's own run of show if it
    // has one, and where the teacher has moved it.
    if (window.ShowRun) S.run = window.ShowRun.start({ db: db, cohort: S.cohort, session: S.session, parts: S.parts, teaching: S.teaching, onChange: showChanged });
    S.show.slot('clock', $('[data-part-clock]'));
    S.show.slot('lead', $('[data-now-lead]'));
    S.show.slot('wings', $('[data-wings]'));
    S.show.slot('questions', $('[data-questions]'));
    if (A.boardLinks(S.cohort, S.session, S.room.groupId)) S.show.slot('design', $('[data-board]'));
    S.show.slot('rooms', $('[data-rooms]'));
    if (S.cohort.github_repo && S.cohort.github_team && 'discussion_number' in S.session) {
      $('[data-thread]').hidden = false;
      S.show.slot('thread', $('[data-thread]'));
      drawThreadActivity();
    }
    drawBoardActivity();
  }

  // ------------------------------------------------------------------
  // The class channel (R10, R11): reactions, stance, and who is here.
  // What it hears goes to this person's own main stage when it is open.
  // ------------------------------------------------------------------

  // What this person did in the session, kept in session_events: the
  // reactions and stances they sent, and a row a minute while the add-on is
  // open. Sent in small batches, and a failed write never touches the call.
  function startKeeping() {
    if (S.keeping || !S.session) return;
    var waiting = [];
    function row(kind, detail) {
      waiting.push({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: S.me.id, kind: kind, detail: detail || null });
    }
    function send() {
      if (!waiting.length) return;
      var rows = waiting; waiting = [];
      db.from('session_events').insert(rows).then(function (r) {
        if (r.error) console.log('[addon] session events not kept: ' + r.error.message);
      });
    }
    S.keeping = row;
    // A row names the room, so time in a breakout is kept even though
    // rooms are not recorded and so have no talk time.
    function here() { row('here', S.room && S.room.groupId ? 'room:' + S.room.groupId : null); send(); }
    here();
    setInterval(here, 60000);
    setInterval(send, 10000);
    window.addEventListener('pagehide', send);
  }

  function startClass() {
    if (!window.ClassChannel || S.classChannel) return;
    startKeeping();
    S.classChannel = window.ClassChannel.start({
      db: db, auth: current, cohort: S.cohort, me: S.me, name: S.names[S.me.id] || null,
      log: function (kind, detail) { if (S.keeping) S.keeping(kind, detail); },
      mount: $('[data-react]'),
      onStage: function (payload) {
        if (!S.stageOn || !side) return;
        try { Promise.resolve(side.notifyMainStage(payload)).catch(function () {}); } catch (e) {}
      },
      onPresence: function (state) {
        S.presence = state;
        var members = (S.teacherIds || []).concat(S.people.map(function (p) { return p.user_id; }));
        // A guest arriving, or a guest saying their name.
        if (S.teaching && Object.keys(state || {}).some(function (id) { return members.indexOf(id) < 0; })) loadGuests();
        drawRoster();
        if (S.breakouts) S.breakouts.draw();
        drawCode();
        if (S.onStage && S.onStage.kind === 'path') sendStage();
      }
    });
    S.classChannel.onNudge('guests', function () { if (S.isGuest) { loadGuests(); refreshLive(); } });
  }

  // Recognition for a skill shown in class (R16). A teacher names the
  // skill and the moment; the student sees it here at once (the class
  // channel nudges their panel to read again) and on their class page.
  // No one else sees it, and nothing counts or compares.
  function startRecognition() {
    var RL = window.RecognitionLib, box = $('[data-recognize]');
    if (!RL || !box || S.recognizing) return;
    S.recognizing = true;
    box.hidden = false;
    if (S.teaching) {
      var d = el('details', 'recognize-give');
      d.appendChild(el('summary', null, 'Recognize someone'));
      d.appendChild(el('p', 'small', 'Name a skill someone just showed, and when. Only they and the cohort’s leaders see it.'));
      var who = el('select'); who.setAttribute('aria-label', 'Who showed it');
      who.appendChild(new Option('Who showed it?', ''));
      S.people.map(function (p) { return { id: p.user_id, name: S.names[p.user_id] || 'Someone' }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (p) { who.appendChild(new Option(p.name, p.id)); });
      var what = el('select'); what.setAttribute('aria-label', 'The skill');
      what.appendChild(new Option('Which skill?', ''));
      RL.SKILLS.forEach(function (s) { what.appendChild(new Option(s.label, s.key)); });
      what.appendChild(new Option('In my own words…', 'own'));
      var own = el('input'); own.type = 'text'; own.maxLength = 120; own.hidden = true; own.placeholder = 'The skill, in your words';
      own.setAttribute('aria-label', 'The skill, in your own words');
      what.addEventListener('change', function () { own.hidden = what.value !== 'own'; });
      var moment = el('input'); moment.type = 'text'; moment.maxLength = 300; moment.setAttribute('aria-label', 'The moment');
      d.addEventListener('toggle', function () { if (d.open && !moment.value) { var part = partNow(); moment.value = RL.momentFor(part && part.name, S.session.number); } });
      var status = el('p', 'small'); status.setAttribute('role', 'status');
      var give = button('Give it', 'btn-primary', function () {
        var r = RL.row({ cohortId: S.cohort.id, sessionId: S.session.id, userId: who.value, key: what.value === 'own' ? null : what.value, ownWords: own.value, moment: moment.value });
        if (r.why) { status.textContent = r.why; return; }
        give.disabled = true;
        db.from('recognitions').insert(r.row).then(function (res) {
          give.disabled = false;
          if (res.error) { status.textContent = 'Not given: ' + res.error.message + '.'; return; }
          status.textContent = 'Given to ' + (S.names[who.value] || 'them') + '. Only they and the cohort’s leaders see it.';
          if (S.classChannel) S.classChannel.nudge('recognition');
          who.value = ''; what.value = ''; own.value = ''; own.hidden = true; moment.value = '';
        });
      });
      [who, what, own, moment, give, status].forEach(function (n) { d.appendChild(n); });
      box.appendChild(d);
      return;
    }
    var mineBox = el('div', 'recognize-mine'); box.appendChild(mineBox);
    var seen = null;
    function readMine() {
      db.from('recognitions').select('id, skill, skill_key, moment, given_by, given_at, session_id').eq('cohort_id', S.cohort.id).eq('user_id', S.me.id).then(function (r) {
        if (r.error) return;
        var today = (r.data || []).filter(function (x) { return x.session_id === S.session.id; });
        var lines = RL.lines(today, function (id) { return S.names[id] || 'Your leader'; });
        mineBox.replaceChildren();
        box.hidden = !lines.length;
        if (!lines.length) return;
        mineBox.appendChild(el('p', 'kicker', 'Recognized in class today'));
        lines.forEach(function (l) {
          var card = el('div', 'recognize-card' + (seen && seen.indexOf(l.id) < 0 ? ' is-new' : ''));
          card.appendChild(el('p', 'recognize-skill', l.skill));
          card.appendChild(el('p', 'small', (l.moment ? l.moment + '. ' : '') + 'From ' + l.by + '.'));
          mineBox.appendChild(card);
        });
        seen = lines.map(function (l) { return l.id; });
      });
    }
    readMine();
    if (S.classChannel) S.classChannel.onNudge('recognition', readMine);
  }

  // The class chat (R15): in GitHub, posted by each person as themselves.
  function startChat() {
    if (S.chat || !window.ChatView || !S.cohort.github_repo) return;
    S.chat = window.ChatView.start({
      db: db, mount: $('[data-chat]'), cohort: S.cohort, session: S.session, me: S.me, teaching: S.teaching, channel: S.classChannel,
      onPoll: function (prompt, choices) {
        return db.from('live_checks').insert({
          cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, prompt: prompt, choices: choices, kind: 'choice', show_tally: true
        }).then(function (r) { if (r.error) return r.error.message; refreshLive(); return null; });
      }
    });
  }

  // Code everyone can run (R14): the teacher's program rides in their
  // presence on the class channel; every panel shows its own copy, and
  // passes it to its own main stage while the teacher has it there.
  function drawCode() {
    var CL = window.CodeLib;
    if (!CL || !window.CodeRunner) return;
    if (!S.code) S.code = window.CodeRunner.start({
      mount: $('[data-code]'), teaching: S.teaching,
      onSend: function (m) { if (S.classChannel) S.classChannel.setPresence({ code: m }); }
    });
    var shared = CL.shared(S.presence || {}, S.teacherIds || []);
    S.code.show(shared);
    var msg = CL.stageMessage(shared);
    if (msg !== S.codeStageSent && S.stageOn && side) {
      S.codeStageSent = msg;
      try { Promise.resolve(side.notifyMainStage(msg)).catch(function () {}); } catch (e) {}
    }
  }

  function rosterNow() {
    var RL = window.RosterLib;
    if (!RL) return null;
    var people = S.people.map(function (p) { return { user_id: p.user_id, name: S.names[p.user_id] || 'Someone' }; });
    // A guest tied to a member is that member, here.
    var here = Object.assign({}, S.presence || {});
    (S.guests || []).forEach(function (g) { if (g.member_id && here[g.user_id]) here[g.member_id] = here[g.user_id]; });
    return RL.roster(people, here, S.answers, RL.askingNow(S.checks, S.onStage));
  }

  // ------------------------------------------------------------------
  // Guests: someone in the call who is not signed in as a member. They are
  // in the session like anyone else; a leader can say which member they
  // are, and their answers become that member's.
  // ------------------------------------------------------------------

  function useGuests(rows) {
    S.guests = rows || [];
    S.guests.forEach(function (g) { S.names[g.user_id] = g.name || 'A guest'; });
    S.isGuest = !S.teaching && !S.people.some(function (p) { return p.user_id === S.me.id; });
    var tied = S.guests.filter(function (g) { return g.user_id === S.me.id && g.member_id; })[0];
    S.asMember = tied ? tied.member_id : null;
    // Someone tied to a member is that member here: their name, their app,
    // their place in the queue (Ben, November 6, 2026).
    var self = S.people.filter(function (p) { return p.user_id === who(); })[0];
    if (self) S.myApp = self.app_url || null;
    if (tied && S.classChannel && S.names[tied.member_id]) S.classChannel.rename(S.names[tied.member_id]);
  }
  function who() { return S.asMember || S.me.id; }
  function loadGuests() {
    return db.from('call_guests').select('*').eq('cohort_id', S.cohort.id).order('joined_at', { ascending: false }).then(function (r) {
      if (r.error) return;
      useGuests(r.data);
      drawRoster();
      drawGuest();
      if (S.breakouts) S.breakouts.draw();
    });
  }
  function tieGuest(guest, member, status) {
    status.textContent = 'Saving…';
    return db.rpc('tie_call_guest', { c: S.cohort.id, guest: guest, member: member }).then(function (r) {
      status.textContent = r.error ? 'Not saved: ' + r.error.message : '';
      if (!r.error && S.classChannel) S.classChannel.nudge('guests');
      return Promise.all([loadGuests(), refreshLive()]);
    });
  }
  function drawGuestRows(d) {
    var present = S.presence || {};
    var rows = (S.guests || []).filter(function (g) { return !g.member_id || present[g.user_id]; });
    if (!rows.length) return;
    d.appendChild(el('p', 'kicker', 'Guests'));
    var ul = el('ul', 'roster-list');
    rows.forEach(function (g) {
      var li = el('li', 'roster-guest');
      li.appendChild(el('span', 'roster-name', g.name || 'A guest'));
      var sel = el('select');
      sel.setAttribute('aria-label', 'Which member is ' + (g.name || 'this guest'));
      sel.appendChild(new Option('Who is this?', ''));
      S.people.forEach(function (p) { sel.appendChild(new Option(S.names[p.user_id] || 'Someone', p.user_id)); });
      sel.value = g.member_id || '';
      var status = el('span', 'small'); status.setAttribute('role', 'status');
      sel.addEventListener('change', function () { tieGuest(g.user_id, sel.value || null, status); });
      li.appendChild(sel);
      li.appendChild(status);
      ul.appendChild(li);
    });
    d.appendChild(ul);
  }
  function drawGuest() {
    var box = $('[data-guest]');
    var mine = (S.guests || []).filter(function (g) { return g.user_id === S.me.id; })[0] || {};
    // It rides in the bar that stays on screen, because the panel follows the
    // session and a name field at the top scrolls away (found in a real
    // call). A guest who has given a name has no more need of it.
    $('[data-guest-signin]').parentNode.hidden = !S.isGuest || !!S.asMember;
    box.hidden = !S.isGuest || (!!mine.name && !mine.member_id);
    if (box.hidden) return;
    var bar = $('[data-react]');
    if (box.parentNode !== bar) bar.insertBefore(box, bar.firstChild);
    var name = $('[data-guest-name]');
    if (document.activeElement !== name) name.value = mine.name || '';
    $('[data-guest-form]').hidden = !!mine.member_id;
    var line = $('[data-guest-line]');
    line.hidden = !mine.member_id;
    line.textContent = mine.member_id ? 'You are here as ' + (S.names[mine.member_id] || 'a member') + '.' : '';
    if (mine.member_id) $('[data-guest-status]').textContent = '';
  }
  $('[data-guest-form]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var status = $('[data-guest-status]');
    db.rpc('join_call', { code: S.room.code, guest_name: $('[data-guest-name]').value }).then(function (r) {
      status.textContent = r.error ? 'Not saved: ' + r.error.message : 'Saved.';
      if (!r.error && S.classChannel) S.classChannel.setPresence({ guest_name: $('[data-guest-name]').value });
      loadGuests();
    });
  });
  // Meet's frame cannot borrow the site's sign-in (measured in a real call:
  // the Storage Access request is refused), so the small window does it: a
  // person already signed in on the site comes back at once, with one press.
  $('[data-guest-signin]').addEventListener('click', function () { $('[data-popup]').click(); });

  // The teacher's roster: one line, opened for names. It is drawn from
  // presence while the call runs, and it never writes anything down.
  function drawRoster() {
    var box = $('[data-roster]'), RL = window.RosterLib;
    if (!S.teaching || !RL || !box) return;
    var r = rosterNow(), asking = RL.askingNow(S.checks, S.onStage);
    box.hidden = false;
    var open = box.querySelector('details') && box.querySelector('details').open;
    box.replaceChildren();
    var d = el('details'); d.open = !!open || !!S.newPanel;
    var guests = (S.guests || []).filter(function (g) { return !g.member_id && (S.presence || {})[g.user_id]; }).length;
    d.appendChild(el('summary', null, RL.summary(r, asking).replace(/\.$/, '') + (guests ? ', ' + guests + (guests === 1 ? ' guest' : ' guests') : '') + '.'));
    function list(title, rows, missing) {
      if (!rows.length) return;
      d.appendChild(el('p', 'kicker', title));
      var ul = el('ul', 'roster-list');
      rows.forEach(function (x) {
        var li = el('li', missing ? 'is-missing' : null);
        li.appendChild(el('span', 'roster-name', x.name));
        if (x.stage) li.appendChild(el('span', 'roster-stage', RL.STAGE_SHORT[x.stage]));
        if (asking) li.appendChild(el('span', x.answered ? 'roster-answered' : 'roster-waiting', x.answered ? 'Answered' : 'Not yet'));
        ul.appendChild(li);
      });
      d.appendChild(ul);
    }
    list('Here now', r.here, false);
    list('Not here yet', r.missing, true);
    drawGuestRows(d);
    if (!S.newPanel) {
      var acts = el('div', 'actions');
      acts.appendChild(stageToggle('path', undefined, 'Put the path on the main stage', 'Take it off the main stage'));
      d.appendChild(acts);
    }
    box.appendChild(d);
  }

  function drawCounts() {
    if (!S.show) return;
    S.show.count('wings', L.queue(S.items).waiting.filter(function (x) { return !(S.onStage && S.onStage.kind === 'item' && S.onStage.id === x.id); }).length);
    S.show.count('questions', S.checks.filter(function (k) { return k.state === 'open'; }).length);
    S.show.count('rooms', S.teaching ? Object.keys(S.roomPlaces).filter(function (k) { return S.roomPlaces[k].asking; }).length : 0);
  }

  // ------------------------------------------------------------------
  // What everyone sees (C1, H4): the same view and controls as /live/
  // (assets/signals.js), mounted in this panel.
  // ------------------------------------------------------------------

  function startSignals(teachers) {
    if (S.signals || !window.LiveSignals) return;
    var who = {};
    S.people.concat(teachers).forEach(function (p) { who[p.user_id] = S.names[p.user_id] || 'Someone'; });
    var people = Object.keys(who).map(function (id) { return { id: id, name: id === S.me.id ? who[id] + ' (you)' : who[id] }; })
      .sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    var show = S.parts.filter(function (p) { return p.key === 'show'; })[0];
    S.signals = window.LiveSignals.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups,
      inRoom: function () { return !!S.room.groupId; },
      memberId: function () { return S.asMember || S.me.id; },
      // A card a leader shows goes on the main stage too, the one place
      // the whole call is looking (found in the loop's live Meet test: it
      // reached learners' panels and nowhere else).
      onChange: function (st) {
        breakoutsChanged(st);
        var c = st && st.card ? { id: st.card.id, body: st.card.body, endsAt: st.card.ends_at ? Date.parse(st.card.ends_at) : null } : null;
        var rec = !!(st && st.recording);
        if (JSON.stringify(c) === JSON.stringify(S.card || null) && rec === !!S.recording) return;
        S.card = c; S.recording = rec; sendStage();
      },
      nameOf: nameOf, people: people, roomMinutes: function () { var r = roomsScene(); return r && r.minutes ? r.minutes : (show ? show.minutes : 25); },
      mounts: {
        recording: $('[data-sig-recording]'), where: S.teaching && !S.room.groupId && !standalone ? null : $('[data-sig-where]'), card: $('[data-sig-card]'), stage: $('[data-sig-stage]'),
        controls: S.teaching ? root.querySelector('[data-state="ready"]') : null
      }
    });
    // Each cue group sits in the scene it belongs to (ShowViewLib.SLOTS).
    // Inside Meet the card goes on the main stage itself, so no card page.
    if (S.teaching) S.show.cues($('[data-sig-controls-body]'), { cardHref: standalone ? '/card/?c=' + encodeURIComponent(S.cohort.slug) : null });
  }

  // ------------------------------------------------------------------
  // The drawing board (C4, H4). It needs the hub's sign-in, which Meet
  // keeps apart from this panel and from the main stage, so it opens in
  // its own tab; the teacher presents that tab's stage view.
  // ------------------------------------------------------------------

  function drawBoardActivity() {
    var box = $('[data-board]');
    var part = partNow();
    var links = A.boardLinks(S.cohort, S.session, S.room.groupId, part && part.kind === 'design' ? (part.config || {}).template : null);
    if (!box || !links) return;
    box.replaceChildren();
    // The main stage already shows the board during its part, so the panel
    // offers one way in, in the words the plan uses.
    box.appendChild(el('p', 'small', links.group ? 'Your group’s own board, kept with the session.' : 'The cohort’s board for this session, kept with it.'));
    var acts = el('div', 'actions');
    var open = newTab(el('a', 'btn-primary', 'Open the board')); open.href = links.board; acts.appendChild(open);
    box.appendChild(acts);
  }

  // ------------------------------------------------------------------
  // This session's thread (C5). Meet keeps the panel's storage apart and
  // the sign-in hands over only the hub's tokens, never a GitHub token,
  // so the panel links to the thread instead of reading it; /live/ reads
  // and posts to it.
  // ------------------------------------------------------------------

  function drawThreadActivity() {
    var box = $('[data-thread]');
    if (!box || !S.session) return;
    db.from('sessions').select('discussion_number').eq('id', S.session.id).maybeSingle().then(function (r) {
      var n = r.data && r.data.discussion_number;
      var T = window.SessionThreadLib;
      var url = n && T ? T.threadUrl(S.cohort.github_repo, n) : null;
      box.replaceChildren();
      if (!url) {
        box.appendChild(el('p', 'small', S.teaching
          ? 'This session has no thread yet. Open it on the session page, and it will be linked here for everyone.'
          : 'Your leader has not opened this session’s thread yet.'));
      } else {
        box.appendChild(el('p', 'small', 'Links, questions for later, and what you are stuck on go here, and they stay on GitHub under your own name.'));
        var a = el('a', 'btn-primary', 'Open the thread on GitHub'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
        box.appendChild(el('p')).appendChild(a);
      }
      var live = el('a', null, 'Read and post on the session page'); live.href = '/session/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number; live.target = '_blank'; live.rel = 'noopener';
      box.appendChild(el('p', 'small')).appendChild(live);
    });
  }

  function drawFrame() {
    $('[data-cohort-title]').textContent = S.cohort.title;
    var group = S.room.groupId ? S.groups.filter(function (g) { return g.id === S.room.groupId; })[0] : null;
    $('[data-where]').textContent = (window.CohortLib ? window.CohortLib.sessionName(S.session.number, S.cohort) : 'Week ' + S.session.number) + (group ? ', ' + (group.breakout ? group.name : group.name + '’s room') : S.groups.length ? ', the main room' : '') + (S.teaching ? '. You are leading.' : '.') + (S.room.ambiguous ? ' Another cohort uses this call too.' : '');
    var full = $('[data-full-link]'); full.href = '/session/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number;
    // Outside Meet, this page already is the browser tab.
    full.hidden = standalone;
    if (standalone) document.title = (window.CohortLib ? window.CohortLib.sessionName(S.session.number, S.cohort) : 'Week ' + S.session.number) + ', ' + S.cohort.title + ' | Human Shaped';
    $('[data-fallback-link]').href = '/addon/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number;
    $('[data-open-stage]').hidden = !S.teaching || standalone;
    $('[data-close-stage]').hidden = true;
    stageButtons(S.stageOn);
    // The main stage is a leader's first move in a call, so its button sits
    // at the top of the panel, not below every part.
    if (S.teaching && !standalone) {
      var head = root.querySelector('.addon-head');
      head.appendChild($('[data-open-stage]'));
      head.appendChild($('[data-close-stage]'));
      head.appendChild($('[data-stage-status]'));
      // The welcome is a stage control too, not a part of the plan (found
      // in the live Meet test: it sat alone in an empty box under each part).
      var wt = $('[data-welcome-toggle]'); wt.classList.add('small');
      head.appendChild(wt);
    }
    $('[data-part-controls]').hidden = !S.teaching;
    $('[data-ask-wrap]').hidden = !S.teaching;
    if (S.teaching) startAsking();
  }

  // ------------------------------------------------------------------
  // The session now
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Running the show (R3)
  // ------------------------------------------------------------------

  var V = window.ShowViewLib, SL = window.ShowLib;
  function shared() { return !!(S.run && S.run.shared); }
  function sceneOf(key) { return (S.list || []).filter(function (s) { return s.key === key; })[0] || null; }

  // The scene happening now: where the teacher moved the show, or, without
  // the shared show, the one the clock says (as before R3).
  function partNow() {
    // With the shared show, nothing is on until a leader starts it, even
    // when the schedule says a later part (found in the live Meet test:
    // parts never run showed as done).
    if (shared()) return S.run.current() ? sceneOf(S.run.current()) : null;
    return lib.partNow(S.list || S.parts, S.session.starts_at, new Date(), S.chosenPart);
  }

  // When the current scene's clock runs out: the show's own clock, or the
  // panel's (before R3).
  function endsNow() {
    if (shared() && S.run.state()) return V.endsAt(S.run.state(), partNow());
    return S.timerEnds;
  }

  function showChanged() {
    if (!S.show || !S.run) return;
    var list = V.scenes(S.run.list());
    var changed = JSON.stringify(list) !== JSON.stringify(S.list);
    S.list = list;
    if (shared()) { var was = JSON.stringify(S.onStage); S.onStage = V.pinOf(S.run.state()); if (JSON.stringify(S.onStage) !== was) loadStageDetail(); }
    $('[data-timer]').hidden = shared();
    $('[data-next-part]').hidden = shared();
    if (changed) { S.drawnPart = undefined; S.show.setScenes(S.list); }
    drawPart(true);
    drawQueue(); drawChecks();
    if (S.checks) drawSceneQuestion();
    drawBoardActivity();
    if (S.rooms && S.rooms.setPlan) S.rooms.setPlan({ turn: L.roomTurn(roomsScene(), 3), prompt: roomsPrompt() });
    drawPartTools();
    if (S.breakouts) S.breakouts.draw();
  }

  // Back and next without the show (before R3): the panel's own place.
  function stepLocal(d) {
    var key = V.step(S.list || S.parts, (partNow() || {}).key, d);
    if (!key) return;
    var s = sceneOf(key);
    S.chosenPart = key;
    S.timerEnds = s ? Date.now() + s.minutes * 60000 : null;
    drawPart(true);
  }

  // The clock and what the main stage shows instead, on the current scene.
  function drawRunInfo() {
    if (!S.show || !S.show.tick) return;
    var left = A.timeLeft(endsNow(), Date.now());
    S.show.tick({ left: V.leftText(left), clockOn: left != null, pinned: pinnedText(), slide: slideInfo() });
    if (S.newPanel) drawFrameNow(left);
  }
  // ------------------------------------------------------------------
  // The redesigned panel's frame (ADDON-DESIGN.md).
  // ------------------------------------------------------------------

  function startFrame() {
    S.frame = window.PanelFrame.mount({ root: root, teaching: S.teaching });
    var F = S.frame, mine = S.teaching ? 'tools' : 'mine';
    S.frameTools = el('div', 'p2-group p2-toolset');
    root.querySelector('.addon-head').hidden = true;
    // Now: where to go and what is said to everyone, then the part's own needs.
    S.nowNotes = el('section', 'p2-notes');
    S.nowNotes.setAttribute('aria-label', 'Your notes');
    S.nowWhat = el('p', 'p2-what');
    var now = F.pane('now');
    ['[data-sig-recording]', '[data-sig-where]', '[data-sig-card]', '[data-sig-stage]'].forEach(function (s) { now.appendChild($(s)); });
    now.appendChild(S.nowWhat);
    if (S.teaching) now.appendChild(S.nowNotes);
    S.partTools = el('section', 'p2-group p2-part-tools'); S.partTools.hidden = true;
    S.partTools.setAttribute('aria-label', 'For this part');
    now.appendChild(S.partTools);
    // Plan: the parts, one line each.
    if (S.teaching) F.put('plan', $('[data-show]')); else $('[data-show]').hidden = true;
    if (S.teaching && !standalone && S.room && S.room.code) F.pane('plan').insertBefore(runPick(), F.pane('plan').firstChild);
    // Tools and People, for a leader; Mine, for a learner.
    if (S.teaching) {
      var stage = el('section', 'p2-group');
      var acts = el('div', 'actions');
      ['[data-open-stage]', '[data-close-stage]', '[data-welcome-toggle]'].forEach(function (s) { acts.appendChild($(s)); });
      stage.appendChild(acts);
      stage.appendChild($('[data-stage-status]'));
      F.put('tools', stage);
      F.put('tools', $('[data-ask-wrap]'));
      F.put('tools', $('[data-breakouts]'));
      S.appsBox = el('div', 'p2-apps'); F.put('tools', S.appsBox);
      S.boardPin = el('div', 'actions'); stage.appendChild(S.boardPin);
      S.nowAsks = el('div', 'p2-asks'); S.nowAsks.hidden = true; F.pane('now').insertBefore(S.nowAsks, F.pane('now').firstChild);
      F.put('tools', S.frameTools);
      S.stageTools = stage; S.askTool = $('[data-ask-wrap]'); S.breakTool = $('[data-breakouts]');
      S.tiles = el('div', 'p2-tiles');
      S.toolBack = el('div', 'p2-toolback');
      S.toolBack.appendChild(button('All tools', 'btn-secondary small', closeTool));
      S.toolBack.appendChild(el('span', 'p2-toolname'));
      F.pane('tools').insertBefore(S.toolBack, F.pane('tools').firstChild);
      F.pane('tools').insertBefore(S.tiles, F.pane('tools').firstChild);
      // Only the list of tools is watched, never the tiles themselves: drawing
      // them would wake this again, for ever (it froze the panel, November 6, 2026).
      var tilesSoon = null;
      new MutationObserver(function () { clearTimeout(tilesSoon); tilesSoon = setTimeout(drawTiles, 50); }).observe(S.frameTools, { childList: true, attributes: true, attributeFilter: ['hidden'], subtree: true });
      setTimeout(function () { drawTiles(); drawBoardPin(); }, 0);
      F.put('people', $('[data-roster]'));
      F.put('people', $('[data-recognize]'));
    } else {
      S.mineApp = el('div', 'p2-myapp'); F.put('mine', S.mineApp);
      S.mineAsk = el('div', 'p2-mine-ask'); F.put('mine', S.mineAsk);
      F.put('mine', S.frameTools);
      F.put('mine', $('[data-guest-signin]').parentNode);
      F.put('mine', $('[data-recognize]'));
    }
    root.querySelector('.addon-more').hidden = true;
    F.put(mine, root.querySelector('.addon-foot'));
    // The bar that stays: reactions and a guest's name stay with a learner.
    F.low.appendChild($('[data-react]'));
    F.on(function () { nextMove(); }, function () { if (S.run) S.run.step(-1).then(afterMove); });
  }
  function nextStep() {
    var part = partNow(), info = slideInfo();
    if (!S.teaching) return null;
    if (!S.stageOn && !standalone) return { label: 'Open the main stage', go: 'stage' };
    if (!part) return { label: 'Start the session', go: 'start' };
    if (info && info.next !== 'Next part') return { label: info.next, go: 'step' };
    var list = S.list || [], at = list.indexOf(part), after = list[at + 1];
    return after ? { label: 'Next: ' + after.name, go: 'step' } : { label: 'Last part', disabled: true };
  }
  function nextMove() {
    var n = nextStep();
    if (!n || n.disabled) return;
    if (n.go === 'stage') return $('[data-open-stage]').click();
    if (n.go === 'start') return $('[data-start-session]').click();
    if (S.run) S.run.step(1).then(afterMove);
  }
  // Which session this call runs: the schedule's, or any other the leader picks
  // (call_runs), for someone who missed it.
  function runPick() {
    var box = el('section', 'p2-group p2-run');
    var head = el('p', 'p2-run-name', lib.sessionTitle(S.session, S.cohort));
    box.appendChild(head);
    var said = el('p', 'small'); said.setAttribute('role', 'status');
    var acts = el('div', 'actions');
    var list = el('ul', 'p2-run-list'); list.hidden = true;
    var pick = button('Run another session', 'link-button', function () {
      list.hidden = !list.hidden; pick.setAttribute('aria-expanded', String(!list.hidden));
    });
    pick.setAttribute('aria-expanded', 'false');
    acts.appendChild(pick);
    if (S.callRun) acts.appendChild(button('Back to the schedule', 'link-button', function () { said.textContent = 'Going back…'; stopCallRun(function (m) { said.textContent = m; }); }));
    (S.sessions || []).forEach(function (x) {
      if (x.id === S.session.id) return;
      var li = el('li');
      li.appendChild(button(lib.sessionTitle(x, S.cohort), 'p2-run-row', function () {
        said.textContent = 'Opening ' + lib.sessionName(x.number, S.cohort) + '…';
        runInCall(x.id, function (m) { said.textContent = m; });
      }));
      list.appendChild(li);
    });
    box.appendChild(acts);
    box.appendChild(list);
    box.appendChild(said);
    return box;
  }
  function drawFrameNow(left) {
    var part = partNow(), st = S.signals && S.signals.state ? S.signals.state() || {} : {};
    var chips = [];
    if (S.teaching) {
      chips.push({ text: S.stageOn ? 'Stage on' : 'Stage off', on: !!S.stageOn });
      var place = slideInfo();
      if (place) chips.push({ text: 'Slide ' + (place.at + 1) + ' of ' + place.count });
      if (S.recording) chips.push({ text: 'Recording', on: true });
      if (S.callRun) chips.push({ text: lib.sessionName(S.session.number, S.cohort) + ' again', on: true });
      if (st.rooms) chips.push({ text: 'In breakouts', on: true });
      if (st.together) chips.push({ text: 'Coming back', on: true });
    }
    var info = slideInfo();
    S.frame.draw({
      title: part ? part.name : S.cohort.title,
      time: left != null ? window.LiveLib.clock(left) : '', over: left === 0,
      chips: chips, next: nextStep() || undefined, canBack: !!part
    });
    var first = (S.list || [])[0];
    var what = !part && first ? 'First: ' + first.name : !S.teaching && part && !part.slides ? String(part.what || '').split(/\n{2,}/)[0] : '';
    // A learner with nothing to do is told so, so an empty panel never reads as broken.
    if (!what && !S.teaching && !$('[data-pane="now"] textarea, [data-pane="now"] input, [data-pane="now"] .signal-where:not([hidden]), [data-pane="now"] .signal-card:not([hidden])')) what = 'Nothing to answer right now.';
    if (S.nowWhat.textContent !== what) S.nowWhat.textContent = what;
    S.nowWhat.hidden = !what;
    if (S.teaching) {
      var noteOf = part || first;
      var slideNote = part ? (info ? info.note : '') : first && window.SlidesLib && (S.decks || {})[first.key] ? window.SlidesLib.notes(S.decks[first.key])[0] : '';
      var said = [slideNote, noteOf && (S.notes || {})[noteOf.key]].filter(Boolean).join('\n\n');
      if (S.nowNotes.getAttribute('data-said') !== said) {
        S.nowNotes.setAttribute('data-said', said);
        S.nowNotes.replaceChildren();
        said.split(/\n{2,}/).forEach(function (t) { if (t.trim()) S.nowNotes.appendChild(el('p', null, t.trim())); });
      }
      S.nowNotes.hidden = !said;
    }
    // Breakouts belong to Now while they run.
    var b = $('[data-breakouts]'), running = !!(st.rooms || st.together), pane = S.frame.pane('now');
    if (b && running && b.parentNode !== pane) { pane.insertBefore(b, pane.firstChild); S.frame.show('now'); }
    if (b && !running && b.parentNode === pane) S.frame.pane('tools').insertBefore(b, S.frameTools);
  }

  // Where the show is in this part's slides, for the plan and the stage.
  function slideNow() { return shared() && S.run.slide ? S.run.slide() : 0; }
  function slideInfo() {
    var part = partNow(), SD = window.SlidesLib;
    var stops = part && SD ? SD.frames(part.slides) : [];
    if (!stops.length) return null;
    var here = Math.min(slideNow(), stops.length - 1), stop = stops[here];
    var next = stops[here + 1];
    var source = S.teaching ? (S.decks || {})[part.key] : null;
    return { at: stop.slide, count: SD.count(part.slides), note: source ? SD.notes(source)[stop.slide] || '' : '',
      next: !next ? 'Next part' : next.slide === stop.slide ? 'Next point' : 'Next slide' };
  }
  function slidesView(part) {
    var SD = window.SlidesLib;
    if (!part || !SD) return null;
    var drafting = S.draft && S.draft.key === part.key && S.draft.fields.slides != null;
    var text = drafting ? SD.withoutNotes(S.draft.fields.slides) : part.slides;
    if (!text) return null;
    var stops = SD.frames(text);
    var at = drafting ? SD.frameOf(text, S.draft.fields.slide_at || 0) : Math.min(slideNow(), stops.length - 1);
    var stop = stops[at] || { slide: 0, shown: Infinity };
    // What this deck shows from GitHub, fetched here because the panel is signed in.
    if (window.GitHubBlock) window.GitHubBlock.preload(db, S.cohort.id, text).then(function (got) { if (got) sendStage(); });
    return { text: SD.deck(text), at: stop.slide, shown: stop.shown === Infinity ? 0 : stop.shown, links: SD.ghLinks(text, stop.slide) };
  }
  function pinnedText() {
    var on = S.onStage;
    if (!on) return null;
    if (on.kind === 'welcome') return 'the welcome';
    if (on.kind === 'blank') return 'nothing';
    if (on.kind === 'check') { var own = partCheck(); return own && own.id === on.id ? null : 'a question'; }
    if (on.kind === 'item') {
      // In a Showing work part, someone's work on the stage is the part
      // itself, and the box below says whose (found in the live Meet test:
      // "shows You's work instead of this part").
      var part = partNow();
      if (part && part.kind === 'presenter') return null;
      var i = S.items.filter(function (x) { return x.id === on.id; })[0];
      if (!i) return 'someone’s work';
      return i.user_id === S.me.id ? 'your work' : nameOf(i.user_id) + '’s work';
    }
    return null;
  }

  // Drawn again when the part changes (from the clock, or a teacher's
  // choice), and on force. A change of part opens the activity that part
  // needs, unless someone chose one by hand during this part.
  function drawPart(force) {
    var part = partNow();
    var key = part ? part.key : null;
    if (!S.show || (!force && key === S.drawnPart)) return;
    S.drawnPart = key;
    var list = S.list || S.parts;
    S.plan = A.panelPlan(V ? V.partKeyOf(part, list.indexOf(part)) : key, S.room.room);
    // In a trio's own room, its order leads whatever the main room is doing.
    var rooms = list.filter(function (s) { return (V ? V.partKeyOf(s, list.indexOf(s)) : s.key) === 'show'; })[0];
    S.show.update(S.room.room === 'group' && rooms ? rooms.key : key);
    drawRunInfo();
    drawNowActivity();
    drawChecksChrome();
    sendStage();
    // The panel goes where the session goes, every time, and a learner
    // lands on what is being asked (found in a real call: the stage said to
    // answer in the panel, and the box was three screens below the plan's
    // top). A question draws a moment after its part, so it looks twice.
    if (key && key !== S.shownKey) {
      S.shownKey = key;
      setTimeout(showNow, 300);
      setTimeout(showNow, 1500);
    }
  }
  function showNow() {
    var active = document.activeElement;
    if (active && /^(TEXTAREA|INPUT|SELECT)$/.test(active.tagName)) return;
    if (S.newPanel) {
      if (!S.teaching) S.frame.show('now');
      var q = $('[data-questions]');
      if (!S.teaching && q && q.scrollIntoView && q.querySelector('textarea, input, button')) q.scrollIntoView({ block: 'start' });
      return;
    }
    var it = root.querySelector('[data-show] [aria-current="step"]');
    if (!it) return;
    var ask = S.teaching ? null : it.querySelector('[data-questions]');
    var to = ask && ask.querySelector('textarea, input, button') ? ask : it;
    if (to.scrollIntoView) to.scrollIntoView({ block: 'start' });
  }
  // Closing the panel only hides it, and a hidden page cannot scroll, so
  // it finds its place again when it comes back.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(showNow, 100); });

  function drawNowActivity() {
    var part = partNow();
    $('[data-part-kicker]').textContent = part ? 'Minute ' + part.start + ' of ' + S.cohort.session_minutes : 'Not started yet';
    // Before anything has begun, a leader's one clear move: start.
    // Until a leader starts it, the show has not begun, whatever the
    // schedule says.
    $('[data-start-session]').hidden = !(S.teaching && (shared() ? !S.run.current() : !part));
    tick();
    // The welcome: on the main stage by itself before any scene begins,
    // and the teacher's to put back up at any time (C9).
    drawWelcomeToggle();
    var lead = $('[data-now-lead]'); lead.replaceChildren();
    if (S.plan && S.plan.lead === 'heard') drawHeard(lead);
    if (S.plan && S.plan.lead === 'groups') drawGroups(lead);
    // An empty section is no section (found in the test cohort).
    lead.hidden = !lead.children.length;
    // Once the show runs, the current part carries its own clock, so this
    // box keeps only what a leader can do here (the welcome), and a learner
    // has no box at all.
    var running = shared() && !!part;
    $('[data-part-kicker]').hidden = running;
    $('[data-part-clock]').hidden = running;
  }

  function tick() {
    var part = partNow();
    drawRunInfo();
    // With the show running, the current scene carries the clock (R3).
    $('[data-clock]').hidden = shared();
    if (shared()) return;
    var left = A.timeLeft(S.timerEnds, Date.now());
    var clock = $('[data-clock]'), btn = $('[data-timer]');
    if (left != null) {
      clock.textContent = left ? L.clock(left) : 'Time is up';
      btn.textContent = left ? 'Stop the clock' : 'Start this part’s clock';
      if (!left) S.timerEnds = null;
    } else {
      clock.textContent = part ? part.minutes + ' minutes' : '';
      btn.textContent = 'Start this part’s clock';
    }
  }
  setInterval(function () { if (S.session) { tick(); } }, 1000);
  setInterval(function () { if (S.session) drawPart(); }, 20000);

  function drawWelcomeToggle() {
    var welcoming = S.onStage && S.onStage.kind === 'welcome';
    $('[data-welcome-toggle]').textContent = welcoming ? 'Take the welcome off the main stage' : 'Put the welcome on the main stage';
    // Before the session starts, the welcome is already all the stage shows.
    $('[data-welcome-toggle]').hidden = !partNow();
  }
  $('[data-welcome-toggle]').addEventListener('click', function () {
    var welcoming = S.onStage && S.onStage.kind === 'welcome';
    setPin(welcoming ? null : { kind: 'welcome' });
  });
  $('[data-timer]').addEventListener('click', function () {
    var part = partNow();
    if (S.timerEnds && A.timeLeft(S.timerEnds, Date.now())) { S.timerEnds = null; }
    else if (part) { S.chosenPart = part.key; S.timerEnds = Date.now() + part.minutes * 60000; }
    tick(); sendStage();
  });
  $('[data-next-part]').addEventListener('click', function () {
    var part = partNow();
    var i = part ? S.parts.indexOf(S.parts.filter(function (p) { return p.key === part.key; })[0]) : -1;
    var next = S.parts[Math.min(S.parts.length - 1, i + 1)];
    S.chosenPart = next.key;
    S.timerEnds = Date.now() + next.minutes * 60000;
    drawPart(true);
  });

  // While people arrive: what the teacher heard in last week's checks.
  function drawHeard(box) {
    var heard = S.prev && S.prev.heard;
    if (heard) {
      var wrap = el('div', 'live-heard addon-card');
      wrap.appendChild(el('p', 'kicker', 'What ' + (S.teaching ? 'you' : 'your leader') + ' heard in ' + (S.cohort && S.cohort.schedule === 'custom' ? 'session ' : 'week ') + S.prev.number + '’s checks'));
      heard.split(/\n{2,}/).forEach(function (para) { wrap.appendChild(el('p', null, para)); });
      box.appendChild(wrap);
    } else if (S.teaching && S.prev) {
      var hint = el('p', 'small');
      hint.appendChild(document.createTextNode('What you heard in ' + (S.cohort && S.cohort.schedule === 'custom' ? 'session ' : 'week ') + S.prev.number + '’s checks shows here once you write it '));
      hint.appendChild(newTab(Object.assign(el('a', null, 'in Sessions'), { href: '/cohort/?c=' + encodeURIComponent(S.cohort.slug) + '&t=sessions' })));
      hint.appendChild(document.createTextNode('.'));
      box.appendChild(hint);
    }
  }

  // The room board (C2): every group for a teacher in the main room, the
  // group alone in a group's own room, and your own group otherwise.
  // ------------------------------------------------------------------
  // Breakouts (assets/breakouts.js): the leader launches and calls back from
  // here, and every panel follows through the same signals.
  // ------------------------------------------------------------------

  function reloadGroups() {
    return db.from('groups').select('*, group_members(user_id)').eq('cohort_id', S.cohort.id).order('name').then(function (r) {
      if (r.error) return;
      S.groups.splice.apply(S.groups, [0, S.groups.length].concat(r.data));
      if (S.signals) S.signals.redraw();
      if (S.breakouts) S.breakouts.draw();
    });
  }
  // A launch reaches a learner as a signal, with rooms this panel has never
  // read, so it reads them, and brings the way to the room into view.
  function breakoutsChanged(st) {
    var now = st ? (st.rooms ? 'rooms:' + st.rooms.id : st.together ? 'back:' + st.together.id : '') : '';
    if (now === S.breakoutSeen) return;
    var first = S.breakoutSeen === undefined;
    S.breakoutSeen = now;
    if (S.breakouts) S.breakouts.draw();
    if (first || !now) return;
    reloadGroups().then(function () {
      var box = $('[data-sig-where]');
      if (!S.teaching && box && box.scrollIntoView) box.scrollIntoView({ block: 'start' });
    });
  }
  function startBreakouts() {
    if (S.breakouts || !window.Breakouts || !S.teaching || standalone || S.room.groupId || !S.signals) return;
    $('[data-breakouts]').hidden = false;
    S.breakouts = window.Breakouts.start({
      db: db, mount: $('[data-breakouts]'), cohort: S.cohort, session: S.session, signals: S.signals, nameOf: nameOf,
      groups: function () { return S.groups; }, presence: function () { return S.presence || {}; }, reload: reloadGroups,
      preset: function () {
        var part = partNow();
        if (!part || !part.own || part.kind !== 'rooms') return null;
        var c = part.config || {};
        return { groups: c.groups || null, size: c.group_size || null, minutes: part.minutes || null, random: c.sorting === 'random', key: part.key };
      },
      people: function () {
        var list = S.people.map(function (p) { return { id: p.user_id, name: S.names[p.user_id] || 'Someone' }; });
        (S.guests || []).forEach(function (g) { if (!g.member_id && (S.presence || {})[g.user_id]) list.push({ id: g.user_id, name: g.name || 'A guest' }); });
        return list;
      }
    });
  }

  function startRooms() {
    if (S.rooms || !window.RoomBoard) return;
    var mine = S.groups.some(function (g) { return g.group_members.some(function (m) { return m.user_id === S.me.id; }); });
    if (!S.groups.length || (!S.teaching && !mine && !S.room.groupId)) return;
    S.rooms = window.RoomBoard.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups, people: S.people,
      names: S.names, nameOf: nameOf, mount: $('[data-rooms]'), onlyGroup: S.room.groupId || null, showLinks: !S.room.groupId,
      turn: L.roomTurn(roomsScene(), 3), prompt: roomsPrompt(),
      boardLink: function (gid) { var l = A.boardLinks(S.cohort, S.session, gid); return l ? l.board : null; },
      onChange: function (byGroup) {
        S.roomPlaces = byGroup; drawCounts();
        if (S.onStage && S.onStage.kind === 'rooms') sendStage();
      }
    });
    drawRoomsToggle();
  }

  // From the main room, a teacher can put every room on the main stage
  // (R12), so the class and the teacher see where each one is at once.
  function drawRoomsToggle() {
    var box = $('[data-rooms-stage]'), list = $('[data-rooms]');
    if (!box || !list) return;
    if (box.nextSibling !== list) list.parentNode.insertBefore(box, list);
    box.hidden = !(S.teaching && S.rooms && !S.room.groupId);
    box.replaceChildren();
    if (!box.hidden) box.appendChild(stageToggle('rooms', undefined, 'Put every room on the main stage', 'Take the rooms off the main stage'));
  }

  // The rooms scene the rehearsal rooms run (R6): the current scene when
  // it is one, or else the run of show's first, or the six parts' own.
  function roomsScene() {
    var list = V ? V.scenes(S.list || S.parts) : [];
    var now = S.session ? partNow() : null;
    if (now && now.kind === 'rooms') return now;
    return list.filter(function (x) { return x.kind === 'rooms'; })[0] || null;
  }
  function roomsPrompt() { var r = roomsScene(); return r && r.config && r.config.prompt ? r.config.prompt : null; }

  // During "Show what you built", and always in a group's room:
  // each group's order this week, and each builder's question.
  function drawGroups(box) {
    var groups = S.room.groupId ? S.groups.filter(function (g) { return g.id === S.room.groupId; })
      : S.teaching ? S.groups : S.groups.filter(function (g) { return g.group_members.some(function (m) { return m.user_id === S.me.id; }); });
    if (!groups.length) { box.appendChild(el('p', 'small', 'There are no trios yet, so everyone stays in the main room.')); return; }
    groups.forEach(function (g) {
      var card = el('article', 'addon-card');
      card.appendChild(el('h3', null, g.name));
      if (!S.room.groupId && safe(g.meet_url)) {
        var go = newTab(el('a', null, S.teaching ? 'Visit its rehearsal room' : 'Go to your rehearsal room')); go.href = g.meet_url;
        card.appendChild(el('p', 'small')).appendChild(go);
      }
      var ids = g.group_members.map(function (m) { return m.user_id; });
      var order = L.presentingOrder(S.people.filter(function (p) { return ids.indexOf(p.user_id) >= 0; })
        .map(function (p) { return { id: p.user_id, name: S.names[p.user_id] || 'Someone' }; }), S.session.number);
      var ol = el('ol', 'trio-order');
      order.forEach(function (p) {
        var li = el('li');
        li.appendChild(el('p', 'live-who', p.id === S.me.id ? 'You' : p.name));
        var bb = L.latestBringBack(S.brought, p.id);
        if (bb && bb.want_to_know) li.appendChild(el('p', 'want', 'Wants to know: ' + bb.want_to_know));
        ol.appendChild(li);
      });
      if (!order.length) ol.appendChild(el('li', 'small', 'No one is in this group yet.'));
      card.appendChild(ol);
      box.appendChild(card);
    });
  }

  // ------------------------------------------------------------------
  // The queue and the checks, read again whenever they change
  // ------------------------------------------------------------------

  function refreshLive() {
    var sid = S.session.id;
    return Promise.all([
      db.from('live_queue').select('*').eq('session_id', sid),
      db.from('live_checks').select('*').eq('session_id', sid).order('created_at', { ascending: false }),
      db.from('live_answers').select('*').eq('cohort_id', S.cohort.id),
      db.from('live_requests').select('*').eq('session_id', sid).order('created_at')
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { $('[data-sync]').textContent = 'The panel could not read the latest changes: ' + bad.error.message; return; }
      S.items = res[0].data; S.checks = res[1].data; S.answers = res[2].data;
      S.requests = res[3].data || [];
      if (S.isGuest) loadGuests();
      var visible = S.checks.filter(function (k) { return L.kindOf(k) !== 'short' && (S.teaching || k.show_tally); });
      // A question asked again (R17) needs its first results too, even closed.
      S.checks.forEach(function (k) {
        if (!k.rerun_of || visible.indexOf(k) < 0) return;
        var first = S.checks.filter(function (x) { return x.id === k.rerun_of; })[0];
        if (first && visible.indexOf(first) < 0) visible.push(first);
      });
      return Promise.all(visible.map(function (k) { return Q.readResults(db, k); })).then(function (t) {
        S.results = {};
        visible.forEach(function (k, i) { S.results[k.id] = t[i] || null; });
        render('[data-queue]', drawQueue);
        render('[data-checks]', drawChecks);
        drawSceneQuestion();
        drawCounts();
        drawRoster();
        drawPartTools();
        loadStageDetail();
        sendStage();
      });
    });
  }

  // Redraw part of the panel, unless someone is typing an answer in it.
  function render(sel, fn) {
    var a = document.activeElement;
    if (a && $(sel).contains(a) && (/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) || a.closest('.question-answer, .question-edit'))) { deferred[sel] = fn; return; }
    fn();
  }
  root.addEventListener('focusout', function () {
    setTimeout(function () { Object.keys(deferred).forEach(function (sel) { var fn = deferred[sel]; delete deferred[sel]; render(sel, fn); }); }, 0);
  });

  function stageToggle(kind, id, onLabel, offLabel) {
    var on = S.onStage && S.onStage.kind === kind && S.onStage.id === id;
    var b = button(on ? offLabel : onLabel, 'btn-secondary', function () { setPin(on ? null : { kind: kind, id: id }); });
    b.setAttribute('aria-pressed', String(on));
    return b;
  }

  // What the main stage shows instead of the current scene, if anything.
  // With the show running (R3) this is the show everyone follows, so
  // every main stage changes with the teacher's.
  // What only the leader could read, for every stage: a room's work or one
  // written answer, through on_stage().
  function loadStageDetail() {
    var on = S.onStage;
    if (!on || (on.kind !== 'room' && on.kind !== 'answer' && on.kind !== 'work')) { if (S.onStageDetail) { S.onStageDetail = null; sendStage(); } return; }
    var want = on.kind + ':' + on.id + ':' + !!on.named;
    db.rpc('on_stage', { s: S.session.id }).then(function (r) {
      var d = r && r.data;
      if (!d || !S.onStage || S.onStage.kind + ':' + S.onStage.id + ':' + !!S.onStage.named !== want) return;
      if (d.kind === 'room') {
        var ids = (d.answers || []).map(function (x) { return x.workbook; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        S.workbooks = S.workbooks || {};
        var need = ids.filter(function (id) { return !S.workbooks[id]; });
        var ready = need.length ? db.from('workbooks').select('*').in('id', need).then(function (w) { (w.data || []).forEach(function (x) { S.workbooks[x.id] = x; }); }) : Promise.resolve();
        return ready.then(function () {
          d.items = (d.answers || []).map(function (x) {
            var wb = S.workbooks[x.workbook], b = wb ? (wb.blocks || []).filter(function (y) { return y.key === x.block; })[0] : null;
            var v = x.value || {}, a = v.text || '';
            if (b && b.type === 'choice') a = (v.picks || []).map(function (i) { return (b.choices || [])[i]; }).filter(Boolean).join(', ');
            if (v.cells) a = v.cells.map(function (row) { return row.filter(Boolean).join(' / '); }).filter(Boolean).join('; ');
            var said = b ? window.WorkbookLib.parts(b.text).filter(function (p) { return p.text; })[0] : null;
            return { q: said ? said.text.replace(/[*_#]/g, '').split('\n')[0] : '', a: a };
          });
          S.onStageDetail = d; sendStage();
        });
      }
      // Pre-class work shows as one answer: its question, the words, and the
      // name only when shown.
      if (d.kind === 'work') d = { kind: 'work', prompt: workQuestion(d.block) || d.title || '', text: workText(d.block, d.value), who: d.who || null };
      S.onStageDetail = d; sendStage();
    });
  }
  function setPin(v) {
    S.onStage = v;
    // What only on_stage() can give is read once the pin is saved, or it
    // would read the stage as it was a moment ago.
    var saving = S.run && S.run.shared && S.teaching ? S.run.pin(v) : null;
    Promise.resolve(saving).then(loadStageDetail, loadStageDetail);
    drawQueue(); drawChecks(); drawRoster(); drawRoomsToggle(); sendStage(); drawRunInfo(); drawApps();
    drawBoardPin(); drawPartTools();
  }

  // What a part brought from Course Builder asks of the leader: its document
  // to put up, someone to feature (at random, or someone quiet so far), and
  // each breakout group's document. A learner in a breakout room sees their
  // own group's document.
  function inc(m, id) { if (id) m[id] = (m[id] || 0) + 1; }
  function drawPartTools() {
    var box = S.partTools;
    if (!box) return;
    box.replaceChildren();
    var part = partNow(), c = part && part.own ? part.config || {} : {};
    // What the part is for (scenes.goal), for everyone in the call.
    if (part && part.goal) box.appendChild(el('p', 'p2-goal', part.goal));
    if (S.teaching && c.show && c.show.url) {
      var row = el('div', 'actions');
      var up = S.onStage && S.onStage.kind === 'doc';
      if (part.slides) row.appendChild(button(up ? 'Back to the slides' : 'Show the document', 'btn-secondary small', function () { setPin(up ? null : { kind: 'doc' }); }));
      var a = el('a', 'link-button', c.show.name || 'The document'); a.href = c.show.url; a.target = '_blank'; a.rel = 'noopener';
      row.appendChild(a);
      box.appendChild(row);
    }
    if (S.teaching && part && ((c.feature && c.feature !== 'teacher') || part.kind === 'presenter')) drawFeature(box, part, c.feature);
    if (S.teaching) drawRoomsWork(box);
    if (S.teaching) drawPrework(box);
    var docs = part && part.kind === 'rooms' && Array.isArray(c.group_docs) ? c.group_docs : [];
    if (docs.length) {
      var mine = null;
      if (!S.teaching && S.room && S.room.groupId) {
        var g = (S.groups || []).filter(function (x) { return x.id === S.room.groupId; })[0];
        var n = g ? /(\d+)\s*$/.exec(g.name || '') : null;
        // Flavors are dealt out in turn: room 7 of six flavors has the first.
        mine = n ? docs[(Number(n[1]) - 1) % docs.length] || null : null;
      }
      var list = S.teaching ? docs : mine ? [mine] : [];
      if (list.length) {
        box.appendChild(el('p', 'small', S.teaching ? (docs.length > 1 ? 'The groups’ documents, dealt out in turn' : 'The groups’ document') : 'Your group’s document'));
        var ul = el('ul', 'p2-run-list');
        list.forEach(function (d, i) {
          var li = el('li'), l = el('a', 'p2-run-row', d.name);
          l.href = d.url; l.target = '_blank'; l.rel = 'noopener';
          li.appendChild(l); ul.appendChild(li);
        });
        box.appendChild(ul);
      }
    }
    if (part && part.kind === 'rooms' && Array.isArray(c.workbooks) && c.workbooks.length) drawRoomWorkbook(box, c.workbooks);
    box.hidden = !box.children.length;
  }
  // Pre-class work (Course Builder's "Feature pre-class work"): for a leader,
  // how many answered each of the session's own workbooks, and any written
  // answer to put on every stage, without its author's name until shown
  // (show_state stage 'work', read through on_stage()).
  function workText(block, v) {
    v = v || {};
    if (v.text) return String(v.text);
    if (v.picks && block) return v.picks.map(function (i) { return (block.choices || [])[i]; }).filter(Boolean).join(', ');
    if (v.cells) return v.cells.map(function (row) { return row.filter(Boolean).join(' / '); }).filter(Boolean).join('; ');
    return '';
  }
  function workQuestion(block) {
    var said = block && window.WorkbookLib ? window.WorkbookLib.parts(block.text).filter(function (p) { return p.text; })[0] : null;
    return said ? said.text.replace(/[*_#]/g, '').split('\n')[0] : '';
  }
  function loadPrework() {
    if (S.preworkLoading || !S.session) return;
    var sid = S.session.id;
    S.preworkLoading = true;
    db.from('workbooks').select('*').eq('session_id', sid).eq('kind', 'individual').order('position').then(function (w) {
      var list = w.data || [];
      var answers = list.length ? db.from('workbook_answers').select('id, workbook_id, user_id, block, value').in('workbook_id', list.map(function (x) { return x.id; })).not('user_id', 'is', null) : Promise.resolve({ data: [] });
      return answers.then(function (a) {
        S.preworkLoading = false;
        if (!S.session || S.session.id !== sid) return;
        S.prework = { session: sid, at: Date.now(), workbooks: list, answers: a.data || [] };
        drawPartTools();
      });
    }, function () { S.preworkLoading = false; });
  }
  function drawPrework(box) {
    if (!S.prework || S.prework.session !== S.session.id || Date.now() - S.prework.at > 120000) loadPrework();
    var P = S.prework;
    if (!P || P.session !== S.session.id || !P.workbooks.length) return;
    var everyone = (S.people || []).length;
    var det = el('details', 'p2-prework');
    det.open = !!S.preworkOpen;
    det.addEventListener('toggle', function () { S.preworkOpen = det.open; if (det.open) loadPrework(); });
    var sum = el('summary', null, 'Pre-class work');
    det.appendChild(sum);
    P.workbooks.forEach(function (w) {
      var mine = P.answers.filter(function (a) { return a.workbook_id === w.id; });
      var who = mine.map(function (a) { return a.user_id; }).filter(function (x, i, l) { return l.indexOf(x) === i; });
      det.appendChild(el('p', 'p2-run-name', w.title));
      det.appendChild(el('p', 'small', who.length + (everyone ? ' of ' + everyone : '') + ' answered'));
      (w.blocks || []).filter(function (b) { return b.type !== 'text'; }).forEach(function (b) {
        var rows = mine.filter(function (a) { return a.block === b.key && workText(b, a.value); });
        if (!rows.length) return;
        var q = el('div', 'p2-prework-q');
        q.appendChild(el('p', 'small', workQuestion(b)));
        if (b.type === 'choice') {
          var counts = (b.choices || []).map(function (label, i) { return label + ': ' + rows.filter(function (a) { return ((a.value || {}).picks || []).indexOf(i) >= 0; }).length; });
          q.appendChild(el('p', 'small', counts.join(' · ')));
          det.appendChild(q);
          return;
        }
        var ul = el('ul', 'p2-answers');
        rows.forEach(function (a) {
          var li = el('li');
          var text = workText(b, a.value);
          li.appendChild(el('span', null, (S.names[a.user_id] || 'Someone') + ': ' + (text.length > 140 ? text.slice(0, 139) + '…' : text)));
          var up = S.onStage && S.onStage.kind === 'work' && S.onStage.id === a.id;
          li.appendChild(button(up ? 'Take it down' : 'Put on stage', 'link-button', function () { setPin(up ? null : { kind: 'work', id: a.id, named: false }); }));
          if (up) li.appendChild(button(S.onStage.named ? 'Hide the name' : 'Show the name', 'link-button', function () { setPin({ kind: 'work', id: a.id, named: !S.onStage.named }); }));
          ul.appendChild(li);
        });
        q.appendChild(ul);
        det.appendChild(q);
      });
    });
    box.appendChild(det);
  }

  // A breakout part's group workbooks, dealt out to the rooms in turn: a
  // learner in a room answers their room's together; a leader sees the list.
  function roomNumber() {
    if (!S.room || !S.room.groupId) return null;
    var g = (S.groups || []).filter(function (x) { return x.id === S.room.groupId; })[0];
    var n = g ? /(\d+)\s*$/.exec(g.name || '') : null;
    return n ? Number(n[1]) : null;
  }
  function drawRoomWorkbook(box, ids) {
    S.workbooks = S.workbooks || {};
    var missing = ids.filter(function (id) { return !S.workbooks[id]; });
    if (missing.length && !S.workbooksLoading) {
      S.workbooksLoading = true;
      db.from('workbooks').select('*').in('id', missing).then(function (r) {
        S.workbooksLoading = false;
        (r.data || []).forEach(function (w) { S.workbooks[w.id] = w; });
        drawPartTools();
      });
      return;
    }
    if (S.teaching) {
      box.appendChild(el('p', 'small', ids.length > 1 ? 'The rooms’ workbooks, dealt out in turn' : 'The rooms’ workbook'));
      var ul = el('ul', 'p2-run-list');
      ids.forEach(function (id) {
        var w = S.workbooks[id];
        if (!w) return;
        var li = el('li'), a = el('a', 'p2-run-row', w.title);
        a.href = '/session/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number + '&t=before'; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a); ul.appendChild(li);
      });
      box.appendChild(ul);
      return;
    }
    var n = roomNumber();
    var w = n ? S.workbooks[ids[(n - 1) % ids.length]] : null;
    if (!w || !window.WorkbookView) return;
    var sec = el('section', 'p2-workbook');
    sec.appendChild(el('h2', 'p2-run-name', w.title));
    var body = el('div'); sec.appendChild(body);
    box.appendChild(sec);
    if (S.workbookShown === w.id + ':' + S.room.groupId && S.workbookBody) { sec.replaceChild(S.workbookBody, body); return; }
    db.from('workbook_answers').select('*').eq('workbook_id', w.id).eq('group_id', S.room.groupId).then(function (r) {
      var given = {};
      (r.data || []).forEach(function (a) { given[a.block] = a.value; });
      window.WorkbookView.form(body, { workbook: w, answers: given, image: window.WorkbookView.images(db, w), onSave: function (key, value) {
        return db.from('workbook_answers').upsert({ workbook_id: w.id, cohort_id: S.cohort.id, group_id: S.room.groupId, block: key, value: value }, { onConflict: 'workbook_id,group_id,block' }).then(function (q) { return q.error ? q.error.message : null; });
      } });
      S.workbookShown = w.id + ':' + S.room.groupId; S.workbookBody = body;
    });
  }
  // Featuring: how many (a step featured up to eight beside its poll), and
  // whom: at random, someone quiet so far, or someone who chose an answer to
  // the newest choice question (Course Builder's Voting filter).
  function voteChoices() {
    var k = (S.checks || []).filter(function (x) { var kd = L.kindOf(x); return (kd === 'choice' || kd === 'multi') && (x.choices || []).length; })[0];
    return k ? (k.choices || []).map(function (c, i) { return { key: 'vote:' + k.id + ':' + i, label: 'Who chose “' + c + '”', check: k.id, index: i }; }) : [];
  }
  function drawFeature(box, part, mode) {
    var wrap = el('div', 'p2-feature');
    var on = S.onStage && (S.onStage.kind === 'people' || S.onStage.kind === 'person') ? (S.onStage.ids || [S.onStage.id]) : null;
    var pk = S.featurePick && S.featurePick.part === part.key ? S.featurePick : null;
    if (on) {
      wrap.appendChild(el('p', null, 'Featuring ' + on.map(function (id) { return S.names[id] || 'someone'; }).join(', ')));
      wrap.appendChild(button('Done', 'btn-secondary small', function () { setPin(null); }));
      box.appendChild(wrap);
      return;
    }
    var row = el('div', 'actions');
    var how = el('select'); how.setAttribute('aria-label', 'Whom to feature');
    [{ key: 'random', label: 'At random' }, { key: 'quiet', label: 'Someone quiet so far' }].concat(voteChoices()).forEach(function (o) {
      var op = el('option', null, o.label); op.value = o.key; how.appendChild(op);
    });
    how.value = S.featureHow && how.querySelector('option[value="' + S.featureHow + '"]') ? S.featureHow : (mode === 'quiet' ? 'quiet' : 'random');
    how.addEventListener('change', function () { S.featureHow = how.value; });
    var count = el('input'); count.type = 'number'; count.min = '1'; count.max = '8';
    count.value = String(S.featureCount || (part.config && part.config.feature_count) || 1);
    count.setAttribute('aria-label', 'How many');
    count.addEventListener('change', function () { S.featureCount = Math.max(1, Math.min(8, Number(count.value) || 1)); });
    row.appendChild(how); row.appendChild(count);
    row.appendChild(button(pk ? 'Pick again' : 'Choose', 'btn-secondary small', function () { S.featureHow = how.value; S.featureCount = Math.max(1, Math.min(8, Number(count.value) || 1)); choose(part); }));
    wrap.appendChild(row);
    if (pk) {
      var ul = el('ul', 'p2-picks');
      pk.list.forEach(function (x) { ul.appendChild(el('li', null, x.name + (x.why.length ? ': ' + x.why.join(', ') : ''))); });
      wrap.appendChild(ul);
      wrap.appendChild(button('Feature them', 'btn-secondary small', function () { var ids = pk.list.map(function (x) { return x.id; }); S.featurePick = null; setPin({ kind: 'people', ids: ids }); }));
    }
    if (S.featureSaid) wrap.appendChild(el('p', 'small', S.featureSaid));
    box.appendChild(wrap);
  }
  function choose(part) {
    var r = rosterNow(), how = S.featureHow || 'random';
    var pool = (r ? (r.here.length ? r.here : r.missing) : []).filter(function (p) { return (S.teacherIds || []).indexOf(p.id) < 0; });
    var vote = /^vote:([^:]+):(\d+)$/.exec(how);
    if (vote) {
      var chose = {};
      (S.answers || []).forEach(function (a) {
        if (a.check_id !== vote[1]) return;
        var picks = Array.isArray(a.value) ? a.value : a.choice != null ? [a.choice] : [];
        if (picks.indexOf(Number(vote[2])) >= 0) chose[a.user_id] = true;
      });
      pool = pool.filter(function (p) { return chose[p.id]; });
    }
    S.featureSaid = null;
    return Promise.all([
      db.from('session_events').select('user_id, kind, detail').eq('session_id', S.session.id).in('kind', ['reaction', 'stance', 'stage']),
      db.from('shares').select('user_id').eq('session_id', S.session.id)
    ]).then(function (res) {
      var sig = { reactions: {}, answers: {}, shares: {}, queue: {}, requests: {}, featured: {} };
      ((res[0] && res[0].data) || []).forEach(function (e) {
        if (e.kind === 'stage') {
          var m = /^(person|people):(.+)$/.exec(e.detail || '');
          if (m) m[2].split(',').forEach(function (id) { inc(sig.featured, id); });
        } else inc(sig.reactions, e.user_id);
      });
      ((res[1] && res[1].data) || []).forEach(function (x) { inc(sig.shares, x.user_id); });
      var asked = (S.checks || []).map(function (k) { return k.id; });
      (S.answers || []).forEach(function (a) { if (asked.indexOf(a.check_id) >= 0) inc(sig.answers, a.user_id); });
      (S.items || []).forEach(function (i) { inc(sig.queue, i.user_id); });
      (S.requests || []).forEach(function (q) { inc(sig.requests, q.user_id); });
      var list = window.RosterLib ? window.RosterLib.toFeatureMany(pool.map(function (p) { return { id: p.id, name: p.name }; }), sig, how === 'quiet' ? 'quiet' : 'random', S.featureCount || 1) : [];
      S.featurePick = list.length ? { part: part.key, list: list } : null;
      if (!list.length) S.featureSaid = vote ? 'No one here chose that yet.' : 'There is no one to choose yet.';
      drawPartTools();
    });
  }
  // Each breakout room's work, for its debrief (Course Builder's Feature
  // Breakout Groups): its people and workbook answers on every stage.
  function drawRoomsWork(box) {
    var rooms = (S.groups || []).filter(function (g) { return g.breakout; });
    if (!rooms.length || !S.run || !S.run.shared) return;
    box.appendChild(el('p', 'small', 'Each room’s work'));
    var ul = el('ul', 'p2-run-list');
    rooms.forEach(function (g) {
      var up = S.onStage && S.onStage.kind === 'room' && S.onStage.id === g.id;
      var li = el('li', 'p2-room-row');
      li.appendChild(el('span', null, g.name + ' (' + (g.group_members || []).length + ')'));
      li.appendChild(button(up ? 'Take it down' : 'Put on stage', 'link-button', function () { setPin(up ? null : { kind: 'room', id: g.id }); }));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  // Whose work is on the main stage, for everyone, and, for a teacher,
  // one cue to thank them and bring up the next from the wings (R7).
  function drawOnStage() {
    var box = $('[data-on-stage]');
    var now = V ? V.onStageNow(V.stageChange(S.onStage), S.items, partNow(), S.me.id, nameOf, L.itemLabel) : null;
    var next = V ? V.nextFromWings(S.items, now ? now.id : null) : null;
    box.replaceChildren();
    box.hidden = !now && !(S.teaching && next);
    if (now) {
      box.appendChild(el('p', 'kicker', 'On the main stage'));
      box.appendChild(el('p', 'on-stage-line', now.line));
      box.appendChild(el('p', 'live-what', now.what));
      if (now.audience) box.appendChild(el('p', 'on-stage-audience', 'What to show: ' + now.audience));
    }
    // With no one else waiting, the person on stage still needs thanking
    // (found in the live Meet test: the box offered nothing).
    if (S.teaching && (next || now)) {
      var acts = el('div', 'actions');
      if (next) acts.appendChild(button(now ? 'Thank them, and bring up ' + nameOf(next.user_id) : 'Bring up ' + nameOf(next.user_id) + '', 'btn-primary', function () {
        var done = now ? db.from('live_queue').update({ state: 'shown' }).eq('id', now.id) : Promise.resolve({});
        done.then(function () { setPin({ kind: 'item', id: next.id }); refreshLive(); });
      }));
      if (now) acts.appendChild(button('Thank them, and clear the stage', next ? 'btn-secondary' : 'btn-primary', function () {
        db.from('live_queue').update({ state: 'shown' }).eq('id', now.id).then(function () { setPin(null); refreshLive(); });
      }));
      box.appendChild(acts);
    }
  }

  function drawQueue() {
    drawOnStage();
    var q = L.queue(S.items);
    // Whoever is on the main stage is in the box above, not twice.
    var staged = S.onStage && S.onStage.kind === 'item' ? S.onStage.id : null;
    var waiting = q.waiting.filter(function (x) { return x.id !== staged; });
    var list = $('[data-queue]'); list.replaceChildren();
    if (!waiting.length && !staged) list.appendChild(el('li', 'live-empty small', q.shown.length ? 'Everyone waiting has shown their work.' : 'No one is waiting yet.'));
    waiting.forEach(function (item, i) {
      var li = el('li', 'live-item' + (i === 0 ? ' next' : ''));
      if (i === 0) li.appendChild(el('p', 'kicker', 'Next to present'));
      li.appendChild(el('p', 'live-who', nameOf(item.user_id)));
      li.appendChild(el('p', 'live-what', L.itemLabel(item)));
      if (item.note) li.appendChild(el('p', 'live-note', item.note));
      var acts = el('div', 'actions');
      var open = newTab(el('a', 'btn-secondary', 'Open it')); open.href = item.url;
      open.setAttribute('aria-label', 'Open ' + L.itemLabel(item) + ' in a new tab');
      acts.appendChild(open);
      // The first in line is brought up from the box above, so only those
      // further down need their own way onto the stage.
      if (S.teaching && i > 0) acts.appendChild(stageToggle('item', item.id, 'Put it on the main stage', 'Take it off the main stage'));
      if (L.canManage(item, S.me.id, S.teaching)) {
        acts.appendChild(button(item.user_id === who() ? 'I have shown it' : 'They have shown it', 'btn-secondary', function () {
          if (S.onStage && S.onStage.id === item.id) setPin(null);
          db.from('live_queue').update({ state: 'shown' }).eq('id', item.id).then(function (r) { if (!r.error) refreshLive(); });
        }));
      }
      li.appendChild(acts);
      list.appendChild(li);
    });
    $('[data-shown-count]').textContent = q.shown.length ? L.counted(q.shown.length, 'presentation', 'presentations') + ' so far.' : '';
    drawAskToShow(q);
    drawApps();
    drawMyApp();
    drawAsks();
    drawMyRequests();
    drawTiles();
  }

  // A learner's own way into the queue (found in the test cohort: the
  // panel showed who was waiting but gave a learner no way to ask). One
  // link, their app's address to start with, and what to look at.
  function drawAskToShow(q) {
    var box = $('[data-ask-show]');
    if (!box) { box = el('div', 'live-ask-show'); box.setAttribute('data-ask-show', ''); $('[data-wings]').appendChild(box); }
    box.replaceChildren();
    if (S.teaching) return;
    var mine = q.waiting.filter(function (x) { return x.user_id === who(); })[0];
    if (mine && S.onStage && S.onStage.kind === 'item' && S.onStage.id === mine.id) return;
    if (mine) {
      // Their own card above already says they are waiting.
      box.appendChild(button('Take my name off the list', 'btn-secondary small', function () {
        db.from('live_queue').delete().eq('id', mine.id).then(function () { refreshLive(); });
      }));
      return;
    }
    var f = el('form', 'cohort-form');
    var l = el('label', null, 'What you will show');
    var url = el('input'); url.type = 'url'; url.placeholder = 'https://'; url.required = true; url.value = S.myApp || '';
    l.appendChild(url); f.appendChild(l);
    var n = el('label', null, 'What to look at (optional)');
    var note = el('input'); note.maxLength = 300; n.appendChild(note); f.appendChild(n);
    var acts = el('div', 'actions');
    var go = el('button', 'btn-primary', 'Ask to show my work'); go.type = 'submit';
    var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
    acts.appendChild(go); acts.appendChild(said); f.appendChild(acts);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var c = L.classifyLink(url.value);
      if (!c) { said.textContent = 'A full link that starts with https://'; return; }
      go.disabled = true;
      db.from('live_queue').insert({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: who(), kind: c.kind, url: c.url, note: note.value.trim() || null }).then(function (r) {
        go.disabled = false;
        if (r.error) { said.textContent = 'Not added: ' + r.error.message; return; }
        refreshLive();
      });
    });
    box.appendChild(f);
  }

  // Anything a leader can do, a learner can ask for, and a leader decides.
  var ASKS = { question: 'a question for everyone', card: 'a message on the stage', board: 'the board', breakouts: 'breakouts', other: 'something else' };
  function decide(r, state) {
    return db.from('live_requests').update({ state: state }).eq('id', r.id).then(function () { refreshLive(); });
  }
  function doRequest(r) {
    if (r.kind === 'question') {
      var q = L.parseQuestion({ kind: 'short', prompt: r.body });
      if (q.error) return;
      return ask([q], el('span')).then(function (ok) {
        if (!ok) return;
        decide(r, 'done');
        // What was asked goes straight to the stage, or no one would see it.
        var made = S.checks.filter(function (k) { return k.prompt === q.prompt && k.state === 'open'; })[0];
        if (made) setPin({ kind: 'check', id: made.id });
        else refreshLive().then(function () { var k = S.checks.filter(function (x) { return x.prompt === q.prompt && x.state === 'open'; })[0]; if (k) setPin({ kind: 'check', id: k.id }); });
      });
    }
    if (r.kind === 'card' && S.signals) {
      S.signals.send('card', { body: String(r.body || '').slice(0, 400), ends_at: new Date(Date.now() + 300000).toISOString() }, el('span'));
      return decide(r, 'done');
    }
    if (r.kind === 'board') { setPin({ kind: 'board' }); return decide(r, 'done'); }
    if (r.kind === 'breakouts') { openTool('Breakouts'); return decide(r, 'done'); }
    return decide(r, 'done');
  }
  function sendRequest(kind, body) {
    return db.from('live_requests').insert({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: who(), kind: kind, body: body ? String(body).slice(0, 500) : null }).then(function (r) {
      if (!r.error) refreshLive();
      return r.error ? r.error.message : null;
    });
  }
  function drawMyRequests() {
    var box = S.mineAsk;
    if (!box) return;
    var typing = box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
    if (typing) return;
    box.replaceChildren();
    box.appendChild(el('p', 'p2-label', 'Ask your leader for'));
    var row = el('div', 'p2-asks-row'), form = el('form', 'p2-ask-form'); form.hidden = true;
    var input = el('input'); input.maxLength = 500; input.setAttribute('aria-label', 'What you want');
    var go = el('button', 'btn-primary small', 'Ask'); go.type = 'submit';
    var said = el('span', 'small'); said.setAttribute('role', 'status');
    form.appendChild(input); form.appendChild(go);
    var chosen = null;
    [['question', 'A question', 'What should everyone answer?'], ['card', 'A message', 'What should the stage say?'], ['link', 'A link', 'https://'],
     ['board', 'The board'], ['breakouts', 'Breakouts'], ['other', 'Something else', 'What would you like?']].forEach(function (x) {
      row.appendChild(button(x[1], 'btn-secondary small', function () {
        if (!x[2]) return sendRequest(x[0]);
        chosen = x[0]; form.hidden = false; input.placeholder = x[2]; input.focus();
      }));
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      if (chosen === 'link') {
        var c = L.classifyLink(text);
        if (!c) { said.textContent = 'A full link that starts with https://'; return; }
        db.from('live_queue').insert({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: who(), kind: c.kind, url: c.url }).then(function (r) { said.textContent = r.error ? 'Not sent: ' + r.error.message : ''; if (!r.error) { input.value = ''; input.blur(); refreshLive(); } });
        return;
      }
      sendRequest(chosen, text).then(function (err) { said.textContent = err ? 'Not sent: ' + err : ''; if (!err) { input.value = ''; input.blur(); drawMyRequests(); } });
    });
    box.appendChild(row); box.appendChild(form); box.appendChild(said);
    var mine = (S.requests || []).filter(function (r) { return r.user_id === who(); }).slice(-3).reverse();
    mine.forEach(function (r) {
      var line = el('div', 'p2-ask');
      line.appendChild(el('span', null, ASKS[r.kind].charAt(0).toUpperCase() + ASKS[r.kind].slice(1) + (r.body ? ': ' + r.body : '')));
      if (r.state === 'waiting') line.appendChild(button('Take it back', 'btn-secondary small', function () { db.from('live_requests').delete().eq('id', r.id).then(function () { refreshLive(); }); }));
      else line.appendChild(el('span', 'p2-state', r.state === 'done' ? 'Done' : 'Not now'));
      box.appendChild(line);
    });
  }

  // The first thing in Mine: a learner's own app, and where it stands.
  function drawMyApp() {
    var box = S.mineApp;
    if (!box) return;
    box.replaceChildren();
    var app = S.myApp ? L.classifyLink(S.myApp) : null;
    box.hidden = !app;
    if (!app) return;
    var mine = L.queue(S.items).waiting.filter(function (x) { return x.user_id === who(); })[0];
    if (mine && S.onStage && S.onStage.kind === 'item' && S.onStage.id === mine.id) { box.appendChild(el('p', 'p2-state', 'Your app is on the main stage.')); return; }
    if (mine) {
      box.appendChild(el('p', 'p2-state', 'Your leader sees you are ready.'));
      box.appendChild(button('Take it back', 'btn-secondary small', function () { db.from('live_queue').delete().eq('id', mine.id).then(function () { refreshLive(); }); }));
      return;
    }
    box.appendChild(button('Show my app on the main stage', 'btn-primary', function () {
      db.from('live_queue').insert({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: who(), kind: app.kind, url: app.url }).then(function (r) { if (!r.error) refreshLive(); });
    }));
  }
  // A learner asking to show comes to the leader where the leader is looking.
  function drawAsks() {
    var box = S.nowAsks;
    if (!box) return;
    box.replaceChildren();
    var staged = S.onStage && S.onStage.kind === 'item' ? S.onStage.id : null;
    L.queue(S.items).waiting.filter(function (x) { return x.id !== staged; }).forEach(function (item) {
      var row = el('div', 'p2-ask');
      row.appendChild(el('span', null, nameOf(item.user_id) + ' is ready to show'));
      row.appendChild(button('Show it', 'btn-secondary small', function () { setPin({ kind: 'item', id: item.id }); }));
      box.appendChild(row);
    });
    (S.requests || []).filter(function (r) { return r.state === 'waiting'; }).forEach(function (r) {
      var row = el('div', 'p2-ask is-request');
      var words = el('span');
      words.appendChild(el('strong', null, nameOf(r.user_id)));
      words.appendChild(document.createTextNode(' asks: ' + ASKS[r.kind] + (r.body ? ': ' + r.body : '')));
      row.appendChild(words);
      var acts = el('span', 'p2-ask-acts');
      acts.appendChild(button('Do it', 'btn-secondary small', function () { doRequest(r); }));
      acts.appendChild(button('Not now', 'btn-secondary small', function () { decide(r, 'declined'); }));
      row.appendChild(acts);
      box.appendChild(row);
    });
    if (S.studioKey) {
      var ed = el('div', 'p2-ask');
      ed.appendChild(el('span', null, 'Editing slides on your stage'));
      ed.appendChild(button('Done', 'btn-primary small', studioDone));
      box.appendChild(ed);
    }
    if (staged) {
      var on = el('div', 'p2-ask');
      on.appendChild(el('span', null, 'On the main stage'));
      on.appendChild(button('Take it down', 'btn-secondary small', function () {
        db.from('live_queue').update({ state: 'shown' }).eq('id', staged).then(function () { setPin(null); refreshLive(); });
      }));
      box.appendChild(on);
    }
    box.hidden = !box.children.length;
  }

  function drawBoardPin() {
    if (S.boardPin) S.boardPin.replaceChildren(stageToggle('board', undefined, 'Put the board on the main stage', 'Take the board down'));
  }
  // Tools as tiles: one tool at a time, and the way back to all of them.
  var TOOL_ICONS = { 'Main stage': 'app-window', 'Ask a question': 'chats-circle', 'Breakouts': 'users-three', 'Apps': 'laptop', 'A card for everyone': 'megaphone-simple',
    'Who is presenting': 'chalkboard-teacher', 'Waiting to show work': 'hand-tap', 'The board': 'palette', 'Questions': 'chat-circle-text', 'Recording': 'video-camera' };
  function toolList() {
    var pane = S.frame.pane('tools'), out = [];
    function add(name, node) { if (node && !node.hidden && name) out.push({ name: name, node: node }); }
    add('Main stage', S.stageTools); add('Ask a question', S.askTool); add('Breakouts', S.breakTool);
    if (S.appsBox && S.appsBox.childElementCount) add('Apps', S.appsBox);
    Array.prototype.forEach.call(S.frameTools.children, function (d) {
      var head = d.querySelector('summary');
      var name = head && head.firstChild ? head.firstChild.textContent.trim() : '';
      if (head && !d.hidden && name !== 'The thread') add(name, d);
    });
    return { pane: pane, list: out };
  }
  function drawTiles() {
    if (!S.teaching || !S.tiles) return;
    var t = toolList(), grid = S.tiles, open = t.pane.getAttribute('data-tool');
    grid.replaceChildren();
    t.list.forEach(function (x) {
      var b = el('button', 'p2-tile'); b.type = 'button';
      if (TOOL_ICONS[x.name]) b.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="/assets/icons.svg?v=20261022j#' + TOOL_ICONS[x.name] + '"/></svg>';
      b.appendChild(el('span', null, x.name));
      var n = x.node.querySelector && x.node.querySelector('summary .ui-count, summary [class*="badge"]');
      if (n && !n.hidden && n.textContent) b.appendChild(el('span', 'p2-tile-n', n.textContent));
      b.addEventListener('click', function () { openTool(x.name); });
      grid.appendChild(b);
    });
    if (open && !t.list.some(function (x) { return x.name === open; })) closeTool();
  }
  function openTool(name) {
    if (!S.tiles) return;
    S.frame.show('tools');
    var t = toolList(), one = t.list.filter(function (x) { return x.name === name; })[0];
    if (!one) return;
    t.list.forEach(function (x) { x.node.classList.toggle('is-tool', x === one); });
    if (one.node.tagName === 'DETAILS') one.node.open = true;
    t.pane.setAttribute('data-tool', name);
    S.toolBack.querySelector('span').textContent = name;
  }
  function closeTool() {
    var pane = S.frame.pane('tools');
    pane.removeAttribute('data-tool');
    pane.querySelectorAll('.is-tool').forEach(function (n) { n.classList.remove('is-tool'); });
  }
  // A leader puts anyone's app on every stage in one press.
  // A leader puts anyone's app on every stage in one press.
  function drawApps() {
    var box = S.appsBox;
    if (!box) return;
    box.replaceChildren();
    var rows = S.people.filter(function (p) { return p.app_url && L.classifyLink(p.app_url); });
    box.hidden = !rows.length;
    if (!rows.length) return;
    box.appendChild(el('p', 'kicker', 'Apps'));
    var ul = el('ul', 'roster-list');
    rows.forEach(function (p) {
      var li = el('li', 'roster-guest');
      li.appendChild(el('span', 'roster-name', S.names[p.user_id] || 'Someone'));
      var live = S.onStage && S.onStage.kind === 'item' && (S.items.filter(function (x) { return x.id === S.onStage.id; })[0] || {}).user_id === p.user_id;
      li.appendChild(button(live ? 'Take it down' : 'Show it', 'btn-secondary small', function () {
        if (live) return db.from('live_queue').update({ state: 'shown' }).eq('id', S.onStage.id).then(function () { setPin(null); refreshLive(); });
        db.rpc('queue_member_app', { s: S.session.id, member: p.user_id }).then(function (r) {
          if (r.error) return;
          refreshLive().then(function () { setPin({ kind: 'item', id: r.data }); drawApps(); });
        });
      }));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function drawChecksChrome() {
    var closingFirst = S.plan && S.plan.closingFirst;
    // The plan now has its own closing parts, so the two-at-once button is gone.
    $('[data-closing-wrap]').hidden = true;
    $('[data-ask-closing]').className = closingFirst ? 'btn-primary' : 'btn-secondary';
    // Before the closing part, the button sits below the checks.
    var wrap = $('[data-closing-wrap]'), pane = $('[data-questions]');
    if (closingFirst) pane.insertBefore(wrap, $('[data-checks]')); else pane.insertBefore(wrap, $('[data-ask-status]'));
  }

  function resultsOf(check) {
    return Q.results(check, S.results[check.id], { teaching: S.teaching });
  }

  function changeCheck(check, change) {
    return db.from('live_checks').update(change).eq('id', check.id).then(function (r) { if (!r.error) refreshLive(); });
  }

  function teacherCheck(k) {
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('p', 'kicker', L.questionKind(L.kindOf(k)).name));
    card.appendChild(el('h3', null, k.prompt));
    var mine = S.answers.filter(function (a) { return a.check_id === k.id; });
    var short = L.kindOf(k) === 'short';
    if (!short) card.appendChild(resultsOf(k));
    else { var pc = el('p', 'small', L.counted(mine.length, 'answer', 'answers') + ' '); pc.appendChild(window.UI.visibility('staff')); card.appendChild(pc); }
    if (mine.length) {
      var details = el('details', 'addon-answers');
      details.appendChild(el('summary', null, 'Read the answers'));
      var ul = el('ul', 'live-answers');
      mine.sort(function (a, b) { return a.updated_at.localeCompare(b.updated_at); }).forEach(function (a) {
        var li = el('li'); li.appendChild(el('strong', null, nameOf(a.user_id) + ': ')); li.appendChild(document.createTextNode(L.answerText(k, a) || ''));
        // A written answer can go on every stage, without its author's name
        // until the leader shows it (on_stage, migration 20261111070000).
        if (a.body && S.run && S.run.shared) {
          var up = S.onStage && S.onStage.kind === 'answer' && S.onStage.id === a.id;
          li.appendChild(document.createTextNode(' '));
          li.appendChild(button(up ? 'Take it down' : 'Put on stage', 'link-button', function () { setPin(up ? null : { kind: 'answer', id: a.id, named: false }); }));
          if (up) li.appendChild(button(S.onStage.named ? 'Hide the name' : 'Show the name', 'link-button', function () { setPin({ kind: 'answer', id: a.id, named: !S.onStage.named }); }));
        }
        ul.appendChild(li);
      });
      details.appendChild(ul);
      card.appendChild(details);
    }
    // A question asked again (R17): who changed their answer, for the
    // teacher alone, to ask them why.
    var RR = window.RerunLib;
    var first = k.rerun_of ? S.checks.filter(function (x) { return x.id === k.rerun_of; })[0] : null;
    if (RR && first) {
      var moved = RR.changes(first, k, S.answers, S.answers, L.answerText);
      var dm = el('details', 'addon-answers rerun-moved');
      dm.appendChild(el('summary', null, RR.changesLine(moved)));
      var ulm = el('ul', 'live-answers');
      moved.changed.forEach(function (c) {
        var li = el('li'); li.appendChild(el('strong', null, nameOf(c.user_id) + ': '));
        li.appendChild(document.createTextNode(c.from + ' → ' + c.to)); ulm.appendChild(li);
      });
      if (moved.changed.length) dm.appendChild(ulm);
      card.insertBefore(el('p', 'kicker rerun-kicker', 'Asked again'), card.firstChild);
      card.appendChild(dm);
    }
    var acts = el('div', 'actions');
    // The current part's own question is on the stage already.
    var own = partCheck();
    if (!own || own.id !== k.id) acts.appendChild(stageToggle('check', k.id, 'Put it on the main stage', 'Take it off the main stage'));
    var againStatus = el('span', 'ui-inline-status'); againStatus.setAttribute('role', 'status');
    if (RR && RR.canRerun(L.kindOf(k))) acts.appendChild(button('Ask it again', 'btn-secondary', function () {
      db.from('live_checks').insert(RR.againRow(k, { cohortId: S.cohort.id, sessionId: S.session.id, me: S.me.id })).then(function (r) {
        if (r.error) { againStatus.textContent = 'Not asked again: ' + r.error.message; return; }
        refreshLive();
      });
    }));
    if (!short) acts.appendChild(button(k.show_tally ? 'Hide the results' : 'Show everyone the results', 'btn-secondary', function () { changeCheck(k, { show_tally: !k.show_tally }); }));
    acts.appendChild(button('Close it', 'btn-secondary', function () { if (S.onStage && S.onStage.id === k.id) setPin(null); changeCheck(k, { state: 'closed' }); }));
    card.appendChild(acts);
    card.appendChild(againStatus);
    if (!mine.length && S.kinds) card.appendChild(editCheck(k));
    return card;
  }

  // A question asked in the moment can be changed until someone answers
  // it (the database says the same); the bank keeps its own copy.
  function editCheck(check) {
    var d = el('details', 'question-edit');
    d.appendChild(el('summary', null, 'Change the question'));
    var f = el('form', 'inline-form');
    var fl = Q.fields();
    fl.fill(L.questionFields(check));
    f.appendChild(fl.el);
    var acts = el('div', 'actions');
    var save = el('button', 'btn-secondary', 'Save the change'); save.type = 'submit';
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    acts.appendChild(save); acts.appendChild(status);
    f.appendChild(acts);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var p = L.parseQuestion(fl.read());
      if (p.error) { status.textContent = p.error; return; }
      status.textContent = 'Saving…';
      db.from('live_checks').update({ kind: p.kind, prompt: p.prompt, choices: p.choices, points: p.points }).eq('id', check.id).then(function (r) {
        status.textContent = r.error ? 'Not changed: ' + r.error.message : 'Changed.';
        if (!r.error) refreshLive();
      });
    });
    d.appendChild(f);
    return d;
  }

  function myAnswer(k) {
    return S.answers.filter(function (a) { return a.check_id === k.id && (a.user_id === S.me.id || a.via_guest === S.me.id); })[0];
  }
  function sendAnswer(k, row) {
    var answer = myAnswer(k);
    var write = answer
      ? db.from('live_answers').update(row).eq('id', answer.id)
      : db.from('live_answers').insert(Object.assign({ check_id: k.id, cohort_id: S.cohort.id, user_id: S.me.id }, row));
    return write.then(function (r) {
      if (r.error) return r.error.message;
      delete drafts[k.id]; refreshLive();
      return null;
    });
  }
  // What a person did on their own main stage, done here, where they are signed in.
  function saveDeck(key, text) {
    S.decks = S.decks || {}; S.decks[key] = text;
    return db.rpc('save_scene_deck', { scene: key, source: text }).then(function (r) { if (r.error) console.log('[addon] slides not saved: ' + r.error.message); });
  }
  function studioDone() {
    var key = S.studioKey, held = S.studioHeld;
    S.studioKey = null; S.studioHeld = null;
    (held != null ? saveDeck(key, held) : Promise.resolve()).then(function () { drawAsks(); sendStage(); });
  }
  function stageAct(a) {
    if (a.a === 'react' && S.classChannel) return S.classChannel.press({ key: String(a.key), target: {} });
    if (a.a === 'request' && !S.teaching && ASKS[a.kind]) return sendRequest(a.kind, a.body);
    if (a.a === 'deck' && S.teaching && a.key === S.studioKey) {
      // Half-typed words never reach a room that is watching this part.
      var watching = (partNow() || {}).key === a.key;
      if (watching) { S.studioHeld = String(a.text); return; }
      return saveDeck(a.key, String(a.text));
    }
    if (a.a !== 'answer' || S.teaching) return;
    var k = S.checks.filter(function (x) { return x.id === a.id && x.state === 'open'; })[0];
    if (!k) return;
    var row = L.answerRow(k, a.body != null ? { body: String(a.body) } : a.picks ? { picks: a.picks } : { choice: a.choice });
    if (row.error) return;
    if (row.value == null) delete row.value;
    sendAnswer(k, row);
  }

  function studentCheck(k) {
    var answer = S.answers.filter(function (a) { return a.check_id === k.id && (a.user_id === S.me.id || a.via_guest === S.me.id); })[0];
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('h3', null, k.prompt));
    var said = L.answerText(k, answer);
    if (said) card.appendChild(el('p', 'small', 'You answered: ' + said));
    card.appendChild(Q.answer(k, answer, {
      draft: drafts[k.id],
      onDraft: function (input) { drafts[k.id] = input; },
      onSend: function (row) { return sendAnswer(k, row); }
    }));
    if (k.show_tally && L.kindOf(k) !== 'short') card.appendChild(resultsOf(k));
    return card;
  }

  function drawChecks() {
    var open = S.checks.filter(function (k) { return k.state === 'open'; });
    var box = $('[data-checks]'); box.replaceChildren();
    if (!open.length) box.appendChild(el('p', 'small live-empty', S.teaching ? 'No question is open right now.' : 'No question is open right now. When your leader asks one, it appears here.'));
    open.forEach(function (k) { box.appendChild(S.teaching ? teacherCheck(k) : studentCheck(k)); });
  }

  // Asking questions, in order: a copy of each goes to everyone, so
  // changing one in the moment never changes the bank or the run of show.
  function ask(questions, statusBox) {
    var status = statusBox || $('[data-ask-status]');
    status.textContent = 'Asking…';
    return questions.reduce(function (p, q) {
      return p.then(function (r) {
        if (r && r.error) return r;
        return db.from('live_checks').insert(Q.askRow({
          cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, show_tally: !!q.show_tally,
          rerun_of: q.rerun_of || null
        }, q, S.kinds));
      });
    }, Promise.resolve(null)).then(function (r) {
      status.textContent = r && r.error ? 'Not asked: ' + r.error.message : questions.length > 1 ? 'Asked both.' : 'Asked.';
      if (!(r && r.error)) refreshLive();
      return !(r && r.error);
    });
  }
  $('[data-ask]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!askFields) return;
    var f = askFields.read();
    var parsed = L.parseQuestion(f);
    if (parsed.error) { $('[data-ask-status]').textContent = parsed.error; return; }
    ask([Object.assign({ question_id: f.question_id, show_tally: $('[data-ask-tally]').checked }, parsed)]).then(function (ok) {
      if (ok) { askFields.reset(); $('[data-ask-wrap]').open = false; }
    });
  });
  $('[data-ask-closing]').addEventListener('click', function () {
    ask(L.CLOSING_CHECKS.map(function (p) { return { kind: 'short', prompt: p }; }));
  });

  // The teacher's question bank (R4): their own questions and this
  // cohort's, to start a question from. Before the database has the bank,
  // the form works as before, without it.
  function startAsking() {
    if (!Q || askFields) return;
    Q.ready(db).then(function (ok) {
      S.kinds = ok;
      if (!ok) return { error: true, basic: true };
      return db.from('questions').select('id, cohort_id, kind, prompt, choices, points, updated_at').order('updated_at', { ascending: false });
    }).then(function (r) {
      var bank = r.error ? [] : (r.data || []).filter(function (q) { return !q.cohort_id || q.cohort_id === S.cohort.id; });
      askFields = Q.fields({ bank: bank, basic: !S.kinds });
      $('[data-ask-fields]').replaceChildren(askFields.el);
    });
  }

  // A question scene in the run of show holds the question the teacher
  // planned. When it is the current scene, the teacher asks it in one
  // press, and the panel says so once it has been asked.
  function drawSceneQuestion() {
    var box = $('[data-scene-question]');
    var part = partNow();
    var q = S.teaching && part && part.own && part.kind === 'question' ? L.fromScene(part.config) : null;
    box.hidden = !q;
    box.replaceChildren();
    if (!q) return;
    var asked = (S.checks || []).some(function (k) { return k.prompt === q.prompt && k.state === 'open'; });
    // Once asked, the question's own card below is the one place for it.
    box.hidden = asked;
    if (asked) return;
    box.appendChild(el('p', 'kicker', 'Planned for this part, ' + L.questionKind(q.kind).name.toLowerCase()));
    box.appendChild(el('p', 'live-what', q.prompt));
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    var acts = el('div', 'actions');
    acts.appendChild(button('Ask it now', 'btn-primary', function () {
      ask([Object.assign({ show_tally: $('[data-ask-tally]').checked }, q)], status);
    }));
    acts.appendChild(status);
    box.appendChild(acts);
  }

  // Moving to a question part asks its planned question, once: the main
  // stage already shows it, and learners' panels said no question was
  // open (found in the live Meet test). Only the leader who moved asks,
  // so two leaders never ask it twice; closed, it stays closed.
  // A Writing part asks in words too: its stage says to write, and the
  // panel has to give the place to do it (found in a real call: it gave none).
  function plannedAsk(part) {
    if (part.kind === 'question') return L.fromScene(part.config);
    if (part.kind === 'reflection') return L.fromScene(Object.assign({}, part.config, { kind: 'short' }));
    return null;
  }
  // A part that asks an earlier part's question again (scenes.config.rerun_of,
  // Course Builder's Repoll): the first time's question, and this time's copy.
  function rerunPair(part) {
    var ref = part && part.config && part.config.rerun_of;
    var earlier = ref ? (S.list || []).filter(function (x) { return x.key === ref; })[0] : null;
    var q = earlier ? plannedAsk(earlier) : null;
    var first = q ? (S.checks || []).filter(function (k) { return k.prompt === q.prompt && !k.rerun_of; })[0] || null : null;
    var again = first ? (S.checks || []).filter(function (k) { return k.rerun_of === first.id; })[0] || null : null;
    return ref ? { first: first, again: again } : null;
  }
  function askPlanned() {
    var part = partNow();
    if (!S.teaching || !part || !part.own) return;
    var q = plannedAsk(part);
    // The question another part asked closes, so learners only ever face
    // what this part asks, on every kind of part (found in a real call: a
    // Writing part's panel still showed the question from a part left
    // behind). Answers stay, and a question asked by hand stays open.
    var planned = (S.list || []).filter(function (x) { return x.own && x.key !== part.key; })
      .map(function (x) { var p = plannedAsk(x); return p ? p.prompt : null; });
    (S.checks || []).forEach(function (k) {
      if (k.state === 'open' && !(q && k.prompt === q.prompt) && planned.indexOf(k.prompt) >= 0) {
        if (S.onStage && S.onStage.id === k.id) setPin(null);
        changeCheck(k, { state: 'closed' });
      }
    });
    // A part showing an earlier question's answers lets everyone see the counts.
    var shown = resultsCheck(part);
    if (shown && !shown.show_tally) changeCheck(shown, { show_tally: true });
    if (!q) return;
    var pair = rerunPair(part);
    if (pair) {
      if (pair.first && pair.first.state === 'open') changeCheck(pair.first, { state: 'closed' });
      if (pair.again) { if (pair.again.state !== 'open') changeCheck(pair.again, { state: 'open' }); return; }
      if (!pair.first || S.autoAsked[part.key]) return;
      S.autoAsked[part.key] = true;
      var tallyAgain = part.config && typeof part.config.show_tally === 'boolean' ? part.config.show_tally : $('[data-ask-tally]').checked;
      ask([Object.assign({ show_tally: tallyAgain, rerun_of: pair.first.id }, q)]);
      return;
    }
    // Coming back to a part opens its question again, with its answers
    // (found in the live Meet test: Back showed a question no one could
    // answer); a first arrival asks it, once.
    var mine = (S.checks || []).filter(function (k) { return k.prompt === q.prompt; })[0];
    if (mine) { if (mine.state !== 'open') changeCheck(mine, { state: 'open' }); return; }
    if (S.autoAsked[part.key]) return;
    S.autoAsked[part.key] = true;
    // Its own card says it is open, so only a problem leaves a line.
    var said = el('span');
    var tally = part.config && typeof part.config.show_tally === 'boolean' ? part.config.show_tally : $('[data-ask-tally]').checked;
    Promise.resolve(ask([Object.assign({ show_tally: tally }, q)], said)).then(function () {
      if (/^Not asked/.test(said.textContent)) $('[data-ask-status]').textContent = said.textContent;
    });
  }

  // After a leader moves the show: the new part in view (found in the
  // live Meet test: the panel stayed where the button was, parts away),
  // and its planned question asked.
  function afterMove() {
    if (S.newPanel) S.frame.show('now');
    var now = root.querySelector('[data-show] [aria-current="step"]');
    if (now && now.scrollIntoView) now.scrollIntoView({ block: 'start', behavior: 'smooth' });
    askPlanned();
  }

  // ------------------------------------------------------------------
  // The main stage: opened by the teacher, and told what to show. Meet
  // delivers these messages only to this same person's stage.
  // ------------------------------------------------------------------

  // The main stage follows the current scene (R3), as the class builder
  // previews it; while the teacher edits a scene, their own stage shows
  // the words as they type, before anyone else sees them.
  function currentView() {
    var part = partNow();
    var scene = null;
    if (part && SL && V && (shared() || part.own)) {
      var s = S.draft && S.draft.key === part.key ? V.draft(part, S.draft.fields) : part;
      scene = SL.stagePreview(V.asRow(s));
      // A design scene puts the board itself on the main stage (R5): the
      // room's own board in a trio's call, the session's in the main room.
      if (s.kind === 'design') {
        var links = A.boardLinks(S.cohort, S.session, S.room.groupId, (s.config || {}).template);
        if (links) scene.board = links.stage;
      }
    }
    return A.stageView({
      part: part ? { key: part.key, name: part.name, endsAt: endsNow() } : null,
      // A card outranks the part's own question; only a leader's own pin
      // outranks the card.
      card: S.onStage ? null : S.card || null,
      answerable: !S.teaching,
      studio: S.studioKey ? { key: S.studioKey, text: S.studioHeld != null ? S.studioHeld : (S.decks || {})[S.studioKey] || (sceneOf(S.studioKey) || {}).slides || '', gh: window.SlidesLib ? window.SlidesLib.ghAll() : {} } : null,
      boardStage: (A.boardLinks(S.cohort, S.session, null, null) || {}).stage,
      mineOf: function (k) { var x = myAnswer(k); return x ? { choice: x.choice, picks: Array.isArray(x.value) ? x.value : undefined, body: x.body } : null; },
      onStage: S.onStage || (S.card ? null : partCheckPin()), checks: S.checks, results: S.results, items: S.items, names: S.names, audience: V ? V.audienceOf(part) : null,
      welcome: lib.welcome(S.cohort, S.session, S.list && S.list.length ? S.list : S.parts), scene: scene, slides: slidesView(part),
      doc: part && part.own && part.config && part.config.show ? part.config.show : null,
      onStageDetail: S.onStageDetail || null,
      path: window.RosterLib && S.onStage && S.onStage.kind === 'path' ? window.RosterLib.pathView(rosterNow()) : null,
      rooms: S.onStage && S.onStage.kind === 'rooms' ? Object.keys(S.roomPlaces).map(function (k) { return S.roomPlaces[k]; }) : null
    });
  }
  // A question part's own question is what its stage shows, with the
  // count once the leader shows results (found in the live Meet test:
  // Show everyone the results left the stage on the bare choices).
  function partCheck() {
    var part = partNow();
    if (!part || !part.own) return null;
    if (part.kind === 'question') {
      var pair = rerunPair(part);
      if (pair) return pair.again && pair.again.state === 'open' ? pair.again : null;
      var q = L.fromScene(part.config);
      return q ? (S.checks || []).filter(function (k) { return k.state === 'open' && k.prompt === q.prompt && !k.rerun_of; })[0] || null : null;
    }
    return resultsCheck(part);
  }
  // The question an earlier part asked, for a part that shows its answers
  // (scenes.config.results_of, from Course Builder's poll results).
  function resultsCheck(part) {
    var ref = part && part.config && part.config.results_of;
    var target = ref ? (S.list || []).filter(function (x) { return x.key === ref; })[0] : null;
    var q = target ? plannedAsk(target) : null;
    return q ? (S.checks || []).filter(function (k) { return k.prompt === q.prompt; })[0] || null : null;
  }
  function partCheckPin() {
    var part = partNow(), k = partCheck();
    if (!k) return null;
    return part.kind === 'question' ? { kind: 'check', id: k.id } : { kind: 'check', id: k.id, results: true };
  }
  function sendStage() {
    drawWelcomeToggle();
    if (!S.stageOn || !side || !S.session) return;
    try { Promise.resolve(side.notifyMainStage(A.stageMessage(currentView(), !!S.recording, !S.teaching))).catch(function () {}); } catch (e) {}
  }
  // Start the session: the first part, with its clock running.
  $('[data-start-session]').addEventListener('click', function () {
    var first = (S.list || S.parts || [])[0];
    if (!first) return;
    if (shared()) S.run.go(first.key).then(function () { return S.run.clock(true); });
    else { S.chosenPart = first.key; drawPart(true); }
  });
  $('[data-open-stage]').addEventListener('click', function () {
    var status = $('[data-stage-status]');
    status.textContent = 'Opening the main stage…';
    // Both addresses: Meet opens for someone joining only the frames named
    // here, and a stage with no panel beside it has nothing to show (found
    // in Week 1: learners got a stage that never left its welcome line, and
    // had to open the panel by hand).
    Promise.resolve(side.startActivity({ mainStageUrl: location.origin + '/addon/stage/', sidePanelUrl: location.origin + '/addon/' })).then(function () {
      S.stageOn = true;
      stageButtons(true);
      status.textContent = 'The main stage is open. Ask everyone to press Join activity at the top of Meet.';
    }, function (err) {
      status.textContent = A.stageError(err);
    });
  });

  // Closing the stage ends Meet's activity, which only the leader who
  // opened it can do (found in Prep's recording, October 28: "can I turn
  // off the main stage? ... If I press Stop, what happens? Nope.").
  function stageButtons(open) {
    if (!S.teaching || standalone) return;
    $('[data-open-stage]').hidden = !!open;
    $('[data-close-stage]').hidden = !open;
  }
  $('[data-close-stage]').addEventListener('click', function () {
    var status = $('[data-stage-status]');
    Promise.resolve(side && side.endActivity ? side.endActivity() : Promise.reject(new Error('Meet cannot close it from here'))).then(function () {
      S.stageOn = false;
      stageButtons(false);
      status.textContent = 'The main stage is closed.';
    }, function (err) {
      status.textContent = 'The main stage did not close: ' + (err && err.message ? err.message : 'only the leader who opened it can close it') + '. Use End activity in Meet.';
    });
  });

  // ------------------------------------------------------------------
  // Hearing about changes (as on /live/)
  // ------------------------------------------------------------------

  function nudge() { clearTimeout(nudgeTimer); nudgeTimer = setTimeout(refreshLive, 300); }
  function poll(on) {
    if (on && !poller) poller = setInterval(refreshLive, POLL);
    if (!on && poller) { clearInterval(poller); poller = null; }
    $('[data-sync]').textContent = on ? 'This panel checks for changes every fifteen seconds.' : '';
  }
  function listen() {
    if (channel || !db.channel) return poll(true);
    var f = 'cohort_id=eq.' + S.cohort.id;
    channel = db.channel('addon:' + S.cohort.id);
    ['live_queue', 'live_checks', 'live_answers', 'live_requests'].forEach(function (t) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: f }, nudge);
    });
    poll(true);
    channel.subscribe(function (status) {
      if (status === 'SUBSCRIBED') { poll(false); refreshLive(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') poll(true);
    });
  }

  // ------------------------------------------------------------------
  // Opening
  // ------------------------------------------------------------------

  function offerOneTap() {
    if (!window.HSGoogle || !GL) return;
    window.HSGoogle.mount({
      db: db, prompt: true,
      onSession: function (s) { if (s) proceed(s); },
      onError: function (e) { console.log('[addon] one tap: ' + (e && e.message ? e.message : e)); }
    });
  }
  function asGuest() {
    return db.auth.signInAnonymously().then(function (r) {
      if (r.error || !r.data || !r.data.session) { console.log('[addon] guest: ' + (r.error ? r.error.message : 'no session')); return signedOut(); }
      proceed(r.data.session);
      return true;
    }, function () { signedOut(); });
  }
  $('[data-as-guest]').addEventListener('click', function () {
    if (openCode) return show('open');
    if (S.me) return show('ready');
    try { localStorage.removeItem(OUT); } catch (e) {}
    show('loading');
    asGuest();
  });
  function open() {
    show('loading');
    if (!cfg.cloudProjectNumber) return fail('This add-on is not set up yet: it needs its Google Cloud project number in assets/addon-config.js.');
    withTimeout(window.meet.addon.createAddonSession({ cloudProjectNumber: String(cfg.cloudProjectNumber) }), 10000).then(function (session) {
      return session.createSidePanelClient();
    }).then(function (client) {
      side = client;
      side.on('frameToFrameMessage', function (m) {
        if (m && opened && opened.frame(m.payload)) return;
        if (m && A.isHello(m.payload)) { S.stageOn = true; stageButtons(true); sendStage(); S.codeStageSent = null; drawCode(); }
        var did = m && A.readAct(m.payload);
        if (did) stageAct(did);
        var key = m && A.readKey(m.payload);
        if (key && S.classChannel) S.classChannel.press(key);
      });
      return signIn().then(function (s) {
        if (s) return proceed(s);
        return strangerCall().then(function (code) {
          if (code) { openRoom(code); offerOneTap(); return; }
          return cohortGuest();
        });
      });
    }, function () {
      show('outside');
    });
  }
  // Before anyone signs in or becomes a guest: is this a cohort's call? If the
  // answer does not come, the panel carries on as it would for a cohort.
  function strangerCall() {
    return Promise.resolve().then(function () { return side.getMeetingInfo(); }).then(function (m) {
      var code = A.meetingCode(m && m.meetingCode);
      if (!code) return null;
      return db.rpc('is_cohort_call', { code: code }).then(function (r) { return !r.error && r.data === false ? code : null; });
    }).catch(function () { return null; });
  }
  function cohortGuest() {
        if (signedOutOnPurpose()) return signedOut();
        // No sign-in here: come in as a guest, with no screen in the way.
        // One Tap rides on top, as Google's listing rule asks, and closes.
        return asGuest().then(function (came) { if (came) offerOneTap(); });
  }
  $('[data-reload]').addEventListener('click', function () { if (S.me) start({ user: S.me }); else if (standalone) openStandalone(); else open(); });
  // Outside Meet there is no main stage to open, and the sign-in is this
  // site's own.
  function openStandalone() {
    show('loading');
    return sessionOf(db).then(function (s) { if (s) proceed(s); else signedOut(); });
  }
  if (standalone) openStandalone(); else open();
})();
