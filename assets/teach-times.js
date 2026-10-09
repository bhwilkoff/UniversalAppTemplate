// A teacher's polls for finding a weekly time (/teach/times/; migration
// 20261009010000). The database decides who may see and change a poll and
// its answers; this page only asks. The page counts and orders the
// answers, and the teacher chooses the time.
(function () {
  var root = document.querySelector('[data-teach-times]');
  if (!root || !window.supabase || !window.HUB || !window.TimesLib || !window.TimesGrid) return;
  var T = window.TimesLib, G = window.TimesGrid;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var me = null, polls = [], current = null, answers = [], zone = G.myZone(), picked = null, table = null;
  var form = root.querySelector('[data-poll-form]');

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
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function shareUrl(p) { return location.origin + '/times/#' + p.token; }
  function daysText(p) { return p.days.map(function (d) { return T.DAYS[d]; }).join(', '); }
  function windowText(p) {
    return T.timeText(p.first_minute) + (p.last_minute > p.first_minute ? ' to ' + T.timeText(p.last_minute) : '');
  }

  // ---- the list -----------------------------------------------------
  function loadList() {
    return db.from('time_polls').select('*, time_poll_answers(count)').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return fail('Your polls could not be loaded: ' + r.error.message);
      polls = r.data;
      var box = $('[data-poll-list]');
      box.replaceChildren();
      if (!polls.length) box.appendChild(el('p', 'small', 'You have not made a poll yet.'));
      polls.forEach(function (p) {
        var n = (p.time_poll_answers[0] || {}).count || 0;
        var card = el('article', 'cohort-card');
        card.appendChild(el('h3', null, p.title));
        card.appendChild(el('p', 'small', (p.open ? 'Taking answers' : 'Closed') + ', ' + n + (n === 1 ? ' answer' : ' answers') + '. ' + daysText(p) + ', ' + windowText(p) + '.'));
        var open = el('button', 'btn-quiet', 'Open');
        open.type = 'button';
        open.addEventListener('click', function () { openPoll(p.id); });
        var a = el('div', 'actions'); a.appendChild(open); card.appendChild(a);
        box.appendChild(card);
      });
    });
  }

  // ---- making one ---------------------------------------------------
  function loadCohorts() {
    return db.from('cohort_teachers').select('cohorts(id, title, status, starts_on, time_zone)').eq('user_id', me.id).then(function (r) {
      if (r.error) return;
      var list = r.data.map(function (x) { return x.cohorts; }).filter(function (c) { return c && c.status !== 'finished'; });
      var sel = form.elements.cohort_id;
      list.forEach(function (c) { var o = el('option', null, c.title); o.value = c.id; o.dataset.starts = c.starts_on || ''; o.dataset.zone = c.time_zone || ''; sel.appendChild(o); });
      $('[data-cohort-field]').hidden = !list.length;
    });
  }
  form.elements.cohort_id.addEventListener('change', function (e) {
    var o = e.target.selectedOptions[0];
    if (o && o.dataset.starts && !form.elements.starts_on.value) form.elements.starts_on.value = o.dataset.starts;
    if (o && o.dataset.zone) form.elements.time_zone.value = o.dataset.zone;
  });
  $('[data-new-poll]').addEventListener('click', function () {
    form.hidden = false;
    $('[data-detail]').hidden = true;
    form.elements.title.focus();
  });
  $('[data-cancel]').addEventListener('click', function () { form.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var checked = T.checkPoll({
      title: f.title.value, note: f.note.value, cohort_id: f.cohort_id.value,
      days: Array.prototype.filter.call(form.querySelectorAll('input[name="days"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      from: f.from.value, to: f.to.value, step: f.step.value, time_zone: f.time_zone.value,
      session_minutes: f.session_minutes.value, starts_on: f.starts_on.value
    });
    var err = $('[data-form-error]');
    if (checked.error) { err.textContent = checked.error; return; }
    err.textContent = 'Saving…';
    db.from('time_polls').insert(checked.row).select('id').single().then(function (r) {
      if (r.error) { err.textContent = 'The poll was not made: ' + r.error.message; return; }
      err.textContent = '';
      form.reset();
      form.elements.time_zone.value = zone;
      form.hidden = true;
      return loadList().then(function () { return openPoll(r.data.id); });
    });
  });

  // ---- one poll -----------------------------------------------------
  function level(n, most) {
    if (!n) return '';
    return 'h' + Math.max(1, Math.ceil((n / most) * 4));
  }
  function cellFor(tally) {
    var most = 1;
    Object.keys(tally.works).concat(Object.keys(tally.if_need_be)).forEach(function (s) {
      most = Math.max(most, (tally.works[s] || 0) + (tally.if_need_be[s] || 0));
    });
    return function (slot) {
      var n = tally.works[slot] || 0, k = tally.if_need_be[slot] || 0;
      return {
        cls: level(n + k, most) + (slot === picked ? ' picked' : ''),
        text: n + k ? String(n + k) : '',
        label: n + ' can make it' + (k ? ', ' + k + ' if need be' : ''),
        pressed: slot === picked ? 'true' : 'false'
      };
    };
  }
  function showWho(slot) {
    picked = picked === slot ? null : slot;
    var box = $('[data-who]');
    box.replaceChildren();
    G.refresh(table, cellFor(T.tallyOf(answers)));
    if (picked == null) return;
    box.appendChild(el('h4', null, T.slotText(current, slot, zone)));
    var yes = answers.filter(function (a) { return a.works.indexOf(slot) >= 0; }).map(function (a) { return a.name; });
    var maybe = answers.filter(function (a) { return a.if_need_be.indexOf(slot) >= 0; }).map(function (a) { return a.name; });
    box.appendChild(el('p', null, yes.length ? 'Can make it: ' + yes.join(', ') + '.' : 'No one has said this time works.'));
    if (maybe.length) box.appendChild(el('p', null, 'If need be: ' + maybe.join(', ') + '.'));
  }
  function drawGrid() {
    var tally = T.tallyOf(answers);
    table = G.render($('[data-detail-grid]'), {
      poll: current, zone: zone, cell: cellFor(tally), onCell: showWho,
      caption: 'How many people can make each time, in ' + T.zoneName(zone)
    });
    var best = $('[data-best]');
    best.replaceChildren();
    var top = T.bestTimes(tally, 5);
    if (!top.length) best.appendChild(el('li', null, 'No answers yet.'));
    top.forEach(function (b) {
      best.appendChild(el('li', null, T.slotText(current, b.slot, zone) + ': ' + b.works + ' can make it' + (b.if_need_be ? ', ' + b.if_need_be + ' if need be' : '') + '.'));
    });
  }
  function drawAnswers() {
    $('[data-answer-count]').textContent = answers.length
      ? answers.length + (answers.length === 1 ? ' person has' : ' people have') + ' answered. Choose a time to see who can make it.'
      : 'No one has answered yet.';
    var body = $('[data-answers]');
    body.replaceChildren();
    answers.forEach(function (a) {
      var tr = el('tr');
      tr.appendChild(el('td', null, a.name));
      tr.appendChild(el('td', null, a.contact || ''));
      tr.appendChild(el('td', null, a.works.length + (a.if_need_be.length ? ', and ' + a.if_need_be.length + ' if need be' : '')));
      tr.appendChild(el('td', null, a.comment || ''));
      var td = el('td');
      var rm = el('button', 'link-btn', 'Remove');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove ' + a.name + "'s answer");
      rm.addEventListener('click', function () {
        if (!window.confirm('Remove ' + a.name + "'s answer? This cannot be undone.")) return;
        db.from('time_poll_answers').delete().eq('id', a.id).then(function (r) {
          if (r.error) { $('[data-detail-status]').textContent = 'It was not removed: ' + r.error.message; return; }
          openPoll(current.id);
          loadList();
        });
      });
      td.appendChild(rm);
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }
  function openPoll(id) {
    current = polls.filter(function (p) { return p.id === id; })[0];
    if (!current) return Promise.resolve();
    picked = null;
    $('[data-who]').replaceChildren();
    return db.from('time_poll_answers').select('id, name, contact, comment, works, if_need_be, created_at').eq('poll_id', id).order('created_at').then(function (r) {
      if (r.error) return fail('The answers could not be loaded: ' + r.error.message);
      answers = r.data;
      var d = $('[data-detail]');
      $('[data-detail-title]').textContent = current.title;
      $('[data-detail-facts]').textContent = (current.open ? 'Taking answers. ' : 'Closed. ') + daysText(current) + ', starting ' + windowText(current) + ' every ' + current.step_minutes + ' minutes, in ' + T.zoneName(current.time_zone) + '. Sessions of ' + current.session_minutes + ' minutes' + (current.starts_on ? ', beginning the week of ' + current.starts_on : '') + '.';
      $('[data-share-link]').value = shareUrl(current);
      $('[data-open-share]').href = shareUrl(current);
      $('[data-toggle-open]').textContent = current.open ? 'Stop taking answers' : 'Take answers again';
      $('[data-detail-status]').textContent = '';
      G.fillZones($('[data-detail-zone]'), zone);
      drawGrid();
      drawAnswers();
      d.hidden = false;
    });
  }
  $('[data-detail-zone]').addEventListener('change', function (e) { zone = e.target.value; picked = null; $('[data-who]').replaceChildren(); drawGrid(); });
  $('[data-copy-share]').addEventListener('click', function (e) {
    var input = $('[data-share-link]');
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy the link'; }, 2000); }, function () { input.select(); });
    else input.select();
  });
  $('[data-toggle-open]').addEventListener('click', function () {
    db.from('time_polls').update({ open: !current.open }).eq('id', current.id).then(function (r) {
      if (r.error) { $('[data-detail-status]').textContent = 'Nothing changed: ' + r.error.message; return; }
      var id = current.id;
      loadList().then(function () { openPoll(id); });
    });
  });
  $('[data-delete]').addEventListener('click', function () {
    if (!window.confirm('Delete "' + current.title + '" and every answer to it? The link will stop working. This cannot be undone.')) return;
    db.from('time_polls').delete().eq('id', current.id).then(function (r) {
      if (r.error) { $('[data-detail-status]').textContent = 'It was not deleted: ' + r.error.message; return; }
      $('[data-detail]').hidden = true;
      current = null;
      loadList();
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
        G.fillZones(form.elements.time_zone, zone);
        show('teacher');
        return Promise.all([loadList(), loadCohorts()]);
      });
    }).catch(function (err) { fail('Something went wrong: ' + said(err) + '.'); });
  }
  $('[data-reload]').addEventListener('click', load);
  load();
})();
