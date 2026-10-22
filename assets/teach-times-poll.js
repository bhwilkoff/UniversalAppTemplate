// One poll for finding a weekly time, on its own page (/teach/times/poll/?p=
// <id>; migrations 20261009010000 and 20261021010000). The database decides
// who may see and change a poll and its answers; this page only asks. The
// page counts and orders the answers, and the teacher chooses the time,
// the people to invite, and whether it becomes a cohort.
(function () {
  var root = document.querySelector('[data-teach-times-poll]');
  if (!root || !window.supabase || !window.HUB || !window.TimesLib || !window.TimesGrid || !window.TeachTimesPage || !window.TeachLib || !window.UI) return;
  var T = window.TimesLib, G = window.TimesGrid, P = window.TeachTimesPage, TL = window.TeachLib, el = P.el, said = P.said;
  var id = new URLSearchParams(location.search).get('p');
  var db = null, me = null, myName = '', hostMarks = {}, hostTouched = {}, hostTable = null, current = null, answers = [], zone = G.myZone(), picked = null, table = null;

  function $(sel) { return root.querySelector(sel); }
  function shareUrl(p) { return location.origin + '/times/#' + p.token; }
  function daysText(p) { return p.days.map(function (d) { return T.DAYS[d]; }).join(', '); }

  var page = P.start(root, function (client, user, name) {
    db = client; me = user; myName = name;
    return openPoll();
  });

  // ---- the poll -----------------------------------------------------
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
    var sel = $('[data-make-slot]');
    if (Array.prototype.some.call(sel.options, function (o) { return +o.value === slot; })) { sel.value = String(slot); drawPeople(); }
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
    $('[data-answer-count]').textContent = answers.length ? '' : 'No answers yet';
    var body = $('[data-answers]');
    body.replaceChildren();
    answers.forEach(function (a) {
      var tr = el('tr');
      tr.appendChild(el('td', null, a.host ? a.name + (current.created_by === me.id ? ' (you)' : ' (leader)') : a.name));
      tr.appendChild(el('td', null, a.contact || ''));
      tr.appendChild(el('td', null, a.works.length + (a.if_need_be.length ? ', and ' + a.if_need_be.length + ' if need be' : '')));
      tr.appendChild(el('td', null, a.comment || ''));
      var td = el('td');
      tr.appendChild(td);
      body.appendChild(tr);
      if (a.host) return;
      var rm = el('button', 'btn-danger small', 'Delete');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Delete ' + a.name + "'s answer");
      window.UI.confirmStep(rm, { title: 'Delete ' + a.name + "'s answer?", body: 'It is deleted for good.', action: 'Delete answer', run: function () {
        G.within(db.from('time_poll_answers').delete().eq('id', a.id), db).catch(function (e) { return { error: { message: said(e) } }; }).then(function (r) {
          if (r.error) { $('[data-detail-status]').textContent = 'Not removed: ' + r.error.message; return; }
          openPoll();
        });
      } });
      td.appendChild(rm);
    });
  }
  function openPoll() {
    if (!id) { page.show('missing'); return Promise.resolve(); }
    return Promise.all([
      db.from('time_polls').select('*, cohorts(*)').eq('id', id).maybeSingle(),
      db.from('time_poll_answers').select('id, name, contact, comment, works, if_need_be, created_at, host, invited').eq('poll_id', id).order('created_at')
    ]).then(function (res) {
      if (res[0].error) return page.fail('The poll could not be loaded: ' + res[0].error.message);
      if (!res[0].data) return page.show('missing');
      if (res[1].error) return page.fail('The answers could not be loaded: ' + res[1].error.message);
      var first = !current;
      current = res[0].data;
      answers = res[1].data;
      picked = null;
      $('[data-who]').replaceChildren();
      document.title = current.title + ' | Human Shaped';
      document.querySelector('[data-detail-title]').textContent = current.title;
      $('[data-detail-facts]').replaceChildren(window.UI.facts([
        ['Status', window.UI.status('poll', current.open ? 'open' : 'closed')],
        ['Days', daysText(current)],
        ['Start times', T.hoursText(current) + ', every ' + current.step_minutes + ' minutes'],
        ['Time zone', T.zoneName(current.time_zone)],
        ['Sessions', current.session_minutes + ' minutes'],
        ['First week', current.starts_on ? new Date(current.starts_on + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null],
        ['Answers', String(answers.filter(function (a) { return !a.host; }).length)]
      ]));
      $('[data-share-link]').value = shareUrl(current);
      $('[data-open-share]').href = shareUrl(current);
      $('[data-toggle-open]').textContent = current.open ? 'Stop taking answers' : 'Take answers again';
      $('[data-detail-status]').textContent = '';
      if (first) G.fillZones($('[data-detail-zone]'), zone);
      $('[data-host-name-form]').elements.host_name.value = current.host_name || myName;
      $('[data-host-name-status]').textContent = '';
      $('[data-host-status]').textContent = '';
      hostMarks = {};
      answers.filter(function (a) { return a.host; }).forEach(function (a) {
        a.works.forEach(function (x) { hostMarks[x] = 'works'; });
        a.if_need_be.forEach(function (x) { hostMarks[x] = 'if_need_be'; });
      });
      drawHost();
      drawGrid();
      drawAnswers();
      drawMake(first);
    });
  }

  // ---- the teacher's own name and times ---------------------------------
  function hostMode() { return root.querySelector('input[name="host_mode"]:checked').value; }
  function hostCell(slot) {
    var m = hostMarks[slot], busy = hostCal.busy();
    var c = {
      cls: m === 'works' ? 'works' : m === 'if_need_be' ? 'maybe' : '',
      pressed: m === 'works' ? 'true' : m === 'if_need_be' ? 'mixed' : 'false',
      label: m === 'works' ? 'works for you' : m === 'if_need_be' ? 'if need be' : 'not marked'
    };
    if (busy && busy.busy[slot]) {
      c.cls += ' busy';
      c.label += ', busy on your calendar ' + (busy.busy[slot] === busy.weeks ? 'every week' : 'in ' + busy.busy[slot] + ' of ' + busy.weeks + ' weeks');
    }
    return c;
  }
  var hostCal = window.TimesCalendar ? window.TimesCalendar.mount($('[data-host-calendar]'), {
    poll: function () { return current; },
    marks: function () { return hostMarks; },
    touched: function () { return hostTouched; },
    canMark: function () { return true; },
    refresh: function () { G.refresh(hostTable, hostCell); },
    after: 'Look them over, then save your times.'
  }) : { busy: function () { return null; }, reset: function () {} };
  var hostDragTo = null;
  function drawHost() {
    hostTable = G.render($('[data-host-grid]'), {
      poll: current, zone: zone, cell: hostCell,
      onCell: function (slot) {
        hostTouched[slot] = true;
        var want = hostMode();
        if (hostMarks[slot] === want) delete hostMarks[slot]; else hostMarks[slot] = want;
        G.refresh(hostTable, hostCell);
      },
      onDrag: function (slot, first) {
        hostTouched[slot] = true;
        if (first) hostDragTo = hostMarks[slot] === hostMode() ? null : hostMode();
        if (hostDragTo) hostMarks[slot] = hostDragTo; else delete hostMarks[slot];
        G.refresh(hostTable, hostCell);
      },
      caption: 'Your own times, in ' + T.zoneName(zone)
    });
  }
  $('[data-host-save]').addEventListener('click', function (e) {
    var works = [], maybe = [], btn = e.target, say = $('[data-host-status]');
    Object.keys(hostMarks).forEach(function (x) { (hostMarks[x] === 'works' ? works : maybe).push(+x); });
    btn.disabled = true;
    say.textContent = 'Saving…';
    G.within(db.rpc('set_host_times', { poll: id, works: works, if_need_be: maybe }), db).then(function (r) {
      if (r.error) throw r.error;
      return openPoll().then(function () {
        $('[data-host-status]').textContent = works.length + maybe.length ? 'Your times are saved.' : 'Your times are cleared.';
      });
    }).catch(function (err) { say.textContent = 'Your times were not saved: ' + said(err) + '.'; })
      .then(function () { btn.disabled = false; });
  });
  $('[data-host-name-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = e.target.elements.host_name.value.trim(), say = $('[data-host-name-status]');
    say.textContent = 'Saving…';
    G.within(db.from('time_polls').update({ host_name: name || null }).eq('id', id), db).then(function (r) {
      if (r.error) throw r.error;
      return openPoll().then(function () { $('[data-host-name-status]').textContent = 'Saved.'; });
    }).catch(function (err) { say.textContent = 'The name was not saved: ' + said(err) + '.'; });
  });

  // ---- making it a cohort ---------------------------------------------
  // The teacher chooses one time and who to invite; time_poll_to_cohort
  // makes the cohort (or sets the time of the one the poll is for) and
  // marks the invitations. People join it themselves from the poll's link.
  var makeForm = $('[data-make-form]'), slugTouched = false;
  function invited() { return answers.filter(function (a) { return a.invited; }); }
  function drawPeople() {
    var slot = +$('[data-make-slot]').value, box = $('[data-make-people]');
    var chosen = T.inviteesAt(answers, slot);
    box.replaceChildren();
    answers.filter(function (a) { return !a.host; }).forEach(function (a) {
      var at = T.answerAt(a, slot);
      var label = el('label', 'check');
      var tick = el('input'); tick.type = 'checkbox'; tick.name = 'invite'; tick.value = a.id;
      tick.checked = chosen.indexOf(a.id) >= 0;
      label.appendChild(tick);
      var words = label.appendChild(el('span', null, a.name + (a.contact ? ' (' + a.contact + ')' : '') + ', '));
      words.appendChild(el('span', 'small', at === 'works' ? 'can make it' : at === 'if_need_be' ? 'if need be' : 'not this time'));
      box.appendChild(label);
    });
    if (!box.children.length) box.appendChild(el('p', 'small', 'No one has answered yet.'));
  }
  function drawMake(first) {
    var cohort = current.cohorts, people = invited(), made = !!(cohort && people.length);
    $('[data-make-title]').textContent = cohort ? cohort.title : 'Make it a cohort';
    $('[data-made]').hidden = !made;
    if (made) {
      var U = window.UI;
      var noMail = people.filter(function (a) { return !a.contact; }).map(function (a) { return a.name; });
      $('[data-made-line]').replaceChildren(U.facts([
        ['Status', U.status('cohort', cohort.status)],
        ['Meets', TL.scheduleText(cohort, zone).replace(/\.$/, '').replace(/, for \d+ minutes/, '')],
        ['Starts', cohort.starts_on ? new Date(cohort.starts_on + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null],
        ['Invited', people.map(function (a) { return a.name; }).join(', ')],
        ['No email from', noMail.length ? noMail.join(', ') : null]
      ]));
      $('[data-made-who]').textContent = '';
      $('[data-made-setup]').href = '/cohort/?c=' + cohort.id;
      var mails = people.filter(function (a) { return a.contact; }).map(function (a) { return a.contact; });
      var mail = $('[data-made-mail]'), copy = $('[data-made-copy]');
      mail.hidden = copy.hidden = !mails.length;
      mail.href = 'mailto:?bcc=' + mails.map(encodeURIComponent).join(',') + '&subject=' + encodeURIComponent(cohort.title) +
        (cohort.status === 'open' ? '&body=' + encodeURIComponent(location.origin + '/account/?join=' + cohort.slug) : '');
      copy.dataset.mails = mails.join(', ');
    }
    if (first) makeForm.hidden = made;
    $('[data-make-change]').hidden = !made || !makeForm.hidden;

    var sel = $('[data-make-slot]'), keep = sel.value;
    sel.replaceChildren();
    T.bestTimes(T.tallyOf(answers), 1000).forEach(function (b) {
      var o = el('option', null, T.slotText(current, b.slot, zone) + ': ' + b.works + ' can make it' + (b.if_need_be ? ', ' + b.if_need_be + ' if need be' : ''));
      o.value = String(b.slot);
      sel.appendChild(o);
    });
    var now = cohort && cohort.session_weekday != null && cohort.session_time
      ? String(T.slotOf(cohort.session_weekday, T.minutesOf(cohort.session_time.slice(0, 5)))) : null;
    [now, keep].forEach(function (v) { if (v && Array.prototype.some.call(sel.options, function (o) { return o.value === v; })) sel.value = v; });
    $('[data-make-none]').hidden = !!sel.options.length;
    drawPeople();
    $('[data-make-new]').hidden = !!cohort;
    var f = makeForm.elements;
    if (first) {
      f.title.value = current.title;
      f.slug.value = TL.slugFrom(current.title);
      f.starts_on.value = (cohort && cohort.starts_on) || current.starts_on || '';
    }
    $('[data-make-submit]').textContent = cohort ? (made ? 'Save the time and invitations' : 'Set its time and invite them') : 'Make the cohort';
    $('[data-make-submit]').disabled = !sel.options.length;
  }
  makeForm.elements.title.addEventListener('input', function () {
    if (!slugTouched) makeForm.elements.slug.value = TL.slugFrom(makeForm.elements.title.value);
  });
  makeForm.elements.slug.addEventListener('input', function () { slugTouched = true; });
  $('[data-make-slot]').addEventListener('change', drawPeople);
  $('[data-make-change]').addEventListener('click', function (e) { makeForm.hidden = false; e.target.hidden = true; });
  makeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = makeForm.elements, err = $('[data-make-error]'), cohort = current.cohorts;
    var invite = Array.prototype.filter.call(makeForm.querySelectorAll('input[name="invite"]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
    if (!cohort) {
      if (!f.title.value.trim()) { err.textContent = 'Give the cohort a name people will recognize.'; f.title.focus(); return; }
      var wrong = TL.slugProblem(f.slug.value.trim());
      if (wrong) { err.textContent = wrong; f.slug.focus(); return; }
    }
    var btn = $('[data-make-submit]');
    btn.disabled = true;
    err.textContent = 'Saving…';
    G.within(db.rpc('time_poll_to_cohort', {
      poll: id, slot: +f.slot.value, invite: invite,
      title: cohort ? null : f.title.value.trim(), slug: cohort ? null : f.slug.value.trim(),
      starts_on: f.starts_on.value || null, weeks: Number(f.weeks.value) || 5,
      status: f.open.checked ? 'open' : 'draft', cohort: cohort ? cohort.id : null
    }), db).then(function (r) {
      if (r.error) throw r.error;
      err.textContent = '';
      if (window.HS && window.HS.forgetRoles) window.HS.forgetRoles(); 
      makeForm.hidden = true;
      return openPoll().then(function () { $('[data-made]').scrollIntoView({ block: 'start' }); });
    }).catch(function (x) {
      err.textContent = /duplicate|unique/i.test(said(x)) ? 'Another cohort already uses that short name. Try another.' : 'Nothing was made: ' + said(x) + '.';
    }).then(function () { btn.disabled = false; });
  });
  $('[data-made-copy]').addEventListener('click', function (e) {
    var text = e.target.dataset.mails;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy their addresses'; }, 2000); });
  });

  $('[data-detail-zone]').addEventListener('change', function (e) { zone = e.target.value; picked = null; $('[data-who]').replaceChildren(); drawHost(); drawGrid(); drawMake(false); });
  $('[data-copy-share]').addEventListener('click', function (e) {
    var input = $('[data-share-link]');
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy the link'; }, 2000); }, function () { input.select(); });
    else input.select();
  });
  $('[data-toggle-open]').addEventListener('click', function () {
    G.within(db.from('time_polls').update({ open: !current.open }).eq('id', id), db).catch(function (e) { return { error: { message: said(e) } }; }).then(function (r) {
      if (r.error) { $('[data-detail-status]').textContent = 'Nothing changed: ' + r.error.message; return; }
      openPoll();
    });
  });
  window.UI.confirmStep($('[data-delete]'), { title: 'Delete this poll?', body: 'Its answers go too, and its link stops working.', action: 'Delete poll', run: function () {
    G.within(db.from('time_polls').delete().eq('id', id), db).catch(function (e) { return { error: { message: said(e) } }; }).then(function (r) {
      if (r.error) { $('[data-detail-status]').textContent = 'Not deleted: ' + r.error.message; return; }
      location.assign('/teach/times/');
    });
  } });
})();
