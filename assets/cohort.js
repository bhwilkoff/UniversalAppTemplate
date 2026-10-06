// The cohort page (/cohort/?c=<slug>). The hub's database says who is in
// the cohort and what they chose to share; everyone's work is read live
// from GitHub, never copied, because it belongs to them.
(function () {
  var root = document.querySelector('[data-cohort-page]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.CohortLib;
  var slug = new URLSearchParams(location.search).get('c') || '';
  var me = null, cohort = null, token = null, session = null;
  // The teaching tools (M12): whether the database has them yet, who
  // confirmed which bring-back, and who this person's partners are.
  var tools = false, confirmations = [], amTeaching = false, partnerIds = [], week = null;

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text) { var a = el('a', null, text); a.href = href; return a; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function when(iso) {
    return new Date(iso).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  }
  function nameOf(p) { return p ? (p.display_name || p.github_login) : 'Someone'; }

  // Commits, read from GitHub with the visitor's own sign-in when there
  // is one, and remembered for ten minutes so a busy cohort page stays
  // under GitHub's limits.
  function commits(repo) {
    var key = 'hs-commits:' + repo;
    try {
      var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (hit && Date.now() - hit.at < 600000) return Promise.resolve(hit.data);
    } catch (e) {}
    var headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch('https://api.github.com/repos/' + repo + '/commits?per_page=3', { headers: headers })
      .then(function (r) {
        if (r.status === 404) return { missing: true };
        if (r.status === 409) return { empty: true };
        if (!r.ok) return { unavailable: r.status };
        return r.json().then(function (list) {
          return { list: list.map(function (c) { return { message: c.commit.message, date: c.commit.author && c.commit.author.date, url: c.html_url }; }) };
        });
      })
      .catch(function () { return { unavailable: 0 }; })
      .then(function (data) {
        if (data.list) { try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {} }
        return data;
      });
  }

  // Which repositories have a page on the hub (/apps/app/), read once:
  // only apps their builders chose to show and nobody kept off
  // (public_apps). A classmate's private app gets no link to a page
  // that would not draw it. It fails quietly to no links.
  var hubPages = null;
  function hubPageSet() {
    if (!hubPages) {
      hubPages = db.rpc('public_apps').then(function (r) {
        var set = {};
        (r.error ? [] : r.data || []).forEach(function (a) { if (a.app_repo) set[a.app_repo.toLowerCase()] = true; });
        return set;
      }, function () { return {}; });
    }
    return hubPages;
  }

  function personCard(e) {
    var card = el('article', 'app');
    card.appendChild(el('h3', null, e.app_name || nameOf(e.profiles)));
    var by = el('p', 'facts');
    by.appendChild(document.createTextNode((e.app_name ? 'Built by ' + nameOf(e.profiles) + ', ' : '')));
    if (e.profiles) by.appendChild(link('https://github.com/' + encodeURIComponent(e.profiles.github_login), '@' + e.profiles.github_login));
    var role = window.MentorLib ? window.MentorLib.roleLabel(e.role) : '';
    if (role) by.appendChild(el('span', 'role-tag', role));
    card.appendChild(by);
    if (e.role === 'mentor' && !e.app_repo) {
      card.appendChild(el('p', 'small', 'Here as a mentor, to help.'));
      return card;
    }
    var repo = lib.repoPath(e.app_repo);
    var links = el('ul', 'links');
    if (safe(e.app_url)) links.appendChild(el('li')).appendChild(link(e.app_url, 'Use it'));
    if (repo) links.appendChild(el('li')).appendChild(link('https://github.com/' + repo, 'Its repository'));
    if (repo) hubPageSet().then(function (set) {
      if (set[repo.toLowerCase()]) links.appendChild(el('li')).appendChild(link('/apps/app/?r=' + encodeURIComponent(repo), 'Its page on the hub'));
    });
    card.appendChild(links);
    var log = el('div', 'commits');
    card.appendChild(log);
    if (!repo) { log.appendChild(el('p', 'small', 'No repository shared yet.')); return card; }
    log.appendChild(el('p', 'small', 'Reading recent work from GitHub…'));
    commits(repo).then(function (d) {
      log.replaceChildren();
      if (d.missing) return log.appendChild(el('p', 'small', 'This repository is private or has moved, so its recent work cannot be shown here.'));
      if (d.empty) return log.appendChild(el('p', 'small', 'Nothing has been committed yet.'));
      if (!d.list) return log.appendChild(el('p', 'small', 'GitHub could not be reached just now, so recent work is not shown.'));
      var ul = el('ul', 'commit-list');
      d.list.forEach(function (c) {
        var li = el('li');
        li.appendChild(link(c.url, lib.commitLine(c.message)));
        if (c.date) li.appendChild(el('span', 'small', ' ' + lib.ago(c.date, new Date())));
        ul.appendChild(li);
      });
      log.appendChild(ul);
    });
    return card;
  }

  function drawShares(shares, people) {
    var box = $('[data-shares]');
    box.replaceChildren();
    if (!shares.length) { box.appendChild(el('p', 'small', 'Nothing has been shared yet this cohort.')); return; }
    var byId = {};
    people.forEach(function (p) { byId[p.user_id] = p.profiles; });
    var KIND = { 'bring-back': 'Bring-back', 'for-feedback': 'Asking for feedback', 'ai-review': 'A review from their AI agent', question: 'A question' };
    shares.forEach(function (s) {
      var card = el('article', 'cohort-card share');
      card.appendChild(el('p', 'kicker', KIND[s.kind] + ' from ' + nameOf(byId[s.user_id]) + ', ' + lib.ago(s.created_at, new Date())));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (safe(s.url)) card.appendChild(el('p')).appendChild(link(s.url, s.url.replace(/^https:\/\//, '')));
      if (s.kind === 'bring-back' && tools) card.appendChild(markBlock(s, byId));
      (s.feedback || []).sort(function (a, b) { return a.created_at.localeCompare(b.created_at); }).forEach(function (f) {
        var q = el('blockquote', 'feedback');
        q.appendChild(el('p', null, f.body));
        q.appendChild(el('p', 'small', nameOf(byId[f.author_id] || (f.author_id === me.id ? { display_name: 'You' } : null))));
        card.appendChild(q);
      });
      var form = el('form', 'inline-form');
      var label = el('label', null, 'Your feedback');
      var input = el('textarea'); input.rows = 2; input.required = true; input.maxLength = 8000;
      label.appendChild(input); form.appendChild(label);
      var b = el('button', 'btn-quiet', 'Send'); b.type = 'submit';
      var a = el('div', 'actions'); a.appendChild(b); form.appendChild(a);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        db.from('feedback').insert({ share_id: s.id, author_id: me.id, body: input.value.trim() }).then(function (r) {
          if (r.error) { b.textContent = 'Not sent, try again'; return; }
          load();
        });
      });
      card.appendChild(form);
      box.appendChild(card);
    });
  }

  // A bring-back's question, its builder's mark, and who saw it working,
  // with a way for a partner (or a teacher) to confirm, and for the
  // builder to change their mark. The database decides who may do each
  // (migration 20261003100000); this only offers it.
  function markBlock(s, byId) {
    var mine = s.user_id === me.id;
    var box = el('div', 'bring-back-mark');
    if (s.want_to_know) box.appendChild(el('p', 'want', (mine ? 'Your question: ' : 'Their question: ') + s.want_to_know));
    var ready = lib.readinessText(s, mine);
    if (ready) box.appendChild(el('p', 'mark ' + (s.readiness === 'ready' ? 'is-ready' : 'is-not-yet'), ready));
    var mineConfirmed = confirmations.some(function (c) { return c.share_id === s.id && c.user_id === me.id; });
    var seen = lib.seenText(confirmations.filter(function (c) { return c.share_id === s.id; }).map(function (c) {
      return c.user_id === me.id ? 'you' : nameOf(byId[c.user_id]);
    }));
    if (seen) box.appendChild(el('p', 'small', seen));
    var acts = el('div', 'actions');
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    if (mineConfirmed) {
      acts.appendChild(button('Take back my confirmation', function () {
        db.from('share_confirmations').delete().eq('share_id', s.id).eq('user_id', me.id).then(function (r) { if (r.error) msg.textContent = 'Not changed: ' + r.error.message; else load(); });
      }));
    } else if (lib.canConfirm(s, me.id, partnerIds, amTeaching)) {
      acts.appendChild(button('I saw it working on a device', function () {
        db.from('share_confirmations').insert({ share_id: s.id, user_id: me.id, cohort_id: cohort.id }).then(function (r) { if (r.error) msg.textContent = 'Not saved: ' + r.error.message; else load(); });
      }));
    }
    if (mine) {
      var change = button(s.readiness ? 'Change your mark' : 'Mark it ready or not yet', function () { change.hidden = true; form.hidden = false; });
      acts.appendChild(change);
      var form = markForm(s, function () { form.hidden = true; change.hidden = false; });
      form.hidden = true;
      box.appendChild(acts);
      box.appendChild(form);
    } else if (acts.children.length) {
      box.appendChild(acts);
    }
    acts.appendChild(msg);
    return box.children.length ? box : el('span');
  }

  function button(label, fn) { var b = el('button', 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  // The builder's own mark, changed in place. Changing it clears what
  // partners confirmed, so that they can look again.
  var markCount = 0;
  function markForm(s, onCancel) {
    var n = ++markCount;
    var f = el('form', 'inline-form ready-mark-form');
    var fs = el('fieldset', 'ready-mark');
    fs.appendChild(el('legend', null, 'Ready to move on, or not yet?'));
    var radios = {};
    [['ready', 'Ready, because it meets the bar'], ['not-yet', 'Not yet']].forEach(function (x) {
      var l = el('label', 'check');
      var r = el('input'); r.type = 'radio'; r.name = 'mark-' + n; r.value = x[0]; r.checked = s.readiness === x[0];
      l.appendChild(r); l.appendChild(document.createTextNode(' ' + x[1]));
      fs.appendChild(l); radios[x[0]] = r;
    });
    var ml = el('label', null, 'What is still missing');
    var missing = el('textarea'); missing.rows = 2; missing.maxLength = 1000; missing.value = s.missing || '';
    ml.appendChild(missing); fs.appendChild(ml);
    function sync() { ml.hidden = !radios['not-yet'].checked; missing.required = radios['not-yet'].checked; }
    radios.ready.addEventListener('change', sync); radios['not-yet'].addEventListener('change', sync); sync();
    f.appendChild(fs);
    var save = el('button', 'btn-quiet', 'Save my mark'); save.type = 'submit';
    var cancel = button('Leave it as it was', onCancel);
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var a = el('div', 'actions'); a.appendChild(save); a.appendChild(cancel); a.appendChild(msg); f.appendChild(a);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var value = radios.ready.checked ? 'ready' : radios['not-yet'].checked ? 'not-yet' : null;
      if (!value) { msg.textContent = 'Choose ready or not yet first.'; return; }
      var patch = { readiness: value, missing: value === 'not-yet' ? missing.value.trim() : null };
      if (value === 'not-yet' && !patch.missing) { msg.textContent = 'Say what is still missing, so it reads as your next step.'; return; }
      msg.textContent = 'Saving…';
      db.from('shares').update(patch).eq('id', s.id).then(function (r) { if (r.error) msg.textContent = 'Not saved: ' + r.error.message; else load(); });
    });
    return f;
  }

  // The bar for this week's stages, read live from each stage's own file in
  // the template (its "When you are ready to move on" paragraph), and
  // remembered for this visit.
  var RAW = 'https://raw.githubusercontent.com/bhwilkoff/UniversalAppTemplate/main/';
  function stageBar(n) {
    var file = lib.stageFile(n);
    if (!file) return Promise.resolve(null);
    var key = 'hs-bar:' + n;
    try { var hit = sessionStorage.getItem(key); if (hit) return Promise.resolve(hit); } catch (e) {}
    return fetch(RAW + file).then(function (r) { return r.ok ? r.text() : ''; }).then(function (md) {
      var bar = lib.readyBar(md);
      if (bar) { try { sessionStorage.setItem(key, bar); } catch (e) {} }
      return bar;
    }).catch(function () { return null; });
  }
  function drawBars() {
    var box = $('[data-ready-bar]');
    box.replaceChildren();
    var stages = week ? lib.stagesForWeek(week) : [];
    if (!stages.length) { box.appendChild(el('p', 'small', 'Each stage of the path ends with a paragraph that begins "When you are ready to move on", and that paragraph is the bar.')); return; }
    Promise.all(stages.map(stageBar)).then(function (bars) {
      box.replaceChildren();
      stages.forEach(function (n, i) {
        var p = el('p', 'small');
        p.appendChild(link('/path/' + n + '/', 'Stage ' + n));
        p.appendChild(document.createTextNode(': ' + (bars[i] || 'its paragraph that begins "When you are ready to move on" is the bar.')));
        box.appendChild(p);
      });
    });
  }
  function syncShareForm() {
    var f = $('[data-share-form]').elements;
    var bring = f.kind.value === 'bring-back';
    $('[data-bb-extras]').hidden = !(bring && tools);
    var notYet = f.readiness.value === 'not-yet';
    $('[data-missing-wrap]').hidden = !notYet;
    f.missing.required = bring && tools && notYet;
  }

  function load() {
    if (!slug) return fail('This page needs to know which cohort to show. Open it from your account.');
    show('loading');
    db.auth.getSession().then(function (s) {
      session = s.data && s.data.session;
      if (!session) return show('signed-out');
      me = session.user;
      // The GitHub token lives in this tab only (DiscussionsLib).
      token = window.CohortTalk ? window.CohortTalk.token(db, session) : null;
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This cohort could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        cohort = c.data;
        return Promise.all([
          db.from('enrollments').select('user_id, role, status, app_name, app_repo, app_url, profiles(github_login, display_name)').eq('cohort_id', cohort.id).neq('status', 'left'),
          db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
          // Every column of groups and shares, so a group's Meet room and a
          // bring-back's question and mark come along once the database has
          // them (migration 20261003100000), and the page works before then.
          db.from('groups').select('*, group_members(user_id)').eq('cohort_id', cohort.id),
          db.from('shares').select('*, feedback(id, author_id, body, created_at)').eq('cohort_id', cohort.id).order('created_at', { ascending: false }).limit(40),
          db.from('calendar_contacts').select('email').eq('cohort_id', cohort.id).eq('user_id', me.id).maybeSingle(),
          db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
          db.from('github_access').select('state, detail').eq('cohort_id', cohort.id).eq('user_id', me.id).maybeSingle(),
          // Read on its own: before the table exists, this fails quietly and
          // the ready marks simply do not show.
          db.from('share_confirmations').select('share_id, user_id').eq('cohort_id', cohort.id)
        ]).then(function (res) {
          var bad = res.slice(0, 7).filter(function (r) { return r.error; })[0];
          if (bad) return fail('This cohort could not be loaded: ' + bad.error.message);
          var people = res[0].data;
          var mine = people.filter(function (p) { return p.user_id === me.id; })[0];
          // In the cohort means enrolled, or teaching it (a brand-new cohort
          // has no sessions or people yet, so their absence proves nothing).
          var teaching = res[5].data.some(function (t) { return t.user_id === me.id; });
          if (!mine && !teaching) return show('not-member');
          tools = !res[7].error;
          confirmations = tools ? res[7].data : [];
          amTeaching = teaching;
          partnerIds = lib.partnersOf(me.id, res[2].data);
          draw(people, mine, res[1].data, res[2].data, res[3].data, res[4].data, res[5].data);
          drawTalk(res[6].data);
          drawNotes(res[5].data);
          drawRecognized(res[5].data);
          drawSetup(mine, res[6].data);
          drawPublicChoice(mine, res[1].data);
          drawShowcase(res[1].data);
          drawCredentialNote();
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  // The last week (H5): the cohort's public showing, if its teacher
  // opened one to guests, and the one lesson the cohort sends back to the
  // template. Words by Claude, awaiting Ben's review.
  function drawShowcase(sessions) {
    var S = window.ShowcaseLib;
    var box = $('[data-last-week]');
    if (!S || !box) return;
    var open = (sessions || []).filter(function (s) { return s.public_showcase; })[0];
    var guests = $('[data-showcase-line]');
    guests.hidden = !open;
    if (open) $('[data-showcase-page]').href = '/showcase/?c=' + encodeURIComponent(cohort.slug);
    var lesson = S.lessonTime(cohort, sessions, new Date());
    $('[data-lesson-line]').hidden = !lesson;
    if (lesson) $('[data-lesson-link]').href = S.lessonIssueUrl(cohort.title);
    box.hidden = !open && !lesson;
  }

  // Your credential from this cohort, once a teacher has recorded it
  // (the holder reads their own; migration 20261003070000). Words by
  // Claude, awaiting Ben's review (H2).
  function drawCredentialNote() {
    var p = $('[data-credential-note]');
    if (!p) return;
    p.hidden = true;
    db.from('credentials').select('id, signed_at, revoked_at').eq('cohort_id', cohort.id).eq('user_id', me.id)
      .is('revoked_at', null).maybeSingle().then(function (r) {
        if (r.error || !r.data) return;
        p.replaceChildren();
        if (r.data.signed_at) {
          p.appendChild(document.createTextNode('Your credential from this cohort is signed. '));
          var a = document.createElement('a'); a.href = '/credential/?id=' + encodeURIComponent(r.data.id);
          a.textContent = 'Open it to share, download, or check it'; p.appendChild(a);
          p.appendChild(document.createTextNode('.'));
        } else {
          p.textContent = 'Your teacher has recorded your credential from this cohort, and it is waiting to be signed. It will be on your account page once it is.';
        }
        p.hidden = false;
      });
  }

  // Showing your app in public is your own choice (hub-privacy-notes.md).
  // The choice is read on its own, so the rest of the page works before
  // the hub's database has the app_public column.
  var canShow = false;
  function drawPublicChoice(mine, sessions) {
    var wrap = $('[data-app-public-wrap]');
    wrap.hidden = true; canShow = false;
    $('[data-submit-note]').hidden = true;
    $('[data-app-hidden]').hidden = true;
    if (!mine) return;
    db.from('enrollments').select('app_public').eq('cohort_id', cohort.id).eq('user_id', me.id).maybeSingle().then(function (r) {
      if (r.error || !r.data) return;
      canShow = true;
      $('[data-my-app]').elements.app_public.checked = !!r.data.app_public;
      wrap.hidden = false;
      drawSubmitNote(Object.assign({}, mine, { app_public: !!r.data.app_public }), sessions);
    });
    drawHidden();
  }

  // As the cohort nears its end, a student who has not submitted yet
  // reads what their app still needs (SubmitLib.studentNote), once, here,
  // and nowhere else: no reminders, no counts.
  function drawSubmitNote(mine, sessions) {
    var S = window.SubmitLib;
    if (!S) return;
    var win = S.submissionWindow(cohort, sessions, new Date());
    var last = win.lastSessionAt && !win.ended
      ? new Date(win.lastSessionAt).toLocaleDateString(undefined, { timeZone: cohort.time_zone, weekday: 'long', month: 'long', day: 'numeric' })
      : null;
    var note = S.studentNote(mine, win, last);
    var box = $('[data-submit-note]');
    box.textContent = note ? note.text : '';
    box.hidden = !note;
  }

  // A teacher's hide (app_hides) is never hidden from the student: they
  // see that it is in place, and the reason when the teacher gave one.
  // Before the table exists, the read fails quietly and nothing shows.
  function drawHidden() {
    db.from('app_hides').select('reason').eq('cohort_id', cohort.id).eq('user_id', me.id).maybeSingle().then(function (r) {
      var box = $('[data-app-hidden]');
      box.hidden = !!(r.error || !r.data);
      var why = $('[data-app-hidden-reason]');
      why.textContent = r.data && r.data.reason ? 'Their reason: ' + r.data.reason : '';
      why.hidden = !(r.data && r.data.reason);
    });
  }

  // Follow-ups a teacher wrote to this person alone (teacher_notes,
  // migration 20261003130000). Before the table exists, the read fails
  // quietly and nothing shows. The person can remove any of them.
  function drawNotes(teachers) {
    var section = $('[data-notes-section]');
    db.from('teacher_notes').select('id, author_id, body, created_at, edited_at').eq('cohort_id', cohort.id).eq('student_id', me.id).order('created_at', { ascending: false }).then(function (r) {
      var notes = r.error ? [] : r.data;
      section.hidden = !notes.length;
      var box = $('[data-notes]');
      box.replaceChildren();
      var names = {};
      (teachers || []).forEach(function (t) { names[t.user_id] = nameOf(t.profiles); });
      notes.forEach(function (n) {
        var q = el('blockquote', 'feedback');
        n.body.split(/\n{2,}/).forEach(function (para) { q.appendChild(el('p', null, para)); });
        q.appendChild(el('p', 'small', (names[n.author_id] || 'Your teacher') + ', ' + lib.ago(n.created_at, new Date()) + (n.edited_at ? ', edited ' + lib.ago(n.edited_at, new Date()) : '')));
        var msg = el('span', 'small'); msg.setAttribute('role', 'status');
        var rm = button('Remove it from my page', function () {
          rm.disabled = true;
          db.from('teacher_notes').delete().eq('id', n.id).select('id').then(function (d) {
            rm.disabled = false;
            if (d.error || !d.data.length) { msg.textContent = 'Not removed: ' + (d.error ? d.error.message : 'the database refused') + '.'; return; }
            drawNotes(teachers);
          });
        });
        var a = el('div', 'actions'); a.appendChild(rm); a.appendChild(msg); q.appendChild(a);
        box.appendChild(q);
      });
    });
  }

  // Skills a teacher recognized in class (recognitions, R16). Only this
  // person and the cohort's teachers read them; the person can remove any.
  function drawRecognized(teachers) {
    var RL = window.RecognitionLib, section = $('[data-recognized-section]');
    if (!RL || !section) return;
    db.from('recognitions').select('id, skill, skill_key, moment, given_by, given_at').eq('cohort_id', cohort.id).eq('user_id', me.id).then(function (r) {
      var names = {};
      (teachers || []).forEach(function (t) { names[t.user_id] = nameOf(t.profiles); });
      var lines = r.error ? [] : RL.lines(r.data, function (id) { return names[id] || 'Your teacher'; });
      section.hidden = !lines.length;
      var ul = $('[data-recognized]');
      ul.replaceChildren();
      lines.forEach(function (l) {
        var li = el('li', 'recognize-card');
        li.appendChild(el('p', 'recognize-skill', l.skill));
        li.appendChild(el('p', 'small', (l.moment ? l.moment + '. ' : '') + 'From ' + l.by + ', ' + lib.ago(l.at, new Date()) + '.' + (l.principle ? ' It shows principle ' + l.principle + '.' : '')));
        var msg = el('span', 'small'); msg.setAttribute('role', 'status');
        var rm = button('Remove it', function () {
          rm.disabled = true;
          db.from('recognitions').delete().eq('id', l.id).select('id').then(function (d) {
            rm.disabled = false;
            if (d.error || !d.data.length) { msg.textContent = 'Not removed: ' + (d.error ? d.error.message : 'the database refused') + '.'; return; }
            drawRecognized(teachers);
          });
        });
        var a = el('div', 'actions'); a.appendChild(rm); a.appendChild(msg); li.appendChild(a);
        ul.appendChild(li);
      });
    });
  }

  // Where this person's access to the cohort's private conversation on
  // GitHub stands (github_access, written only by cohort-access).
  function drawTalk(access) {
    var box = $('[data-talk]');
    box.replaceChildren();
    var repo = cohort.github_repo;
    if (!repo || !cohort.github_team) {
      box.appendChild(el('p', 'small', 'The cohort talks in its own private space on GitHub, and your teacher is still setting it up.'));
      return;
    }
    var state = access ? access.state : null;
    var actions = el('div', 'actions');
    if (state === 'member') {
      box.appendChild(el('p', null, 'The conversation is open to you. It happens in GitHub Discussions, in a repository only this cohort can see, and what you write there is yours.'));
      var go = link('https://github.com/' + repo + '/discussions', 'Open the conversation on GitHub'); go.className = 'btn-github';
      actions.appendChild(go);
      box.appendChild(actions);
      // The newest conversations, read and posted here as this person.
      if (window.CohortTalk) window.CohortTalk.full(box, { db: db, session: session, repo: repo });
      return;
    } else if (state === 'invited') {
      box.appendChild(el('p', null, 'GitHub has emailed you an invitation to the humanshaped organization. Accept it, and the conversation opens.'));
      var inv = link('https://github.com/orgs/humanshaped/invitation', 'Accept the invitation'); inv.className = 'btn-github';
      actions.appendChild(inv);
      actions.appendChild(askButton('I accepted it'));
    } else {
      box.appendChild(el('p', null, 'The cohort talks in GitHub Discussions, in a repository only this cohort can see. Opening it adds you to the cohort\u2019s team on GitHub, which may send you an invitation to accept.'));
      if (state === 'failed' && access.detail) box.appendChild(el('p', 'small error', access.detail));
      actions.appendChild(askButton(state === 'failed' ? 'Try again' : 'Open the conversation'));
    }
    box.appendChild(actions);
  }
  // Getting ready: only for people in the cohort, and only while a step
  // the hub can see is still undone (CohortLib.setupSteps).
  function drawSetup(mine, access) {
    var box = $('[data-setup]');
    var steps = mine ? lib.setupSteps(mine, access, cohort) : [];
    box.hidden = !steps.some(function (s) { return s.done === false; });
    var list = $('[data-setup-steps]');
    list.replaceChildren();
    steps.forEach(function (s) {
      var li = el('li', s.done ? 'done' : s.done === null ? 'optional' : null);
      var a = link(s.href, s.label);
      li.appendChild(a);
      if (s.done) li.appendChild(el('span', 'visually-hidden', ' (done)'));
      list.appendChild(li);
    });
  }

  function askButton(label) {
    var b = el('button', 'btn-quiet', label);
    b.type = 'button';
    b.addEventListener('click', function () {
      b.disabled = true;
      b.textContent = 'Asking GitHub…';
      db.functions.invoke('cohort-access', { body: { action: 'join', cohort_id: cohort.id } }).then(function (r) {
        if (!r.error) return load();
        // GitHub or the hub said no: keep the reason on screen, and let them try again.
        var res = r.error.context;
        return (res && res.json ? res.json() : Promise.resolve({})).catch(function () { return {}; }).then(function (body) {
          b.disabled = false;
          b.textContent = 'Try again';
          $('[data-talk]').appendChild(el('p', 'small error', body.message || 'GitHub could not be reached just now.'));
        });
      });
    });
    return b;
  }

  // The cohort's own background for calls (assets/background.js), drawn
  // in this browser from the brand kit's, with nothing sent anywhere.
  var bgWired = false;
  function drawBackground() {
    var B = window.CohortBackground;
    $('[data-bg-wrap]').hidden = !B;
    if (!B || bgWired) return;
    bgWired = true;
    root.querySelectorAll('[data-bg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var status = $('[data-bg-status]');
        b.disabled = true; status.textContent = 'Drawing it…';
        B.save(cohort.title, b.getAttribute('data-bg')).then(function () {
          status.textContent = 'Saved. In Meet, choose Backgrounds and effects, then Add your own personal background.';
        }, function (err) {
          status.textContent = (err && err.message) || 'The background could not be drawn.';
        }).then(function () { b.disabled = false; });
      });
    });
  }

  // The next session's run of show (R2; migration 20261004050000): its
  // scenes' kinds, titles, and minutes, read-only, so everyone knows how
  // the session will go. The teacher's notes are never readable here.
  // Words by Claude, awaiting Ben's review.
  function drawRunOfShow(next) {
    var box = $('[data-run-of-show]');
    var S = window.ShowLib;
    if (!box || !S) return;
    box.hidden = true;
    if (!next) return;
    db.from('scenes').select('id, position, kind, title, minutes').eq('session_id', next.id).order('position').then(function (r) {
      if (r.error || !r.data.length) return;
      var list = $('[data-run-of-show-list]');
      list.replaceChildren();
      var at = S.startTimes(r.data);
      r.data.forEach(function (sc, i) {
        var k = S.kind(sc.kind);
        var li = el('li', null);
        li.appendChild(el('span', 'scene-at', Math.floor(at[i] / 60) + ':' + ('0' + (at[i] % 60)).slice(-2)));
        li.appendChild(el('span', 'scene-glance', sc.title + (k ? ', ' + k.name.toLowerCase() : '') + ', ' + sc.minutes + ' min'));
        list.appendChild(li);
      });
      box.hidden = false;
    });
  }

  function draw(people, mine, sessions, groups, shares, contact, teachers) {
    $('[data-title]').textContent = cohort.title;
    $('[data-lead]').textContent = cohort.description || '';
    var t = lib.currentAndNext(sessions, new Date(), cohort.session_minutes);
    week = t.current ? t.current.number : null;
    var myGroup = groups.filter(function (g) { return g.group_members.some(function (m) { return m.user_id === me.id; }); })[0];
    var room = myGroup ? safe(myGroup.meet_url) : null;
    $('[data-week-title]').textContent = t.current ? 'Week ' + t.current.number + (t.current.title && t.current.title !== 'Week ' + t.current.number ? ': ' + t.current.title : '') : 'This week';
    $('[data-week-scope]').textContent = t.current && t.current.scope ? t.current.scope : 'Your teacher will put this week’s challenge here.';
    drawBackground();
    var na = $('[data-next-actions]'); na.replaceChildren();
    if (t.next) {
      $('[data-next-when]').textContent = (t.live ? 'Happening now: ' : '') + when(t.next.starts_at) + ', for ' + cohort.session_minutes + ' minutes.';
      // During the group part, your group's own room comes first.
      var part = t.live ? lib.partNow(lib.agenda(cohort.session_minutes), t.next.starts_at, new Date()) : null;
      if (room && part && part.key === 'show') { var gr = link(room, 'Join your group’s room'); gr.className = 'btn-github'; na.appendChild(gr); }
      if (safe(t.next.meet_url)) { var j = link(t.next.meet_url, t.live ? (part && part.key === 'show' && room ? 'The main session' : 'Join the session now') : 'The Meet link'); j.className = room && part && part.key === 'show' ? 'btn-quiet' : 'btn-github'; na.appendChild(j); }
      var lp = link('/live/?c=' + encodeURIComponent(cohort.slug), 'The session page'); lp.className = 'btn-quiet'; na.appendChild(lp);
    } else {
      $('[data-next-when]').textContent = sessions.length ? 'The last session has happened.' : 'The sessions have not been scheduled yet.';
    }
    drawRunOfShow(t.next);
    var past = sessions.filter(function (s) { return safe(s.recording_url); });
    past.forEach(function (s) { na.appendChild(link(s.recording_url, 'Week ' + s.number + ' recording')); });

    $('[data-group-section]').hidden = !myGroup;
    if (myGroup) {
      var gb = $('[data-group]'); gb.replaceChildren();
      gb.appendChild(el('p', null, myGroup.name + (myGroup.expectations ? ': ' + myGroup.expectations : '')));
      var names = people.filter(function (p) { return p.user_id !== me.id && myGroup.group_members.some(function (m) { return m.user_id === p.user_id; }); }).map(function (p) { return nameOf(p.profiles); });
      gb.appendChild(el('p', 'small', names.length ? 'With ' + names.join(', ') + '.' : 'Your teacher will add the others soon.'));
      // The group's own Meet room, for the group part of each session
      // (Meet on our Google edition may have no breakout rooms).
      if (room) {
        var rp = el('p', 'small');
        rp.appendChild(document.createTextNode('Your group meets in its own room for the group part of each session, and the session page sends you there when it is time: '));
        rp.appendChild(link(room, room.replace(/^https:\/\//, '')));
        gb.appendChild(rp);
      }
    }

    var form = $('[data-my-app]');
    form.hidden = !mine;
    if (mine) {
      form.elements.app_name.value = mine.app_name || '';
      form.elements.app_repo.value = mine.app_repo || '';
      form.elements.app_url.value = mine.app_url || '';
      form.elements.email.value = contact && contact.email ? contact.email : '';
    }
    var box = $('[data-people]'); box.replaceChildren();
    people.filter(function (p) { return p.role === 'student' || p.role === 'mentor'; }).forEach(function (p) { box.appendChild(personCard(p)); });
    if (!box.children.length) box.appendChild(el('p', 'small', 'No one has joined yet.'));
    // Teachers share and give feedback too, so their names are known here.
    drawShares(shares, people.concat((teachers || []).filter(function (t) {
      return !people.some(function (p) { return p.user_id === t.user_id; });
    })));
    syncShareForm();
    if (tools) drawBars();
    show('ready');
    if (mine) openBringBack();
  }

  // A stage's "Bring it back" (assets/path-marks.js) opens the form here
  // for that stage, once, with the person's own answer to the stage's
  // bar already chosen if they gave one. They still write it and send it.
  var bringOpened = false;
  function openBringBack() {
    var P = window.PathLib;
    var stage = P && P.bringParam(location.search);
    if (!stage || bringOpened) return;
    bringOpened = true;
    var form = $('[data-share-form]'), f = form.elements;
    f.kind.value = 'bring-back';
    var info = P.stageInfo(stage);
    f.note.placeholder = 'What you are bringing back from ' + (stage === 'setup' ? 'getting set up' : 'stage ' + stage + ', ' + info.title) + ', in your own words';
    syncShareForm();
    var go = function () {
      syncShareForm();
      $('#share-title').scrollIntoView();
      f.note.focus({ preventScroll: true });
    };
    if (!tools) { go(); return; }
    db.from('stage_marks').select('state').eq('user_id', me.id).eq('stage', stage).eq('item', 'ready').maybeSingle().then(function (r) {
      var state = !r.error && r.data ? r.data.state : null;
      [].forEach.call(f.readiness, function (x) { x.checked = x.value === state; });
      go();
    });
  }

  $('[data-my-app]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target.elements, msg = $('[data-my-app-message]');
    var repo = f.app_repo.value.trim() ? lib.repoPath(f.app_repo.value) : null;
    if (f.app_repo.value.trim() && !repo) { msg.textContent = 'Give the repository as owner/name, for example bea/garden-swap, or paste its GitHub link.'; return; }
    msg.textContent = 'Saving…';
    var email = f.email.value.trim();
    Promise.all([
      db.from('enrollments').update({ app_name: f.app_name.value.trim() || null, app_repo: repo, app_url: f.app_url.value.trim() || null }).eq('cohort_id', cohort.id).eq('user_id', me.id),
      email
        ? db.from('calendar_contacts').upsert({ cohort_id: cohort.id, user_id: me.id, email: email })
        : db.from('calendar_contacts').delete().eq('cohort_id', cohort.id).eq('user_id', me.id),
      canShow
        ? db.from('enrollments').update({ app_public: f.app_public.checked }).eq('cohort_id', cohort.id).eq('user_id', me.id)
        : Promise.resolve({})
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      msg.textContent = bad ? 'Not saved: ' + bad.error.message : 'Saved.';
      if (!bad) load();
    });
  });

  $('[data-share-form]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target.elements, msg = $('[data-share-message]');
    var url = f.url.value.trim();
    if (url && !safe(url)) { msg.textContent = 'Links need to start with https://.'; return; }
    var row = { cohort_id: cohort.id, user_id: me.id, kind: f.kind.value, url: url || null, note: f.note.value.trim() };
    // A bring-back's question and mark, only when given, so a share
    // without them works before the database has the columns.
    if (row.kind === 'bring-back' && tools) {
      var want = f.want_to_know.value.trim();
      if (want) row.want_to_know = want;
      if (f.readiness.value) row.readiness = f.readiness.value;
      if (f.readiness.value === 'not-yet') {
        row.missing = f.missing.value.trim();
        if (!row.missing) { msg.textContent = 'Say what is still missing, so it reads as your next step.'; return; }
      }
    }
    msg.textContent = 'Sharing…';
    db.from('shares').insert(row).then(function (r) {
      if (r.error) { msg.textContent = 'Not shared: ' + r.error.message; return; }
      ev.target.reset(); syncShareForm(); msg.textContent = 'Shared with your cohort.';
      load();
    });
  });
  $('[data-share-form]').addEventListener('change', syncShareForm);

  $('[data-reload]').addEventListener('click', load);
  load();
})();
