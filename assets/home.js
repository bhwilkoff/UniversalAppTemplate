// The signed-in home page (research/notes/signed-in-experience-notes.md).
// The page's head marks <html data-member> when this browser holds a
// session; only then does this load the hub's scripts and draw the
// person's own home. Without a session that still works, the pitch
// comes back. Words by Claude, awaiting Ben's review.
(function () {
  var html = document.documentElement;
  var root = document.querySelector('[data-member-home]');
  if (!root || !html.hasAttribute('data-member')) return;

  var SCRIPTS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js',
    '/assets/hub-config.js?v=20261016a',
    '/assets/teach-lib.js?v=20261022c',
    '/assets/path-lib.js',
    '/assets/home-lib.js?v=20261022d',
    '/assets/exchange-lib.js?v=20261022a',
    '/assets/exchange-list.js?v=20261022d'
  ];
  function loadAll(list) {
    return new Promise(function (resolve, reject) {
      var left = list.length;
      list.forEach(function (src) {
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = function () { if (--left === 0) resolve(); };
        s.onerror = function () { reject(new Error('a part of the page did not load (' + src.split('?')[0] + ')')); };
        document.body.appendChild(s);
      });
    });
  }

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text, cls) { var a = el('a', cls || null, text); a.href = href; return a; }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function status(text) {
    $('[data-home-status]').textContent = text || ''; $('[data-home-status]').hidden = !text;
    var sk = $('[data-home-skeleton]'); if (sk) sk.hidden = true;
  }
  function section(key) { return root.querySelector('[data-home="' + key + '"]'); }
  function pub() { html.removeAttribute('data-member'); }
  function safeUrl(u) { return /^https:\/\//.test(u || '') ? u : null; }

  // A row: what it is, a line about it, and its actions on the right.
  function row(title, line, actions, cls) {
    var li = el('li', 'home-row' + (cls ? ' ' + cls : ''));
    var text = el('div', 'home-row-text');
    if (title) text.appendChild(title.nodeType ? title : el('p', 'home-row-title', title));
    if (line) text.appendChild(line.nodeType ? line : el('p', 'home-row-line', line));
    li.appendChild(text);
    if (actions && actions.length) {
      var a = el('div', 'actions');
      actions.forEach(function (x) { a.appendChild(x); });
      li.appendChild(a);
    }
    return li;
  }
  function empty(text, actions) {
    var box = el('div', 'home-empty');
    box.appendChild(el('p', null, text));
    if (actions && actions.length) {
      var a = el('div', 'actions');
      actions.forEach(function (x) { a.appendChild(x); });
      box.appendChild(a);
    }
    return box;
  }

  var SEEN_KEY = 'hs-home-seen';
  function lastSeen() {
    try { return localStorage.getItem(SEEN_KEY); } catch (e) { return null; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch (e) {}
  }

  var COHORT = 'id, slug, title, starts_on, weeks, status, session_weekday, session_time, session_minutes, time_zone';

  function start() {
    var H = window.HomeLib, T = window.TeachLib, P = window.PathLib;
    var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
    return db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) return pub();
      var me = session.user;
      var since = lastSeen() || new Date(Date.now() - 14 * 864e5).toISOString();
      var now = new Date();
      var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      return Promise.all([
        db.from('profiles').select('github_login, display_name, avatar_url').eq('id', me.id).maybeSingle(),
        db.from('enrollments').select('role, status, app_name, app_repo, app_url, app_public, cohorts(' + COHORT + ')').eq('user_id', me.id).neq('status', 'left'),
        db.from('cohort_teachers').select('cohorts(' + COHORT + ')').eq('user_id', me.id),
        db.from('teachers').select('*').eq('user_id', me.id).maybeSingle(),
        db.from('builder_apps').select('app_repo, app_name, app_url, public').eq('user_id', me.id).maybeSingle(),
        db.from('stage_marks').select('stage, updated_at').eq('user_id', me.id),
        db.from('teacher_notes').select('created_at').eq('student_id', me.id),
        db.from('shares').select('cohort_id, feedback(author_id, created_at)').eq('user_id', me.id),
        db.from('cohorts').select(COHORT).eq('status', 'open').order('starts_on')
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) throw bad.error;
        var profile = res[0].data || {};
        var teacher = res[3].data;

        // Every cohort this person is in or teaches, once each.
        var cohorts = [], byId = {};
        res[2].data.forEach(function (x) {
          if (x.cohorts && !byId[x.cohorts.id]) { byId[x.cohorts.id] = Object.assign({}, x.cohorts, { myRole: 'teacher' }); cohorts.push(byId[x.cohorts.id]); }
        });
        res[1].data.forEach(function (x) {
          if (x.cohorts && !byId[x.cohorts.id]) { byId[x.cohorts.id] = Object.assign({}, x.cohorts, { myRole: x.role, enrollment: x }); cohorts.push(byId[x.cohorts.id]); }
        });
        var ids = cohorts.map(function (c) { return c.id; });
        var taught = cohorts.filter(function (c) { return c.myRole === 'teacher'; }).map(function (c) { return c.id; });

        var feedbackNew = 0, feedbackCohort = null;
        res[7].data.forEach(function (sh) {
          (sh.feedback || []).forEach(function (f) {
            if (f.author_id !== me.id && f.created_at > since) { feedbackNew++; feedbackCohort = sh.cohort_id; }
          });
        });

        var polls = [];
        try {
          for (var i = 0; i < localStorage.length; i++) polls.push(localStorage.key(i));
        } catch (e) { polls = []; }
        var answered = H.answeredPolls(polls);

        return Promise.all([
          ids.length ? db.from('sessions').select('cohort_id, number, starts_at, meet_url').in('cohort_id', ids) : { data: [] },
          teacher ? db.from('time_polls').select('id, title, open, created_at, time_poll_answers(count)').order('created_at', { ascending: false }) : { data: [] },
          taught.length ? db.from('shares').select('cohort_id, kind, created_at, feedback(author_id)').in('cohort_id', taught).in('kind', ['for-feedback', 'question']) : { data: [] },
          taught.length ? db.from('cohort_teachers').select('cohort_id, user_id').in('cohort_id', taught) : { data: [] },
          teacher && teacher.can_approve ? db.from('teacher_requests').select('state, created_at').eq('state', 'waiting') : { data: [] },
          Promise.all(answered.map(function (t) {
            return db.rpc('time_poll', { t: t }).then(function (r) { return r.data ? { token: t, title: r.data.title, open: r.data.open } : null; }, function () { return null; });
          }))
        ]).then(function (more) {
          var sessions = (more[0].data || []);
          cohorts.forEach(function (c) { c.now = H.cohortNow(c, sessions.filter(function (s) { return s.cohort_id === c.id; }), now); });
          var teachersBy = {};
          (more[3].data || []).forEach(function (t) { (teachersBy[t.cohort_id] = teachersBy[t.cohort_id] || []).push(t.user_id); });
          var model = {
            me: me, profile: profile, teacher: teacher, cohorts: cohorts, now: now, zone: zone,
            open: res[8].data.filter(function (c) { return !byId[c.id]; }),
            comingUp: H.comingUp(cohorts.filter(function (c) { return c.status !== 'draft'; }), now),
            builderApp: res[4].data,
            lastMark: H.lastStage(res[5].data),
            myPolls: more[1].data || [],
            answeredPolls: more[5].filter(Boolean)
          };
          var feedbackCohortSlug = feedbackCohort && byId[feedbackCohort] ? byId[feedbackCohort].slug : null;
          model.waiting = H.waiting({
            requests: (more[4].data || []).length,
            feedback: T ? T.waitingForFeedback(more[2].data || [], teachersBy).length : 0,
            notes: H.newerThan(res[6].data, 'created_at', since),
            answers: feedbackNew,
            answersHref: feedbackCohortSlug ? '/cohort/?c=' + encodeURIComponent(feedbackCohortSlug) : '/account/'
          });
          model.polls = model.myPolls.concat(model.answeredPolls);
          draw(model, H, P);
          markSeen();
        });
      });
    });
  }

  function draw(m, H, P) {
    var shown = H.sections(m);
    root.querySelectorAll('[data-home]').forEach(function (s) { s.hidden = shown.indexOf(s.getAttribute('data-home')) < 0; });
    drawNext(m, H);
    drawWaiting(m);
    drawCohorts(m, H);
    drawTimes(m);
    drawApp(m);
    drawStages(m, P);
    drawMore(m);
    status('');
  }
  var U = function () { return window.UI; };
  function day(iso) { return new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }); }

  // ---- coming up: a session on now, or one in the next eight days ----
  function drawNext(m, H) {
    var box = $('[data-home-next]');
    box.replaceChildren();
    var list = U().rows();
    m.comingUp.forEach(function (u) {
      var c = u.cohort, slug = encodeURIComponent(c.slug);
      var acts = [];
      var meet = safeUrl(u.session.meet_url);
      if (u.live && meet) acts.push(link(meet, 'Join the call', 'btn-primary'));
      acts.push(link('/live/?c=' + slug, 'Live session', u.live && !meet ? 'btn-primary' : 'btn-secondary small'));
      list.appendChild(U().row({
        title: c.title + ', week ' + u.session.number, href: '/cohort/?c=' + slug,
        meta: u.live ? null : H.whenText(u.session.starts_at, m.now, m.zone),
        status: u.live ? U().status('session', 'live') : null, actions: acts
      }));
    });
    box.appendChild(list);
  }

  // ---- waiting for you: a row per kind, with its count ------------------
  function drawWaiting(m) {
    var box = $('[data-home-waiting]');
    box.replaceChildren();
    var list = U().rows();
    m.waiting.forEach(function (w) { list.appendChild(U().row({ title: w.title, href: w.href, status: U().count(w.count, w.noun) })); });
    box.appendChild(list);
  }

  // ---- cohorts ----------------------------------------------------------
  function drawCohorts(m, H) {
    var box = $('[data-home-cohorts]');
    box.replaceChildren();
    if (m.cohorts.length) {
      var list = U().rows();
      m.cohorts.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (c) {
        var st = H.cohortState(c, c.now);
        var slug = encodeURIComponent(c.slug);
        var detail = c.myRole === 'teacher' ? U().tag('Teacher') : c.myRole === 'mentor' ? U().tag('Mentor') : null;
        list.appendChild(U().row({
          title: c.title, href: c.myRole === 'teacher' ? '/teach/cohort/?c=' + c.id : '/cohort/?c=' + slug,
          meta: st.meta, detail: detail, status: U().status(st.thing, st.state)
        }));
      });
      box.appendChild(list);
    }
    var students = m.cohorts.filter(function (c) { return c.myRole !== 'teacher' && c.status !== 'finished'; });
    if (!students.length && m.open.length) {
      var h = el('h3', 'home-sub', 'Open to join');
      box.appendChild(h);
      var open = U().rows();
      m.open.forEach(function (c) {
        open.appendChild(U().row({ title: c.title, meta: c.starts_on ? 'Starts ' + day(c.starts_on) : 'Dates not set', status: U().status('cohort', 'open'),
          actions: [link('/account/?join=' + encodeURIComponent(c.slug), 'Join', 'btn-secondary small')] }));
      });
      box.appendChild(open);
    } else if (!m.cohorts.length) {
      box.appendChild(U().empty('No cohorts yet', m.teacher ? link('/teach/new/', 'Plan a cohort', 'btn-secondary') : link('/cohorts/', 'See open cohorts', 'btn-secondary')));
    }
    function rank(c) { return { live: 0, between: 1, before: 2, draft: 3, unscheduled: 4, over: 5, finished: 6 }[c.now.kind]; }
  }

  // ---- finding a time ---------------------------------------------------
  function drawTimes(m) {
    var box = $('[data-home-times]');
    box.replaceChildren();
    var list = U().rows();
    m.myPolls.forEach(function (p) {
      var n = (p.time_poll_answers && p.time_poll_answers[0] || {}).count || 0;
      list.appendChild(U().row({ title: p.title, href: '/teach/times/poll/?p=' + p.id, meta: n === 1 ? '1 answer' : n + ' answers', status: U().status('poll', p.open ? 'open' : 'closed') }));
    });
    m.answeredPolls.forEach(function (p) {
      list.appendChild(U().row({ title: p.title, href: '/times/#' + p.token, status: U().status('poll', p.open ? 'answered' : 'closed') }));
    });
    if (list.children.length) box.appendChild(list);
    else if (m.teacher) box.appendChild(U().empty('No polls yet', link('/teach/times/new/', 'Make a poll', 'btn-secondary')));
  }

  // ---- your app ---------------------------------------------------------
  function drawApp(m) {
    var box = $('[data-home-app]');
    box.replaceChildren();
    var list = U().rows();
    m.cohorts.forEach(function (c) {
      var e = c.enrollment;
      if (!e || !e.app_repo) return;
      list.appendChild(U().row({ title: e.app_name || e.app_repo, href: '/cohort/?c=' + encodeURIComponent(c.slug) + '&t=mine', meta: c.title, visibility: U().visibility(e.app_public ? 'public' : 'cohort') }));
    });
    var b = m.builderApp;
    if (b) list.appendChild(U().row({ title: b.app_name || b.app_repo, href: '/apps/mine/', visibility: U().visibility(b.public ? 'public' : 'me') }));
    if (list.children.length) { box.appendChild(list); return; }
    box.appendChild(U().empty('No app yet', link('/apps/mine/', 'Add your app', 'btn-secondary')));
  }

  // ---- stages -------------------------------------------------------------
  function drawStages(m, P) {
    var box = $('[data-home-stages]');
    box.replaceChildren();
    if (!m.lastMark || !P) return;
    var s = P.stageInfo(m.lastMark.stage);
    if (!s) return;
    var list = U().rows();
    list.appendChild(U().row({ title: s.title, href: s.href, meta: m.lastMark.at ? 'Marked ' + day(m.lastMark.at) : null }));
    box.appendChild(list);
  }

  // ---- more you can do ----------------------------------------------------
  function drawMore(m) {
    var box = $('[data-home-more]');
    box.replaceChildren();
    [['/connect/', 'Connect your agent'], [m.teacher ? '/teach/' : '/teach/#ask', m.teacher ? 'Teaching' : 'Ask to teach'], ['/events/', 'Host an event'], ['/account/', 'Your account']].forEach(function (x) {
      var li = el('li');
      li.appendChild(link(x[0], x[1]));
      box.appendChild(li);
    });
  }

  loadAll(SCRIPTS).then(start).catch(function (e) {
    status('This could not load: ' + said(e));
  });
})();
