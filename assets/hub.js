// The hub's connection to its database (Supabase), used by /account/.
// The project address and the publishable key are public by design; the
// rules about who can see and change what live in the database itself
// (supabase/migrations), not here.
(function () {
  var HUB = window.HUB;
  var root = document.querySelector('[data-account]');
  if (!root || !window.supabase || !HUB) return;
  var db = window.supabase.createClient(HUB.url, HUB.key);

  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) {
      s.hidden = s.getAttribute('data-state') !== state;
    });
  }
  function fail(message) {
    root.querySelector('[data-error-text]').textContent = message;
    show('error');
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function when(dateText) {
    if (!dateText) return 'Dates to come';
    var d = new Date(dateText + 'T12:00:00');
    return 'Begins ' + d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // GitHub sends people back here with an error in the address when
  // something goes wrong (for example, if sign-in is not switched on).
  var params = new URLSearchParams(location.search + '&' + location.hash.replace(/^#/, ''));
  // The cohorts page sends people here with ?join=<slug> for the cohort
  // they chose; they still click Join themselves.
  var joining = params.get('join');
  var arrivalError = params.get('error_description')
    ? 'GitHub sign-in did not finish: ' + params.get('error_description') + '. Nothing was saved.'
    : null;

  // The Meet add-on's sign-in window opens /account/?handoff=meet: once
  // signed in, this page hands the session to the panel that opened it
  // (window.opener, this origin only) and closes (assets/addon.js).
  var handoffMode = params.get('handoff') === 'meet';
  var handoffNote = root.querySelector('[data-handoff-note]');
  if (handoffNote) handoffNote.hidden = !handoffMode;

  root.querySelector('[data-sign-in]').addEventListener('click', function () {
    if (handoffMode) { try { window.sessionStorage.setItem('hs-handoff', '1'); } catch (e) {} }
    db.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: location.origin + '/account/' + (handoffMode ? '?handoff=meet' : joining ? '?join=' + encodeURIComponent(joining) : '') }
    }).then(function (r) { if (r.error) fail(r.error.message); });
  });
  root.querySelector('[data-retry]').addEventListener('click', function () {
    history.replaceState(null, '', '/account/' + (joining ? '?join=' + encodeURIComponent(joining) : ''));
    arrivalError = null;
    load();
  });
  // GitHub hands over the person's GitHub token once, right after sign-in.
  // Keep it for this tab only, so the cohort page can read the cohort's
  // conversation, and take it out of the long-lived saved session
  // (DiscussionsLib; research/notes/cohort-conversation-notes.md, part 7).
  var stores = {};
  try { stores.session = window.sessionStorage; stores.local = window.localStorage; } catch (e) {}
  function keepGitHubToken(session) {
    if (window.DiscussionsLib) window.DiscussionsLib.tokenFrom(session, stores, Date.now(), db.auth.storageKey);
  }
  root.querySelector('[data-sign-out]').addEventListener('click', function () {
    if (window.DiscussionsLib) window.DiscussionsLib.forget(stores.session);
    db.auth.signOut().then(load);
  });

  var deleteDialog = document.querySelector('[data-delete-dialog]');
  root.querySelector('[data-delete-open]').addEventListener('click', function () { deleteDialog.showModal(); });
  deleteDialog.addEventListener('close', function () {
    if (deleteDialog.returnValue !== 'delete') return;
    db.rpc('delete_my_account').then(function (r) {
      if (r.error) return fail('Your account could not be deleted just now: ' + r.error.message);
      if (window.DiscussionsLib) window.DiscussionsLib.forget(stores.session);
      db.auth.signOut().then(function () {
        show('signed-out');
        root.querySelector('[data-state="signed-out"] .small').textContent =
          'Your account and everything you shared here have been deleted.';
      });
    });
  });

  var leaveDialog = document.querySelector('[data-leave-dialog]');
  var leavingCohort = null;
  leaveDialog.addEventListener('close', function () {
    if (leaveDialog.returnValue !== 'leave' || !leavingCohort) return;
    var leaving = leavingCohort;
    db.rpc('leave_cohort', { c: leaving }).then(function (r) {
      if (r.error) return fail('You could not leave just now: ' + r.error.message);
      // Take them off the cohort's GitHub team too, so the conversation
      // closes when membership does.
      db.functions.invoke('cohort-access', { body: { action: 'leave', cohort_id: leaving } }).catch(function () {});
      load();
    });
  });

  function cohortCard(c, mine) {
    var card = el('article', 'cohort-card');
    card.appendChild(el('h3', null, c.title));
    var weeks = c.weeks + ' weeks';
    card.appendChild(el('p', 'small', when(c.starts_on) + ', ' + weeks + '.'));
    if (window.TeachLib) card.appendChild(el('p', 'small', window.TeachLib.scheduleText(c, Intl.DateTimeFormat().resolvedOptions().timeZone)));
    if (c.description) card.appendChild(el('p', null, c.description));
    var actions = el('div', 'actions');
    if (mine) {
      var open = el('a', 'btn-github', 'Open your cohort');
      open.href = '/cohort/?c=' + encodeURIComponent(c.slug);
      actions.appendChild(open);
      var leave = el('button', 'btn-quiet', 'Leave this cohort');
      leave.type = 'button';
      leave.addEventListener('click', function () { leavingCohort = c.id; leaveDialog.showModal(); });
      actions.appendChild(leave);
    } else {
      var join = el('button', 'btn-quiet', 'Join this cohort');
      join.type = 'button';
      join.addEventListener('click', function () {
        join.disabled = true;
        db.auth.getUser().then(function (u) {
          return db.from('enrollments').insert({ cohort_id: c.id, user_id: u.data.user.id });
        }).then(function (r) {
          if (r.error) { join.disabled = false; return fail('You could not join just now: ' + r.error.message); }
          // Open the cohort's conversation on GitHub. If the cohort has no
          // team yet, the cohort page offers it again later.
          db.functions.invoke('cohort-access', { body: { action: 'join', cohort_id: c.id } }).catch(function () {});
          joining = null;
          history.replaceState(null, '', '/account/');
          load();
        });
      });
      actions.appendChild(join);
    }
    card.appendChild(actions);
    return card;
  }

  // Hand the session to the Meet panel that opened this window: only the
  // two Supabase tokens (AddonLib.handoff), only to this site's origin.
  // If this window signed in only for the panel, it then forgets the
  // session itself, so the panel and this browser never refresh the same
  // session from two places (Supabase would end it). If someone was
  // already signed in here, they stay signed in here.
  function handOff(session) {
    var msg = window.AddonLib ? window.AddonLib.handoff(session) : null;
    var opener = null;
    try { opener = window.opener && !window.opener.closed ? window.opener : null; } catch (e) { opener = null; }
    var text = root.querySelector('[data-handoff-text]');
    var signedInHere = false;
    try { signedInHere = window.sessionStorage.getItem('hs-handoff') === '1'; window.sessionStorage.removeItem('hs-handoff'); } catch (e) {}
    if (!opener || !msg) {
      text.textContent = 'You are signed in on humanshaped.org, but this window lost track of Meet along the way. Go back to Meet, and in the panel choose “Use my humanshaped.org sign-in”, which can work now.';
      return show('handoff');
    }
    opener.postMessage(msg, location.origin);
    if (signedInHere) {
      try { db.auth.stopAutoRefresh(); window.localStorage.removeItem(db.auth.storageKey); } catch (e) {}
    }
    text.textContent = 'You are signed in inside Meet, and this window can close now.';
    show('handoff');
    setTimeout(function () { window.close(); }, 1500);
  }

  function load() {
    show('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) {
        if (arrivalError) fail(arrivalError); else show('signed-out');
        return;
      }
      if (handoffMode) return handOff(session);
      var uid = session.user.id;
      keepGitHubToken(session);
      return Promise.all([
        db.from('profiles').select('github_login, display_name, avatar_url').eq('id', uid).single(),
        db.from('enrollments').select('status, cohorts(id, slug, title, starts_on, weeks, description, status, session_weekday, session_time, session_minutes, time_zone)').eq('user_id', uid).neq('status', 'left'),
        db.from('cohorts').select('id, slug, title, starts_on, weeks, description, status, session_weekday, session_time, session_minutes, time_zone').eq('status', 'open').order('starts_on'),
        db.from('teachers').select('user_id').eq('user_id', uid).maybeSingle()
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) return fail('Your account could not be loaded just now: ' + bad.error.message);
        var p = res[0].data;
        root.querySelector('[data-name]').textContent = p.display_name || p.github_login;
        var title = document.querySelector('[data-account-title]');
        if (title) title.textContent = 'Your account.';
        var a = root.querySelector('[data-github-link]');
        a.textContent = '@' + p.github_login;
        a.href = 'https://github.com/' + encodeURIComponent(p.github_login);
        var img = root.querySelector('[data-avatar]');
        if (p.avatar_url && /^https:\/\//.test(p.avatar_url)) img.src = p.avatar_url; else img.hidden = true;

        var mine = res[1].data.map(function (e) { return e.cohorts; }).filter(Boolean);
        var mineIds = mine.map(function (c) { return c.id; });
        var myBox = root.querySelector('[data-my-cohorts]');
        myBox.replaceChildren();
        if (!mine.length) myBox.appendChild(el('p', 'small', 'You are not in a cohort yet.'));
        mine.forEach(function (c) { myBox.appendChild(cohortCard(c, true)); });

        var open = res[2].data.filter(function (c) { return mineIds.indexOf(c.id) === -1; });
        var openBox = root.querySelector('[data-open-cohorts]');
        openBox.replaceChildren();
        if (!open.length) openBox.appendChild(el('p', 'small', 'No cohort is open for sign-up right now. When one opens, it will be here, and on the cohorts page.'));
        var chosen = joining && open.filter(function (c) { return c.slug === joining; })[0];
        if (chosen) {
          open = [chosen].concat(open.filter(function (c) { return c !== chosen; }));
        } else if (joining && mine.some(function (c) { return c.slug === joining; })) {
          myBox.prepend(el('p', 'small', 'You are already in this cohort.'));
        } else if (joining) {
          openBox.appendChild(el('p', 'small', 'The cohort you chose is not open for sign-up any more.'));
        }
        open.forEach(function (c) {
          var card = cohortCard(c, false);
          if (c === chosen) {
            card.classList.add('chosen');
            card.insertBefore(el('p', 'kicker', 'The cohort you chose'), card.firstChild);
            card.querySelector('button').className = 'btn-github';
          }
          openBox.appendChild(card);
        });
        root.querySelector('[data-teach-link]').hidden = !res[3].data;
        drawNotes(uid);
        drawPath(uid);
        show('signed-in');
      });
    }).catch(function (err) {
      fail('Something went wrong while signing in: ' + (err && err.message ? err.message : 'no details') + '.');
    });
  }

  // Every note a teacher sent you, in every cohort, including ones you
  // have left or that have finished (DECISIONS.md, "Notes to students").
  // A teacher's name shows when you can still read their profile.
  function drawNotes(uid) {
    var section = root.querySelector('[data-notes-section]');
    var box = root.querySelector('[data-notes]');
    db.from('teacher_notes').select('id, author_id, body, created_at, edited_at, cohorts(title, slug)')
      .eq('student_id', uid).order('created_at', { ascending: false }).then(function (r) {
        var notes = r.error ? [] : r.data;
        section.hidden = !notes.length;
        if (!notes.length) return;
        var ids = notes.map(function (n) { return n.author_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
        return db.from('profiles').select('id, display_name, github_login').in('id', ids).then(function (pr) {
          var names = {};
          (pr.data || []).forEach(function (p) { names[p.id] = p.display_name || p.github_login; });
          box.replaceChildren();
          notes.forEach(function (n) {
            var q = el('blockquote', 'feedback');
            n.body.split(/\n{2,}/).forEach(function (para) { q.appendChild(el('p', null, para)); });
            var line = (names[n.author_id] || 'Your teacher') + ', ' + new Date(n.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
            if (n.cohorts && n.cohorts.title) line += ', in ' + n.cohorts.title;
            if (n.edited_at) line += ' (edited)';
            q.appendChild(el('p', 'small', line));
            var msg = el('span', 'small'); msg.setAttribute('role', 'status');
            var rm = el('button', 'btn-quiet', 'Remove this note');
            rm.type = 'button';
            rm.addEventListener('click', function () {
              rm.disabled = true;
              db.from('teacher_notes').delete().eq('id', n.id).select('id').then(function (d) {
                rm.disabled = false;
                if (d.error || !d.data.length) { msg.textContent = 'Not removed: ' + (d.error ? d.error.message : 'the database refused') + '.'; return; }
                drawNotes(uid);
              });
            });
            var a = el('div', 'actions'); a.appendChild(rm); a.appendChild(msg); q.appendChild(a);
            box.appendChild(q);
          });
        });
      });
  }

  // Your own marks on the path (assets/path-lib.js): the stages you
  // marked ready, and any note you kept of what you would bring back.
  // Nobody else sees this, and it counts nothing.
  function drawPath(uid) {
    var P = window.PathLib;
    var section = root.querySelector('[data-path-section]');
    var box = root.querySelector('[data-path-marks]');
    if (!P || !section) return;
    db.from('stage_marks').select('stage, item, state, note, updated_at').eq('user_id', uid).then(function (r) {
      // Before the database has the table, the section stays away.
      var marks = r.error ? {} : P.fromRows(r.data);
      var ready = P.readyStages(marks);
      var notes = P.STAGES.map(function (s) { return { stage: s, mark: P.get(marks, s.id, 'note') }; }).filter(function (x) { return x.mark; });
      section.hidden = !ready.length && !notes.length;
      box.replaceChildren();
      if (ready.length) {
        var p = el('p', null, 'You marked ' + (ready.length === 1 ? 'this stage' : 'these stages') + ' ready to move on: ');
        ready.forEach(function (s, i) {
          if (i) p.appendChild(document.createTextNode(i === ready.length - 1 ? (ready.length > 2 ? ', and ' : ' and ') : ', '));
          var a = el('a', null, s.title); a.href = s.href;
          p.appendChild(a);
        });
        p.appendChild(document.createTextNode('.'));
        box.appendChild(p);
      }
      notes.forEach(function (x) {
        var q = el('blockquote', 'feedback');
        x.mark.note.split(/\n{2,}/).forEach(function (para) { q.appendChild(el('p', null, para)); });
        var line = el('p', 'small', 'Your note on ');
        var a = el('a', null, x.stage.title); a.href = x.stage.href;
        line.appendChild(a);
        q.appendChild(line);
        var msg = el('span', 'small'); msg.setAttribute('role', 'status');
        var rm = el('button', 'btn-quiet', 'Remove this note');
        rm.type = 'button';
        rm.addEventListener('click', function () {
          rm.disabled = true;
          db.from('stage_marks').delete().eq('user_id', uid).eq('stage', x.stage.id).eq('item', 'note').select('item').then(function (d) {
            rm.disabled = false;
            if (d.error || !d.data.length) { msg.textContent = 'Not removed: ' + (d.error ? d.error.message : 'the database refused') + '.'; return; }
            drawPath(uid);
          });
        });
        var acts = el('div', 'actions'); acts.appendChild(rm); acts.appendChild(msg); q.appendChild(acts);
        box.appendChild(q);
      });
    });
  }

  load();
})();
