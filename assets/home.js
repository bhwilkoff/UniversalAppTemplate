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
    '/assets/teach-lib.js?v=20261006g',
    '/assets/path-lib.js',
    '/assets/home-lib.js?v=20261021a',
    '/assets/exchange-lib.js?v=20261016b',
    '/assets/exchange-recorder.js?v=20261015a',
    '/assets/exchange-drive.js?v=20261012b',
    '/assets/exchange-list.js?v=20261014a'
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
  function status(text) { $('[data-home-status]').textContent = text || ''; $('[data-home-status]').hidden = !text; }
  function section(key) { return root.querySelector('[data-home="' + key + '"]'); }
  function pub() { html.removeAttribute('data-member'); }
  function safeUrl(u) { return /^https:\/\//.test(u || '') ? u : null; }

  // A row: what it is, a line about it, and its actions on the right.
  function row(title, line, actions, cls) {
    var li = el('li', 'home-row' + (cls ? ' ' + cls : ''));
    var text = el('div', 'home-row-text');
    if (title) text.appendChild(title.nodeType ? title : el('p', 'home-row-title', title));
    if (line) text.appendChild(el('p', 'home-row-line', line));
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
    var name = (m.profile.display_name || '').trim() || m.profile.github_login || '';
    var who = $('[data-home-who]');
    who.replaceChildren();
    if (m.profile.github_login) {
      who.append('Signed in as ');
      who.appendChild(link('https://github.com/' + encodeURIComponent(m.profile.github_login), '@' + m.profile.github_login));
      who.append('.');
    } else {
      who.textContent = name ? 'Signed in as ' + name + '.' : 'Signed in.';
    }
    var img = $('[data-home-avatar]');
    if (safeUrl(m.profile.avatar_url)) { img.src = m.profile.avatar_url; img.hidden = false; }

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

  // ---- coming up: a session on now, or one in the next eight days ----
  function drawNext(m, H) {
    var box = $('[data-home-next]');
    box.replaceChildren();
    m.comingUp.forEach(function (u, i) {
      var c = u.cohort, slug = encodeURIComponent(c.slug);
      var acts = [];
      var meet = safeUrl(u.session.meet_url);
      if (u.live && meet) acts.push(link(meet, 'Join the session now', 'btn-primary'));
      acts.push(link('/live/?c=' + slug, 'The session page', u.live && !meet ? 'btn-primary' : 'btn-secondary'));
      if (!u.live) acts.push(link('/cohort/?c=' + slug, 'The cohort page', 'btn-secondary'));
      var when = u.live ? 'On now' : H.whenText(u.session.starts_at, m.now, m.zone);
      var title = el('p', 'home-row-title');
      title.appendChild(el('span', 'home-when', when));
      title.append(' ' + c.title + ', week ' + u.session.number);
      box.appendChild(row(title, null, acts, u.live ? 'live' : null));
    });
  }

  // ---- waiting for you ------------------------------------------------
  function drawWaiting(m) {
    var box = $('[data-home-waiting]');
    box.replaceChildren();
    m.waiting.forEach(function (w) {
      var a = link(w.href, w.action, 'btn-secondary small');
      a.setAttribute('aria-label', w.action + ': ' + w.text);
      box.appendChild(row(w.text, null, [a]));
    });
  }

  // ---- cohorts ----------------------------------------------------------
  function drawCohorts(m, H) {
    var box = $('[data-home-cohorts]');
    box.replaceChildren();
    if (m.cohorts.length) {
      var ul = el('ul', 'home-rows');
      m.cohorts.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (c) {
        var slug = encodeURIComponent(c.slug);
        var acts = [];
        if (c.myRole === 'teacher') {
          acts.push(link('/teach/cohort/?c=' + c.id, c.status === 'draft' ? 'Finish setting it up' : 'Teach it', 'btn-secondary small'));
          if (c.status !== 'draft') acts.push(link('/cohort/?c=' + slug, 'Its page', 'btn-secondary small'));
        } else {
          acts.push(link('/cohort/?c=' + slug, 'Open the cohort', 'btn-secondary small'));
        }
        ul.appendChild(row(c.title, H.cohortLine(c, c.now), acts));
      });
      box.appendChild(ul);
    }
    var students = m.cohorts.filter(function (c) { return c.myRole !== 'teacher' && c.status !== 'finished'; });
    if (!students.length && m.open.length) {
      var open = el('div', 'home-open');
      open.appendChild(el('p', 'small', m.open.length === 1 ? 'One cohort is open for people to join.' : m.open.length + ' cohorts are open for people to join.'));
      var oul = el('ul', 'home-rows');
      m.open.forEach(function (c) {
        oul.appendChild(row(c.title, c.starts_on ? 'Begins ' + new Date(c.starts_on + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.' : 'Dates to come.',
          [link('/account/?join=' + encodeURIComponent(c.slug), 'Join it', 'btn-secondary small')]));
      });
      open.appendChild(oul);
      box.appendChild(open);
    } else if (!m.cohorts.length) {
      var acts = [link('/cohorts/', 'See the cohorts', 'btn-secondary')];
      if (m.teacher) acts.unshift(link('/teach/new/', 'Plan a cohort', 'btn-secondary'));
      box.appendChild(empty(m.teacher
        ? 'You do not teach a cohort yet. A cohort you plan is listed here from its first draft.'
        : 'You are not in a cohort yet, and none is open to join right now. When one opens, it is listed here and on the cohorts page.', acts));
    }
    function rank(c) { return { live: 0, between: 1, before: 2, draft: 3, unscheduled: 4, over: 5, finished: 6 }[c.now.kind]; }
  }

  // ---- finding a time ---------------------------------------------------
  function drawTimes(m) {
    var box = $('[data-home-times]');
    box.replaceChildren();
    var ul = el('ul', 'home-rows');
    m.myPolls.forEach(function (p) {
      var n = (p.time_poll_answers && p.time_poll_answers[0] || {}).count || 0;
      ul.appendChild(row(p.title, (p.open ? 'Taking answers' : 'Closed') + ', with ' + (n === 0 ? 'no answers yet' : n === 1 ? 'one answer' : n + ' answers') + '.',
        [link('/teach/times/poll/?p=' + p.id, 'Open', 'btn-secondary small')]));
    });
    m.answeredPolls.forEach(function (p) {
      ul.appendChild(row(p.title, 'You answered it' + (p.open ? '' : ', and it is closed now') + '.',
        [link('/times/#' + p.token, 'Change my answer', 'btn-secondary small')]));
    });
    if (ul.children.length) box.appendChild(ul);
    if (m.teacher) {
      if (!m.myPolls.length) box.appendChild(el('p', 'small', 'A poll of weekly times lets the people you hope will join say when they can meet, before a cohort has a time.'));
      var a = el('div', 'actions');
      a.appendChild(link('/teach/times/', 'Make a poll', 'btn-secondary'));
      box.appendChild(a);
    }
  }

  // ---- your app ---------------------------------------------------------
  function drawApp(m) {
    var box = $('[data-home-app]');
    box.replaceChildren();
    var ul = el('ul', 'home-rows');
    m.cohorts.forEach(function (c) {
      var e = c.enrollment;
      if (!e || !e.app_repo) return;
      ul.appendChild(row(e.app_name || e.app_repo, 'Built in ' + c.title + '. ' + (e.app_public ? 'Shown on the apps page.' : 'Seen only by your cohort.'),
        [link('/apps/app/?r=' + encodeURIComponent(e.app_repo), 'Its page', 'btn-secondary small'), link('/cohort/?c=' + encodeURIComponent(c.slug) + '#mine-title', 'Change it', 'btn-secondary small')]));
    });
    var b = m.builderApp;
    if (b) {
      var acts = [link('/account/#own-app', 'Change it', 'btn-secondary small')];
      if (b.public) acts.unshift(link('/apps/app/?r=' + encodeURIComponent(b.app_repo), 'Its page', 'btn-secondary small'));
      ul.appendChild(row(b.app_name || b.app_repo, b.public ? 'Shown on the apps page.' : 'Yours alone until you choose to show it.', acts));
    }
    if (ul.children.length) { box.appendChild(ul); return; }
    box.appendChild(empty('Building an app on your own, from the template? Add it here, and choose whether the apps page shows it.', [
      link('/account/#own-app', 'Add your app', 'btn-secondary'),
      link('/path/setup/', 'Start from the template', 'btn-secondary')
    ]));
  }

  // ---- stages -------------------------------------------------------------
  function drawStages(m, P) {
    var box = $('[data-home-stages]');
    box.replaceChildren();
    if (!m.lastMark || !P) return;
    var s = P.stageInfo(m.lastMark.stage);
    if (!s) return;
    var ul = el('ul', 'home-rows');
    ul.appendChild(row(s.title, 'The stage you marked most recently.', [link(s.href, 'Go back to it', 'btn-secondary small'), link('/account/#stages', 'All your marks', 'btn-secondary small')]));
    box.appendChild(ul);
  }

  // ---- more you can do ----------------------------------------------------
  function drawMore(m) {
    var box = $('[data-home-more]');
    box.replaceChildren();
    var items = [
      ['/connect/', 'Connect your agent', 'Let your own Claude or Gemini read your cohorts, your app, and your marks.'],
      [m.teacher ? '/teach/' : '/teach/#ask', m.teacher ? 'Teach' : 'Teach a cohort', m.teacher ? 'Your cohorts, their sessions, and the feedback queue.' : 'Ask to lead a cohort of your own.'],
      ['/events/', 'Host an event', 'A meetup or a day of building, or one near you.'],
      ['/account/', 'Your account', 'How you sign in, how teachers can reach you, and your data.']
    ];
    items.forEach(function (x) {
      var li = el('li');
      li.appendChild(link(x[0], x[1]));
      li.appendChild(el('span', null, x[2]));
      box.appendChild(li);
    });
  }

  status('Gathering your cohorts, exchanges, and times…');
  loadAll(SCRIPTS).then(start).catch(function (e) {
    status('Your home could not be gathered just now: ' + said(e) + '. Reload the page to try again.');
  });
})();
