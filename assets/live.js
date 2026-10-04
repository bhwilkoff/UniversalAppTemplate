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
    var ol = $('[data-agenda]'); ol.replaceChildren();
    S.parts.forEach(function (p) {
      var li = el('li', 'agenda-part');
      li.setAttribute('data-part', p.key);
      li.appendChild(el('h3', null, p.name));
      li.appendChild(el('p', 'small', 'Minute ' + p.start + ', for ' + p.minutes + ' minutes'));
      li.appendChild(el('p', null, p.what));
      // Starting a part's timer also tells the page that this is the part
      // the session is in, whatever the clock says.
      li.appendChild(timerButton(p.minutes * 60, 'part:' + p.key, function () { S.chosenPart = p.key; drawNow(); }));
      ol.appendChild(li);
    });

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
    var part = lib.partNow(S.parts, S.session.starts_at, new Date(), S.chosenPart);
    var key = part ? part.key : null;
    root.querySelectorAll('[data-part]').forEach(function (li) { li.classList.toggle('now', li.getAttribute('data-part') === key); });
    if (!force && key === S.drawnPart) return;
    S.drawnPart = key;
    var body = $('[data-now-body]');
    body.replaceChildren();
    var section = $('[data-now]');
    if (key === 'arrive') drawArrive(body);
    else if (key === 'show') drawGroups(body);
    section.hidden = !body.children.length;
    if (part) $('[data-now-title]').textContent = part.name;
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

    var steps = L.turnSteps(partMinutes('show'), order.length || 1);
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
    $('[data-rooms-intro]').textContent = S.teaching
      ? 'Where each group is in its turns, from the step timers and the Next step button in each room. A group that would like you lights up. Join its room, say that you are there, and press I am here.'
      : 'Where your group is in its turns, which your teacher can see from any room. Press Next step as you go, and ask for your teacher here if you would like them to come.';
    rooms = window.RoomBoard.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups, people: S.people,
      names: S.names, nameOf: nameOf, mount: $('[data-rooms]'),
      onChange: function (byGroup) {
        roomPlaces = byGroup;
        $('[data-rooms-section]').hidden = $('[data-rooms]').hidden;
        root.querySelectorAll('[data-steps-of]').forEach(function (list) { markSteps(list, byGroup[list.getAttribute('data-steps-of')]); });
      }
    });
  }

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
    $('[data-sig-card-page]').href = '/card/?c=' + encodeURIComponent(S.cohort.slug);
    signals = window.LiveSignals.start({
      db: db, cohort: S.cohort, session: S.session, meId: S.me.id, teaching: S.teaching, groups: S.groups,
      nameOf: nameOf, people: people, roomMinutes: partMinutes('show'),
      mounts: {
        recording: $('[data-sig-recording]'), where: $('[data-sig-where]'), card: $('[data-sig-card]'), stage: $('[data-sig-stage]'),
        controls: S.teaching ? $('[data-sig-controls]') : null
      }
    });
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
      db.from('live_answers').select('id, check_id, user_id, choice, body, updated_at').eq('cohort_id', S.cohort.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { $('[data-sync]').textContent = 'The page could not read the latest changes: ' + bad.error.message; return; }
      var checks = res[1].data;
      var visible = checks.filter(function (k) { return k.choices && (S.teaching || k.show_tally); });
      return Promise.all(visible.map(function (k) { return db.rpc('check_tally', { c: k.id }); })).then(function (tallies) {
        var byCheck = {};
        visible.forEach(function (k, i) { byCheck[k.id] = (tallies[i] && tallies[i].data) || []; });
        render('[data-queue]', function () { drawQueue(res[0].data); });
        render('[data-checks]', function () { drawChecks(checks, res[2].data, byCheck); });
        // Classmates' answers do not reach a student through Realtime (they
        // cannot read them), so a shown count is read again on its own.
        var wantTally = !S.teaching && checks.some(function (k) { return k.state === 'open' && k.show_tally && k.choices; });
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
    if (a && box.contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) && !a.closest('[data-add]') && !a.closest('[data-ask]')) {
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
    if (!isShown && i === 0) li.appendChild(el('p', 'kicker', 'Up next'));
    li.appendChild(el('p', 'live-who', nameOf(item.user_id)));
    li.appendChild(el('p', 'live-what', L.itemLabel(item)));
    if (item.note) li.appendChild(el('p', 'live-note', item.note));
    var acts = el('div', 'actions');
    var open = el('a', isShown ? 'btn-quiet' : 'btn-github', 'Open it'); open.href = item.url; open.target = '_blank'; open.rel = 'noopener';
    open.setAttribute('aria-label', 'Open ' + L.itemLabel(item) + ' in a new tab');
    acts.appendChild(open);
    if (L.canManage(item, S.me.id, S.teaching)) {
      if (isShown) acts.appendChild(button('Back in the queue', 'btn-quiet', function () { setItem(item, { state: 'waiting' }); }));
      else acts.appendChild(button('It has been shown', 'btn-quiet', function () { setItem(item, { state: 'shown' }); }));
      acts.appendChild(button('Take it off', 'btn-quiet', function () { removeItem(item); }));
    }
    li.appendChild(acts);
    return li;
  }

  function drawQueue(items) {
    var q = L.queue(items);
    var list = $('[data-queue]'); list.replaceChildren();
    if (!q.waiting.length) list.appendChild(el('li', 'live-empty small', q.shown.length ? 'Everything in the queue has been shown.' : 'Nothing is in the queue yet.'));
    q.waiting.forEach(function (item, i) { list.appendChild(queueItem(item, i, false)); });
    $('[data-shown-wrap]').hidden = !q.shown.length;
    $('[data-shown-summary]').textContent = 'Shown so far (' + q.shown.length + ')';
    var shown = $('[data-shown]'); shown.replaceChildren();
    q.shown.forEach(function (item, i) { shown.appendChild(queueItem(item, i, true)); });
  }

  // ------------------------------------------------------------------
  // Checks for understanding
  // ------------------------------------------------------------------

  function tallyBars(check, rows) {
    var t = L.tally(check, rows);
    var wrap = el('div', 'live-tally');
    wrap.appendChild(el('p', 'small', L.counted(t.total, 'answer', 'answers') + (S.teaching ? '' : ', with no names')));
    var ul = el('ul');
    t.rows.forEach(function (r) {
      var li = el('li');
      li.appendChild(el('span', 'label', r.label));
      var bar = el('span', 'bar'); bar.style.setProperty('--share', r.share + '%');
      li.appendChild(bar);
      li.appendChild(el('span', 'count', String(r.count)));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function changeCheck(check, change) {
    return db.from('live_checks').update(change).eq('id', check.id).then(function (r) { if (!r.error) return refreshLive(); });
  }

  function teacherCard(check, answers, tallyRows) {
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('p', 'kicker', check.state === 'open' ? 'Open' : 'Closed'));
    card.appendChild(el('h3', null, check.prompt));
    var mine = answers.filter(function (a) { return a.check_id === check.id; });
    if (check.choices) card.appendChild(tallyBars(check, tallyRows || []));
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
    if (check.choices) acts.appendChild(button(check.show_tally ? 'Hide the count from everyone' : 'Show everyone the count', 'btn-quiet', function () { changeCheck(check, { show_tally: !check.show_tally }); }));
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
    return card;
  }

  function studentCard(check, answer, tallyRows) {
    var card = el('article', 'cohort-card live-check');
    card.appendChild(el('p', 'kicker', check.state === 'open' ? 'Your teacher asks' : 'Closed'));
    card.appendChild(el('h3', null, check.prompt));
    var said = L.answerText(check, answer);
    if (check.state === 'open') {
      var form = el('form', 'inline-form');
      if (check.choices) {
        var fs = el('fieldset', 'live-mode');
        fs.appendChild(el('legend', 'visually-hidden', 'Choose one'));
        check.choices.forEach(function (c, i) {
          var lab = el('label', 'check');
          var r = el('input'); r.type = 'radio'; r.name = 'check-' + check.id; r.value = String(i + 1); r.required = true;
          var d = drafts[check.id];
          r.checked = d != null ? d === r.value : !!(answer && answer.choice === i + 1);
          r.addEventListener('change', function () { drafts[check.id] = r.value; });
          lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + c));
          fs.appendChild(lab);
        });
        form.appendChild(fs);
      } else {
        var lab2 = el('label', null, 'Your answer');
        var ta = el('textarea'); ta.rows = 2; ta.maxLength = 1000; ta.required = true;
        ta.value = drafts[check.id] != null ? drafts[check.id] : (answer ? answer.body : '');
        ta.addEventListener('input', function () { drafts[check.id] = ta.value; });
        lab2.appendChild(ta); form.appendChild(lab2);
      }
      var acts = el('div', 'actions');
      var send = el('button', 'btn-quiet', answer ? 'Change my answer' : 'Send my answer'); send.type = 'submit';
      var status = el('span', 'small'); status.setAttribute('role', 'status');
      acts.appendChild(send); acts.appendChild(status);
      form.appendChild(acts);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var row = { check_id: check.id, cohort_id: S.cohort.id, user_id: S.me.id };
        if (check.choices) { var picked = form.querySelector('input:checked'); if (!picked) return; row.choice = Number(picked.value); row.body = null; }
        else { row.body = ta.value.trim(); row.choice = null; if (!row.body) return; }
        status.textContent = 'Sending…';
        var write = answer
          ? db.from('live_answers').update({ choice: row.choice, body: row.body }).eq('id', answer.id)
          : db.from('live_answers').insert(row);
        write.then(function (r) {
          if (r.error) { status.textContent = 'Not sent: ' + r.error.message; return; }
          delete drafts[check.id];
          refreshLive();
        });
      });
      if (said) card.appendChild(el('p', 'small', 'You answered: ' + said));
      card.appendChild(form);
    } else {
      card.appendChild(el('p', 'small', said ? 'You answered: ' + said : 'You did not answer this one.'));
    }
    if (check.choices && check.show_tally) card.appendChild(tallyBars(check, tallyRows || []));
    return card;
  }

  function drawChecks(checks, answers, tallies) {
    var open = checks.filter(function (k) { return k.state === 'open'; });
    var closed = checks.filter(function (k) { return k.state !== 'open'; });
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
    var mode = root.querySelector('input[name="ask-mode"]:checked').value;
    var status = $('[data-ask-status]');
    var parsed = L.parseCheck($('[data-ask-prompt]').value, mode, $('[data-ask-choices]').value);
    if (parsed.error) { status.textContent = parsed.error; return; }
    status.textContent = 'Asking…';
    db.from('live_checks').insert({
      cohort_id: S.cohort.id, session_id: S.session.id, created_by: S.me.id,
      prompt: parsed.prompt, choices: parsed.choices, show_tally: $('[data-ask-tally]').checked
    }).then(function (r) {
      if (r.error) { status.textContent = 'Not asked: ' + r.error.message; return; }
      status.textContent = 'Asked.';
      $('[data-ask-prompt]').value = ''; $('[data-ask-choices]').value = '';
      refreshLive();
    });
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
  root.querySelectorAll('input[name="ask-mode"]').forEach(function (r) {
    r.addEventListener('change', function () { $('[data-ask-choices-wrap]').hidden = r.value !== 'choices' || !r.checked; });
  });
  $('[data-reload]').addEventListener('click', load);
  load();
})();
