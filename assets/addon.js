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
  var popup = null, popupWatch = null;

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
        if (s) { db = client; return s; }
        if (!quiet) status.textContent = 'You are not signed in on humanshaped.org in this browser yet, so sign in with GitHub in a small window instead.';
        return null;
      });
    });
  }

  // After Sign out, the panel stays signed out until the person signs in
  // again, rather than quietly borrowing the site's sign-in.
  var OUT = 'hs-addon-signed-out';
  function signedOutOnPurpose() { try { return localStorage.getItem(OUT) === '1'; } catch (e) { return false; } }
  function signIn() {
    return sessionOf(db).then(function (s) { return s || (signedOutOnPurpose() ? null : useSiteSignIn(true)); });
  }

  // Google sign-in beside GitHub (DECISIONS.md): signed out, the panel
  // offers Google's One Tap and its button (what Meet asks of add-ons),
  // beside GitHub. Someone signed in without GitHub links it once in a
  // small window, because cohorts work through GitHub.
  var GL = window.GoogleSignInLib;
  var current = null;      // the session to lend the link window
  function signedOut() {
    show('signed-out');
    if (!window.HSGoogle || !GL) return;
    window.HSGoogle.mount({
      db: db, button: $('[data-google-signin]'), prompt: true,
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      onSession: function (s) { if (s) proceed(s); },
      onError: function (e) { $('[data-signin-status]').textContent = 'Google sign-in did not finish: ' + (e && e.message ? e.message : e) + '.'; }
    });
  }
  function proceed(session) {
    current = session;
    try { localStorage.removeItem(OUT); } catch (e) {}
    // A tab without a GitHub token gets a fresh one first (GitHubToken).
    if (window.GitHubToken) window.GitHubToken.ensure(db, session);
    if (!GL) return start(session);
    return db.from('profiles').select('github_login').eq('id', session.user.id).maybeSingle().then(function (p) {
      if (!p.error && GL.needsGitHub(p.data)) return show('link-github');
      start(session);
    }, function () { start(session); });
  }

  root.querySelectorAll('[data-sign-out]').forEach(function (b) {
    b.addEventListener('click', function () {
      try { localStorage.setItem(OUT, '1'); } catch (e) {}
      if (window.google && window.google.accounts && window.google.accounts.id) window.google.accounts.id.disableAutoSelect();
      (window.GitHubToken ? window.GitHubToken.forget(db) : Promise.resolve()).catch(function () {})
        .then(function () { return db.auth.signOut({ scope: 'local' }); }).catch(function () {})
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
    popup = window.open('/account/?handoff=meet', 'hs-signin', 'popup,width=480,height=720');
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

  function nameOf(id) { return S.me && id === S.me.id ? 'You' : (S.names[id] || 'Someone'); }

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
  function findCohort(code) {
    var like = '%' + code + '%';
    return Promise.all([
      db.from('sessions').select('id, cohort_id, meet_url').ilike('meet_url', like),
      db.from('groups').select('id, cohort_id, name, meet_url').ilike('meet_url', like),
      db.from('cohort_teachers').select('cohort_id').eq('user_id', S.me.id),
      db.from('cohorts').select('id').eq('details->>any_call', 'true')
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) return fail('The panel could not look up this call: ' + bad.error.message);
      var room = A.findRoom(code, { sessions: res[0].data, groups: res[1].data, teaching: res[2].data.map(function (t) { return t.cohort_id; }),
        anyCall: res[3].data.map(function (c) { return c.id; }) });
      if (!room) {
        $('[data-no-room-text]').textContent = 'This call’s code is ' + code + '. Each session’s call is the Meet link on its calendar invitation and its session page; open the panel from that call.';
        return show('no-room');
      }
      S.room = room;
      return loadCohort(room.cohortId);
    });
  }

  function loadCohort(id) {
    return db.from('cohorts').select('*').eq('id', id).maybeSingle().then(function (c) {
      if (c.error || !c.data) return fail('This cohort could not be opened' + (c.error ? ': ' + c.error.message : '.'));
      var cohort = c.data;
      return Promise.all([
        db.from('sessions').select('*').eq('cohort_id', id).order('number'),
        db.from('enrollments').select('user_id, app_url, profiles(github_login, display_name)').eq('cohort_id', id).neq('status', 'left'),
        db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', id),
        db.from('groups').select('*, group_members(user_id)').eq('cohort_id', id).order('name')
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
        var t = lib.currentAndNext(ss, new Date(), cohort.session_minutes);
        var named = standalone && standaloneNumber != null ? ss.filter(function (x) { return x.number === standaloneNumber; })[0] : null;
        S.session = named || (t.live ? t.next : (t.next || t.current));
        S.prev = ss.filter(function (x) { return x.number === S.session.number - 1; })[0] || null;
        S.parts = lib.agenda(cohort.session_minutes);
        var since = S.prev && S.prev.starts_at ? S.prev.starts_at : new Date(Date.now() - 8 * 86400000).toISOString();
        return db.from('shares').select('*').eq('cohort_id', id).eq('kind', 'bring-back').gte('created_at', since).order('created_at', { ascending: false }).then(function (sh) {
          S.brought = sh.data || [];
          drawFrame();
          startShow();
          startRooms();
          startSignals(res[2].data);
          startClass();
          // Reactions and stance are for the people in the session, not
          // the leader running it.
          if (S.teaching) $('[data-react]').hidden = true;
          drawCode();
          startChat();
          startRecognition();
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
    S.show = window.ShowView.mount({
      mount: $('[data-show]'), parts: S.list, teaching: S.teaching,
      // What does not apply to this cohort stays out of sight: rooms
      // without groups, a board without a board part (JOURNEYS.md).
      unavailable: function () {
        var off = [];
        off.push('cue-talk');
        if (!S.groups.length) off.push('rooms', 'cue-rooms', 'brought');
        var list = S.list || S.parts || [];
        if (!list.some(function (x) { return x.kind === 'design' || x.key === 'prompt'; })) off.push('design');
        return off;
      },
      stuck: window.CurriculumPagesLib && S.session ? window.CurriculumPagesLib.stuckFor(S.session.number) : null,
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

  function startClass() {
    if (!window.ClassChannel || S.classChannel) return;
    S.classChannel = window.ClassChannel.start({
      db: db, auth: current, cohort: S.cohort, me: S.me, name: S.names[S.me.id] || null,
      mount: $('[data-react]'),
      onStage: function (payload) {
        if (!S.stageOn || !side) return;
        try { Promise.resolve(side.notifyMainStage(payload)).catch(function () {}); } catch (e) {}
      },
      onPresence: function (state) {
        S.presence = state;
        drawRoster();
        drawCode();
        if (S.onStage && S.onStage.kind === 'path') sendStage();
      }
    });
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
    return RL.roster(people, S.presence || {}, S.answers, RL.askingNow(S.checks, S.onStage));
  }

  // The teacher's roster: one line, opened for names. It is drawn from
  // presence while the call runs, and it never writes anything down.
  function drawRoster() {
    var box = $('[data-roster]'), RL = window.RosterLib;
    if (!S.teaching || !RL || !box) return;
    var r = rosterNow(), asking = RL.askingNow(S.checks, S.onStage);
    box.hidden = false;
    var open = box.querySelector('details') && box.querySelector('details').open;
    box.replaceChildren();
    var d = el('details'); d.open = !!open;
    d.appendChild(el('summary', null, RL.summary(r, asking)));
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
    var acts = el('div', 'actions');
    acts.appendChild(stageToggle('path', undefined, 'Put the path on the main stage', 'Take it off the main stage'));
    d.appendChild(acts);
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
      // A card a leader shows goes on the main stage too, the one place
      // the whole call is looking (found in the loop's live Meet test: it
      // reached learners' panels and nowhere else).
      onChange: function (st) {
        var c = st && st.card ? { id: st.card.id, body: st.card.body, endsAt: st.card.ends_at ? Date.parse(st.card.ends_at) : null } : null;
        var rec = !!(st && st.recording);
        if (JSON.stringify(c) === JSON.stringify(S.card || null) && rec === !!S.recording) return;
        S.card = c; S.recording = rec; sendStage();
      },
      nameOf: nameOf, people: people, roomMinutes: function () { var r = roomsScene(); return r && r.minutes ? r.minutes : (show ? show.minutes : 25); },
      mounts: {
        recording: $('[data-sig-recording]'), where: $('[data-sig-where]'), card: $('[data-sig-card]'), stage: $('[data-sig-stage]'),
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
    $('[data-where]').textContent = (window.CohortLib ? window.CohortLib.sessionName(S.session.number) : 'Week ' + S.session.number) + (group ? ', ' + group.name + '’s room' : S.groups.length ? ', the main room' : '') + (S.teaching ? '. You are leading.' : '.') + (S.room.ambiguous ? ' Another cohort uses this call too.' : '');
    var full = $('[data-full-link]'); full.href = '/session/?c=' + encodeURIComponent(S.cohort.slug) + '&s=' + S.session.number;
    // Outside Meet, this page already is the browser tab.
    full.hidden = standalone;
    if (standalone) document.title = (window.CohortLib ? window.CohortLib.sessionName(S.session.number) : 'Week ' + S.session.number) + ', ' + S.cohort.title + ' | Human Shaped';
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
    if (shared()) S.onStage = V.pinOf(S.run.state());
    $('[data-timer]').hidden = shared();
    $('[data-next-part]').hidden = shared();
    if (changed) { S.drawnPart = undefined; S.show.setScenes(S.list); }
    drawPart(true);
    drawQueue(); drawChecks();
    if (S.checks) drawSceneQuestion();
    drawBoardActivity();
    if (S.rooms && S.rooms.setPlan) S.rooms.setPlan({ turn: L.roomTurn(roomsScene(), 3), prompt: roomsPrompt() });
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
    S.show.tick({ left: V.leftText(left), clockOn: left != null, pinned: pinnedText() });
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
    // Opened mid-session, the panel starts at the part that is on (found
    // in the live Meet test: it opened at the top of the plan).
    if (key && !S.shownNow) {
      S.shownNow = true;
      setTimeout(function () { var it = root.querySelector('[data-show] [aria-current="step"]'); if (it && it.scrollIntoView) it.scrollIntoView({ block: 'start' }); }, 300);
    }
  }

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
      wrap.appendChild(el('p', 'kicker', 'What ' + (S.teaching ? 'you' : 'your leader') + ' heard in week ' + S.prev.number + '’s checks'));
      heard.split(/\n{2,}/).forEach(function (para) { wrap.appendChild(el('p', null, para)); });
      box.appendChild(wrap);
    } else if (S.teaching && S.prev) {
      var hint = el('p', 'small');
      hint.appendChild(document.createTextNode('What you heard in week ' + S.prev.number + '’s checks shows here once you write it '));
      hint.appendChild(newTab(Object.assign(el('a', null, 'in Sessions'), { href: '/cohort/?c=' + encodeURIComponent(S.cohort.slug) + '&t=sessions' })));
      hint.appendChild(document.createTextNode('.'));
      box.appendChild(hint);
    }
  }

  // The room board (C2): every group for a teacher in the main room, the
  // group alone in a group's own room, and your own group otherwise.
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

  // During "Show what you brought back", and always in a group's room:
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
      db.from('live_answers').select('*').eq('cohort_id', S.cohort.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { $('[data-sync]').textContent = 'The panel could not read the latest changes: ' + bad.error.message; return; }
      S.items = res[0].data; S.checks = res[1].data; S.answers = res[2].data;
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
  function setPin(v) {
    S.onStage = v;
    if (S.run && S.run.shared && S.teaching) S.run.pin(v);
    drawQueue(); drawChecks(); drawRoster(); drawRoomsToggle(); sendStage(); drawRunInfo();
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
        acts.appendChild(button(item.user_id === S.me.id ? 'I have shown it' : 'They have shown it', 'btn-secondary', function () {
          if (S.onStage && S.onStage.id === item.id) setPin(null);
          db.from('live_queue').update({ state: 'shown' }).eq('id', item.id).then(function (r) { if (!r.error) refreshLive(); });
        }));
      }
      li.appendChild(acts);
      list.appendChild(li);
    });
    $('[data-shown-count]').textContent = q.shown.length ? L.counted(q.shown.length, 'presentation', 'presentations') + ' so far.' : '';
    drawAskToShow(q);
  }

  // A learner's own way into the queue (found in the test cohort: the
  // panel showed who was waiting but gave a learner no way to ask). One
  // link, their app's address to start with, and what to look at.
  function drawAskToShow(q) {
    var box = $('[data-ask-show]');
    if (!box) { box = el('div', 'live-ask-show'); box.setAttribute('data-ask-show', ''); $('[data-wings]').appendChild(box); }
    box.replaceChildren();
    if (S.teaching) return;
    var mine = q.waiting.filter(function (x) { return x.user_id === S.me.id; })[0];
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
      db.from('live_queue').insert({ cohort_id: S.cohort.id, session_id: S.session.id, user_id: S.me.id, kind: c.kind, url: c.url, note: note.value.trim() || null }).then(function (r) {
        go.disabled = false;
        if (r.error) { said.textContent = 'Not added: ' + r.error.message; return; }
        refreshLive();
      });
    });
    box.appendChild(f);
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
        var li = el('li'); li.appendChild(el('strong', null, nameOf(a.user_id) + ': ')); li.appendChild(document.createTextNode(L.answerText(k, a) || '')); ul.appendChild(li);
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

  function studentCheck(k) {
    var answer = S.answers.filter(function (a) { return a.check_id === k.id && a.user_id === S.me.id; })[0];
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('h3', null, k.prompt));
    var said = L.answerText(k, answer);
    if (said) card.appendChild(el('p', 'small', 'You answered: ' + said));
    card.appendChild(Q.answer(k, answer, {
      draft: drafts[k.id],
      onDraft: function (input) { drafts[k.id] = input; },
      onSend: function (row) {
        var write = answer
          ? db.from('live_answers').update(row).eq('id', answer.id)
          : db.from('live_answers').insert(Object.assign({ check_id: k.id, cohort_id: S.cohort.id, user_id: S.me.id }, row));
        return write.then(function (r) {
          if (r.error) return r.error.message;
          delete drafts[k.id]; refreshLive();
          return null;
        });
      }
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
          cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, show_tally: !!q.show_tally
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
  function askPlanned() {
    var part = partNow();
    if (!S.teaching || !part || !part.own || part.kind !== 'question') return;
    var q = L.fromScene(part.config);
    if (!q) return;
    // The question an earlier part asked closes, so learners face one at a
    // time (found in the live Meet test: two were open at once). Answers
    // stay, and a question the leader asked by hand stays open.
    var planned = (S.list || []).filter(function (x) { return x.own && x.kind === 'question' && x.key !== part.key; })
      .map(function (x) { var p = L.fromScene(x.config); return p ? p.prompt : null; });
    (S.checks || []).forEach(function (k) {
      if (k.state === 'open' && k.prompt !== q.prompt && planned.indexOf(k.prompt) >= 0) {
        if (S.onStage && S.onStage.id === k.id) setPin(null);
        changeCheck(k, { state: 'closed' });
      }
    });
    // Coming back to a part opens its question again, with its answers
    // (found in the live Meet test: Back showed a question no one could
    // answer); a first arrival asks it, once.
    var mine = (S.checks || []).filter(function (k) { return k.prompt === q.prompt; })[0];
    if (mine) { if (mine.state !== 'open') changeCheck(mine, { state: 'open' }); return; }
    if (S.autoAsked[part.key]) return;
    S.autoAsked[part.key] = true;
    // Its own card says it is open, so only a problem leaves a line.
    var said = el('span');
    Promise.resolve(ask([Object.assign({ show_tally: $('[data-ask-tally]').checked }, q)], said)).then(function () {
      if (/^Not asked/.test(said.textContent)) $('[data-ask-status]').textContent = said.textContent;
    });
  }

  // After a leader moves the show: the new part in view (found in the
  // live Meet test: the panel stayed where the button was, parts away),
  // and its planned question asked.
  function afterMove() {
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
      onStage: S.onStage || (S.card ? null : partCheckPin()), checks: S.checks, results: S.results, items: S.items, names: S.names, audience: V ? V.audienceOf(part) : null,
      welcome: lib.welcome(S.cohort, S.session, S.list && S.list.length ? S.list : S.parts), scene: scene,
      path: window.RosterLib && S.onStage && S.onStage.kind === 'path' ? window.RosterLib.pathView(rosterNow()) : null,
      rooms: S.onStage && S.onStage.kind === 'rooms' ? Object.keys(S.roomPlaces).map(function (k) { return S.roomPlaces[k]; }) : null
    });
  }
  // A question part's own question is what its stage shows, with the
  // count once the leader shows results (found in the live Meet test:
  // Show everyone the results left the stage on the bare choices).
  function partCheck() {
    var part = partNow();
    if (!part || !part.own || part.kind !== 'question') return null;
    var q = L.fromScene(part.config);
    return q ? (S.checks || []).filter(function (k) { return k.state === 'open' && k.prompt === q.prompt; })[0] || null : null;
  }
  function partCheckPin() { var k = partCheck(); return k ? { kind: 'check', id: k.id } : null; }
  function sendStage() {
    drawWelcomeToggle();
    if (!S.stageOn || !side || !S.session) return;
    try { Promise.resolve(side.notifyMainStage(A.stageMessage(currentView(), !!S.recording))).catch(function () {}); } catch (e) {}
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
    Promise.resolve(side.startActivity({ mainStageUrl: location.origin + '/addon/stage/' })).then(function () {
      S.stageOn = true;
      stageButtons(true);
      status.textContent = 'The main stage is open. Meet asks everyone in the call to join it.';
    }, function (err) {
      status.textContent = 'The main stage did not open: ' + (err && err.message ? err.message : 'Meet gave no reason') + '.';
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
    ['live_queue', 'live_checks', 'live_answers'].forEach(function (t) {
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

  function open() {
    show('loading');
    if (!cfg.cloudProjectNumber) return fail('This add-on is not set up yet: it needs its Google Cloud project number in assets/addon-config.js.');
    withTimeout(window.meet.addon.createAddonSession({ cloudProjectNumber: String(cfg.cloudProjectNumber) }), 10000).then(function (session) {
      return session.createSidePanelClient();
    }).then(function (client) {
      side = client;
      side.on('frameToFrameMessage', function (m) {
        if (m && A.isHello(m.payload)) { S.stageOn = true; stageButtons(true); sendStage(); S.codeStageSent = null; drawCode(); }
      });
      return signIn().then(function (s) { if (s) proceed(s); else signedOut(); });
    }, function () {
      show('outside');
    });
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
