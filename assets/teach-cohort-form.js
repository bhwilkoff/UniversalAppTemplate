// Planning a new cohort (/teach/new/) or changing one's details
// (/teach/cohort/edit/?c=<id>; PAGES.md). Saving opens the cohort.
(function () {
  var root = document.querySelector('[data-teach-cohort-form]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib || !window.TeachPage) return;
  var P = window.TeachPage;
  var editId = new URLSearchParams(location.search).get('c');
  var db = null, me = null;

  function $(sel) { return root.querySelector(sel); }
  function say(sel, text) { $(sel).textContent = text || ''; }

  // Offer every time zone the browser knows.
  try {
    var zones = Intl.supportedValuesOf('timeZone');
    var list = $('[data-zones]');
    zones.forEach(function (z) { var o = document.createElement('option'); o.value = z; list.appendChild(o); });
  } catch (e) { /* older browsers: the field still takes typed text */ }

  // ---- the form -----------------------------------------------------
  // Every answer changes how the cohort runs. The address is made from the
  // name until the teacher changes it, and a preview shows the cohort as
  // /cohorts/ will list it.
  var form = $('[data-cohort-form]');
  var editing = null, slugTouched = false;
  var TL = window.TeachLib;
  function showSlug() {
    var f = form.elements, slug = f.slug.value;
    $('[data-slug-show]').textContent = slug || '…';
  }
  function drawPreview() {
    var f = form.elements;
    var c = {
      title: f.title.value.trim(), description: f.description.value.trim(), starts_on: f.starts_on.value || null,
      weeks: Number(f.weeks.value) || 5, capacity: f.capacity.value ? Number(f.capacity.value) : null,
      session_weekday: f.session_weekday.value === '' ? null : Number(f.session_weekday.value),
      session_time: f.session_time.value || null, session_minutes: Number(f.session_minutes.value) || 75, time_zone: f.time_zone.value
    };
    $('[data-preview-title]').textContent = c.title || 'Your cohort’s name';
    $('[data-preview-line]').textContent = TL.openingLine(c);
    var when;
    try { new Intl.DateTimeFormat('en-US', { timeZone: c.time_zone }); when = TL.scheduleText(c, null); }
    catch (e) { when = 'The weekly session time is still to come.'; }
    $('[data-preview-time]').textContent = when;
    $('[data-preview-desc]').textContent = c.description || 'Who it is for, in your words.';
    $('[data-preview-desc]').classList.toggle('placeholder', !c.description);
    var st = f.status.value;
    $('[data-preview-note]').textContent = st === 'open' ? 'This is how it is listed on the cohorts page now.'
      : st === 'draft' ? 'People see it here once it is Open.' : 'It is not listed on the cohorts page while it is ' + (st === 'running' ? 'running.' : 'finished.');
  }
  function fillForm(c) {
    editing = c ? c.id : null;
    slugTouched = !!c;
    say('[data-form-message]', '');
    var f = form.elements;
    f.title.value = c ? c.title : '';
    f.slug.value = c ? c.slug : '';
    f.slug.readOnly = !!c;
    $('[data-slug-field]').hidden = true;
    $('[data-slug-edit]').hidden = !!c;
    f.description.value = c && c.description ? c.description : '';
    f.starts_on.value = c && c.starts_on ? c.starts_on : '';
    f.weeks.value = c ? c.weeks : 5;
    f.session_weekday.value = c && c.session_weekday != null ? String(c.session_weekday) : '';
    f.session_time.value = c && c.session_time ? c.session_time.slice(0, 5) : '';
    var minutes = String(c ? c.session_minutes : 75);
    if (!Array.prototype.some.call(f.session_minutes.options, function (o) { return o.value === minutes; })) {
      f.session_minutes.appendChild(new Option(minutes + ' minutes', minutes));
    }
    f.session_minutes.value = minutes;
    f.time_zone.value = c ? c.time_zone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    f.capacity.value = c && c.capacity ? c.capacity : '';
    f.status.value = c ? c.status : 'draft';
    startedAs = c ? c.status : null;
    f.conversations_open.checked = c ? c.conversations_open : false;
    f.github_repo.value = c && c.github_repo ? c.github_repo : '';
    f.github_team.value = c && c.github_team ? c.github_team : '';
    form.querySelector('.by-hand').open = !!(c && (c.github_repo || c.github_team));
    showSlug();
    drawPreview();
    f.title.focus({ preventScroll: true });
  }
  form.elements.title.addEventListener('input', function () {
    if (!slugTouched && !editing) { form.elements.slug.value = TL.slugFrom(form.elements.title.value); showSlug(); }
  });
  form.elements.slug.addEventListener('input', function () { slugTouched = true; showSlug(); });
  form.elements.slug.addEventListener('blur', function () {
    if (!editing) { form.elements.slug.value = TL.slugFrom(form.elements.slug.value); showSlug(); }
  });
  $('[data-slug-edit]').addEventListener('click', function () {
    $('[data-slug-field]').hidden = false;
    form.elements.slug.focus();
  });
  form.addEventListener('input', drawPreview);
  form.addEventListener('change', drawPreview);

  // What is wrong with the answers, in plain words, or null.
  function formProblem(f) {
    if (!f.title.value.trim()) return { field: f.title, text: 'Give the cohort a name people will recognize.' };
    if (!editing) {
      var slugWrong = TL.slugProblem(f.slug.value);
      if (slugWrong) { $('[data-slug-field]').hidden = false; return { field: f.slug, text: slugWrong }; }
    }
    if (!f.time_zone.value.trim()) return { field: f.time_zone, text: 'Choose the time zone the class meets in, such as America/Denver.' };
    try { new Intl.DateTimeFormat('en-US', { timeZone: f.time_zone.value.trim() }); }
    catch (e) { return { field: f.time_zone, text: 'That time zone is not one the calendar knows. Choose one from the list, such as America/Denver.' }; }
    if (f.capacity.value && !(Number(f.capacity.value) >= 1)) return { field: f.capacity, text: 'The number of places should be 1 or more, or empty for no limit.' };
    var repo = f.github_repo.value.trim(), team = f.github_team.value.trim();
    if (repo && !/^humanshaped\/[A-Za-z0-9._-]+$/.test(repo)) return { field: f.github_repo, text: 'The repository should be written as humanshaped/its-name.' };
    if (team && !/^[a-z0-9-]+$/.test(team)) return { field: f.github_team, text: 'The team’s name can only use lowercase letters, numbers, and hyphens.' };
    return null;
  }
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

  var startedAs = null, archiveIt = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements;
    var wrong = formProblem(f);
    if (wrong) { say('[data-form-message]', wrong.text); wrong.field.focus(); return; }
    var row = {
      title: f.title.value.trim(),
      description: f.description.value.trim() || null,
      starts_on: f.starts_on.value || null,
      weeks: Number(f.weeks.value) || 5,
      session_weekday: f.session_weekday.value === '' ? null : Number(f.session_weekday.value),
      session_time: f.session_time.value || null,
      session_minutes: Number(f.session_minutes.value) || 75,
      time_zone: f.time_zone.value.trim(),
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
    // Finishing asks about the repository (JOURNEYS.md, Ben's decision 9):
    // archive it now, or leave it open for the cohort to keep talking.
    var finishing = editing && row.status === 'finished' && startedAs !== 'finished' && !!row.github_repo;
    var archive = finishing && window.UI ? window.UI.confirm({
      title: 'Archive the repository now?',
      body: 'Everyone in the cohort can still read it. Nothing new can be added.',
      action: 'Archive it', cancel: 'Leave it open', danger: false
    }) : Promise.resolve(false);
    before = Promise.all([before, archive]).then(function (r) { archiveIt = !!r[1]; });
    var q = editing
      ? before.then(function () { return db.from('cohorts').update(row).eq('id', editing).select().single(); })
      : db.from('cohorts').insert(Object.assign({ slug: f.slug.value.trim(), created_by: me.id }, row)).select().single();
    say('[data-form-message]', 'Saving…');
    q.then(function (r) {
      if (r.error) {
        var dup = /duplicate|unique/i.test(r.error.message);
        return say('[data-form-message]', dup ? 'Another cohort already uses that short name. Try another.' : 'It could not be saved: ' + r.error.message);
      }
      var go = function () { if (window.HS && window.HS.forgetRoles) window.HS.forgetRoles(); location.assign('/cohort/?c=' + r.data.id); };
      if (!archiveIt) return go();
      say('[data-form-message]', 'Archiving the repository…');
      // If GitHub says no, the leader hears why instead of the page moving on.
      db.functions.invoke('cohort-access', { body: { action: 'archive', cohort_id: r.data.id } }).then(function (a) {
        if (!a.error) return go();
        var res = a.error.context;
        return (res && res.json ? res.json() : Promise.resolve({})).catch(function () { return {}; }).then(function (b) {
          say('[data-form-message]', 'Saved as finished, but the repository was not archived: ' + (b.message || 'GitHub did not answer') + '. You can archive it on GitHub.');
        });
      });
    });
  });


  var page = P.start(root, function (client, user) {
    db = client; me = user;
    if (!editId) { fillForm(null); return; }
    return db.from('cohorts').select('*').eq('id', editId).maybeSingle().then(function (r) {
      if (r.error) return page.fail('This cohort could not be loaded: ' + r.error.message);
      if (!r.data) return page.show('missing');
      document.title = 'Edit ' + r.data.title + ' | Human Shaped';
      document.querySelector('[data-form-title]').textContent = r.data.title;
      var back = document.querySelectorAll('[data-back-to-cohort]');
      back.forEach(function (a) { a.href = '/cohort/?c=' + r.data.id; if (a.hasAttribute('data-name')) a.textContent = r.data.title; });
      fillForm(r.data);
    });
  });
})();
