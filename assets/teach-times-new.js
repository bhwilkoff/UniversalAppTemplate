// Making a poll of weekly times (/teach/times/new/; migration
// 20261009010000). Once it is made, the teacher lands on its own page.
(function () {
  var root = document.querySelector('[data-teach-times-new]');
  if (!root || !window.supabase || !window.HUB || !window.TimesLib || !window.TimesGrid || !window.TeachTimesPage) return;
  var T = window.TimesLib, G = window.TimesGrid, P = window.TeachTimesPage, el = P.el;
  var form = root.querySelector('[data-poll-form]');
  var db = null, zone = G.myZone();

  P.start(root, function (client, me, myName) {
    db = client;
    G.fillZones(form.elements.time_zone, zone);
    if (!form.elements.host_name.value) form.elements.host_name.value = myName;
    return db.from('cohort_teachers').select('cohorts(id, title, status, starts_on, time_zone)').eq('user_id', me.id).then(function (r) {
      if (r.error) return;
      var list = r.data.map(function (x) { return x.cohorts; }).filter(function (c) { return c && c.status !== 'finished'; });
      var sel = form.elements.cohort_id;
      list.forEach(function (c) { var o = el('option', null, c.title); o.value = c.id; o.dataset.starts = c.starts_on || ''; o.dataset.zone = c.time_zone || ''; sel.appendChild(o); });
      root.querySelector('[data-cohort-field]').hidden = !list.length;
    });
  });

  form.elements.cohort_id.addEventListener('change', function (e) {
    var o = e.target.selectedOptions[0];
    if (o && o.dataset.starts && !form.elements.starts_on.value) form.elements.starts_on.value = o.dataset.starts;
    if (o && o.dataset.zone) form.elements.time_zone.value = o.dataset.zone;
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var checked = T.checkPoll({
      title: f.title.value, host_name: f.host_name.value, note: f.note.value, cohort_id: f.cohort_id.value,
      days: Array.prototype.filter.call(form.querySelectorAll('input[name="days"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      parts: Array.prototype.filter.call(form.querySelectorAll('input[name="parts"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      step: f.step.value, time_zone: f.time_zone.value,
      session_minutes: f.session_minutes.value, starts_on: f.starts_on.value
    });
    var err = root.querySelector('[data-form-error]');
    if (checked.error) { err.textContent = checked.error; return; }
    err.textContent = 'Saving…';
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    G.within(db.from('time_polls').insert(checked.row).select('id').single(), db).then(function (r) {
      if (r.error) { err.textContent = 'The poll was not made: ' + r.error.message; btn.disabled = false; return; }
      location.assign('/teach/times/poll/?p=' + r.data.id);
    }).catch(function (e) {
      err.textContent = 'The poll may not have been made: ' + P.said(e) + '. Your answers are still in the form. If it appears in your polls, it was saved.';
      btn.disabled = false;
    });
  });
})();
