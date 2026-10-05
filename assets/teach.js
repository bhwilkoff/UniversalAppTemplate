// The teacher page (/teach/). Every rule about who may do what is
// enforced by the database; this page only asks for it.
(function () {
  var root = document.querySelector('[data-teach]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.TeachLib;
  var me = null;
  var current = null;
  var currentGroups = [];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function fail(message) { $('[data-error-text]').textContent = message; show('error'); }
  function say(sel, text) { $(sel).textContent = text || ''; }
  function whenText(iso, tz) {
    return new Date(iso).toLocaleString(undefined, { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  }

  // Offer every time zone the browser knows.
  try {
    var zones = Intl.supportedValuesOf('timeZone');
    var list = $('[data-zones]');
    zones.forEach(function (z) { var o = document.createElement('option'); o.value = z; list.appendChild(o); });
  } catch (e) { /* older browsers: the field still takes typed text */ }

  // ---- the list of cohorts ------------------------------------------
  function loadList() {
    return db.from('cohort_teachers').select('cohorts(*)').eq('user_id', me.id).then(function (r) {
      if (r.error) return fail('Your cohorts could not be loaded: ' + r.error.message);
      var box = $('[data-cohort-list]');
      box.replaceChildren();
      var cohorts = r.data.map(function (x) { return x.cohorts; }).filter(Boolean)
        .sort(function (a, b) { return (b.starts_on || '').localeCompare(a.starts_on || ''); });
      if (!cohorts.length) box.appendChild(el('p', 'small', 'You have not made a cohort yet.'));
      cohorts.forEach(function (c) {
        var card = el('article', 'cohort-card');
        card.appendChild(el('h3', null, c.title));
        card.appendChild(el('p', 'small', statusText(c.status) + (c.starts_on ? ', first day ' + c.starts_on : '') + '.'));
        var open = el('button', 'btn-quiet', 'Open');
        open.type = 'button';
        open.addEventListener('click', function () { openCohort(c.id); });
        var a = el('div', 'actions'); a.appendChild(open); card.appendChild(a);
        box.appendChild(card);
      });
    });
  }
  function statusText(s) {
    return { draft: 'Draft, visible only to you', open: 'Open for people to join', running: 'Running', finished: 'Finished' }[s] || s;
  }

  // ---- the feedback queue -------------------------------------------
  // Everything in the teacher's cohorts that asks for feedback or asks a
  // question and has no answer from a teacher yet (TeachLib.waitingForFeedback).
  function loadQueue() {
    var box = $('[data-queue-list]');
    return db.from('cohort_teachers').select('cohort_id, cohorts(id, slug, title)').eq('user_id', me.id).then(function (r) {
      if (r.error) { box.replaceChildren(el('p', 'small error', 'The requests could not be loaded: ' + r.error.message)); return; }
      var cohorts = {};
      r.data.forEach(function (x) { if (x.cohorts) cohorts[x.cohort_id] = x.cohorts; });
      var ids = Object.keys(cohorts);
      if (!ids.length) { box.replaceChildren(el('p', 'small', 'Nothing yet, because you do not have a cohort yet.')); return; }
      return Promise.all([
        db.from('shares').select('id, cohort_id, user_id, kind, url, note, created_at, profiles(github_login, display_name), feedback(author_id)')
          .in('cohort_id', ids).in('kind', ['for-feedback', 'question']),
        db.from('cohort_teachers').select('cohort_id, user_id').in('cohort_id', ids)
      ]).then(function (res) {
        if (res[0].error || res[1].error) {
          box.replaceChildren(el('p', 'small error', 'The requests could not be loaded: ' + (res[0].error || res[1].error).message));
          return;
        }
        var teachers = {};
        res[1].data.forEach(function (t) { (teachers[t.cohort_id] = teachers[t.cohort_id] || []).push(t.user_id); });
        drawQueue(lib.waitingForFeedback(res[0].data, teachers), cohorts);
      });
    });
  }
  function drawQueue(waiting, cohorts) {
    var box = $('[data-queue-list]');
    box.replaceChildren();
    if (!waiting.length) { box.appendChild(el('p', 'small', 'Nothing is waiting for you right now.')); return; }
    waiting.forEach(function (s) {
      var c = cohorts[s.cohort_id];
      var who = s.profiles ? (s.profiles.display_name || '@' + s.profiles.github_login) : 'Someone';
      var card = el('article', 'cohort-card share');
      card.appendChild(el('p', 'kicker', (s.kind === 'question' ? 'A question from ' : 'Feedback requested by ') + who));
      card.appendChild(el('p', 'small', c.title + ', ' + new Date(s.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.'));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (s.url && /^https:\/\//.test(s.url)) {
        var a = el('a', null, s.url.replace(/^https:\/\//, '')); a.href = s.url; a.rel = 'noopener';
        card.appendChild(el('p')).appendChild(a);
      }
      var form = el('form', 'inline-form');
      var label = el('label', null, s.kind === 'question' ? 'Your answer' : 'Your feedback');
      var input = el('textarea'); input.rows = 3; input.required = true; input.maxLength = 8000;
      label.appendChild(input); form.appendChild(label);
      var send = el('button', 'btn-quiet', 'Send'); send.type = 'submit';
      var open = el('a', 'text', 'Open the cohort page'); open.href = '/cohort/?c=' + encodeURIComponent(c.slug);
      var actions = el('div', 'actions'); actions.appendChild(send); actions.appendChild(open); form.appendChild(actions);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        send.disabled = true;
        db.from('feedback').insert({ share_id: s.id, author_id: me.id, body: input.value.trim() }).then(function (r) {
          if (r.error) { send.disabled = false; send.textContent = 'Not sent, try again'; return; }
          loadQueue();
        });
      });
      card.appendChild(form);
      box.appendChild(card);
    });
  }

  // ---- the form -----------------------------------------------------
  var form = $('[data-cohort-form]');
  var editing = null;
  function fillForm(c) {
    editing = c ? c.id : null;
    say('[data-form-title]', c ? 'Edit ' + c.title : 'A new cohort');
    say('[data-form-message]', '');
    var f = form.elements;
    f.title.value = c ? c.title : '';
    f.slug.value = c ? c.slug : '';
    f.slug.readOnly = !!c;
    f.description.value = c && c.description ? c.description : '';
    f.starts_on.value = c && c.starts_on ? c.starts_on : '';
    f.weeks.value = c ? c.weeks : 5;
    f.session_weekday.value = c && c.session_weekday != null ? String(c.session_weekday) : '';
    f.session_time.value = c && c.session_time ? c.session_time.slice(0, 5) : '';
    f.session_minutes.value = c ? c.session_minutes : 75;
    f.time_zone.value = c ? c.time_zone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    f.capacity.value = c && c.capacity ? c.capacity : '';
    f.status.value = c ? c.status : 'draft';
    f.conversations_open.checked = c ? c.conversations_open : false;
    f.github_repo.value = c && c.github_repo ? c.github_repo : '';
    f.github_team.value = c && c.github_team ? c.github_team : '';
    form.hidden = false;
    $('[data-detail]').hidden = true;
    f.title.focus();
  }
  $('[data-new-cohort]').addEventListener('click', function () { fillForm(null); });
  $('[data-cancel]').addEventListener('click', function () { form.hidden = true; if (current) $('[data-detail]').hidden = false; });
  function removeBoardFiles(cohortId) {
    var store = db.storage.from('board-files');
    return db.from('boards').select('id').eq('cohort_id', cohortId).then(function (b) {
      return Promise.all(((b && b.data) || []).map(function (board) {
        var folder = cohortId + '/' + board.id;
        return store.list(folder, { limit: 1000 }).then(function (l) {
          var names = ((l && l.data) || []).map(function (f) { return folder + '/' + f.name; });
          return names.length ? store.remove(names) : null;
        });
      }));
    }).catch(function () {});
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements;
    try { new Intl.DateTimeFormat('en-US', { timeZone: f.time_zone.value }); }
    catch (e) { return say('[data-form-message]', 'That time zone is not one the calendar knows. Choose one from the list, such as America/Denver.'); }
    var row = {
      title: f.title.value.trim(),
      description: f.description.value.trim() || null,
      starts_on: f.starts_on.value || null,
      weeks: Number(f.weeks.value) || 5,
      session_weekday: f.session_weekday.value === '' ? null : Number(f.session_weekday.value),
      session_time: f.session_time.value || null,
      session_minutes: Number(f.session_minutes.value) || 75,
      time_zone: f.time_zone.value,
      capacity: f.capacity.value ? Number(f.capacity.value) : null,
      status: f.status.value,
      conversations_open: f.conversations_open.checked,
      github_repo: f.github_repo.value.trim() || null,
      github_team: f.github_team.value.trim() || null
    };
    // Finishing a cohort deletes its boards (migration 20261003150000), so
    // the pages placed on them go first (R13): a file in storage cannot be
    // removed from SQL.
    var before = editing && row.status === 'finished' ? removeBoardFiles(editing) : Promise.resolve();
    var q = editing
      ? before.then(function () { return db.from('cohorts').update(row).eq('id', editing).select().single(); })
      : db.from('cohorts').insert(Object.assign({ slug: f.slug.value.trim(), created_by: me.id }, row)).select().single();
    say('[data-form-message]', 'Saving…');
    q.then(function (r) {
      if (r.error) {
        var dup = /duplicate|unique/i.test(r.error.message);
        return say('[data-form-message]', dup ? 'Another cohort already uses that short name. Try another.' : 'It could not be saved: ' + r.error.message);
      }
      form.hidden = true;
      loadList();
      openCohort(r.data.id);
    });
  });

  // ---- one cohort ---------------------------------------------------
  function openCohort(id) {
    Promise.all([
      db.from('cohorts').select('*').eq('id', id).single(),
      db.from('sessions').select('*').eq('cohort_id', id).order('number'),
      db.from('enrollments').select('user_id, role, status, app_name, app_repo, app_url, app_public, profiles(github_login, display_name)').eq('cohort_id', id),
      // Every column, so a group's Meet link (meet_url) comes along once
      // the database has it, and the page works the same before then.
      db.from('groups').select('*, group_members(user_id)').eq('cohort_id', id).order('name'),
      db.from('github_access').select('state').eq('cohort_id', id).eq('user_id', me.id).maybeSingle(),
      db.from('credentials').select('*').eq('cohort_id', id)
    ]).then(function (res) {
      var bad = res.slice(0, 5).filter(function (r) { return r.error; })[0];
      if (bad) return fail('This cohort could not be loaded: ' + bad.error.message);
      current = res[0].data;
      currentGroups = res[3].data;
      var c = current;
      say('[data-detail-title]', c.title);
      var meta = [statusText(c.status)];
      if (c.session_weekday != null && c.session_time) meta.push(DAYS[c.session_weekday] + 's at ' + c.session_time.slice(0, 5) + ' ' + c.time_zone + ', ' + c.session_minutes + ' minutes');
      if (c.starts_on) meta.push(c.weeks + ' weeks from ' + c.starts_on);
      say('[data-detail-meta]', meta.join('. ') + '.');
      say('[data-detail-message]', '');
      drawSessions(res[1].data);
      if (window.QuestionBank) window.QuestionBank.mount($('[data-question-bank]'), { db: db, cohort: c });
      drawLesson(c, res[1].data);
      drawRoster(res[2].data, res[3].data);
      drawTeachers();
      $('[data-live-link]').href = '/live/?c=' + encodeURIComponent(c.slug);
      $('[data-rooms-link]').href = '/live/?c=' + encodeURIComponent(c.slug) + '#rooms';
      loadSubmissions(res[2].data, res[1].data);
      drawGroups(res[3].data, res[2].data);
      drawCohortSetup(res[1].data, res[4].data, null);
      // On its own, so the page works the same before the database has
      // setup_requests (migration 20261004000000).
      var setupSessions = res[1].data, setupAccess = res[4].data;
      db.from('setup_requests').select('state, detail, created_at').eq('cohort_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle().then(function (q) {
        if (!q.error && q.data && current && current.id === id) drawCohortSetup(setupSessions, setupAccess, q.data);
      });
      loadSince(res[1].data, res[2].data);
      drawCredentials(res[2].data, res[5]);
      form.hidden = true;
      var del = $('[data-delete-draft]');
      del.hidden = c.status !== 'draft';
      del.textContent = 'Delete this draft';
      del.removeAttribute('data-armed');
      $('[data-detail]').hidden = false;
    });
  }
  $('[data-edit]').addEventListener('click', function () { fillForm(current); });

  // Before the first session: the steps a teacher's cohort needs, each
  // checked off by what the hub can see (TeachLib.cohortSetupSteps). The
  // card goes away once every step is done.
  function drawCohortSetup(sessions, access, meetRequest) {
    // /live/ remembers, in this browser only, that its teacher opened it.
    var rehearsed = false;
    try { rehearsed = !!localStorage.getItem('hs-rehearsed:' + current.id); } catch (e) {}
    var steps = lib.cohortSetupSteps(current, sessions, access, meetRequest, { groups: currentGroups, rehearsed: rehearsed });
    $('[data-cohort-setup]').hidden = steps.every(function (x) { return x.done || x.optional; });
    var list = $('[data-cohort-setup-steps]');
    list.replaceChildren();
    steps.forEach(function (x) {
      var li = el('li', x.done ? 'done' : null);
      var target;
      if (x.href) { target = el('a', null, x.label); target.href = x.href; }
      else {
        target = el('button', 'link', x.label); target.type = 'button';
        target.addEventListener('click', function () {
          if (x.action === 'sessions') $('[data-make-sessions]').click();
          else if (x.action === 'meet') askMeet(target);
          else if (x.action === 'provision') provision(target);
          else if (x.action === 'groups') { var g = $('#groups'); if (g) g.scrollIntoView({ block: 'start' }); }
          else fillForm(current);
        });
      }
      li.appendChild(target);
      if (x.optional) li.appendChild(el('span', 'small', ' (if you would like)'));
      if (x.note) li.appendChild(el('span', 'small', ' ' + x.note));
      if (x.done) li.appendChild(el('span', 'visually-hidden', ' (done)'));
      list.appendChild(li);
    });
  }

  // A teacher who is not Ben sets up a cohort alone (LOOP-PLAN G1). Words
  // by Claude, awaiting Ben's review.
  //
  // The calls: a request for meet@humanshaped.org's script, which makes
  // the weekly event, its Meet link, and the group rooms, and puts the
  // links on each week here. A request holds no email; the script reads
  // the invitation emails when it takes the request.
  function askMeet(button) {
    button.disabled = true;
    db.from('setup_requests').insert({ cohort_id: current.id }).then(function (r) {
      button.disabled = false;
      if (r.error && r.error.code === '23505') return say('[data-detail-message]', 'You have asked already, and meet@ has not finished yet.');
      if (r.error) return say('[data-detail-message]', 'The request could not be made: ' + r.error.message);
      say('[data-detail-message]', 'Asked. meet@humanshaped.org picks it up within the hour, invites everyone who gave an email for invitations, and puts the Meet link on each week here. People who give their email later are added when you ask again.');
      openCohort(current.id);
    });
  }

  // The conversation: the hub makes the private repository with
  // Discussions on and the secret team (the cohort-access function), and
  // then adds you to the team, as it does for everyone who opens it.
  function provision(button) {
    var id = current.id;
    button.disabled = true;
    say('[data-detail-message]', 'Making the repository and team on GitHub…');
    db.functions.invoke('cohort-access', { body: { action: 'provision', cohort_id: id } }).then(function (r) {
      if (r.error) {
        var res = r.error.context;
        return (res && res.json ? res.json() : Promise.resolve({})).catch(function () { return {}; }).then(function (body) {
          button.disabled = false;
          say('[data-detail-message]', body.message || 'GitHub could not be reached just now. Try again in a minute.');
        });
      }
      return db.functions.invoke('cohort-access', { body: { action: 'join', cohort_id: id } }).then(function () {
        say('[data-detail-message]', 'The repository ' + r.data.github_repo + ' and its team are ready, with Discussions on. Open the cohort’s conversation from its page to check it works.');
        openCohort(id);
      });
    });
  }

  // Only a draft can be deleted (the database allows nothing else), and
  // the button asks once more on the page itself before it does.
  $('[data-delete-draft]').addEventListener('click', function () {
    var b = this;
    if (!b.hasAttribute('data-armed')) {
      b.setAttribute('data-armed', '');
      b.textContent = 'Delete ' + current.title + ', with its sessions and groups';
      say('[data-detail-message]', 'This cannot be undone. Click again to delete it.');
      return;
    }
    b.disabled = true;
    db.from('cohorts').delete().eq('id', current.id).eq('status', 'draft').select('id').then(function (r) {
      b.disabled = false;
      if (r.error || !r.data.length) return say('[data-detail-message]', 'It could not be deleted: ' + (r.error ? r.error.message : 'only drafts can be deleted') + '.');
      current = null;
      $('[data-detail]').hidden = true;
      loadList();
    });
  });

  $('[data-make-sessions]').addEventListener('click', function () {
    var rows = lib.sessionRows(current);
    if (!rows) return say('[data-detail-message]', 'Set the first day, the session day, and the time first, and the sessions will follow from them.');
    db.from('sessions').upsert(rows, { onConflict: 'cohort_id,number' }).then(function (r) {
      if (r.error) return say('[data-detail-message]', 'The sessions could not be made: ' + r.error.message);
      say('[data-detail-message]', rows.length + ' weekly sessions are set. Changing the dates later and making them again keeps what you wrote in each.');
      openCohort(current.id);
    });
  });

  // The setup the Meet script reads, with one room asked for per group
  // (each group's members by the emails they gave for invitations). If
  // the clipboard is not available, the text appears on the page to copy.
  $('[data-copy-meet]').addEventListener('click', function () {
    var shown = $('[data-meet-text]');
    shown.hidden = true;
    db.from('calendar_contacts').select('user_id, email').eq('cohort_id', current.id).then(function (r) {
      if (r.error) return say('[data-detail-message]', 'The emails could not be read: ' + r.error.message);
      var byUser = {};
      r.data.forEach(function (x) { byUser[x.user_id] = x.email; });
      var groups = currentGroups.map(function (g) {
        return { id: g.id, name: g.name, emails: g.group_members.map(function (m) { return byUser[m.user_id]; }).filter(Boolean) };
      });
      var setup = lib.meetSetup(current, r.data.map(function (x) { return x.email; }), [], groups);
      var text = JSON.stringify(setup, null, 2);
      var rooms = groups.length ? ', and the script will make a room for each of the ' + groups.length + (groups.length === 1 ? ' group' : ' groups') : '';
      var told = r.data.length + (r.data.length === 1 ? ' person has' : ' people have') + ' given an email for invitations' + rooms + '.';
      var done = function () { say('[data-detail-message]', 'Copied. Paste it into the Meet events script as this cohort’s setup, and add your own email under "teachers". ' + told); };
      var fallback = function () {
        shown.value = text; shown.hidden = false; shown.select();
        say('[data-detail-message]', 'Copy the setup below, paste it into the Meet events script, and add your own email under "teachers". ' + told);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
  });

  // ---- since the last session ---------------------------------------
  // Two things for the days after a session, for the cohort's teachers
  // alone: that session's check answers with one field to say what you
  // heard and what changes (shown on /live/ while people arrive next
  // time), and who has not been seen since it began, worked out here from
  // what this page can already read and never stored (TeachLib.notSeen).
  function loadSince(sessions, people) {
    var box = $('[data-since]');
    var last = lib.lastStarted(sessions, new Date());
    box.hidden = !last;
    if (!last) return;
    var since = last.starts_at;
    var reachLoaded = loadReach();
    var names = {};
    people.forEach(function (p) { names[p.user_id] = personName(p); });
    var nameOf = function (id) { return id === me.id ? 'You' : (names[id] || 'Someone'); };
    say('[data-checks-heard-title]', 'What week ' + last.number + '’s checks said');
    say('[data-not-seen-title]', 'Not seen since week ' + last.number + ' began');
    var heardForm = $('[data-heard-form]');
    heardForm.hidden = !('heard' in last);   // until the database has the column
    heardForm.elements.heard.value = last.heard || '';
    heardForm.onsubmit = function (ev) {
      ev.preventDefault();
      say('[data-heard-message]', 'Saving…');
      db.from('sessions').update({ heard: heardForm.elements.heard.value.trim() || null }).eq('id', last.id).select('id').then(function (r) {
        say('[data-heard-message]', r.error || !r.data.length ? 'Not saved: ' + (r.error ? r.error.message : 'the database refused') + '.' : 'Saved. It shows on the session page while people arrive next time.');
      });
    };
    say('[data-heard-message]', '');

    var answersBox = $('[data-check-answers]');
    answersBox.replaceChildren(el('p', 'small', 'Reading the answers…'));
    var notSeenList = $('[data-not-seen]');
    notSeenList.replaceChildren();
    say('[data-not-seen-intro]', '');
    db.from('live_checks').select('*').eq('session_id', last.id).then(function (k) {
      if (k.error) { answersBox.replaceChildren(el('p', 'small error', 'The checks could not be read: ' + k.error.message)); return; }
      var ids = k.data.map(function (x) { return x.id; });
      var answers = ids.length
        ? db.from('live_answers').select('*').in('check_id', ids)
        : Promise.resolve({ data: [] });
      return answers.then(function (a) {
        if (a.error) { answersBox.replaceChildren(el('p', 'small error', 'The answers could not be read: ' + a.error.message)); return; }
        drawCheckAnswers(lib.checkAnswers(k.data, a.data, nameOf), last);
      });
    });

    // Anything a person did since the session began: a share, an item in
    // the queue, an answer, or feedback on someone's work.
    Promise.all([
      db.from('shares').select('user_id, created_at').eq('cohort_id', current.id).gte('created_at', since),
      db.from('live_queue').select('user_id, created_at').eq('cohort_id', current.id).gte('created_at', since),
      db.from('live_answers').select('user_id, updated_at').eq('cohort_id', current.id).gte('updated_at', since),
      db.from('feedback').select('author_id, created_at, shares!inner(cohort_id)').eq('shares.cohort_id', current.id).gte('created_at', since)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) { say('[data-not-seen-intro]', 'This list could not be worked out just now: ' + bad.error.message); return; }
      var activity = [].concat(
        res[0].data.map(function (x) { return { user_id: x.user_id, at: x.created_at }; }),
        res[1].data.map(function (x) { return { user_id: x.user_id, at: x.created_at }; }),
        res[2].data.map(function (x) { return { user_id: x.user_id, at: x.updated_at }; }),
        res[3].data.map(function (x) { return { user_id: x.author_id, at: x.created_at }; }));
      reachLoaded.then(function () { drawNotSeen(lib.notSeen(people, since, activity), last); });
    });

    reachLoaded.then(function () { loadFollowups(last, sessions, people, nameOf); });
  }

  // How each person chose to be reached when they are not on the site
  // (research/notes/reach-notes.md): an address only for someone who said
  // their teachers may email them. Before the hub's database has
  // reach_choices, everyone is reached through notes, as before.
  var R = window.ReachLib;
  var reachBy = {};
  function loadReach() {
    reachBy = {};
    if (!R) return Promise.resolve();
    return db.rpc('reach_for', { c: current.id }).then(function (r) {
      reachBy = r.error ? {} : R.byPerson(r.data);
    }, function () { reachBy = {}; });
  }

  // A link that opens the teacher's own mail to this person, with their
  // draft in it, or null if the person has not allowed email.
  function emailLink(p, draft) {
    var way = reachBy[p.user_id];
    if (!R || !way || !way.mayEmail) return null;
    var href = R.mailtoHref(way.email, R.reachSubject(current.title), draft || '');
    if (!href) return null;
    var a = el('a', null, 'Write to ' + personName(p) + ' from your own email');
    a.href = href;
    return a;
  }

  // ---- follow-ups ---------------------------------------------------
  // For each student after a session, what they contributed on purpose
  // (FollowupLib.contributions) and a follow-up the teacher writes. The
  // draft lives only in this browser (localStorage) until it is sent, so
  // the database never holds words about a student that the student
  // cannot read. Sending puts it where the student will see it: feedback
  // on their bring-back, or a note in teacher_notes (migration
  // 20261003130000) that only they and the cohort's teachers can read.
  // Nothing here writes a word for the teacher.
  var F = window.FollowupLib;
  var store = null;
  try { store = window.localStorage; } catch (e) { store = null; }

  function loadFollowups(last, sessions, people, nameOf) {
    var box = $('[data-followups]');
    if (!F || !box) return;
    say('[data-followups-title]', 'Following up on week ' + last.number);
    say('[data-followups-intro]', '');
    box.replaceChildren(el('p', 'small', 'Gathering what each person did around the session…'));
    var w = F.sessionWindow(sessions, last);
    Promise.all([
      db.from('shares').select('*, feedback(id, author_id, body, created_at)').eq('cohort_id', current.id),
      db.from('live_queue').select('user_id, kind, url, note, state, created_at').eq('session_id', last.id),
      db.from('live_checks').select('*').eq('session_id', last.id),
      db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', current.id),
      // Read on its own: before migration 20261003130000 the table is not
      // there, and follow-ups can still go as feedback on a bring-back.
      db.from('teacher_notes').select('id, student_id, author_id, body, created_at').eq('cohort_id', current.id),
      // The session's run of show (R8), on its own: a week with none, or a
      // database before migration 20261004050000, simply has no list.
      db.from('scenes').select('position, kind, title, minutes').eq('session_id', last.id)
    ]).then(function (res) {
      var bad = res.slice(0, 4).filter(function (r) { return r.error; })[0];
      if (bad) { box.replaceChildren(el('p', 'small error', 'The follow-ups could not be gathered: ' + bad.error.message)); return; }
      var ids = res[2].data.map(function (k) { return k.id; });
      var answers = ids.length
        ? db.from('live_answers').select('*').in('check_id', ids)
        : Promise.resolve({ data: [] });
      return answers.then(function (a) {
        if (a.error) { box.replaceChildren(el('p', 'small error', 'The answers could not be read: ' + a.error.message)); return; }
        var teacherNames = {};
        res[3].data.forEach(function (t) { if (t.profiles) teacherNames[t.user_id] = t.profiles.display_name || t.profiles.github_login; });
        var who = function (id) { return id === me.id ? 'You' : (teacherNames[id] || nameOf(id)); };
        drawFollowups(last, people, w, {
          teacherIds: res[3].data.map(function (t) { return t.user_id; }),
          shares: res[0].data, queue: res[1].data, checks: res[2].data, answers: a.data,
          notes: res[4].error ? [] : res[4].data,
          scenes: res[5].error ? [] : res[5].data
        }, !res[4].error, who);
      });
    });
  }

  function drawFollowups(last, people, w, data, notesReady, who) {
    var box = $('[data-followups]');
    box.replaceChildren();
    var byId = {};
    people.forEach(function (p) { byId[p.user_id] = F.contributions(p.user_id, w, data); });
    var order = F.followupOrder(people, byId);
    say('[data-followups-intro]', order.length
      ? 'What each person did on purpose around week ' + last.number + '’s session, from what they brought back to the feedback they gave, with a place to write to them. Anyone who said something is still muddy comes first. A draft stays in this browser alone until you send it, and sending puts your words where they will see them: on their bring-back, or, if they brought nothing back, as a note on their cohort page that only they and the cohort’s teachers can read. Every word is yours to write.'
      : 'Once people join, each of them is listed here after every session, with a place to write to them.');
    // The show as it ran (R8): what everyone did together, above what each
    // person did.
    var show = F.showAsRun(data.scenes);
    if (show.length) {
      var ran = el('details', 'followup-show');
      ran.appendChild(el('summary', null, 'Week ' + last.number + '’s run of show'));
      var ol = el('ol', 'show-glance');
      show.forEach(function (s) {
        var li = el('li');
        li.appendChild(el('span', 'scene-kind', s.kind));
        li.appendChild(document.createTextNode(' ' + s.title + ', ' + s.minutes + ' min'));
        ol.appendChild(li);
      });
      ran.appendChild(ol);
      box.appendChild(ran);
    }
    order.forEach(function (p) { box.appendChild(followupCard(p, byId[p.user_id], last, notesReady, who)); });
  }

  // Correcting a note or feedback you sent (DECISIONS.md, "Notes to
  // students"): only its words change, and the student sees it was edited.
  function correctControl(g) {
    var wrap = el('span', 'followup-correct');
    var open = el('button', 'btn-link', 'Edit');
    open.type = 'button';
    var form = el('form', 'inline-form');
    form.hidden = true;
    var label = el('label', null, 'Your corrected words');
    var input = el('textarea'); input.rows = 3; input.required = true; input.maxLength = 8000; input.value = g.body;
    label.appendChild(input); form.appendChild(label);
    var save = el('button', 'btn-quiet', 'Save the correction'); save.type = 'submit';
    var cancel = el('button', 'btn-quiet', 'Cancel'); cancel.type = 'button';
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var actions = el('div', 'actions'); actions.appendChild(save); actions.appendChild(cancel); actions.appendChild(msg);
    form.appendChild(actions);
    open.addEventListener('click', function () { form.hidden = false; open.hidden = true; input.focus(); });
    cancel.addEventListener('click', function () { form.hidden = true; open.hidden = false; input.value = g.body; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var body = input.value.trim();
      if (!body) return;
      save.disabled = true;
      var q = g.note_id
        ? db.from('teacher_notes').update({ body: body }).eq('id', g.note_id).select('id')
        : db.from('feedback').update({ body: body }).eq('id', g.feedback_id).select('id');
      q.then(function (r) {
        save.disabled = false;
        if (r.error || !r.data.length) { msg.textContent = 'Not saved: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
        g.body = body;
        msg.textContent = 'Saved. They will see it was edited.';
        form.hidden = true; open.hidden = false;
      });
    });
    wrap.appendChild(document.createTextNode(' '));
    wrap.appendChild(open); wrap.appendChild(form);
    return wrap;
  }

  function followupCard(p, c, last, notesReady, who) {
    var name = personName(p);
    var key = F.draftKey(current.id, last.id, p.user_id);
    var card = el('details', 'cohort-card followup');
    var sum = el('summary');
    sum.appendChild(el('strong', null, name));
    var gist = c.muddy ? 'Still muddy: ' + c.muddy.text
      : c.bringBacks.length ? (c.bringBacks[0].readiness === 'ready' ? 'Brought something back, marked ready' : c.bringBacks[0].readiness === 'not-yet' ? 'Brought something back, marked not yet' : 'Brought something back')
      : c.empty ? 'Nothing from them around this session' : 'Took part without a bring-back';
    var gistEl = el('span', 'small followup-gist', gist);
    sum.appendChild(gistEl);
    var draftFlag = el('span', 'small followup-draft', 'Draft');
    draftFlag.hidden = !F.loadDraft(store, key);
    sum.appendChild(draftFlag);
    card.appendChild(sum);

    var body = el('div', 'followup-body');
    function block(title, rows) {
      if (!rows.length) return;
      body.appendChild(el('p', 'kicker', title));
      var ul = el('ul', 'answer-list');
      rows.forEach(function (r) { ul.appendChild(r); });
      body.appendChild(ul);
    }
    function line(text, href) {
      var li = el('li');
      if (href && /^https:\/\//.test(href)) {
        li.appendChild(document.createTextNode(text ? text + ' ' : ''));
        var a = el('a', null, href.replace(/^https:\/\//, '')); a.href = href; a.rel = 'noopener'; a.target = '_blank';
        li.appendChild(a);
      } else li.textContent = text;
      return li;
    }
    block('What they brought back', c.bringBacks.map(function (s) {
      var li = line(s.note || '', s.url);
      if (s.want_to_know) li.appendChild(el('span', 'followup-line want', 'Their question: ' + s.want_to_know));
      if (s.readiness === 'ready') li.appendChild(el('span', 'followup-line small', 'They marked it ready to move on.'));
      if (s.readiness === 'not-yet') li.appendChild(el('span', 'followup-line small', 'They marked it not yet' + (s.missing ? ', because ' + s.missing.charAt(0).toLowerCase() + s.missing.slice(1) : '.')));
      return li;
    }));
    // Their room and what they presented (R8), from the show.
    var room = F.roomOf(p.user_id, currentGroups, who);
    if (room) body.appendChild(el('p', 'small followup-room', 'In ' + room.name + (room.partners.length ? ', with ' + room.partners.join(' and ') : '') + '.'));
    var pres = F.presented(c.queue);
    block('What they presented to everyone', pres.shown.map(function (q) { return line(q.note ? '“' + q.note + '”' : '', q.url); }));
    block('What they asked to show and the session did not reach', pres.waiting.map(function (q) { return line(q.note ? '“' + q.note + '”' : '', q.url); }));
    var QK = window.LiveLib ? window.LiveLib.questionKind : null;
    block('Their answers to the questions', c.answers.map(function (x) {
      var li = el('li'); li.appendChild(el('strong', null, x.prompt + ' '));
      li.appendChild(document.createTextNode(x.text || '(no answer)'));
      var k = QK ? QK(x.kind) : null;
      if (k && x.kind !== 'short') li.appendChild(el('span', 'followup-line small', k.name));
      return li;
    }));
    var KIND = { 'for-feedback': 'Asked for feedback', 'ai-review': 'Shared a review from their AI agent', question: 'Asked a question' };
    block('What else they shared', c.otherShares.map(function (s) { return line((KIND[s.kind] || s.kind) + (s.note ? ': ' + s.note : ''), s.url); }));
    block('Feedback they gave', c.given.map(function (g) { return line('To ' + who(g.to) + ': ' + g.body); }));
    block('Feedback they received', c.received.map(function (g) { return line('From ' + who(g.from) + ': ' + g.body); }));
    block('Already sent by a teacher', c.fromTeachers.map(function (g) {
      var li = line(who(g.from) + ': ' + g.body);
      if (g.from === me.id && (g.note_id || g.feedback_id)) li.appendChild(correctControl(g));
      return li;
    }));
    if (c.empty) body.appendChild(el('p', 'small', 'They did not share, queue, answer, or give feedback around this session, which is worth a kind, private word with an easy way back in.'));
    if (p.app_repo) {
      var repo = el('p', 'small'); var ra = el('a', null, 'Their repository on GitHub'); ra.href = 'https://github.com/' + p.app_repo; ra.rel = 'noopener'; ra.target = '_blank';
      repo.appendChild(ra); body.appendChild(repo);
    }

    var target = F.followupTarget(c);
    var form = el('form', 'inline-form followup-form');
    var label = el('label', null, 'Your follow-up to ' + name);
    var where = target.kind === 'feedback'
      ? 'It goes as your feedback on their bring-back, where they and the cohort will see it.'
      : notesReady ? 'It goes as a note on their cohort page that only they and the cohort’s teachers can read.'
        : 'It can go only as feedback on a bring-back until the hub’s database has notes, and they brought nothing back this time.';
    label.appendChild(el('span', 'hint', where));
    var input = el('textarea'); input.rows = 4; input.maxLength = 8000;
    input.value = F.loadDraft(store, key);
    label.appendChild(input); form.appendChild(label);
    var send = el('button', 'btn-quiet', 'Send it to ' + name); send.type = 'submit';
    send.disabled = target.kind === 'note' && !notesReady;
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var acts = el('div', 'actions'); acts.appendChild(send); acts.appendChild(msg); form.appendChild(acts);
    // When they said their teachers may email them, the same draft can go
    // privately from the teacher's own mail instead (reach-notes.md).
    var mail = emailLink(p, input.value);
    if (mail) {
      var alt = el('p', 'small');
      alt.appendChild(document.createTextNode('Or, privately, since they said you may email them: '));
      alt.appendChild(mail);
      alt.appendChild(document.createTextNode('. It opens your own mail with this draft in it, and nothing is sent until you send it there.'));
      form.appendChild(alt);
    }
    input.addEventListener('input', function () {
      if (mail) mail.href = R.mailtoHref(reachBy[p.user_id].email, R.reachSubject(current.title), input.value);
      var kept = F.saveDraft(store, key, input.value);
      draftFlag.hidden = !input.value.trim();
      msg.textContent = !input.value.trim() ? '' : kept ? 'Draft kept in this browser only.' : 'This browser will not keep drafts, so send it before you leave the page.';
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var checked = F.checkBody(input.value);
      if (checked.error) { msg.textContent = checked.error; return; }
      send.disabled = true;
      msg.textContent = 'Sending…';
      var q = target.kind === 'feedback'
        ? db.from('feedback').insert({ share_id: target.share_id, author_id: me.id, body: checked.body })
        : db.from('teacher_notes').insert({ cohort_id: current.id, student_id: p.user_id, author_id: me.id, session_id: last.id, body: checked.body });
      q.then(function (r) {
        send.disabled = false;
        if (r.error) { msg.textContent = 'Not sent, and your draft is still here: ' + r.error.message; return; }
        F.clearDraft(store, key);
        input.value = '';
        draftFlag.hidden = true;
        msg.textContent = target.kind === 'feedback' ? 'Sent, as feedback on their bring-back.' : 'Sent, as a note on their cohort page.';
        body.insertBefore(el('p', 'small followup-sent', 'You sent: ' + checked.body), form);
      });
    });
    body.appendChild(form);
    card.appendChild(body);
    return card;
  }

  function drawCheckAnswers(checks, last) {
    var box = $('[data-check-answers]');
    box.replaceChildren();
    say('[data-checks-heard-intro]', checks.length
      ? 'Every answer from week ' + last.number + ', by name, for you alone. Read them before the next session, and then say in a few sentences what you heard and what you will change because of it.'
      : 'No questions were asked in week ' + last.number + '’s session, so there is nothing to read. You can still tell the cohort what you noticed, and what changes.');
    checks.forEach(function (k) {
      var card = el('article', 'cohort-card check-answers');
      card.appendChild(el('h4', null, k.prompt));
      if (!k.answers.length) card.appendChild(el('p', 'small', 'No one answered this one.'));
      else {
        var ul = el('ul', 'answer-list');
        k.answers.forEach(function (a) {
          var li = el('li');
          li.appendChild(el('strong', null, a.name + ': '));
          li.appendChild(document.createTextNode(a.text));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      box.appendChild(card);
    });
  }

  function drawNotSeen(list, last) {
    var ul = $('[data-not-seen]');
    ul.replaceChildren();
    say('[data-not-seen-intro]', list.length
      ? 'No one listed here has shared, queued, answered a check, or given feedback since week ' + last.number + ' began, so these are the people to reach out to in the next two days, privately and kindly, with an easy way back in. Only you see this. It is worked out each time you open this page, from what you can already read, and it says nothing about who came to the session.'
      : 'Everyone in the cohort has shared, queued, answered, or given feedback since week ' + last.number + ' began.');
    list.forEach(function (p) {
      var li = el('li');
      li.appendChild(el('strong', null, personName(p)));
      if (p.profiles) {
        var gh = el('a', null, ' @' + p.profiles.github_login); gh.href = 'https://github.com/' + encodeURIComponent(p.profiles.github_login);
        li.appendChild(gh);
      }
      var mail = emailLink(p, '');
      var how = el('span', 'small followup-line');
      if (mail) { how.appendChild(document.createTextNode('They said you may email them. ')); how.appendChild(mail); }
      else how.textContent = 'They have not chosen email, so a note to them, in their follow-up below, is how your words reach them.';
      li.appendChild(how);
      ul.appendChild(li);
    });
  }

  function drawSessions(sessions) {
    var box = $('[data-sessions]');
    box.replaceChildren();
    if (!sessions.length) { box.appendChild(el('p', 'small', 'No sessions yet. Set the day and time, then make the weekly sessions.')); return; }
    sessions.forEach(function (s) {
      var f = el('form', 'session-row');
      f.appendChild(el('p', 'session-when', 'Week ' + s.number + (s.starts_at ? ', ' + whenText(s.starts_at, current.time_zone) : '')));
      [['title', 'Title', s.title], ['scope', 'This week’s challenge, in your words', s.scope], ['meet_url', 'Meet link', s.meet_url], ['recording_url', 'Recording link', s.recording_url]].forEach(function (x) {
        var l = el('label', null, x[1]);
        var input = x[0] === 'scope' ? el('textarea') : el('input');
        input.name = x[0]; input.value = x[2] || '';
        if (x[0] === 'scope') input.rows = 2;
        if (/url/.test(x[0])) { input.type = 'url'; input.placeholder = 'https://'; }
        l.appendChild(input); f.appendChild(l);
      });
      // The showing, open to guests (H5; migration 20261004030000): only
      // once the database has the columns, so the page works before then.
      // Words by Claude, awaiting Ben's review.
      var showcase = 'public_showcase' in s;
      if (showcase) {
        var open = el('label', 'check');
        var openBox = el('input'); openBox.type = 'checkbox'; openBox.name = 'public_showcase'; openBox.checked = !!s.public_showcase;
        open.appendChild(openBox); open.appendChild(document.createTextNode(' Open this session to guests, as a public showing'));
        f.appendChild(open);
        var share = el('label', 'check');
        var shareBox = el('input'); shareBox.type = 'checkbox'; shareBox.name = 'showcase_shares_link'; shareBox.checked = !!s.showcase_shares_link;
        share.appendChild(shareBox); share.appendChild(document.createTextNode(' Show its Meet link on the public page, so anyone can ask to join'));
        f.appendChild(share);
        var where = el('p', 'small');
        function drawWhere() {
          share.hidden = !openBox.checked;
          where.replaceChildren();
          if (!openBox.checked) return;
          where.appendChild(document.createTextNode('Guests read only when it is, the way in if you share it, and the apps your students chose to show. '));
          var page = el('a', null, 'Its public page'); page.href = '/showcase/?c=' + encodeURIComponent(current.slug);
          where.appendChild(page);
          where.appendChild(document.createTextNode(' appears on Events once the cohort is open or running.'));
        }
        openBox.addEventListener('change', drawWhere);
        drawWhere();
        f.appendChild(where);
      }
      var save = el('button', 'btn-quiet', 'Save week ' + s.number); save.type = 'submit';
      var msg = el('span', 'small');
      var a = el('div', 'actions'); a.appendChild(save); a.appendChild(msg); f.appendChild(a);
      // The run of show (R2): the class builder, opened under each week.
      // Words by Claude, awaiting Ben's review.
      if (window.ShowBuilder && window.ShowLib) {
        var show = el('details', 'show-builder');
        show.appendChild(el('summary', null, 'Run of show for week ' + s.number));
        var showBox = el('div', 'show-box');
        show.appendChild(showBox);
        var mounted = false;
        show.addEventListener('toggle', function () {
          if (!show.open || mounted) return;
          mounted = true;
          window.ShowBuilder.mount(showBox, {
            db: db, cohort: current, session: s, sessions: sessions,
            agenda: window.CohortLib ? window.CohortLib.agenda(current.session_minutes) : [],
            turn: window.LiveLib ? window.LiveLib.TURN : []
          });
        });
        f.appendChild(show);
      }
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var e = f.elements;
        var patch = { title: e.title.value.trim() || null, scope: e.scope.value.trim() || null, meet_url: e.meet_url.value.trim() || null, recording_url: e.recording_url.value.trim() || null };
        if (showcase) { patch.public_showcase = e.public_showcase.checked; patch.showcase_shares_link = e.public_showcase.checked && e.showcase_shares_link.checked; }
        msg.textContent = 'Saving…';
        db.from('sessions').update(patch).eq('id', s.id).then(function (r) { msg.textContent = r.error ? 'Not saved: ' + r.error.message : 'Saved.'; });
      });
      box.appendChild(f);
    });
  }

  // The lesson the cohort sends back to the template (COURSE.md, "What
  // a cohort gives back"), offered once the last session has begun or
  // the cohort is finished. It opens a new issue on GitHub that carries
  // the cohort's title and nothing about anyone. Words by Claude,
  // awaiting Ben's review.
  function drawLesson(c, sessions) {
    var box = $('[data-lesson]');
    if (!box || !window.ShowcaseLib) return;
    box.hidden = !window.ShowcaseLib.lessonTime(c, sessions, new Date());
    $('[data-lesson-link]').href = window.ShowcaseLib.lessonIssueUrl(c.title);
  }

  function personName(e) { return e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone'; }

  // Co-teachers (H1; migration 20261004020000). Anyone in public.teachers
  // can be added; anyone but the cohort's maker can be taken off, and
  // the database refuses to leave a cohort with no teacher. Words by
  // Claude, awaiting Ben's review.
  function drawTeachers() {
    var c = current;
    Promise.all([
      db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', c.id),
      db.from('teachers').select('user_id, profiles(github_login, display_name)')
    ]).then(function (res) {
      if (!current || current.id !== c.id) return;
      var box = $('[data-teachers]');
      box.replaceChildren();
      var form = $('[data-co-teacher-form]');
      if (res[0].error) { box.appendChild(el('li', 'small', 'The teachers could not be read just now.')); form.hidden = true; return; }
      var here = res[0].data;
      var ids = here.map(function (t) { return t.user_id; });
      here.forEach(function (t) {
        var li = el('li');
        li.appendChild(el('strong', null, t.user_id === me.id ? 'You' : personName(t)));
        if (t.user_id === c.created_by) { li.appendChild(el('span', 'small', ' made this cohort')); box.appendChild(li); return; }
        var msg = el('span', 'small'); msg.setAttribute('role', 'status');
        var rm = el('button', 'btn-link', t.user_id === me.id ? 'Step away from this cohort' : 'Take them off');
        rm.type = 'button';
        rm.addEventListener('click', function () {
          if (!rm.hasAttribute('data-armed')) {
            rm.setAttribute('data-armed', '');
            rm.textContent = t.user_id === me.id ? 'Step away: you will no longer teach it' : 'Take ' + personName(t) + ' off this cohort';
            return;
          }
          rm.disabled = true;
          db.from('cohort_teachers').delete().eq('cohort_id', c.id).eq('user_id', t.user_id).select('user_id').then(function (r) {
            rm.disabled = false;
            if (r.error || !r.data.length) { msg.textContent = ' Not removed: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
            if (t.user_id === me.id) { current = null; $('[data-detail]').hidden = true; loadList(); return; }
            drawTeachers();
          });
        });
        li.appendChild(document.createTextNode(' '));
        li.appendChild(rm); li.appendChild(msg);
        box.appendChild(li);
      });
      var choices = (res[1].data || []).filter(function (t) { return ids.indexOf(t.user_id) === -1; });
      var select = $('[data-co-teacher-choices]');
      select.replaceChildren();
      choices.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t.user_id;
        o.textContent = personName(t) + (t.profiles ? ' (@' + t.profiles.github_login + ')' : '');
        select.appendChild(o);
      });
      form.hidden = !choices.length;
    });
  }
  $('[data-co-teacher-form]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, uid = f.user_id.value, msg = $('[data-co-teacher-message]');
    if (!uid || !current) return;
    var btn = f.querySelector('button'); btn.disabled = true;
    db.from('cohort_teachers').insert({ cohort_id: current.id, user_id: uid }).then(function (r) {
      btn.disabled = false;
      msg.textContent = r.error ? 'Not added: ' + r.error.message + '.' : 'Added. They will find the cohort on their own teaching page.';
      if (!r.error) drawTeachers();
    });
  });

  function drawRoster(people) {
    var box = $('[data-roster]');
    box.replaceChildren();
    var here = people.filter(function (p) { return p.status !== 'left'; });
    if (!here.length) { box.appendChild(el('p', 'small', current.status === 'open' ? 'No one has joined yet.' : 'No one has joined yet. People can join once the cohort is open.')); return; }
    var ul = el('ul', 'roster');
    here.forEach(function (p) {
      var li = el('li');
      li.appendChild(el('strong', null, personName(p)));
      if (p.profiles) {
        var gh = el('a', null, ' @' + p.profiles.github_login); gh.href = 'https://github.com/' + encodeURIComponent(p.profiles.github_login);
        li.appendChild(gh);
      }
      if (p.role === 'mentor') li.appendChild(el('span', 'role-tag', 'Mentor'));
      if (p.app_repo) {
        li.appendChild(document.createTextNode(', building '));
        var r = el('a', null, p.app_name || p.app_repo); r.href = 'https://github.com/' + p.app_repo;
        li.appendChild(r);
      }
      if (window.MentorLib && (p.role === 'student' || p.role === 'mentor')) li.appendChild(roleSwitch(p, people));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  // A teacher moves someone between student and mentor (DECISIONS.md,
  // "Alumni"): a mentor has no app to submit, and everyone in the cohort
  // sees the word beside their name. The database lets only this cohort's
  // teachers change it (migration 20261003200000). Its words were written
  // by Claude for G7 and await Ben's review.
  function roleSwitch(p, people) {
    var wrap = el('span', 'roster-role');
    var next = window.MentorLib.otherRole(p.role);
    var b = el('button', 'link', next === 'mentor' ? 'Make them a mentor' : 'Make them a student again');
    b.type = 'button';
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    b.addEventListener('click', function () {
      b.disabled = true;
      db.from('enrollments').update({ role: next }).eq('cohort_id', current.id).eq('user_id', p.user_id).select('role').then(function (r) {
        b.disabled = false;
        if (r.error || !r.data.length) { msg.textContent = ' Not changed: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
        p.role = r.data[0].role;
        drawRoster(people);
      });
    });
    wrap.appendChild(document.createTextNode(' '));
    wrap.appendChild(b); wrap.appendChild(msg);
    return wrap;
  }

  // ---- their apps on humanshaped.org --------------------------------
  // Who has submitted (their own "it is ready", with a repository and a
  // live address), and, as the cohort nears its end, who has not yet, by
  // name, for the cohort's teachers alone (SubmitLib). A teacher can keep
  // a submitted app off /apps/ with a reason the student reads, and show
  // it again; the student's own switch is never touched. Before app_hides
  // exists, the lists still draw, without the hide controls.
  function loadSubmissions(people, sessions) {
    var box = $('[data-submissions]');
    box.replaceChildren();
    say('[data-submissions-intro]', '');
    if (!window.SubmitLib) return;
    db.from('app_hides').select('user_id, reason, hidden_at').eq('cohort_id', current.id).then(function (r) {
      drawSubmissions(people, sessions, r.error ? null : r.data);
    });
  }

  function drawSubmissions(people, sessions, hides) {
    var S = window.SubmitLib;
    var box = $('[data-submissions]');
    box.replaceChildren();
    var win = S.submissionWindow(current, sessions, new Date());
    var view = S.teacherView(people, hides || []);
    var opens = win.opensAt ? new Date(win.opensAt).toLocaleDateString(undefined, { timeZone: current.time_zone, month: 'long', day: 'numeric' }) : null;
    say('[data-submissions-intro]', win.open
      ? 'An app goes up on humanshaped.org/apps/ when its builder says it is ready, and every app in the cohort is up by the time the cohort ends. Who has not submitted yet is listed here for you alone, so that you can reach out.'
      : 'An app goes up on humanshaped.org/apps/ when its builder says it is ready, and every app in the cohort is up by the time the cohort ends. ' +
        (opens ? 'From ' + opens + ', a week before the last session,' : 'A week before the last session,') +
        ' this also lists who has not submitted yet, for you alone, so that you can reach out.');
    if (!view.submitted.length && !view.notYet.length) { box.appendChild(el('p', 'small', 'Apps appear here once people join.')); return; }

    if (view.submitted.length) {
      box.appendChild(el('p', 'kicker', 'Submitted'));
      var ul = el('ul', 'submissions');
      view.submitted.forEach(function (row) { ul.appendChild(submissionItem(row, hides, true)); });
      box.appendChild(ul);
    } else {
      box.appendChild(el('p', 'small', 'No one has said their app is ready yet.'));
    }

    // Not yet: everyone, once the window is open; before then, only an
    // app that a teacher has hidden, so the hide can still be lifted.
    var notYet = win.open ? view.notYet : view.notYet.filter(function (row) { return row.hide; });
    if (notYet.length) {
      box.appendChild(el('p', 'kicker', win.open ? 'Not submitted yet' : 'Hidden, and not submitted'));
      var ul2 = el('ul', 'submissions');
      notYet.forEach(function (row) { ul2.appendChild(submissionItem(row, hides, false)); });
      box.appendChild(ul2);
    }
  }

  function submissionItem(row, hides, submitted) {
    var S = window.SubmitLib;
    var p = row.person;
    var li = el('li', 'submission');
    var who = el('p', 'who-line');
    who.appendChild(document.createTextNode(personName(p)));
    if (p.app_repo) {
      who.appendChild(document.createTextNode(', '));
      var a = el('a', null, p.app_name || p.app_repo); a.href = 'https://github.com/' + p.app_repo;
      who.appendChild(a);
    }
    li.appendChild(who);
    var status = el('p', 'small');
    if (!submitted) status.textContent = 'Still needs ' + S.missingText(row.missing, 'teacher') + '.';
    else if (!row.hide) status.textContent = 'Shown on humanshaped.org/apps/.';
    if (status.textContent) li.appendChild(status);
    if (row.hide) {
      var hid = el('p', 'small');
      hid.textContent = 'Kept off humanshaped.org/apps/' + (row.hide.reason ? ', with the reason they read: \u201c' + row.hide.reason + '\u201d' : ', with no reason given.');
      li.appendChild(hid);
    }
    if (!hides) return li;   // the hide is not in this database yet
    var msg = el('p', 'small');
    var actions = el('div', 'actions');
    li.appendChild(actions);

    if (row.hide) {
      var showBtn = el('button', 'btn-quiet', 'Show it again'); showBtn.type = 'button';
      actions.appendChild(showBtn);
      li.appendChild(msg);
      showBtn.addEventListener('click', function () {
        if (!showBtn.hasAttribute('data-armed')) {
          showBtn.setAttribute('data-armed', '');
          showBtn.textContent = 'Show it again, for anyone to see';
          msg.textContent = submitted
            ? 'It goes back on humanshaped.org/apps/ and the feed. Click again to show it.'
            : 'It goes back on humanshaped.org/apps/ once its builder says it is ready. Click again to lift the hide.';
          return;
        }
        showBtn.disabled = true;
        db.from('app_hides').delete().eq('cohort_id', current.id).eq('user_id', p.user_id).select('user_id').then(function (r) {
          showBtn.disabled = false;
          if (r.error || !r.data.length) { msg.textContent = 'It was not changed: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
          openCohort(current.id);
        });
      });
      return li;
    }
    if (!submitted) { li.removeChild(actions); return li; }

    var hideBtn = el('button', 'btn-quiet', 'Keep it off /apps/'); hideBtn.type = 'button';
    actions.appendChild(hideBtn);
    var f = el('form', 'inline-form'); f.hidden = true;
    var l = el('label', null, 'Why, in a sentence they will read (you may leave it empty)');
    var input = el('input'); input.maxLength = 500;
    l.appendChild(input); f.appendChild(l);
    f.appendChild(el('p', 'small', 'It stays on the cohort’s own pages for everyone in the cohort, and their own word that it is ready stays as it is.'));
    var go = el('button', 'btn-quiet', 'Keep it off /apps/ now'); go.type = 'submit';
    var cancel = el('button', 'btn-quiet', 'Leave it shown'); cancel.type = 'button';
    var fa = el('div', 'actions'); fa.appendChild(go); fa.appendChild(cancel); f.appendChild(fa);
    li.appendChild(f);
    li.appendChild(msg);
    hideBtn.addEventListener('click', function () { actions.hidden = true; f.hidden = false; input.focus(); });
    cancel.addEventListener('click', function () { f.hidden = true; actions.hidden = false; msg.textContent = ''; });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      go.disabled = true;
      db.from('app_hides').insert({ cohort_id: current.id, user_id: p.user_id, hidden_by: me.id, reason: input.value.trim() || null }).then(function (r) {
        go.disabled = false;
        if (r.error) { msg.textContent = 'It was not hidden: ' + r.error.message; return; }
        openCohort(current.id);
      });
    });
    return li;
  }

  function drawGroups(groups, people) {
    var box = $('[data-groups]');
    box.replaceChildren();
    var here = people.filter(function (p) { return p.status !== 'left'; });
    if (!groups.length) { box.appendChild(el('p', 'small', 'No groups yet.')); return; }
    groups.forEach(function (g) {
      var card = el('article', 'cohort-card');
      card.appendChild(el('h4', null, g.name));
      if (g.expectations) card.appendChild(el('p', 'small', g.expectations));
      var members = g.group_members.map(function (m) { return m.user_id; });
      here.forEach(function (p) {
        var l = el('label', 'check');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = members.indexOf(p.user_id) !== -1;
        cb.addEventListener('change', function () {
          var q = cb.checked
            ? db.from('group_members').insert({ group_id: g.id, user_id: p.user_id })
            : db.from('group_members').delete().eq('group_id', g.id).eq('user_id', p.user_id);
          q.then(function (r) { if (r.error) { cb.checked = !cb.checked; say('[data-detail-message]', 'That change was not saved: ' + r.error.message); } });
        });
        l.appendChild(cb); l.appendChild(document.createTextNode(' ' + personName(p)));
        card.appendChild(l);
      });
      if (!here.length) card.appendChild(el('p', 'small', 'People will appear here as they join.'));
      // The group's own Meet room, once the database has the column.
      if ('meet_url' in g) card.appendChild(roomForm(g));
      box.appendChild(card);
    });
  }

  function roomForm(g) {
    var f = el('form', 'inline-form group-room');
    var l = el('label', null, 'Its own Meet room');
    // The line setupCohort prints: the link, and the room's spaces/ name
    // when meet@ made it through the Meet REST API (RoomsLib.parseRoomLine).
    var hasSpace = 'meet_space' in g && window.RoomsLib;
    var input = el('input'); input.type = hasSpace ? 'text' : 'url'; input.placeholder = 'https://meet.google.com/…'; input.maxLength = 620;
    input.value = (g.meet_url || '') + (hasSpace && g.meet_space ? ' | ' + g.meet_space : '');
    l.appendChild(input); f.appendChild(l);
    var save = el('button', 'btn-quiet', 'Save the room'); save.type = 'submit';
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var a = el('div', 'actions'); a.appendChild(save); a.appendChild(msg); f.appendChild(a);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var url = input.value.trim(), patch = { meet_url: url || null };
      if (hasSpace) {
        var parsed = window.RoomsLib.parseRoomLine(url);
        if (parsed.error) { msg.textContent = parsed.error; return; }
        url = parsed.url; patch = { meet_url: parsed.url, meet_space: parsed.space };
      } else if (url && !/^https:\/\//.test(url)) { msg.textContent = 'A Meet link starts with https://.'; return; }
      msg.textContent = 'Saving…';
      db.from('groups').update(patch).eq('id', g.id).select('id').then(function (r) {
        msg.textContent = r.error || !r.data.length ? 'Not saved: ' + (r.error ? r.error.message : 'the database refused') + '.' : (url ? 'Saved.' : 'Removed.');
        if (!r.error && r.data.length) Object.assign(g, patch);
      });
    });
    return f;
  }

  $('[data-group-form]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target.elements;
    db.from('groups').insert({ cohort_id: current.id, name: f.name.value.trim(), expectations: f.expectations.value.trim() || null }).then(function (r) {
      if (r.error) return say('[data-detail-message]', 'The group could not be added: ' + r.error.message);
      ev.target.reset();
      openCohort(current.id);
    });
  });

  // ---- the credential -----------------------------------------------
  // For a finished cohort, each person who stayed: record their
  // credential once the teacher has opened the evidence, copy the signing
  // request for the signing tool, attach the signed file when it comes
  // back (checked here first), and revoke it if that is ever needed. The
  // database decides who may do each of these (migration 20261003070000).
  var cred = window.CredentialLib;
  function drawCredentials(people, result) {
    var finished = current.status === 'finished';
    $('[data-credentials-later]').hidden = finished;
    $('[data-credentials]').hidden = !finished;
    if (!finished || !cred) return;
    var box = $('[data-credential-list]');
    box.replaceChildren();
    if (result.error) { box.appendChild(el('p', 'small error', 'The credentials could not be loaded: ' + result.error.message)); return; }
    var here = people.filter(function (p) { return p.status !== 'left'; });
    if (!here.length) { box.appendChild(el('p', 'small', 'No one stayed in this cohort to the end.')); return; }
    here.forEach(function (p) {
      var mine = result.data.filter(function (r) { return r.user_id === p.user_id; });
      box.appendChild(credentialCard(p, cred.recordState(mine)));
    });
  }

  function linkList(items) {
    var ul = el('ul', 'links');
    items.forEach(function (x) {
      var li = el('li'); var a = el('a', null, x[0]); a.href = x[1]; a.rel = 'noopener';
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }

  function credentialCard(p, now) {
    var card = el('article', 'cohort-card credential-person');
    card.appendChild(el('p', 'who-line', personName(p) + (p.profiles ? ' (@' + p.profiles.github_login + ')' : '')));
    var status = el('p', 'small');
    card.appendChild(status);
    var msg = el('p', 'small');
    var rec = now.record;
    var day = function (iso) { return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); };

    if (now.state === 'waiting' || now.state === 'signed') {
      var links = [['The repository', 'https://github.com/' + rec.evidence_repo], ['On the web', rec.app_url]];
      (rec.platforms || []).slice(1).forEach(function (id) {
        links.push(['On ' + cred.platform(id).label, (rec.platform_links || {})[id]]);
      });
      card.appendChild(linkList(links));
    }

    if (now.state === 'signed') {
      status.textContent = cred.levelName(cred.levelFor(rec.platforms)) + '. Signed on ' + day(rec.signed_at) + ', and public at its own page, which the holder can share.';
      var actions = el('div', 'actions');
      var open = el('a', 'btn-quiet', 'Open its page'); open.href = '/credential/?id=' + rec.id;
      actions.appendChild(open);
      var revoke = el('button', 'btn-quiet danger', 'Revoke it'); revoke.type = 'button';
      actions.appendChild(revoke);
      card.appendChild(actions);
      var why = el('label', null, 'Why, for the record (only the cohort’s teachers and the holder read it)');
      var whyInput = el('input'); whyInput.maxLength = 500; why.appendChild(whyInput);
      var whyForm = el('div', 'inline-form'); whyForm.appendChild(why); whyForm.hidden = true;
      card.appendChild(whyForm);
      revoke.addEventListener('click', function () {
        if (!revoke.hasAttribute('data-armed')) {
          revoke.setAttribute('data-armed', '');
          revoke.textContent = 'Revoke it for good';
          whyForm.hidden = false;
          msg.textContent = 'Its page will say it was revoked, and it will no longer open finished cohorts. Revoking cannot be undone, and a higher level is issued as a new credential afterwards. Click again to revoke.';
          return;
        }
        revoke.disabled = true;
        db.from('credentials').update({ revoked_at: new Date().toISOString(), revoked_reason: whyInput.value.trim() || null }).eq('id', rec.id).select('id').then(function (r) {
          revoke.disabled = false;
          if (r.error || !r.data.length) { msg.textContent = 'It was not revoked: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
          openCohort(current.id);
        });
      });
      card.appendChild(msg);
      return card;
    }

    if (now.state === 'waiting') {
      status.textContent = cred.levelName(cred.levelFor(rec.platforms)) + '. Recorded on ' + day(rec.issued_at) + ', and waiting to be signed.';
      var request = cred.requestFromRecord(rec, p.profiles || { github_login: '' }, current);
      var acts = el('div', 'actions');
      var copy = el('button', 'btn-quiet', 'Copy what the signing tool needs'); copy.type = 'button';
      var pick = el('label', 'btn-quiet file-pick', 'Attach the signed file');
      var file = el('input'); file.type = 'file'; file.accept = '.json,application/json,application/ld+json';
      pick.appendChild(file);
      var remove = el('button', 'btn-quiet danger', 'Remove this record'); remove.type = 'button';
      acts.appendChild(copy); acts.appendChild(pick); acts.appendChild(remove);
      card.appendChild(acts);
      var shown = el('textarea', 'signing-request'); shown.readOnly = true; shown.rows = 8; shown.hidden = true;
      shown.value = JSON.stringify(request, null, 2);
      card.appendChild(shown);
      card.appendChild(msg);

      copy.addEventListener('click', function () {
        var done = function () { msg.textContent = 'Copied. On the signer’s computer, run: pbpaste | node tools/credential/sign.mjs --key <the key file> > signed.json, then attach signed.json here.'; };
        var fallback = function () { shown.hidden = false; shown.select(); msg.textContent = 'Copy the text above, then give it to the signing tool.'; };
        if (navigator.clipboard) navigator.clipboard.writeText(shown.value).then(done, fallback); else fallback();
      });

      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        msg.textContent = 'Checking the signed file…';
        f.text().then(function (text) {
          var doc;
          try { doc = JSON.parse(text); } catch (e) { throw new Error('That file is not JSON.'); }
          if (!cred.matchesRow(doc, request)) throw new Error('That file is not the signed credential for this record. Its words or links differ from what was recorded here.');
          return window.CredentialCheck.check(doc).then(function (r) {
            if (!r.ok) throw new Error('Its signature does not check out. ' + r.reason);
            return db.from('credentials').update({ signed: doc }).eq('id', rec.id).select('id');
          });
        }).then(function (r) {
          if (r.error || !r.data.length) throw new Error('It was not saved: ' + (r.error ? r.error.message : 'the database refused') + '.');
          openCohort(current.id);
        }).catch(function (err) { msg.textContent = err.message; file.value = ''; });
      });

      remove.addEventListener('click', function () {
        if (!remove.hasAttribute('data-armed')) {
          remove.setAttribute('data-armed', '');
          remove.textContent = 'Remove it, before it is signed';
          msg.textContent = 'For a record made by mistake. Click again to remove it.';
          return;
        }
        remove.disabled = true;
        db.from('credentials').delete().eq('id', rec.id).select('id').then(function (r) {
          remove.disabled = false;
          if (r.error || !r.data.length) { msg.textContent = 'It was not removed: ' + (r.error ? r.error.message : 'the database refused') + '.'; return; }
          openCohort(current.id);
        });
      });
      return card;
    }

    // Nothing live yet (or only a revoked one): offer to record it.
    var before = now.state === 'revoked' ? 'Their last credential was revoked on ' + day(rec.revoked_at) + '. ' : '';
    if (!p.app_repo || !/^https:\/\//.test(p.app_url || '')) {
      status.textContent = before + 'Waiting for their repository and the live address of their app, which they add on the cohort page.';
      return card;
    }
    status.textContent = before + 'Not issued yet.';
    card.appendChild(linkList([['The repository', 'https://github.com/' + p.app_repo], ['On the web', p.app_url]]));
    var start = el('button', 'btn-quiet', 'Issue the credential'); start.type = 'button';
    var startRow = el('div', 'actions'); startRow.appendChild(start); card.appendChild(startRow);

    var f = el('form', 'inline-form'); f.hidden = true;
    var set = el('fieldset', 'platform-choices');
    set.appendChild(el('legend', null, 'Where else it is published, if anywhere'));
    var inputs = {};
    cred.PLATFORMS.slice(1).forEach(function (pl) {
      var l = el('label', 'check');
      var cb = el('input'); cb.type = 'checkbox';
      l.appendChild(cb); l.appendChild(document.createTextNode(' ' + pl.label));
      var url = el('input'); url.type = 'url'; url.placeholder = 'https:// where people get it'; url.hidden = true;
      url.setAttribute('aria-label', 'Where people get it on ' + pl.label);
      cb.addEventListener('change', function () { url.hidden = !cb.checked; url.required = cb.checked; level(); if (cb.checked) url.focus(); });
      set.appendChild(l); set.appendChild(url);
      inputs[pl.id] = { cb: cb, url: url };
    });
    f.appendChild(set);
    var levelLine = el('p', 'small');
    f.appendChild(levelLine);
    var sure = el('label', 'check');
    var sureBox = el('input'); sureBox.type = 'checkbox'; sureBox.required = true;
    sure.appendChild(sureBox); sure.appendChild(document.createTextNode(' I opened the repository and every link, and they show this person’s own work.'));
    f.appendChild(sure);
    var save = el('button', 'btn-quiet', 'Record the credential'); save.type = 'submit';
    var cancel = el('button', 'btn-quiet', 'Not now'); cancel.type = 'button';
    var fa = el('div', 'actions'); fa.appendChild(save); fa.appendChild(cancel); f.appendChild(fa);
    card.appendChild(f);
    card.appendChild(msg);

    function chosen() {
      var platforms = ['web'], links = {};
      cred.PLATFORMS.slice(1).forEach(function (pl) {
        if (inputs[pl.id].cb.checked) { platforms.push(pl.id); links[pl.id] = inputs[pl.id].url.value.trim(); }
      });
      return { platforms: platforms, links: links };
    }
    function level() { levelLine.textContent = 'This is level ' + chosen().platforms.length + ': ' + cred.levelName(chosen().platforms.length) + '.'; }
    level();
    start.addEventListener('click', function () { startRow.hidden = true; f.hidden = false; });
    cancel.addEventListener('click', function () { f.hidden = true; startRow.hidden = false; msg.textContent = ''; });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var c = chosen();
      var draft = {
        credential: '00000000-0000-4000-8000-000000000000', issued_at: new Date().toISOString(),
        person: { github_login: p.profiles ? p.profiles.github_login : '' }, app: { repo: p.app_repo, url: p.app_url },
        platforms: c.platforms, links: c.links
      };
      var wrong = cred.problems(draft);
      if (wrong.length) { msg.textContent = wrong.join(' '); return; }
      save.disabled = true;
      msg.textContent = 'Recording…';
      db.from('credentials').insert({
        user_id: p.user_id, cohort_id: current.id, issued_by: me.id,
        platforms: c.platforms, platform_links: c.links,
        evidence_repo: p.app_repo, app_name: p.app_name || null, app_url: p.app_url
      }).select('id').then(function (r) {
        save.disabled = false;
        if (r.error) { msg.textContent = 'It was not recorded: ' + r.error.message; return; }
        openCohort(current.id);
      });
    });
    return card;
  }

  // ---- asking to teach ----------------------------------------------
  // Someone who does not teach yet sees the request form, or their own
  // request and its answer. The database decides who may read and
  // change what (teacher_requests in supabase/migrations).
  var myRequest = null;
  var askForm = $('[data-ask-form]');
  function loadMyRequest() {
    return db.from('teacher_requests').select('*').eq('user_id', me.id).maybeSingle().then(function (r) {
      if (r.error) return fail('Your request to teach could not be loaded: ' + r.error.message);
      myRequest = r.data;
      drawMyRequest();
    });
  }
  function drawMyRequest() {
    var state = lib.requestState(false, myRequest);
    if (state === 'ask') {
      askForm.reset();
      $('[data-ask-cancel]').hidden = true;
      say('[data-ask-submit]', 'Send my request');
      say('[data-ask-message]', '');
      show('ask');
      if (location.hash === '#ask') $('#ask').scrollIntoView();
      return;
    }
    var waiting = state === 'waiting';
    say('[data-asked-status]', waiting
      ? 'Your request is waiting for an answer, which will appear here. Until then, you can change its words or take it back.'
      : 'Your request has an answer, and it was not a yes this time. Taking the request back clears it, so that you can ask again later.');
    say('[data-asked-why]', myRequest.why);
    say('[data-asked-brings]', myRequest.brings || '');
    $('[data-asked-brings-box]').hidden = !myRequest.brings;
    say('[data-asked-reply]', myRequest.reply || '');
    $('[data-asked-reply-box]').hidden = !myRequest.reply;
    $('[data-asked-edit]').hidden = !waiting;
    var w = $('[data-asked-withdraw]');
    w.textContent = 'Take it back';
    w.removeAttribute('data-armed');
    say('[data-asked-message]', '');
    show('asked');
  }
  askForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = askForm.elements;
    var row = { why: f.why.value.trim(), brings: f.brings.value.trim() || null };
    if (!row.why) return say('[data-ask-message]', 'Say a little about why you would like to teach, and then send it.');
    var editing = !!myRequest;
    var q = editing
      ? db.from('teacher_requests').update(Object.assign({ updated_at: new Date().toISOString() }, row)).eq('user_id', me.id).select().single()
      : db.from('teacher_requests').insert(Object.assign({ user_id: me.id }, row)).select().single();
    say('[data-ask-message]', 'Sending…');
    q.then(function (r) {
      if (r.error) return say('[data-ask-message]', 'It could not be sent: ' + r.error.message);
      myRequest = r.data;
      drawMyRequest();
    });
  });
  $('[data-asked-edit]').addEventListener('click', function () {
    var f = askForm.elements;
    f.why.value = myRequest.why;
    f.brings.value = myRequest.brings || '';
    $('[data-ask-cancel]').hidden = false;
    say('[data-ask-submit]', 'Save the changes');
    say('[data-ask-message]', '');
    show('ask');
    f.why.focus();
  });
  $('[data-ask-cancel]').addEventListener('click', drawMyRequest);
  // Taking a request back asks once more on the page itself.
  $('[data-asked-withdraw]').addEventListener('click', function () {
    var b = this;
    if (!b.hasAttribute('data-armed')) {
      b.setAttribute('data-armed', '');
      b.textContent = 'Take my request back';
      say('[data-asked-message]', 'Its words will be deleted. Click again to take it back.');
      return;
    }
    b.disabled = true;
    db.from('teacher_requests').delete().eq('user_id', me.id).select('user_id').then(function (r) {
      b.disabled = false;
      if (r.error || !r.data.length) return say('[data-asked-message]', 'It could not be taken back: ' + (r.error ? r.error.message : 'no request was found') + '.');
      myRequest = null;
      drawMyRequest();
    });
  });

  // People who can approve teachers see every waiting request, with a
  // place to answer, an approve button that asks once more on the page,
  // and a decline button.
  function loadRequests() {
    var wrap = $('[data-requests]');
    return db.from('teacher_requests')
      .select('user_id, why, brings, state, created_at, profiles!teacher_requests_user_id_fkey(github_login, display_name)')
      .eq('state', 'waiting').then(function (r) {
        var box = $('[data-request-list]');
        wrap.hidden = false;
        if (r.error) { box.replaceChildren(el('p', 'small error', 'The requests to teach could not be loaded: ' + r.error.message)); return; }
        var waiting = lib.waitingRequests(r.data);
        box.replaceChildren();
        if (!waiting.length) { box.appendChild(el('p', 'small', 'No one is waiting to hear about teaching right now.')); return; }
        waiting.forEach(function (q) { box.appendChild(requestCard(q)); });
      });
  }
  function requestCard(q) {
    var p = q.profiles || {};
    var login = p.github_login || 'someone';
    var card = el('article', 'cohort-card share');
    var who = el('p', 'kicker');
    var gh = el('a', null, p.display_name ? p.display_name + ' (@' + login + ')' : '@' + login);
    gh.href = 'https://github.com/' + encodeURIComponent(login);
    who.appendChild(gh);
    who.appendChild(document.createTextNode(' asks to teach'));
    card.appendChild(who);
    card.appendChild(el('p', 'small', 'Asked ' + new Date(q.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.'));
    card.appendChild(el('p', null, q.why));
    if (q.brings) {
      card.appendChild(el('p', 'small', 'What they would bring'));
      card.appendChild(el('p', null, q.brings));
    }
    var form = el('form', 'inline-form');
    var label = el('label', null, 'Your answer, which they will read');
    var input = el('textarea'); input.rows = 3; input.maxLength = 2000;
    label.appendChild(input); form.appendChild(label);
    var approve = el('button', 'btn-quiet', 'Approve'); approve.type = 'submit';
    var decline = el('button', 'btn-quiet danger', 'Decline'); decline.type = 'button';
    var msg = el('p', 'small');
    var actions = el('div', 'actions'); actions.appendChild(approve); actions.appendChild(decline);
    form.appendChild(actions); form.appendChild(msg);
    function decide(yes) {
      approve.disabled = decline.disabled = true;
      db.rpc('decide_teacher_request', { person: q.user_id, approve: yes, answer: input.value.trim() || null }).then(function (r) {
        approve.disabled = decline.disabled = false;
        if (r.error) { msg.textContent = 'That was not saved: ' + r.error.message; return; }
        loadRequests();
      });
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!approve.hasAttribute('data-armed')) {
        approve.setAttribute('data-armed', '');
        approve.textContent = 'Approve, and make @' + login + ' a teacher';
        msg.textContent = 'They will be able to make and run cohorts of their own. Click again to approve.';
        return;
      }
      decide(true);
    });
    decline.addEventListener('click', function () { decide(false); });
    card.appendChild(form);
    return card;
  }

  // ---- signing, for a signer (migration 20261004040000) --------------
  // Every credential waiting to be signed, across cohorts. The signer
  // copies its request, signs it on the computer that holds the key
  // (tools/credential/sign-waiting.mjs), and pastes or chooses the signed
  // file, which is checked here before the database takes it.
  function loadSigning() {
    var wrap = $('[data-signing]');
    if (!cred) return Promise.resolve();
    return db.rpc('credentials_to_sign').then(function (r) {
      var box = $('[data-signing-list]');
      wrap.hidden = false;
      if (r.error) { box.replaceChildren(el('p', 'small error', 'What is waiting to be signed could not be loaded: ' + r.error.message)); return; }
      box.replaceChildren();
      if (!r.data.length) { box.appendChild(el('p', 'small', 'Nothing is waiting to be signed right now.')); return; }
      r.data.forEach(function (w) { box.appendChild(signingCard(w)); });
    });
  }
  function signingCard(w) {
    var card = el('article', 'cohort-card credential-person');
    var who = (w.display_name ? w.display_name + ' (@' + w.github_login + ')' : '@' + w.github_login);
    card.appendChild(el('p', 'who-line', who + ', ' + w.cohort_title));
    card.appendChild(el('p', 'small', cred.levelName(cred.levelFor(w.platforms)) + '. Recorded on ' +
      new Date(w.issued_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '.'));
    var links = [['The repository', 'https://github.com/' + w.evidence_repo], ['On the web', w.app_url]];
    (w.platforms || []).slice(1).forEach(function (id) { links.push(['On ' + cred.platform(id).label, (w.platform_links || {})[id]]); });
    card.appendChild(linkList(links));
    var request = cred.requestFromWaiting(w);
    var msg = el('p', 'small'); msg.setAttribute('role', 'status');
    var copy = el('button', 'btn-quiet', 'Copy the signing request'); copy.type = 'button';
    var shown = el('textarea', 'signing-request'); shown.readOnly = true; shown.rows = 8; shown.hidden = true;
    shown.value = JSON.stringify(request, null, 2);
    copy.addEventListener('click', function () {
      var done = function () { msg.textContent = 'Copied. Now run ' + cred.SIGN_COMMAND + ' in the site folder, and paste what it puts on your clipboard below.'; };
      var fallback = function () { shown.hidden = false; shown.select(); msg.textContent = 'Copy the text above, then give it to the signing tool.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(shown.value).then(done, fallback); else fallback();
    });
    var form = el('form', 'inline-form');
    var label = el('label', null, 'The signed file');
    var pasted = el('textarea'); pasted.rows = 4; pasted.placeholder = 'Paste the signed credential here';
    label.appendChild(pasted); form.appendChild(label);
    var pick = el('label', 'btn-quiet file-pick', 'Or choose the file');
    var file = el('input'); file.type = 'file'; file.accept = '.json,application/json,application/ld+json';
    pick.appendChild(file);
    var save = el('button', 'btn-quiet', 'Check and attach it'); save.type = 'submit';
    var acts = el('div', 'actions'); acts.appendChild(copy); acts.appendChild(save); acts.appendChild(pick);
    form.appendChild(acts);
    function attach(text) {
      save.disabled = true;
      msg.textContent = 'Checking the signature…';
      Promise.resolve().then(function () {
        var doc = cred.readSigned(text);
        if (!cred.matchesRow(doc, request)) throw new Error('That file is not the signed credential for this record. Its words or links differ from what was recorded.');
        return window.CredentialCheck.check(doc).then(function (c) {
          if (!c.ok) throw new Error('Its signature does not check out. ' + c.reason);
          return db.rpc('attach_signed_credential', { credential: w.id, file: doc });
        });
      }).then(function (r) {
        if (r.error) throw new Error('It was not saved: ' + r.error.message);
        card.replaceChildren(el('p', 'who-line', who + ', ' + w.cohort_title),
          el('p', 'small', 'Signed and saved. Its holder can find it on their account page now.'));
      }).catch(function (err) { msg.textContent = err.message; save.disabled = false; file.value = ''; });
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); attach(pasted.value); });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (f) f.text().then(attach); });
    card.appendChild(form);
    card.appendChild(shown);
    card.appendChild(msg);
    return card;
  }

  // ---- start --------------------------------------------------------
  function load() {
    show('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) return show('signed-out');
      me = session.user;
      // Every column, so can_sign comes along once the database has it.
      return db.from('teachers').select('*').eq('user_id', me.id).maybeSingle().then(function (r) {
        if (r.error) return fail('Your teaching access could not be checked: ' + r.error.message);
        if (!r.data) return loadMyRequest();
        show('teacher');
        var jobs = [loadList(), loadQueue()];
        if (r.data.can_approve) jobs.push(loadRequests());
        if (r.data.can_sign) jobs.push(loadSigning());
        return Promise.all(jobs);
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }
  $('[data-reload]').addEventListener('click', load);
  load();
})();
