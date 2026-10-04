// The live session page (/live/?c=<slug>), kept open beside Google Meet.
// Meet cannot be embedded in another page, so this page holds what Meet
// does not: the agenda with a timer for each part, this week's challenge
// and stages, a "show your work" queue, checks for understanding, and
// what people brought back.
//
// Live updates: Supabase Realtime tells the page that something in this
// cohort's queue, questions, or answers changed, and the page reads them
// again through the same access rules. If Realtime cannot connect, the
// page reads again every fifteen seconds instead (migration
// 20261003060000 has the free plan's limits and the reasons).
(function () {
  var root = document.querySelector('[data-live]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib || !window.LiveLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.CohortLib;
  var L = window.LiveLib;
  var slug = new URLSearchParams(location.search).get('c') || '';
  var timer = null;
  var POLL = 15000;

  // What the page knows about this session, filled in by load().
  var S = { me: null, auth: null, token: null, cohort: null, session: null, teaching: false, names: {}, mine: null, myShares: [],
    // The teaching tools (M12): the agenda's parts, the part someone chose
    // by starting its timer, the previous session (for what the teacher
    // heard), the groups and their rooms, the bring-backs since the last
    // session, who confirmed them, and whether the database has them yet.
    parts: [], chosenPart: null, drawnPart: undefined, prev: null, groups: [], people: [], brought: [], confirmations: [], tools: false };
  var drafts = {};          // what someone has typed into an answer box, by question
  var Q = window.QuestionView, askFields = null, bank = [];  // the question bank (R4)
  var channel = null, poller = null, tallyPoller = null, nudgeTimer = null, deferred = {};
  var rooms = null, roomPlaces = {};  // the room board (C2), and where each group is

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function nameOf(id) { return id === S.me.id ? 'You' : (S.names[id] || 'Someone'); }

  // A timer anyone can run for the part of the session they are in, or a
  // step of a turn in their group. It counts down quietly and says so when
  // the time is up; it never makes a sound. One runs at a time, and it
  // keeps running when the part of the page it sits in is drawn again
  // (the new button with the same key takes it over).
  // A quiet line for screen readers, since the timer's button changes
  // its own words without announcing them.
  var said = el('p', 'visually-hidden');
  said.setAttribute('role', 'status');
  root.appendChild(said);
  function say(text) {
    said.textContent = '';
    setTimeout(function () { said.textContent = text; }, 50);
  }
  function idleLabel(seconds) { return 'Start ' + (seconds % 60 ? L.clock(seconds) : seconds / 60 + ' min'); }
  function runTimer(btn, seconds, key) {
    if (timer) {
      clearInterval(timer.id); timer.button.textContent = idleLabel(timer.seconds);
      if (timer.key === key) { timer = null; return; }
    }
    var end = Date.now() + seconds * 1000;
    function tick() {
      var left = Math.max(0, end - Date.now());
      timer.button.textContent = left ? L.clock(left / 1000) + ' left (stop)' : 'Time is up';
      if (!left) { clearInterval(timer.id); timer = null; say('Time is up.'); }
    }
    timer = { id: setInterval(tick, 1000), button: btn, seconds: seconds, key: key };
    tick();
  }
  function timerButton(seconds, key, onStart) {
    var b = button(idleLabel(seconds), 'btn-quiet', function () { runTimer(b, seconds, key); if (onStart) onStart(); });
    if (timer && timer.key === key) { timer.button = b; }
    return b;
  }

  function load() {
    if (!slug) return fail('This page needs to know which cohort’s session to show. Open it from your cohort page.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) return show('signed-out');
      S.me = s.data.session.user;
      S.auth = s.data.session;
      // The GitHub token lives in this tab only (DiscussionsLib).
      S.token = window.CohortTalk ? window.CohortTalk.token(db, S.auth) : null;
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This session could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        var cohort = c.data;
        return Promise.all([
          db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
          db.from('enrollments').select('user_id, status, app_url, app_repo, profiles(github_login, display_name)').eq('cohort_id', cohort.id).neq('status', 'left'),
          db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
          // Every column, so each group's room comes along once the database has it.
          db.from('groups').select('*, group_members(user_id)').eq('cohort_id', cohort.id).order('name')
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('The session could not be loaded: ' + bad.error.message);
          var ss = res[0].data, people = res[1].data, teachers = res[2].data;
          S.groups = res[3].data;
          S.people = people;
          if (!ss.length) return show('not-member');
          S.cohort = cohort;
          S.teaching = teachers.some(function (t) { return t.user_id === S.me.id; });
          // /teach/'s "Before the first session" checks off rehearsing
          // once this browser has opened the live page as its teacher.
          if (S.teaching) { try { localStorage.setItem('hs-rehearsed:' + cohort.id, '1'); } catch (e) {} }
          S.mine = people.filter(function (p) { return p.user_id === S.me.id; })[0] || null;
          if (!S.mine && !S.teaching) return show('not-member');
          people.concat(teachers).forEach(function (p) { if (p.profiles) S.names[p.user_id] = p.profiles.display_name || p.profiles.github_login; });
          var t = lib.currentAndNext(ss, new Date(), cohort.session_minutes);
          var session = t.live ? t.next : (t.next || t.current);
          S.session = session;
          var prev = ss.filter(function (x) { return x.number === session.number - 1; })[0];
          S.prev = prev || null;
          var since = prev && prev.starts_at ? prev.starts_at : new Date(Date.now() - 8 * 86400000).toISOString();
          return Promise.all([
            // Every column, so each bring-back's question and mark come along.
            db.from('shares').select('*').eq('cohort_id', cohort.id).eq('kind', 'bring-back').gte('created_at', since).order('created_at', { ascending: false }),
            db.from('shares').select('id, kind, url, note, created_at').eq('cohort_id', cohort.id).eq('user_id', S.me.id).not('url', 'is', null).order('created_at', { ascending: false }).limit(10),
            // On its own: before the table exists, this fails quietly.
            db.from('share_confirmations').select('share_id, user_id').eq('cohort_id', cohort.id)
          ]).then(function (sh) {
            S.myShares = sh[1].data || [];
            S.brought = sh[0].data || [];
            S.tools = !sh[2].error;
            S.confirmations = S.tools ? sh[2].data : [];
            draw(t.live, S.brought);
            startSignals(teachers);
            startRooms();
            return refreshLive().then(listen);
          });
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  // ------------------------------------------------------------------
  // The parts of the page that do not change during the session
  // ------------------------------------------------------------------

  function draw(live, shares) {
    var cohort = S.cohort, session = S.session;
    $('[data-kicker]').textContent = cohort.title + (live ? ', live now' : '') + (S.teaching ? '. You are teaching it.' : '');
    $('[data-title]').textContent = 'Week ' + session.number + (session.title && session.title !== 'Week ' + session.number ? ': ' + session.title : '');
    $('[data-scope]').textContent = session.scope || 'This week’s challenge will be here once your teacher writes it.';
    var top = $('[data-top-actions]'); top.replaceChildren();
    if (safe(session.meet_url)) { var j = el('a', 'btn-github', live ? 'Join the session' : 'The Meet link'); j.href = session.meet_url; j.target = '_blank'; j.rel = 'noopener'; top.appendChild(j); }
    var back = el('a', 'btn-quiet', 'Your cohort page'); back.href = '/cohort/?c=' + encodeURIComponent(cohort.slug); top.appendChild(back);
    // The session's drawing board (C4), in its own tab so this page stays open.
    var board = el('a', 'btn-quiet', 'The board'); board.href = '/board/?c=' + encodeURIComponent(cohort.slug) + '&s=week-' + session.number; board.target = '_blank'; board.rel = 'noopener'; top.appendChild(board);
    $('[data-cohort-link]').href = back.href;

    S.parts = lib.agenda(cohort.session_minutes);
    startShow();

    var stages = lib.stagesForWeek(session.number);
    $('[data-stages-section]').hidden = !stages.length;
    var ul = $('[data-stages]'); ul.replaceChildren();
    stages.forEach(function (n) { var li = el('li'); var a = el('a', null, 'Stage ' + n); a.href = '/path/' + n + '/'; li.appendChild(a); ul.appendChild(li); });

    drawBrought(shares);
    drawAddForm();
    drawNow(true);
    drawTalk();
    // During class, for teachers: commits since the session began (C6).
    if (window.LiveCommits) window.LiveCommits.draw(root, { teaching: S.teaching, people: S.people, since: session.starts_at, token: S.token });
    $('[data-ask]').hidden = !S.teaching;
    if (S.teaching) startAsking();
    $('[data-checks-intro]').textContent = S.teaching
      ? 'Ask a short question to see what is landing. Each person sees only their own answer, and the count of answers only if you choose to show it. Nothing here is graded, and the questions and answers are deleted when the cohort finishes.'
      : 'Your teacher may ask a short question to see what is landing. Only you and your teacher see your answer, nothing here is graded, and the questions and answers are deleted when the cohort finishes.';
    show('ready');
  }

  // What people brought back since the last session, with each one's
  // question and mark (M12).
  function drawBrought(shares) {
    var box = $('[data-brought]'); box.replaceChildren();
    if (!shares.length) box.appendChild(el('p', 'small', 'Nothing has been brought back yet for this session.'));
    shares.forEach(function (s) {
      var card = el('article', 'cohort-card');
      card.appendChild(el('h3', null, nameOf(s.user_id)));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (safe(s.url)) { var a = el('a', null, s.url.replace(/^https:\/\//, '')); a.href = s.url; card.appendChild(el('p')).appendChild(a); }
      if (s.want_to_know) card.appendChild(el('p', 'small', 'Wants to know: ' + s.want_to_know));
      markLines(s).forEach(function (n) { card.appendChild(n); });
      box.appendChild(card);
    });
  }

  // ------------------------------------------------------------------
  // Now: what this part of the session needs (M12)
  // ------------------------------------------------------------------

  // Which part it is comes from the clock, unless someone started a
  // part's timer (CohortLib.partNow). The block is drawn again only when
  // the part changes, or when what it shows has changed (force), so a
  // step's timer keeps running underneath it.
  function drawNow(force) {
    var part = partNow();
    var key = part ? part.key : null;
    if (clockLine) clockLine.textContent = part ? 'Minute ' + part.start + ' of ' + S.cohort.session_minutes + ', for ' + part.minutes + ' minutes' : 'Before the session, week ' + S.session.number;
    if (!force && key === S.drawnPart) return;
    S.drawnPart = key;
    var list = S.list || S.parts;
    var lead = V ? V.partKeyOf(part, list.indexOf(part)) : key;
    var body = $('[data-now-body]');
    body.replaceChildren();
    if (lead === 'arrive') drawArrive(body);
    else if (lead === 'show') drawGroups(body);
    body.hidden = !body.children.length;
    if (show) show.update(key, runInfo());
    if (S.checks) drawSceneQuestion();
    designHref();
    if (rooms && rooms.setPlan) rooms.setPlan({ turn: L.roomTurn(roomsScene(), 3), prompt: roomsPrompt() });
  }

  // ------------------------------------------------------------------
  // Running the show (R3): the show everyone follows, moved by a teacher
  // from here or from the Meet add-on's panel (assets/show-run.js).
  // ------------------------------------------------------------------

  var V = window.ShowViewLib, run = null;
  function shared() { return !!(run && run.shared); }
  function sceneOf(key) { return (S.list || S.parts).filter(function (s) { return s.key === key; })[0] || null; }

  // Where the teacher moved the show, or, before anyone has, the scene the
  // clock says (or one whose timer someone started here, as before R3).
  function partNow() {
    if (shared() && run.state() && run.current()) return sceneOf(run.current());
    return lib.partNow(S.list || S.parts, S.session.starts_at, new Date(), S.chosenPart);
  }

  function runInfo() {
    if (!shared() || !V) return undefined;
    var st = run.state();
    var left = st ? V.secondsLeft(st, partNow(), Date.now()) : null;
    var pin = V.pinOf(st);
    var pinned = !pin ? null : pin.kind === 'welcome' ? 'the welcome' : pin.kind === 'blank' ? 'nothing' : pin.kind === 'check' ? 'a question' : 'someone’s work';
    return { left: V.leftText(left), clockOn: left != null, pinned: pinned };
  }

  function showChanged() {
    if (!show || !run) return;
    var list = V.scenes(run.list());
    var changed = JSON.stringify(list) !== JSON.stringify(S.list);
    S.list = list;
    if (changed) { S.drawnPart = undefined; show.setScenes(S.list); }
    drawNow(true);
    // A pin moved the main stage (R7): the wings and their card follow.
    if (S.items) render('[data-queue]', function () { drawQueue(S.items); });
  }
  setInterval(function () { if (show && show.tick && shared()) show.tick(runInfo()); }, 1000);

  // ------------------------------------------------------------------
  // The run of show (R1): the same component as the Meet add-on's panel
  // (ShowView), for the teacher's view or the student's. Each part of
  // this page is drawn by its own code and handed to it to place.
  // ------------------------------------------------------------------

  var show = null, clockLine = null;
  function startShow() {
    if (show || !window.ShowView) return;
    S.list = S.parts;
    show = window.ShowView.mount({
      mount: $('[data-show]'), parts: S.list, teaching: S.teaching,
      onPick: function (key) {
        if (shared()) { run.go(key); return; }
        S.chosenPart = key; drawNow();
      },
      // A scene's timer also tells the page that this is the scene the
      // session is in, whatever the clock says. Once the show runs (R3),
      // each scene's clock is the show's own, on the current scene.
      tools: function (key) {
        if (shared()) return null;
        var p = sceneOf(key);
        return p ? timerButton(p.minutes * 60, 'part:' + p.key, function () { S.chosenPart = p.key; drawNow(); }) : null;
      },
      run: S.teaching ? {
        onStep: function (d) {
          if (shared()) { run.step(d); return; }
          var key = V.step(S.list || S.parts, (partNow() || {}).key, d);
          if (key) { S.chosenPart = key; drawNow(); }
        },
        onClock: function (on) { if (shared()) run.clock(on); },
        onFollow: function () { if (shared()) run.pin(null); },
        canEdit: function (key) {
          if (!run) return null;
          var s = sceneOf(key);
          if (s && s.own) return 'own';
          return run.canOwn() ? 'parts' : null;
        },
        onSave: function (key, fields) { return run.save(key, fields); },
        onStartOwn: function () { return run.startOwn(); }
      } : {}
    });
    if (window.ShowRun) run = window.ShowRun.start({ db: db, cohort: S.cohort, session: S.session, parts: S.parts, teaching: S.teaching, onChange: showChanged });
    var clock = el('div', 'addon-part');
    clockLine = el('p', 'kicker');
    clock.appendChild(clockLine);
    show.slot('clock', clock);
    show.slot('lead', $('[data-now-body]'));
    show.slot('wings', $('[data-wings]'));
    show.slot('questions', $('[data-questions]'));
    show.slot('rooms', $('[data-rooms]'));
    show.slot('brought', $('[data-brought-section]'));
    show.slot('path', $('[data-stages-section]'));
    show.slot('thread', $('[data-thread-section]'));
    show.slot('conversation', $('[data-talk-section]'));
    if (S.teaching) show.slot('pushed', $('[data-pushed-section]'));
    var board = el('div');
    board.appendChild(el('p', 'small', 'This week’s design stage for the whole cohort. Everyone draws on it at once, and it is kept with the session.'));
    var open = el('a', 'btn-github', 'Open the design stage'); open.target = '_blank'; open.rel = 'noopener';
    S.designLink = open;
    designHref();
    board.appendChild(el('p')).appendChild(open);
    show.slot('design', board);
  }

  // While people arrive: what the teacher heard in last week's checks,
  // and what changes because of it (sessions.heard, written on /teach/).
  function drawArrive(body) {
    var heard = S.prev && S.prev.heard;
    if (heard) {
      var box = el('div', 'live-heard');
      box.appendChild(el('p', 'kicker', 'What your teacher heard in week ' + S.prev.number + '’s checks, and what changes'));
      heard.split(/\n{2,}/).forEach(function (para) { box.appendChild(el('p', null, para)); });
      body.appendChild(box);
    } else if (S.teaching && S.prev && 'heard' in S.prev) {
      var hint = el('p', 'small');
      hint.appendChild(document.createTextNode('What you heard in week ' + S.prev.number + '’s checks, and what you changed because of it, shows here while people arrive once you write it '));
      var a = el('a', null, 'on your teaching page'); a.href = '/teach/';
      hint.appendChild(a); hint.appendChild(document.createTextNode('.'));
      body.appendChild(hint);
    }
  }

  function peopleIn(g) {
    var ids = g.group_members.map(function (m) { return m.user_id; });
    return S.people.filter(function (p) { return ids.indexOf(p.user_id) >= 0; })
      .map(function (p) { return { id: p.user_id, name: S.names[p.user_id] || 'Someone' }; });
  }

  // During "Show what you brought back": your group's room, the order of
  // turns this week, each builder's question, and a timer for each step
  // of a turn. A teacher sees every group, to visit each room in turn.
  function drawGroups(body) {
    var mine = S.groups.filter(function (g) { return g.group_members.some(function (m) { return m.user_id === S.me.id; }); });
    var groups = S.teaching ? S.groups : mine;
    if (!groups.length) {
      body.appendChild(el('p', null, S.teaching
        ? 'This cohort has no groups yet, so everyone stays in the main session. You can make groups on your teaching page.'
        : 'You are not in a group yet, so stay in the main session, and your teacher will say where to go.'));
      return;
    }
    body.appendChild(el('p', 'small', 'Each builder takes a turn, in the order below, which moves along by one each week. Run the step timers from any one screen in the group.'));
    groups.forEach(function (g) { body.appendChild(groupCard(g, groups.length > 1)); });
  }

  function groupCard(g, named) {
    var card = el('article', 'cohort-card live-group');
    var isMine = g.group_members.some(function (m) { return m.user_id === S.me.id; });
    card.appendChild(el('h3', null, named || S.teaching ? g.name : 'Your group, ' + g.name));
    var acts = el('div', 'actions');
    if (safe(g.meet_url)) {
      var go = el('a', 'btn-github', S.teaching && !isMine ? 'Visit its room' : 'Join your group’s room');
      go.href = g.meet_url; go.target = '_blank'; go.rel = 'noopener';
      acts.appendChild(go);
      if (safe(S.session.meet_url)) {
        var back = el('a', 'btn-quiet', 'Back to the main session'); back.href = S.session.meet_url; back.target = '_blank'; back.rel = 'noopener';
        acts.appendChild(back);
      }
      card.appendChild(acts);
    } else {
      card.appendChild(el('p', 'small', S.teaching ? 'This group has no room of its own yet, so it stays in the main session until you add one on your teaching page.' : 'Your group has no room of its own yet, so stay in the main session.'));
    }

    var order = L.presentingOrder(peopleIn(g), S.session.number);
    card.appendChild(el('p', 'kicker', 'The order this week'));
    var ol = el('ol', 'trio-order');
    order.forEach(function (p) {
      var li = el('li');
      li.appendChild(el('p', 'live-who', p.id === S.me.id ? 'You' : p.name));
      var bb = L.latestBringBack(S.brought, p.id);
      var want = bb && bb.want_to_know;
      li.appendChild(el('p', want ? 'want' : 'small', want ? 'Wants to know: ' + want
        : p.id === S.me.id ? 'You can say what you want to know when your turn starts, or write it on your bring-back from your cohort page.'
        : 'They will say what they want to know when their turn starts.'));
      if (bb) {
        if (safe(bb.url)) { var a = el('a', null, 'What they brought back'); if (p.id === S.me.id) a.textContent = 'What you brought back'; a.href = bb.url; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(el('p', 'small')).appendChild(a); }
        markLines(bb).forEach(function (n) { li.appendChild(n); });
      }
      ol.appendChild(li);
    });
    if (!order.length) ol.appendChild(el('li', 'small', 'No one is in this group yet.'));
    card.appendChild(ol);

    var steps = L.roomTurn(roomsScene(), order.length || 1);
    var each = steps.reduce(function (n, s) { return n + s.seconds; }, 0);
    card.appendChild(el('p', 'kicker', 'Each turn, about ' + Math.round(each / 60) + ' minutes'));
    var sl = el('ol', 'turn-steps');
    sl.setAttribute('data-steps-of', g.id);
    steps.forEach(function (s, i) {
      var li = el('li');
      li.appendChild(el('p', 'live-who', s.name));
      li.appendChild(el('p', 'small', s.what));
      // Starting a step's timer also tells the room board which step the
      // group is on, so the teacher can see it from another room.
      li.appendChild(timerButton(s.seconds, 'step:' + g.id + ':' + s.key, function () { if (rooms) rooms.setStep(g.id, i); }));
      sl.appendChild(li);
    });
    card.appendChild(sl);
    markSteps(sl, roomPlaces[g.id]);
    return card;
  }

  // The step a group is on, lit in its list of steps.
  function markSteps(list, place) {
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.classList.toggle('now', !!place && place.step === i);
    });
  }

  // The room board (C2): each group's place in its turns, and whether it
  // would like the teacher, for everyone in the cohort to see.
  function startRooms() {
    if (rooms || !window.RoomBoard) return;
    var mine = S.groups.some(function (g) { return g.group_members.some(function (m) { return m.user_id === S.me.id; }); });
    if (!S.groups.length || (!S.teaching && !mine)) return;
    rooms = window.RoomBoard.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups, people: S.people,
      names: S.names, nameOf: nameOf, mount: $('[data-rooms]'),
      turn: L.roomTurn(roomsScene(), 3), prompt: roomsPrompt(),
      boardLink: window.BoardLib ? function (gid) { return window.BoardLib.link(S.cohort.slug, S.session, gid, false); } : null,
      onChange: function (byGroup) {
        roomPlaces = byGroup;
        if (show) show.count('rooms', S.teaching ? Object.keys(byGroup).filter(function (k) { return byGroup[k].asking; }).length : 0);
        root.querySelectorAll('[data-steps-of]').forEach(function (list) { markSteps(list, byGroup[list.getAttribute('data-steps-of')]); });
      }
    });
  }

  // The rooms scene the rehearsal rooms run (R6): the current scene when
  // it is one, or else the run of show's first, or the six parts' own.
  function roomsScene() {
    var list = V ? V.scenes(S.list || S.parts) : [];
    var now = typeof partNow === 'function' && S.session ? partNow() : null;
    if (now && now.kind === 'rooms') return now;
    return list.filter(function (x) { return x.kind === 'rooms'; })[0] || null;
  }
  function roomsPrompt() { var r = roomsScene(); return r && r.config && r.config.prompt ? r.config.prompt : null; }

  function partMinutes(key) {
    var p = S.parts.filter(function (x) { return x.key === key; })[0];
    return p ? p.minutes : 25;
  }

  // A bring-back's mark and who saw it working, with a way for a partner
  // or a teacher to confirm (and take it back). Nothing here counts.
  function markLines(s) {
    if (!S.tools) return [];
    var out = [];
    var mine = s.user_id === S.me.id;
    var ready = lib.readinessText(s, mine);
    if (ready) out.push(el('p', 'small mark ' + (s.readiness === 'ready' ? 'is-ready' : 'is-not-yet'), ready));
    var mineConfirmed = S.confirmations.some(function (c) { return c.share_id === s.id && c.user_id === S.me.id; });
    var seen = lib.seenText(S.confirmations.filter(function (c) { return c.share_id === s.id; }).map(function (c) {
      return c.user_id === S.me.id ? 'you' : (S.names[c.user_id] || 'someone');
    }));
    if (seen) out.push(el('p', 'small', seen));
    var partners = lib.partnersOf(S.me.id, S.groups);
    if (mineConfirmed) {
      out.push(button('Take back my confirmation', 'btn-quiet', function () { setConfirmation(s, false); }));
    } else if (lib.canConfirm(s, S.me.id, partners, S.teaching)) {
      out.push(button('I saw it working on a device', 'btn-quiet', function () { setConfirmation(s, true); }));
    }
    return out;
  }

  function setConfirmation(s, yes) {
    var q = yes
      ? db.from('share_confirmations').insert({ share_id: s.id, user_id: S.me.id, cohort_id: S.cohort.id })
      : db.from('share_confirmations').delete().eq('share_id', s.id).eq('user_id', S.me.id);
    q.then(function (r) {
      if (r.error) return;
      return db.from('share_confirmations').select('share_id, user_id').eq('cohort_id', S.cohort.id).then(function (c) {
        if (c.error) return;
        S.confirmations = c.data;
        drawBrought(S.brought);
        drawNow(true);
      });
    });
  }

  // ------------------------------------------------------------------
  // Live signals (C1): rooms, come back, a card, on stage, and recording
  // now, drawn by LiveSignals from SignalsLib. Only teachers see the
  // controls; the database lets only them send.
  // ------------------------------------------------------------------

  var signals = null;
  function startSignals(teachers) {
    if (signals || !window.LiveSignals) return;
    var who = {};
    S.people.concat(teachers).forEach(function (p) { who[p.user_id] = S.names[p.user_id] || 'Someone'; });
    var people = Object.keys(who).map(function (id) { return { id: id, name: id === S.me.id ? who[id] + ' (you)' : who[id] }; })
      .sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    $('[data-sig-controls]').hidden = !S.teaching;
    signals = window.LiveSignals.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups,
      nameOf: nameOf, people: people, roomMinutes: function () { var r = roomsScene(); return r && r.minutes ? r.minutes : partMinutes('show'); },
      mounts: {
        recording: $('[data-sig-recording]'), where: $('[data-sig-where]'), card: $('[data-sig-card]'), stage: $('[data-sig-stage]'),
        controls: S.teaching ? root.querySelector('[data-state="ready"]') : null
      }
    });
    // Each cue group sits in the scene it belongs to (ShowViewLib.SLOTS).
    if (S.teaching && show) show.cues($('[data-sig-controls-body]'), { cardHref: '/card/?c=' + encodeURIComponent(S.cohort.slug) });
  }

  // ------------------------------------------------------------------
  // Show your work: adding to the queue
  // ------------------------------------------------------------------

  function drawAddForm() {
    var sel = $('[data-add-what]'); sel.replaceChildren();
    function opt(value, label) { var o = el('option', null, label); o.value = value; sel.appendChild(o); }
    if (S.mine && safe(S.mine.app_url)) opt('app', 'My app, live');
    if (S.mine && lib.repoPath(S.mine.app_repo)) opt('commit', 'My latest commit');
    S.myShares.forEach(function (s) {
      opt('share:' + s.id, 'What I shared ' + lib.ago(s.created_at, new Date()) + (s.note ? ': ' + (s.note.length > 50 ? s.note.slice(0, 47) + '…' : s.note) : ''));
    });
    opt('link', 'A link, from GitHub or anywhere');
    syncAddForm();
  }
  // This session's thread (C5): one discussion on GitHub for the session,
  // opened by a teacher, read and posted to here as each person.
  function drawThread() {
    var repo = S.cohort.github_repo;
    var on = !!(repo && S.cohort.github_team && window.CohortTalk && window.CohortTalk.sessionThread && 'discussion_number' in S.session);
    $('[data-thread-section]').hidden = !on;
    if (!on) return;
    window.CohortTalk.sessionThread($('[data-thread]'), { db: db, session: S.auth, repo: repo, row: S.session, teaching: S.teaching,
      liveUrl: location.origin + '/live/?c=' + encodeURIComponent(S.cohort.slug) });
  }

  // From the conversation: the newest threads in the cohort's GitHub
  // Discussions, each one a link, and a quick way to put it in the queue.
  function drawTalk() {
    drawThread();
    var repo = S.cohort.github_repo;
    $('[data-talk-section]').hidden = !(repo && S.cohort.github_team && window.CohortTalk);
    if (!repo || !window.CohortTalk) return;
    window.CohortTalk.compact($('[data-talk]'), { db: db, session: S.auth, repo: repo, onShow: function (url) {
      var sel = $('[data-add-what]');
      sel.value = 'link'; syncAddForm();
      $('[data-add-link]').value = url;
      $('[data-add]').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      $('[data-add-note]').focus({ preventScroll: true });
      $('[data-add-status]').textContent = 'Say what people should look at, if you like, then add it.';
    } });
  }
  function syncAddForm() { $('[data-add-link-wrap]').hidden = $('[data-add-what]').value !== 'link'; }

  // The newest commit on the person's own repository, read from GitHub
  // when they ask, so the queue points at the commit itself.
  function latestCommit(repo) {
    var headers = { Accept: 'application/vnd.github+json' };
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    return fetch('https://api.github.com/repos/' + repo + '/commits?per_page=1', { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 404 ? 'GitHub cannot see that repository, so paste the commit’s link instead.' : 'GitHub could not be reached just now, so paste the commit’s link instead.');
      return r.json();
    }).then(function (list) {
      if (!list.length) throw new Error('That repository has no commits yet.');
      return list[0].html_url;
    });
  }

  function addToQueue(ev) {
    ev.preventDefault();
    var what = $('[data-add-what]').value, status = $('[data-add-status]');
    var note = $('[data-add-note]').value.trim() || null;
    var row = { cohort_id: S.cohort.id, session_id: S.session.id, user_id: S.me.id, note: note };
    var ready;
    if (what === 'app') ready = Promise.resolve({ kind: 'app', url: S.mine.app_url });
    else if (what === 'commit') ready = latestCommit(lib.repoPath(S.mine.app_repo)).then(function (u) { return { kind: 'commit', url: u }; });
    else if (what.indexOf('share:') === 0) {
      var share = S.myShares.filter(function (s) { return 'share:' + s.id === what; })[0];
      ready = Promise.resolve({ kind: 'share', url: share.url, share_id: share.id });
    } else {
      var c = L.classifyLink($('[data-add-link]').value);
      ready = c ? Promise.resolve({ kind: c.kind, url: c.url }) : Promise.reject(new Error('That needs to be a full link that starts with https://.'));
    }
    status.textContent = 'Adding it…';
    ready.then(function (x) {
      return db.from('live_queue').insert(Object.assign(row, x)).then(function (r) {
        if (r.error) throw new Error('It was not added: ' + r.error.message);
        status.textContent = 'Added.';
        $('[data-add-note]').value = ''; $('[data-add-link]').value = '';
        return refreshLive();
      });
    }).catch(function (err) { status.textContent = err.message; });
  }

  // ------------------------------------------------------------------
  // The parts that change during the session
  // ------------------------------------------------------------------

  function refreshLive() {
    var sid = S.session.id;
    return Promise.all([
      db.from('live_queue').select('*').eq('session_id', sid),
      db.from('live_checks').select('*').eq('session_id', sid).order('created_at', { ascending: false }),
      // Row-level security returns only your own answers, or everyone's to a teacher.
      db.from('live_answers').select('*').eq('cohort_id', S.cohort.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { $('[data-sync]').textContent = 'The page could not read the latest changes: ' + bad.error.message; return; }
      var checks = res[1].data;
      S.checks = checks;
      var visible = checks.filter(function (k) { return L.kindOf(k) !== 'short' && (S.teaching || k.show_tally); });
      return Promise.all(visible.map(function (k) { return Q.readResults(db, k); })).then(function (got) {
        var byCheck = {};
        visible.forEach(function (k, i) { byCheck[k.id] = got[i] || null; });
        render('[data-queue]', function () { drawQueue(res[0].data); });
        render('[data-checks]', function () { drawChecks(checks, res[2].data, byCheck); });
        drawSceneQuestion();
        // Classmates' answers do not reach a student through Realtime (they
        // cannot read them), so shown results are read again on their own.
        var wantTally = !S.teaching && checks.some(function (k) { return k.state === 'open' && k.show_tally && L.kindOf(k) !== 'short'; });
        if (wantTally && !tallyPoller) tallyPoller = setInterval(refreshLive, 10000);
        if (!wantTally && tallyPoller) { clearInterval(tallyPoller); tallyPoller = null; }
      });
    });
  }

  // Redraw a part of the page, unless someone is typing in it; then wait
  // until they leave the field, so a change elsewhere never eats their words.
  function render(sel, fn) {
    var box = $(sel).closest('section');
    var a = document.activeElement;
    var typing = a && box.contains(a) && (/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) || !!a.closest('.question-answer, .question-edit'));
    if (typing && !a.closest('[data-add]') && !a.closest('[data-ask]')) {
      deferred[sel] = fn;
      return;
    }
    fn();
  }
  root.addEventListener('focusout', function () {
    setTimeout(function () {
      Object.keys(deferred).forEach(function (sel) { var fn = deferred[sel]; delete deferred[sel]; render(sel, fn); });
    }, 0);
  });

  function setItem(item, change) {
    return db.from('live_queue').update(change).eq('id', item.id).then(function (r) { if (!r.error) return refreshLive(); });
  }
  function removeItem(item) {
    return db.from('live_queue').delete().eq('id', item.id).then(function (r) { if (!r.error) return refreshLive(); });
  }

  function queueItem(item, i, isShown) {
    var li = el('li', 'live-item' + (!isShown && i === 0 ? ' next' : ''));
    if (!isShown && i === 0) li.appendChild(el('p', 'kicker', 'Next to present'));
    li.appendChild(el('p', 'live-who', nameOf(item.user_id)));
    li.appendChild(el('p', 'live-what', L.itemLabel(item)));
    if (item.note) li.appendChild(el('p', 'live-note', item.note));
    var acts = el('div', 'actions');
    var open = el('a', isShown ? 'btn-quiet' : 'btn-github', 'Open it'); open.href = item.url; open.target = '_blank'; open.rel = 'noopener';
    open.setAttribute('aria-label', 'Open ' + L.itemLabel(item) + ' in a new tab');
    acts.appendChild(open);
    if (L.canManage(item, S.me.id, S.teaching)) {
      if (isShown) acts.appendChild(button('Back in the wings', 'btn-quiet', function () { setItem(item, { state: 'waiting' }); }));
      else acts.appendChild(button('They have presented', 'btn-quiet', function () { setItem(item, { state: 'shown' }); }));
      acts.appendChild(button('Take it off', 'btn-quiet', function () { removeItem(item); }));
    }
    // With the show running (R3), a teacher puts work from the wings on
    // every main stage, and takes it off again (R7).
    if (S.teaching && shared() && !isShown) {
      var pinned = V.pinOf(run.state());
      var on = !!pinned && pinned.kind === 'item' && pinned.id === item.id;
      var t = button(on ? 'Take it off the main stage' : 'Put it on the main stage', 'btn-quiet', function () { run.pin(on ? null : { kind: 'item', id: item.id }); });
      t.setAttribute('aria-pressed', String(on));
      acts.insertBefore(t, acts.children[1] || null);
    }
    li.appendChild(acts);
    return li;
  }

  // Whose work is on the main stage, for everyone, and, for a teacher,
  // one cue to thank them and bring up the next from the wings (R7).
  function drawOnStage() {
    var box = $('[data-on-stage]');
    var items = S.items || [];
    var now = V && shared() ? V.onStageNow(run.state(), items, partNow(), S.me.id, nameOf, L.itemLabel) : null;
    var next = V && shared() && S.teaching ? V.nextFromWings(items, now ? now.id : null) : null;
    box.replaceChildren();
    box.hidden = !now && !next;
    if (now) {
      box.appendChild(el('p', 'kicker', 'On the main stage'));
      box.appendChild(el('p', 'on-stage-line', now.line));
      box.appendChild(el('p', 'live-what', now.what));
      if (now.audience) box.appendChild(el('p', 'on-stage-audience', 'Your part: ' + now.audience));
    }
    if (next) {
      var acts = el('div', 'actions');
      acts.appendChild(button(now ? 'Thank them, and bring up ' + nameOf(next.user_id) : 'Bring up ' + nameOf(next.user_id) + ' from the wings', 'btn-github', function () {
        var done = now ? db.from('live_queue').update({ state: 'shown' }).eq('id', now.id) : Promise.resolve({});
        done.then(function () { run.pin({ kind: 'item', id: next.id }); refreshLive(); });
      }));
      if (now) acts.appendChild(button('Thank them, and clear the stage', 'btn-quiet', function () {
        db.from('live_queue').update({ state: 'shown' }).eq('id', now.id).then(function () { run.pin(null); refreshLive(); });
      }));
      box.appendChild(acts);
    }
  }

  function drawQueue(items) {
    S.items = items;
    drawOnStage();
    var q = L.queue(items);
    var list = $('[data-queue]'); list.replaceChildren();
    if (!q.waiting.length) list.appendChild(el('li', 'live-empty small', q.shown.length ? 'Everyone in the wings has presented.' : 'No one is in the wings yet. Ask to present below.'));
    q.waiting.forEach(function (item, i) { list.appendChild(queueItem(item, i, false)); });
    $('[data-shown-wrap]').hidden = !q.shown.length;
    $('[data-shown-summary]').textContent = 'Presented so far (' + q.shown.length + ')';
    if (show) show.count('wings', q.waiting.length);
    var shown = $('[data-shown]'); shown.replaceChildren();
    q.shown.forEach(function (item, i) { shown.appendChild(queueItem(item, i, true)); });
  }

  // ------------------------------------------------------------------
  // Checks for understanding
  // ------------------------------------------------------------------

  function resultsOf(check, summary) {
    return Q.results(check, summary, { teaching: S.teaching });
  }

  function changeCheck(check, change) {
    return db.from('live_checks').update(change).eq('id', check.id).then(function (r) { if (!r.error) return refreshLive(); });
  }

  function teacherCard(check, answers, summary) {
    var card = el('article', 'cohort-card live-check');
    var kind = L.questionKind(L.kindOf(check));
    card.appendChild(el('p', 'kicker', (check.state === 'open' ? 'Open' : 'Closed') + ', ' + kind.name.toLowerCase()));
    card.appendChild(el('h3', null, check.prompt));
    var mine = answers.filter(function (a) { return a.check_id === check.id; });
    if (L.kindOf(check) !== 'short') card.appendChild(resultsOf(check, summary));
    else card.appendChild(el('p', 'small', L.counted(mine.length, 'answer', 'answers')));
    if (mine.length) {
      var ul = el('ul', 'live-answers');
      mine.sort(function (a, b) { return a.updated_at.localeCompare(b.updated_at); }).forEach(function (a) {
        var li = el('li');
        li.appendChild(el('strong', null, nameOf(a.user_id) + ': '));
        li.appendChild(document.createTextNode(L.answerText(check, a) || ''));
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
    var acts = el('div', 'actions');
    if (L.kindOf(check) !== 'short') acts.appendChild(button(check.show_tally ? 'Hide the results from everyone' : 'Show everyone the results', 'btn-quiet', function () { changeCheck(check, { show_tally: !check.show_tally }); }));
    acts.appendChild(button(check.state === 'open' ? 'Close it' : 'Open it again', 'btn-quiet', function () { changeCheck(check, { state: check.state === 'open' ? 'closed' : 'open' }); }));
    var del = button('Delete it', 'btn-quiet danger', function () { del.hidden = true; ask.hidden = false; });
    acts.appendChild(del);
    var ask = el('div', 'live-confirm'); ask.hidden = true;
    ask.appendChild(el('p', null, 'Delete this question and every answer to it?'));
    var askActs = el('div', 'actions');
    askActs.appendChild(button('Delete', 'btn-quiet danger', function () {
      db.from('live_checks').delete().eq('id', check.id).then(function (r) { if (!r.error) refreshLive(); });
    }));
    askActs.appendChild(button('Keep it', 'btn-quiet', function () { ask.hidden = true; del.hidden = false; }));
    ask.appendChild(askActs);
    card.appendChild(acts);
    card.appendChild(ask);
    if (check.state === 'open' && !mine.length && S.kinds) card.appendChild(editCheck(check));
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
    var save = el('button', 'btn-quiet', 'Save the change'); save.type = 'submit';
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

  function studentCard(check, answer, summary) {
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('p', 'kicker', check.state === 'open' ? 'Your teacher asks' : 'Closed'));
    card.appendChild(el('h3', null, check.prompt));
    var said = L.answerText(check, answer);
    if (check.state === 'open') {
      if (said) card.appendChild(el('p', 'small', 'You answered: ' + said));
      card.appendChild(Q.answer(check, answer, {
        draft: drafts[check.id],
        onDraft: function (input) { drafts[check.id] = input; },
        onSend: function (row) { return sendAnswer(check, answer, row); }
      }));
    } else {
      card.appendChild(el('p', 'small', said ? 'You answered: ' + said : 'You did not answer this one.'));
    }
    if (check.show_tally && L.kindOf(check) !== 'short') card.appendChild(resultsOf(check, summary));
    return card;
  }

  function sendAnswer(check, answer, row) {
    var write = answer
      ? db.from('live_answers').update(row).eq('id', answer.id)
      : db.from('live_answers').insert(Object.assign({ check_id: check.id, cohort_id: S.cohort.id, user_id: S.me.id }, row));
    return write.then(function (r) {
      if (r.error) return r.error.message;
      delete drafts[check.id];
      refreshLive();
      return null;
    });
  }

  function drawChecks(checks, answers, tallies) {
    var open = checks.filter(function (k) { return k.state === 'open'; });
    var closed = checks.filter(function (k) { return k.state !== 'open'; });
    if (show) show.count('questions', open.length);
    function card(k) {
      if (S.teaching) return teacherCard(k, answers, tallies[k.id]);
      return studentCard(k, answers.filter(function (a) { return a.check_id === k.id && a.user_id === S.me.id; })[0], tallies[k.id]);
    }
    var box = $('[data-checks]'); box.replaceChildren();
    if (!open.length) box.appendChild(el('p', 'small live-empty', S.teaching ? 'No question is open right now.' : 'No question is open right now. When your teacher asks one, it appears here.'));
    open.forEach(function (k) { box.appendChild(card(k)); });
    $('[data-earlier-wrap]').hidden = !closed.length;
    var earlier = $('[data-earlier]'); earlier.replaceChildren();
    closed.forEach(function (k) { earlier.appendChild(card(k)); });
  }

  function askCheck(ev) {
    ev.preventDefault();
    var status = $('[data-ask-status]');
    var f = askFields.read();
    var parsed = L.parseQuestion(f);
    if (parsed.error) { status.textContent = parsed.error; return; }
    status.textContent = 'Asking…';
    ask(Object.assign({ question_id: f.question_id }, parsed), $('[data-ask-tally]').checked).then(function (err) {
      status.textContent = err ? 'Not asked: ' + err : 'Asked.';
      if (!err) askFields.reset();
    });
  }

  // Asking a question: a copy of it goes to everyone, so changing it in
  // the moment never changes the bank or the run of show.
  function ask(q, showResults) {
    return db.from('live_checks').insert(Q.askRow({
      cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, show_tally: !!showResults
    }, q, S.kinds)).then(function (r) {
      if (r.error) return r.error.message;
      refreshLive();
      return null;
    });
  }

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
      bank = r.error ? [] : (r.data || []).filter(function (q) { return !q.cohort_id || q.cohort_id === S.cohort.id; });
      askFields = Q.fields({ bank: bank, basic: !S.kinds });
      $('[data-ask-fields]').replaceChildren(askFields.el);
    });
  }

  // The design stage's link carries the current design scene's template
  // (R5), so the board is laid with it the first time it opens.
  function designHref() {
    if (!S.designLink) return;
    var part = typeof partNow === 'function' && S.session ? partNow() : null;
    var t = part && part.kind === 'design' ? (part.config || {}).template : null;
    var B = window.BoardLib;
    S.designLink.href = B ? B.link(S.cohort.slug, S.session, null, false, t)
      : '/board/?c=' + encodeURIComponent(S.cohort.slug) + '&s=week-' + S.session.number;
  }

  // A question scene in the run of show (R2) holds the question the
  // teacher planned. When it is the current scene, the teacher can ask it
  // in one press, and it says so once it has been asked.
  function drawSceneQuestion() {
    var box = $('[data-scene-question]');
    var part = typeof partNow === 'function' ? partNow() : null;
    var q = S.teaching && part && part.own && part.kind === 'question' ? L.fromScene(part.config) : null;
    box.hidden = !q;
    box.replaceChildren();
    if (!q) return;
    var asked = (S.checks || []).some(function (k) { return k.prompt === q.prompt && k.state === 'open'; });
    box.appendChild(el('p', 'kicker', 'Planned for this scene, ' + L.questionKind(q.kind).name.toLowerCase()));
    box.appendChild(el('p', 'live-what', q.prompt));
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    var acts = el('div', 'actions');
    if (asked) status.textContent = 'Asked. The answers are below.';
    else acts.appendChild(button('Ask it now', 'btn-github', function () {
      status.textContent = 'Asking…';
      ask(q, $('[data-ask-tally]').checked).then(function (err) { status.textContent = err ? 'Not asked: ' + err : ''; });
    }));
    acts.appendChild(status);
    box.appendChild(acts);
  }

  // ------------------------------------------------------------------
  // Hearing about changes
  // ------------------------------------------------------------------

  function nudge() { clearTimeout(nudgeTimer); nudgeTimer = setTimeout(refreshLive, 300); }
  function poll(on) {
    if (on && !poller) poller = setInterval(refreshLive, POLL);
    if (!on && poller) { clearInterval(poller); poller = null; }
    $('[data-sync]').textContent = on
      ? 'This page checks for changes every fifteen seconds.'
      : 'Changes to the queue and the questions appear here as they happen.';
  }
  function listen() {
    if (channel || !db.channel) return poll(true);
    var f = 'cohort_id=eq.' + S.cohort.id;
    channel = db.channel('live:' + S.cohort.id);
    ['live_queue', 'live_checks', 'live_answers'].forEach(function (t) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: f }, nudge);
    });
    poll(true);
    channel.subscribe(function (status) {
      if (status === 'SUBSCRIBED') { poll(false); refreshLive(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') poll(true);
    });
  }

  $('[data-add]').addEventListener('submit', addToQueue);
  $('[data-add-what]').addEventListener('change', syncAddForm);
  $('[data-ask]').addEventListener('submit', askCheck);
  // The two closing questions, asked in order, answered privately, and
  // read by the teacher before the next session (LiveLib.CLOSING_CHECKS).
  $('[data-ask-closing]').addEventListener('click', function () {
    var status = $('[data-ask-status]');
    status.textContent = 'Asking…';
    L.CLOSING_CHECKS.reduce(function (p, prompt) {
      return p.then(function (r) {
        if (r && r.error) return r;
        return db.from('live_checks').insert({ cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id, prompt: prompt, choices: null, show_tally: false });
      });
    }, Promise.resolve(null)).then(function (r) {
      status.textContent = r && r.error ? 'Not asked: ' + r.error.message : 'Asked both.';
      refreshLive();
    });
  });
  // The part of the session moves on with the clock.
  setInterval(function () { if (S.session && S.parts.length) drawNow(); }, 20000);
  $('[data-reload]').addEventListener('click', load);
  load();
})();
