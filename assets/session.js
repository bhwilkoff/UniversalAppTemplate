// A session's own page (/session/?c=<slug>&s=<number>). Ben, October 23,
// 2026: "The session page should functionally only be to prep the
// session... The session page should show content to the learners and
// should be prep for the leader, but once the session is going, the
// session page on humanshaped.org should serve no further purpose for the
// leader (other than as reference)." So it holds no live controls: when
// the session is, its call, what to bring, and the plan with each part's
// words, which its leaders change here. While a session runs, learners get
// one button to the add-on's panel outside Meet, until Google approves the
// add-on for everyone; leaders run it from the add-on inside Meet.
(function () {
  var root = document.querySelector('[data-session]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib) return;
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var lib = window.CohortLib, U = window.UI;
  var query = new URLSearchParams(location.search);
  var slug = query.get('c') || '';
  var wanted = /^\d{1,2}$/.test(query.get('s') || '') ? Number(query.get('s')) : null;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function link(text, href, cls, external) {
    var a = el('a', cls || null, text); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function load() {
    if (!slug) return fail('This page needs to know which session to show. Open it from your cohort’s Sessions.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) return show('signed-out');
      var me = s.data.session.user;
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This session could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        var cohort = c.data;
        return Promise.all([
          db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
          db.from('enrollments').select('user_id').eq('cohort_id', cohort.id).eq('user_id', me.id).neq('status', 'left'),
          db.from('cohort_teachers').select('user_id').eq('cohort_id', cohort.id).eq('user_id', me.id)
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('This session could not be loaded: ' + bad.error.message);
          var sessions = res[0].data, member = res[1].data.length > 0, leading = res[2].data.length > 0;
          if (!member && !leading) return show('not-member');
          if (window.CohortNav) window.CohortNav.draw($('[data-cohort-nav]'), { cohort: cohort, teaching: leading, member: member, current: 'live' });
          if (!sessions.length) {
            $('[data-no-sessions]').replaceChildren(U.empty('No sessions yet', leading ? U.link('Go to Sessions', '/cohort/?c=' + encodeURIComponent(cohort.slug) + '&t=sessions', 'btn-secondary') : null));
            return show('no-sessions');
          }
          var t = lib.currentAndNext(sessions, new Date(), cohort.session_minutes);
          var named = wanted == null ? null : sessions.filter(function (x) { return x.number === wanted; })[0];
          var session = named || (t.live ? t.next : (t.next || t.current));
          // The address names the session, so it can be kept and shared.
          if (!named) history.replaceState(null, '', lib.sessionUrl(cohort.slug, session.number));
          var live = !!(t.live && t.next && t.next.id === session.id);
          draw(cohort, sessions, session, live, leading);
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  function draw(cohort, sessions, session, live, leading) {
    var ends = session.starts_at ? Date.parse(session.starts_at) + cohort.session_minutes * 60000 : null;
    var finished = !live && ends != null && ends < Date.now();
    document.title = lib.sessionTitle(session) + ', ' + cohort.title + ' | Human Shaped';
    $('[data-title]').textContent = lib.sessionTitle(session);

    // When, on the reader's own clock, and its state.
    var when = $('[data-when]'); when.replaceChildren();
    when.appendChild(U.status('session', live ? 'live' : finished ? 'finished' : safe(session.meet_url) ? 'ready' : 'planned'));
    if (session.starts_at) {
      var start = new Date(session.starts_at), end = new Date(start.getTime() + cohort.session_minutes * 60000);
      var time = function (d) { return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
      when.appendChild(document.createTextNode(' ' + start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ', ' + time(start) + ' to ' + time(end) + ', your time'));
    }
    $('[data-scope]').textContent = session.scope || '';
    $('[data-scope]').hidden = !session.scope;

    // What a person does from here: join the call, and, while it runs, a
    // learner's panel until the add-on is approved; afterward, the recording.
    var acts = $('[data-actions]'); acts.replaceChildren();
    if (!finished && safe(session.meet_url)) acts.appendChild(link('Join the call', session.meet_url, 'btn-primary', true));
    if (live && !leading) acts.appendChild(link('Open the session panel', '/addon/?c=' + encodeURIComponent(cohort.slug) + '&s=' + session.number, 'btn-secondary', true));
    if (safe(session.recording_url)) acts.appendChild(link('Watch the recording', session.recording_url, finished ? 'btn-primary' : 'btn-secondary', true));
    acts.hidden = !acts.children.length;

    // The sessions on either side.
    var i = sessions.indexOf(session), pager = $('[data-pager]'); pager.replaceChildren();
    [[sessions[i - 1], 'Before: '], [sessions[i + 1], 'Next: ']].forEach(function (x) {
      if (x[0]) pager.appendChild(link(x[1] + lib.sessionTitle(x[0]), lib.sessionUrl(cohort.slug, x[0].number)));
    });
    pager.hidden = !pager.children.length;

    // What to bring: the stage's "Be ready to...", which the plan's
    // bring-back part asks for, and the stages this session starts.
    drawPlan(cohort, sessions, session, leading);
    var stages = lib.stagesForWeek(session.number);
    var stageBox = $('[data-stages]'); stageBox.replaceChildren();
    stages.forEach(function (n) { var li = el('li'); li.appendChild(link('Stage ' + n, '/path/' + n + '/')); stageBox.appendChild(li); });
    $('[data-stages-section]').hidden = !stages.length;

    if (leading) drawDetails(session);
    $('[data-details]').hidden = !leading;
    show('ready');
  }

  function drawPlan(cohort, sessions, session, leading) {
    var box = $('[data-plan]');
    if (!window.ShowBuilder || !window.ShowLib) { box.replaceChildren(U.empty('The plan could not load')); return; }
    window.ShowBuilder.mount(box, {
      db: db, cohort: cohort, session: session, sessions: sessions, readOnly: !leading,
      agenda: lib.agenda(cohort.session_minutes), turn: window.LiveLib ? window.LiveLib.TURN : []
    });
    // What to bring comes from the plan's bring-back part, once it loads.
    db.from('scenes').select('kind, title, config, position').eq('session_id', session.id).order('position').then(function (r) {
      var bring = (r.data || []).filter(function (x) { return (x.kind === 'rooms' || x.kind === 'presenter') && x.config && x.config.prompt; })[0];
      var sec = $('[data-bring-section]');
      sec.hidden = !bring;
      if (bring) $('[data-bring]').textContent = bring.config.prompt;
    });
  }

  // A leader's own fields for the session: its title, the challenge in
  // their words, and the recording once there is one.
  var wired = false;
  function drawDetails(s) {
    var f = $('[data-session-form]'), said = $('[data-session-form-status]');
    f.elements.title.value = s.title && s.title !== lib.sessionName(s.number) ? s.title : '';
    f.elements.scope.value = s.scope || '';
    f.elements.recording_url.value = s.recording_url || '';
    if (wired) return;
    wired = true;
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var e = f.elements, rec = e.recording_url.value.trim();
      if (rec && !safe(rec)) { U.say(said, 'A recording link starts with https://', 'problem'); return; }
      var patch = { title: e.title.value.trim() || lib.sessionName(s.number), scope: e.scope.value.trim() || null, recording_url: rec || null };
      U.say(said, 'Saving');
      db.from('sessions').update(patch).eq('id', s.id).then(function (r) {
        if (r.error) { U.say(said, 'Not saved: ' + r.error.message, 'problem'); return; }
        Object.assign(s, patch);
        U.say(said, 'Saved');
        $('[data-title]').textContent = lib.sessionTitle(s);
        $('[data-scope]').textContent = s.scope || ''; $('[data-scope]').hidden = !s.scope;
      });
    });
  }

  $('[data-reload]').addEventListener('click', load);
  load();
})();
