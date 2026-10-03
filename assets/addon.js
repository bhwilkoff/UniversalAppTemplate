// The Meet add-on's side panel (/addon/), inside Google Meet.
//
// I want the teacher to be able to run a session from inside Meet,
// without a second window, and without the panel ever asking which
// cohort this is: Meet tells it the call's code (getMeetingInfo), and the
// code is in the meet_url of the cohort's sessions, or of one group's room
// (AddonLib.findRoom). The panel is a small launcher of activities (the
// session now, the queue, and the checks), so new tools can slot in
// later beside them (ACTIVITIES, below).
//
// Signing in. Meet frames this page, so its storage is kept apart from
// humanshaped.org's (storage partitioning), and GitHub cannot be framed.
// So, in order: a session this panel already has; the Storage Access API,
// which lets the panel use the humanshaped.org sign-in this browser
// already has; a small window to /account/?handoff=meet that signs in and
// hands the session back with postMessage (this origin only, from the
// window it opened, and only the two Supabase tokens); and, if none of
// those work, a link to open the live page in a new tab.
//
// What it never does: record, measure, or join the call as a
// participant. It reads the meeting code and nothing else from Meet.
(function () {
  var root = document.querySelector('[data-addon]');
  if (!root) return;
  var A = window.AddonLib, lib = window.CohortLib, L = window.LiveLib;
  var cfg = window.MEET_ADDON || {};
  var POLL = 15000;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function newTab(a) { a.target = '_blank'; a.rel = 'noopener'; return a; }

  if (!window.supabase || !window.HUB || !A || !lib || !L) return fail('The panel could not load all of its parts. Close it and open it again.');

  // ------------------------------------------------------------------
  // Inside Meet, or not
  // ------------------------------------------------------------------

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  var side = null;          // Meet's side panel client
  if (!framed || !window.meet || !window.meet.addon) { show('outside'); return; }

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, ms); })]);
  }

  // ------------------------------------------------------------------
  // Signing in
  // ------------------------------------------------------------------

  // The panel's own storage first. A second client is made only when the
  // browser lends the panel humanshaped.org's own storage.
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
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

  function signIn() {
    return sessionOf(db).then(function (s) { return s || useSiteSignIn(true); });
  }

  $('[data-use-site]').hidden = !document.requestStorageAccess;
  $('[data-use-site]').addEventListener('click', function () {
    $('[data-signin-status]').textContent = 'Asking your browser…';
    useSiteSignIn(false).then(function (s) { if (s) start(s); });
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
      start(r.data.session);
    });
  });

  // ------------------------------------------------------------------
  // What the panel knows
  // ------------------------------------------------------------------

  var S = { me: null, room: null, cohort: null, session: null, prev: null, teaching: false, names: {}, people: [], groups: [], brought: [],
    parts: [], chosenPart: null, timerEnds: null, drawnPart: undefined, picked: false, active: null,
    items: [], checks: [], answers: [], tallies: {}, onStage: null, stageOn: false, rooms: null, roomPlaces: {} };
  var channel = null, poller = null, nudgeTimer = null, deferred = {}, drafts = {};

  function nameOf(id) { return S.me && id === S.me.id ? 'You' : (S.names[id] || 'Someone'); }

  function start(session) {
    S.me = session.user;
    show('loading');
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
      db.from('cohort_teachers').select('cohort_id').eq('user_id', S.me.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) return fail('The panel could not look up this call: ' + bad.error.message);
      var room = A.findRoom(code, { sessions: res[0].data, groups: res[1].data, teaching: res[2].data.map(function (t) { return t.cohort_id; }) });
      if (!room) {
        $('[data-no-room-text]').textContent = 'This call’s code is ' + code + '. If it is your cohort’s session or one group’s room, a teacher can paste the call’s link into that session or group on the teaching page, and then this panel finds it when it opens.';
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
        db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', id).neq('status', 'left'),
        db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', id),
        db.from('groups').select('*, group_members(user_id)').eq('cohort_id', id).order('name')
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) return fail('The session could not be loaded: ' + bad.error.message);
        var ss = res[0].data;
        if (!ss.length) return fail('This cohort has no sessions yet.');
        S.cohort = cohort;
        S.people = res[1].data;
        S.groups = res[3].data;
        S.teaching = res[2].data.some(function (t) { return t.user_id === S.me.id; });
        S.people.concat(res[2].data).forEach(function (p) { if (p.profiles) S.names[p.user_id] = p.profiles.display_name || p.profiles.github_login; });
        var t = lib.currentAndNext(ss, new Date(), cohort.session_minutes);
        S.session = t.live ? t.next : (t.next || t.current);
        S.prev = ss.filter(function (x) { return x.number === S.session.number - 1; })[0] || null;
        S.parts = lib.agenda(cohort.session_minutes);
        var since = S.prev && S.prev.starts_at ? S.prev.starts_at : new Date(Date.now() - 8 * 86400000).toISOString();
        return db.from('shares').select('*').eq('cohort_id', id).eq('kind', 'bring-back').gte('created_at', since).order('created_at', { ascending: false }).then(function (sh) {
          S.brought = sh.data || [];
          drawFrame();
          startRooms();
          show('ready');
          return refreshLive().then(listen);
        });
      });
    });
  }

  // ------------------------------------------------------------------
  // The launcher. Each activity is a key, a name, and a pane in the
  // page; new ones (breakouts, a shared drawing board, cards on screen,
  // the chat kept) are one more entry here and one more pane.
  // ------------------------------------------------------------------

  var ACTIVITIES = [
    { key: 'now', name: 'Now', draw: drawNowActivity },
    { key: 'queue', name: 'Queue', draw: drawQueue, badge: function () { return L.queue(S.items).waiting.length; } },
    { key: 'checks', name: 'Checks', draw: drawChecks, badge: function () { return S.checks.filter(function (k) { return k.state === 'open'; }).length; } },
    { key: 'thread', name: 'Thread', draw: drawThreadActivity, when: function () { return !!(S.cohort.github_repo && S.cohort.github_team && 'discussion_number' in S.session); } },
    // Only when there are groups to show (startRooms); for a teacher, the
    // badge is how many groups would like them.
    { key: 'rooms', name: 'Rooms', draw: function () {}, when: function () { return !!S.rooms; },
      badge: function () { return S.teaching ? Object.keys(S.roomPlaces).filter(function (k) { return S.roomPlaces[k].asking; }).length : 0; } }
  ];

  function drawLauncher() {
    var nav = $('[data-launcher]'); nav.replaceChildren();
    ACTIVITIES.forEach(function (a) {
      if (a.when && !a.when()) return;
      var b = button('', 'addon-tab', function () { S.picked = true; openActivity(a.key); });
      b.setAttribute('aria-pressed', String(S.active === a.key));
      b.appendChild(el('span', null, a.name));
      var n = a.badge ? a.badge() : 0;
      if (n) { var badge = el('span', 'addon-badge', String(n)); b.appendChild(badge); b.setAttribute('aria-label', a.name + ', ' + n); }
      nav.appendChild(b);
    });
  }
  function openActivity(key) {
    S.active = key;
    root.querySelectorAll('[data-activity]').forEach(function (p) { p.hidden = p.getAttribute('data-activity') !== key; });
    drawLauncher();
    if (key === 'thread') drawThreadActivity();
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
          : 'Your teacher has not opened this session’s thread yet.'));
      } else {
        box.appendChild(el('p', 'small', 'Links, questions for later, and what you are stuck on go here, and they stay on GitHub under your own name.'));
        var a = el('a', 'btn-github', 'Open the thread on GitHub'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
        box.appendChild(el('p')).appendChild(a);
      }
      var live = el('a', null, 'Read and post on the session page'); live.href = '/live/?c=' + encodeURIComponent(S.cohort.slug); live.target = '_blank'; live.rel = 'noopener';
      box.appendChild(el('p', 'small')).appendChild(live);
    });
  }

  function drawFrame() {
    $('[data-cohort-title]').textContent = S.cohort.title;
    var group = S.room.groupId ? S.groups.filter(function (g) { return g.id === S.room.groupId; })[0] : null;
    $('[data-where]').textContent = 'Week ' + S.session.number + ', ' + (group ? group.name + '’s room' : 'the main room') + (S.teaching ? '. You are teaching.' : '.') + (S.room.ambiguous ? ' Another cohort uses this call too.' : '');
    var full = $('[data-full-link]'); full.href = '/live/?c=' + encodeURIComponent(S.cohort.slug);
    $('[data-fallback-link]').href = full.href;
    $('[data-open-stage]').hidden = !S.teaching;
    $('[data-part-controls]').hidden = !S.teaching;
    $('[data-ask-wrap]').hidden = !S.teaching;
    var sel = $('[data-part-select]'); sel.replaceChildren();
    S.parts.forEach(function (p) { var o = el('option', null, p.name); o.value = p.key; sel.appendChild(o); });
    drawPart(true);
  }

  // ------------------------------------------------------------------
  // The session now
  // ------------------------------------------------------------------

  function partNow() { return lib.partNow(S.parts, S.session.starts_at, new Date(), S.chosenPart); }

  // Drawn again when the part changes (from the clock, or a teacher's
  // choice), and on force. A change of part opens the activity that part
  // needs, unless someone chose one by hand during this part.
  function drawPart(force) {
    var part = partNow();
    var key = part ? part.key : null;
    if (!force && key === S.drawnPart) return;
    if (key !== S.drawnPart) S.picked = false;
    S.drawnPart = key;
    var plan = A.panelPlan(key, S.room.room);
    if (!S.picked) openActivity(plan.open); else drawLauncher();
    S.plan = plan;
    drawNowActivity();
    drawChecksChrome();
    sendStage();
  }

  function drawNowActivity() {
    var part = partNow();
    $('[data-part-kicker]').textContent = part ? 'Now, minute ' + part.start + ' of ' + S.cohort.session_minutes : 'Before the session';
    $('[data-part-name]').textContent = part ? part.name : 'Week ' + S.session.number;
    $('[data-part-what]').textContent = part ? part.what : '';
    $('[data-part-what-wrap]').hidden = !part;
    if (part) $('[data-part-select]').value = part.key;
    tick();
    // The welcome: on the stage by itself before any part begins, and
    // the teacher's to put back up at any time (C9).
    $('[data-welcome-wrap]').hidden = !S.teaching;
    drawWelcomeToggle();
    var lead = $('[data-now-lead]'); lead.replaceChildren();
    if (S.plan && S.plan.lead === 'heard') drawHeard(lead);
    if (S.plan && S.plan.lead === 'groups') drawGroups(lead);
  }

  function tick() {
    var part = partNow();
    var left = A.timeLeft(S.timerEnds, Date.now());
    var clock = $('[data-clock]'), btn = $('[data-timer]');
    if (left != null) {
      clock.textContent = left ? L.clock(left) : 'Time is up';
      btn.textContent = left ? 'Stop the timer' : 'Start the timer';
      if (!left) S.timerEnds = null;
    } else {
      clock.textContent = part ? part.minutes + ' minutes' : '';
      btn.textContent = 'Start the timer';
    }
  }
  setInterval(function () { if (S.session) { tick(); } }, 1000);
  setInterval(function () { if (S.session) drawPart(); }, 20000);

  function drawWelcomeToggle() {
    var welcoming = S.onStage && S.onStage.kind === 'welcome';
    $('[data-welcome-toggle]').textContent = welcoming ? 'Take the welcome off the stage' : 'Put the welcome on the stage';
  }
  $('[data-welcome-toggle]').addEventListener('click', function () {
    var welcoming = S.onStage && S.onStage.kind === 'welcome';
    S.onStage = welcoming ? null : { kind: 'welcome' };
    drawWelcomeToggle(); drawQueue(); drawChecks(); sendStage();
  });
  $('[data-timer]').addEventListener('click', function () {
    var part = partNow();
    if (S.timerEnds && A.timeLeft(S.timerEnds, Date.now())) { S.timerEnds = null; }
    else if (part) { S.chosenPart = part.key; S.timerEnds = Date.now() + part.minutes * 60000; }
    tick(); sendStage();
  });
  $('[data-part-select]').addEventListener('change', function (ev) {
    S.chosenPart = ev.target.value; S.timerEnds = null; drawPart(true);
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
      wrap.appendChild(el('p', 'kicker', 'What ' + (S.teaching ? 'you' : 'your teacher') + ' heard in week ' + S.prev.number + '’s checks'));
      heard.split(/\n{2,}/).forEach(function (para) { wrap.appendChild(el('p', null, para)); });
      box.appendChild(wrap);
    } else if (S.teaching && S.prev) {
      var hint = el('p', 'small');
      hint.appendChild(document.createTextNode('What you heard in week ' + S.prev.number + '’s checks shows here once you write it '));
      hint.appendChild(newTab(Object.assign(el('a', null, 'on your teaching page'), { href: '/teach/' })));
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
      onChange: function (byGroup) { S.roomPlaces = byGroup; drawLauncher(); }
    });
    drawLauncher();
  }

  // During "Show what you brought back", and always in a group's room:
  // each group's order this week, and each builder's question.
  function drawGroups(box) {
    var groups = S.room.groupId ? S.groups.filter(function (g) { return g.id === S.room.groupId; })
      : S.teaching ? S.groups : S.groups.filter(function (g) { return g.group_members.some(function (m) { return m.user_id === S.me.id; }); });
    if (!groups.length) { box.appendChild(el('p', 'small', 'There are no groups yet, so everyone stays in the main room.')); return; }
    groups.forEach(function (g) {
      var card = el('article', 'addon-card');
      card.appendChild(el('h3', null, g.name));
      if (!S.room.groupId && safe(g.meet_url)) {
        var go = newTab(el('a', null, S.teaching ? 'Visit its room' : 'Go to your group’s room')); go.href = g.meet_url;
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
      db.from('live_answers').select('id, check_id, user_id, choice, body, updated_at').eq('cohort_id', S.cohort.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { $('[data-sync]').textContent = 'The panel could not read the latest changes: ' + bad.error.message; return; }
      S.items = res[0].data; S.checks = res[1].data; S.answers = res[2].data;
      var visible = S.checks.filter(function (k) { return k.choices && (S.teaching || k.show_tally); });
      return Promise.all(visible.map(function (k) { return db.rpc('check_tally', { c: k.id }); })).then(function (t) {
        S.tallies = {};
        visible.forEach(function (k, i) { S.tallies[k.id] = (t[i] && t[i].data) || []; });
        render('[data-queue]', drawQueue);
        render('[data-checks]', drawChecks);
        drawLauncher();
        sendStage();
      });
    });
  }

  // Redraw part of the panel, unless someone is typing an answer in it.
  function render(sel, fn) {
    var a = document.activeElement;
    if (a && $(sel).contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) { deferred[sel] = fn; return; }
    fn();
  }
  root.addEventListener('focusout', function () {
    setTimeout(function () { Object.keys(deferred).forEach(function (sel) { var fn = deferred[sel]; delete deferred[sel]; render(sel, fn); }); }, 0);
  });

  function stageToggle(kind, id, onLabel, offLabel) {
    var on = S.onStage && S.onStage.kind === kind && S.onStage.id === id;
    var b = button(on ? offLabel : onLabel, 'btn-quiet', function () { S.onStage = on ? null : { kind: kind, id: id }; drawQueue(); drawChecks(); sendStage(); });
    b.setAttribute('aria-pressed', String(on));
    return b;
  }

  function drawQueue() {
    var q = L.queue(S.items);
    var list = $('[data-queue]'); list.replaceChildren();
    if (!q.waiting.length) list.appendChild(el('li', 'live-empty small', q.shown.length ? 'Everything in the queue has been shown.' : 'Nothing is in the queue yet. People add to it from the live page.'));
    q.waiting.forEach(function (item, i) {
      var li = el('li', 'live-item' + (i === 0 ? ' next' : ''));
      if (i === 0) li.appendChild(el('p', 'kicker', 'Up next'));
      li.appendChild(el('p', 'live-who', nameOf(item.user_id)));
      li.appendChild(el('p', 'live-what', L.itemLabel(item)));
      if (item.note) li.appendChild(el('p', 'live-note', item.note));
      var acts = el('div', 'actions');
      var open = newTab(el('a', 'btn-quiet', 'Open it')); open.href = item.url;
      open.setAttribute('aria-label', 'Open ' + L.itemLabel(item) + ' in a new tab');
      acts.appendChild(open);
      if (S.teaching) acts.appendChild(stageToggle('item', item.id, 'Put it on the stage', 'Take it off the stage'));
      if (L.canManage(item, S.me.id, S.teaching)) {
        acts.appendChild(button('It has been shown', 'btn-quiet', function () {
          if (S.onStage && S.onStage.id === item.id) S.onStage = null;
          db.from('live_queue').update({ state: 'shown' }).eq('id', item.id).then(function (r) { if (!r.error) refreshLive(); });
        }));
      }
      li.appendChild(acts);
      list.appendChild(li);
    });
    $('[data-shown-count]').textContent = q.shown.length ? L.counted(q.shown.length, 'item', 'items') + ' shown so far.' : '';
  }

  function drawChecksChrome() {
    var closingFirst = S.plan && S.plan.closingFirst;
    $('[data-closing-wrap]').hidden = !S.teaching;
    $('[data-ask-closing]').className = closingFirst ? 'btn-github' : 'btn-quiet';
    // Before the closing part, the button sits below the checks.
    var wrap = $('[data-closing-wrap]'), pane = root.querySelector('[data-activity="checks"]');
    if (closingFirst) pane.insertBefore(wrap, $('[data-checks]')); else pane.insertBefore(wrap, $('[data-ask-status]'));
  }

  function tallyBars(check) {
    var t = L.tally(check, S.tallies[check.id] || []);
    var wrap = el('div', 'live-tally');
    wrap.appendChild(el('p', 'small', L.counted(t.total, 'answer', 'answers') + (S.teaching ? '' : ', with no names')));
    var ul = el('ul');
    t.rows.forEach(function (r) {
      var li = el('li');
      li.appendChild(el('span', 'label', r.label));
      var bar = el('span', 'bar'); bar.style.setProperty('--share', r.share + '%'); li.appendChild(bar);
      li.appendChild(el('span', 'count', String(r.count)));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function changeCheck(check, change) {
    return db.from('live_checks').update(change).eq('id', check.id).then(function (r) { if (!r.error) refreshLive(); });
  }

  function teacherCheck(k) {
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('h3', null, k.prompt));
    var mine = S.answers.filter(function (a) { return a.check_id === k.id; });
    if (k.choices) card.appendChild(tallyBars(k));
    else card.appendChild(el('p', 'small', L.counted(mine.length, 'answer', 'answers') + ', which only you and the other teachers see'));
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
    var acts = el('div', 'actions');
    acts.appendChild(stageToggle('check', k.id, 'Put it on the stage', 'Take it off the stage'));
    if (k.choices) acts.appendChild(button(k.show_tally ? 'Hide the count' : 'Show everyone the count', 'btn-quiet', function () { changeCheck(k, { show_tally: !k.show_tally }); }));
    acts.appendChild(button('Close it', 'btn-quiet', function () { if (S.onStage && S.onStage.id === k.id) S.onStage = null; changeCheck(k, { state: 'closed' }); }));
    card.appendChild(acts);
    return card;
  }

  function studentCheck(k) {
    var answer = S.answers.filter(function (a) { return a.check_id === k.id && a.user_id === S.me.id; })[0];
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('h3', null, k.prompt));
    var form = el('form', 'inline-form');
    var ta = null;
    if (k.choices) {
      var fs = el('fieldset', 'live-mode');
      fs.appendChild(el('legend', 'visually-hidden', 'Choose one'));
      k.choices.forEach(function (c, i) {
        var lab = el('label', 'check');
        var r = el('input'); r.type = 'radio'; r.name = 'check-' + k.id; r.value = String(i + 1); r.required = true;
        r.checked = drafts[k.id] != null ? drafts[k.id] === r.value : !!(answer && answer.choice === i + 1);
        r.addEventListener('change', function () { drafts[k.id] = r.value; });
        lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + c)); fs.appendChild(lab);
      });
      form.appendChild(fs);
    } else {
      var lab2 = el('label', null, 'Your answer, which only you and your teacher see');
      ta = el('textarea'); ta.rows = 3; ta.maxLength = 1000; ta.required = true;
      ta.value = drafts[k.id] != null ? drafts[k.id] : (answer ? answer.body : '');
      ta.addEventListener('input', function () { drafts[k.id] = ta.value; });
      lab2.appendChild(ta); form.appendChild(lab2);
    }
    var acts = el('div', 'actions');
    var send = el('button', 'btn-quiet', answer ? 'Change my answer' : 'Send my answer'); send.type = 'submit';
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    acts.appendChild(send); acts.appendChild(status); form.appendChild(acts);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var row = { check_id: k.id, cohort_id: S.cohort.id, user_id: S.me.id };
      if (k.choices) { var picked = form.querySelector('input:checked'); if (!picked) return; row.choice = Number(picked.value); row.body = null; }
      else { row.body = ta.value.trim(); row.choice = null; if (!row.body) return; }
      status.textContent = 'Sending…';
      (answer ? db.from('live_answers').update({ choice: row.choice, body: row.body }).eq('id', answer.id) : db.from('live_answers').insert(row)).then(function (r) {
        if (r.error) { status.textContent = 'Not sent: ' + r.error.message; return; }
        delete drafts[k.id]; refreshLive();
      });
    });
    card.appendChild(form);
    if (k.choices && k.show_tally) card.appendChild(tallyBars(k));
    return card;
  }

  function drawChecks() {
    var open = S.checks.filter(function (k) { return k.state === 'open'; });
    var box = $('[data-checks]'); box.replaceChildren();
    if (!open.length) box.appendChild(el('p', 'small live-empty', S.teaching ? 'No question is open right now.' : 'No question is open right now. When your teacher asks one, it appears here.'));
    open.forEach(function (k) { box.appendChild(S.teaching ? teacherCheck(k) : studentCheck(k)); });
  }

  function ask(prompts) {
    var status = $('[data-ask-status]');
    status.textContent = 'Asking…';
    return prompts.reduce(function (p, q) {
      return p.then(function (r) {
        if (r && r.error) return r;
        return db.from('live_checks').insert({ cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, prompt: q.prompt, choices: q.choices, show_tally: !!q.show_tally });
      });
    }, Promise.resolve(null)).then(function (r) {
      status.textContent = r && r.error ? 'Not asked: ' + r.error.message : prompts.length > 1 ? 'Asked both.' : 'Asked.';
      if (!(r && r.error)) refreshLive();
      return !(r && r.error);
    });
  }
  $('[data-ask]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var mode = root.querySelector('input[name="ask-mode"]:checked').value;
    var parsed = L.parseCheck($('[data-ask-prompt]').value, mode, $('[data-ask-choices]').value);
    if (parsed.error) { $('[data-ask-status]').textContent = parsed.error; return; }
    ask([{ prompt: parsed.prompt, choices: parsed.choices, show_tally: $('[data-ask-tally]').checked }]).then(function (ok) {
      if (ok) { $('[data-ask-prompt]').value = ''; $('[data-ask-choices]').value = ''; $('[data-ask-wrap]').open = false; }
    });
  });
  $('[data-ask-closing]').addEventListener('click', function () {
    ask(L.CLOSING_CHECKS.map(function (p) { return { prompt: p, choices: null }; }));
  });
  root.querySelectorAll('input[name="ask-mode"]').forEach(function (r) {
    r.addEventListener('change', function () { $('[data-ask-choices-wrap]').hidden = !(r.value === 'choices' && r.checked); });
  });

  // ------------------------------------------------------------------
  // The main stage: opened by the teacher, and told what to show. Meet
  // delivers these messages only to this same person's stage.
  // ------------------------------------------------------------------

  function currentView() {
    var part = partNow();
    return A.stageView({
      part: part ? { key: part.key, name: part.name, endsAt: S.timerEnds } : null,
      onStage: S.onStage, checks: S.checks, tallies: S.tallies, items: S.items, names: S.names,
      welcome: lib.welcome(S.cohort, S.session, S.parts)
    });
  }
  function sendStage() {
    drawWelcomeToggle();
    if (!S.stageOn || !side || !S.session) return;
    try { Promise.resolve(side.notifyMainStage(A.stageMessage(currentView()))).catch(function () {}); } catch (e) {}
  }
  $('[data-open-stage]').addEventListener('click', function () {
    var status = $('[data-stage-status]');
    status.textContent = 'Opening the main stage…';
    Promise.resolve(side.startActivity({ mainStageUrl: location.origin + '/addon/stage/' })).then(function () {
      S.stageOn = true;
      status.textContent = 'The main stage is open. Present it from Meet when you want everyone to see it.';
    }, function (err) {
      status.textContent = 'The main stage did not open: ' + (err && err.message ? err.message : 'Meet gave no reason') + '.';
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
        if (m && A.isHello(m.payload)) { S.stageOn = true; sendStage(); }
      });
      return signIn().then(function (s) { if (s) start(s); else show('signed-out'); });
    }, function () {
      show('outside');
    });
  }
  $('[data-reload]').addEventListener('click', function () { if (S.me) start({ user: S.me }); else open(); });
  open();
})();
