// The teacher page (/teach/). Every rule about who may do what is
// enforced by the database; this page only asks for it.
(function () {
  var root = document.querySelector('[data-teach]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.TeachLib;
  var me = null;
  var current = null;
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
    form.hidden = false;
    $('[data-detail]').hidden = true;
    f.title.focus();
  }
  $('[data-new-cohort]').addEventListener('click', function () { fillForm(null); });
  $('[data-cancel]').addEventListener('click', function () { form.hidden = true; if (current) $('[data-detail]').hidden = false; });
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
      conversations_open: f.conversations_open.checked
    };
    var q = editing
      ? db.from('cohorts').update(row).eq('id', editing).select().single()
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
      db.from('enrollments').select('user_id, role, status, app_name, app_repo, app_url, profiles(github_login, display_name)').eq('cohort_id', id),
      db.from('groups').select('id, name, expectations, group_members(user_id)').eq('cohort_id', id).order('name')
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) return fail('This cohort could not be loaded: ' + bad.error.message);
      current = res[0].data;
      var c = current;
      say('[data-detail-title]', c.title);
      var meta = [statusText(c.status)];
      if (c.session_weekday != null && c.session_time) meta.push(DAYS[c.session_weekday] + 's at ' + c.session_time.slice(0, 5) + ' ' + c.time_zone + ', ' + c.session_minutes + ' minutes');
      if (c.starts_on) meta.push(c.weeks + ' weeks from ' + c.starts_on);
      say('[data-detail-meta]', meta.join('. ') + '.');
      say('[data-detail-message]', '');
      drawSessions(res[1].data);
      drawRoster(res[2].data, res[3].data);
      drawGroups(res[3].data, res[2].data);
      form.hidden = true;
      $('[data-detail]').hidden = false;
    });
  }
  $('[data-edit]').addEventListener('click', function () { fillForm(current); });

  $('[data-make-sessions]').addEventListener('click', function () {
    var rows = lib.sessionRows(current);
    if (!rows) return say('[data-detail-message]', 'Set the first day, the session day, and the time first, and the sessions will follow from them.');
    db.from('sessions').upsert(rows, { onConflict: 'cohort_id,number' }).then(function (r) {
      if (r.error) return say('[data-detail-message]', 'The sessions could not be made: ' + r.error.message);
      say('[data-detail-message]', rows.length + ' weekly sessions are set. Changing the dates later and making them again keeps what you wrote in each.');
      openCohort(current.id);
    });
  });

  $('[data-copy-meet]').addEventListener('click', function () {
    db.from('calendar_contacts').select('email').eq('cohort_id', current.id).then(function (r) {
      if (r.error) return say('[data-detail-message]', 'The emails could not be read: ' + r.error.message);
      var setup = lib.meetSetup(current, r.data.map(function (x) { return x.email; }), []);
      var text = JSON.stringify(setup, null, 2);
      var done = function () { say('[data-detail-message]', 'Copied. Paste it into the Meet events script as this cohort’s setup, and add your own email under "teachers". ' + r.data.length + ' people have given an email for invitations.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this setup:', text); });
      else window.prompt('Copy this setup:', text);
    });
  });

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
      var save = el('button', 'btn-quiet', 'Save week ' + s.number); save.type = 'submit';
      var msg = el('span', 'small');
      var a = el('div', 'actions'); a.appendChild(save); a.appendChild(msg); f.appendChild(a);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var e = f.elements;
        var patch = { title: e.title.value.trim() || null, scope: e.scope.value.trim() || null, meet_url: e.meet_url.value.trim() || null, recording_url: e.recording_url.value.trim() || null };
        msg.textContent = 'Saving…';
        db.from('sessions').update(patch).eq('id', s.id).then(function (r) { msg.textContent = r.error ? 'Not saved: ' + r.error.message : 'Saved.'; });
      });
      box.appendChild(f);
    });
  }

  function personName(e) { return e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone'; }

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
      if (p.app_repo) {
        li.appendChild(document.createTextNode(', building '));
        var r = el('a', null, p.app_name || p.app_repo); r.href = 'https://github.com/' + p.app_repo;
        li.appendChild(r);
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
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
      box.appendChild(card);
    });
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

  // ---- start --------------------------------------------------------
  function load() {
    show('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) return show('signed-out');
      me = session.user;
      return db.from('teachers').select('user_id').eq('user_id', me.id).maybeSingle().then(function (r) {
        if (r.error) return fail('Your teaching access could not be checked: ' + r.error.message);
        if (!r.data) return show('not-teacher');
        show('teacher');
        return Promise.all([loadList(), loadQueue()]);
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }
  $('[data-reload]').addEventListener('click', load);
  load();
})();
