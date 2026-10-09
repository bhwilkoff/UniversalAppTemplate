// Finding a weekly time (/times/#<token>): anyone with the link answers
// without an account. The database checks the token and each answer's
// secret (migration 20261009010000); this page only asks. The answer's id
// and secret stay in this browser, and in the private link the page
// offers, so the person can change or take back what they said.
(function () {
  var root = document.querySelector('[data-times]');
  if (!root || !window.supabase || !window.HUB || !window.TimesLib || !window.TimesGrid) return;
  var T = window.TimesLib, G = window.TimesGrid;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key, { auth: { persistSession: false } });
  var form = root.querySelector('[data-form]');
  var poll = null, link = null, mine = null, tally = null, table = null, dragTo = null;
  var marks = {};
  // Times the person changed by hand, which a calendar check never changes.
  var touched = {};
  var zone = G.myZone();

  function $(sel) { return root.querySelector(sel); }
  function show(state) {
    root.querySelectorAll('.times-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function status(text) { $('[data-status]').textContent = text || ''; }

  var KEY = function () { return 'hs-times-' + link.token; };
  function remembered() {
    try { return JSON.parse(localStorage.getItem(KEY()) || 'null'); } catch (e) { return null; }
  }
  function remember(a) {
    try { if (a) localStorage.setItem(KEY(), JSON.stringify(a)); else localStorage.removeItem(KEY()); } catch (e) { /* private window: the link still works */ }
  }

  function mode() { return form.querySelector('input[name="mode"]:checked').value; }

  function hostAt(slot) {
    if ((poll.host_works || []).indexOf(slot) >= 0) return 'works';
    if ((poll.host_if_need_be || []).indexOf(slot) >= 0) return 'if_need_be';
    return null;
  }
  function cell(slot) {
    var m = marks[slot];
    var c = { pressed: m === 'works' ? 'true' : m === 'if_need_be' ? 'mixed' : 'false', disabled: !poll.open };
    c.cls = m === 'works' ? 'works' : m === 'if_need_be' ? 'maybe' : '';
    c.label = m === 'works' ? 'works for you' : m === 'if_need_be' ? 'if need be' : 'not marked';
    var h = hostAt(slot);
    if (h) {
      c.cls += h === 'works' ? ' host-yes' : ' host-maybe';
      c.label += ', ' + poll.teacher + (h === 'works' ? ' can make it' : ' could if need be');
    }
    var busy = cal.busy();
    if (busy && busy.busy[slot]) {
      c.cls += ' busy';
      c.label += ', busy on your calendar ' + (busy.busy[slot] === busy.weeks ? 'every week' : 'in ' + busy.busy[slot] + ' of ' + busy.weeks + ' weeks');
    }
    if (tally) {
      var n = (tally.works[slot] || 0), k = (tally.if_need_be[slot] || 0);
      c.text = n + k ? String(n + k) : '';
      c.label += ', ' + n + ' can make it' + (k ? ' and ' + k + ' if need be' : '');
    }
    return c;
  }
  function toggle(slot) {
    touched[slot] = true;
    var want = mode();
    marks[slot] = marks[slot] === want ? null : want;
    if (!marks[slot]) delete marks[slot];
    G.refresh(table, cell);
  }
  function drag(slot, first) {
    touched[slot] = true;
    if (first) dragTo = marks[slot] === mode() ? null : mode();
    if (dragTo) marks[slot] = dragTo; else delete marks[slot];
    G.refresh(table, cell);
  }
  function draw() {
    table = G.render($('[data-grid]'), {
      poll: poll, zone: zone, cell: cell, onCell: toggle, onDrag: drag,
      caption: 'Weekly times, in ' + T.zoneName(zone)
    });
    var theirs = zone !== poll.time_zone;
    $('[data-zone-line]').textContent = theirs
      ? 'The teacher set these times in ' + T.zoneName(poll.time_zone) + '.'
      : '';
    $('[data-count-line]').hidden = !tally;
    var key = $('[data-host-key]'), hasHost = (poll.host_works || []).length + (poll.host_if_need_be || []).length > 0;
    key.hidden = !hasHost;
    if (hasHost) {
      key.replaceChildren();
      var a = document.createElement('span'), b = document.createElement('span');
      a.innerHTML = '<i class="dot" aria-hidden="true"></i>';
      a.appendChild(document.createTextNode(poll.teacher + ' can make it'));
      key.appendChild(a);
      if ((poll.host_if_need_be || []).length) {
        b.innerHTML = '<i class="dot hollow" aria-hidden="true"></i>';
        b.appendChild(document.createTextNode(poll.teacher + ' could if need be'));
        key.appendChild(b);
      }
    }
  }

  function fill() {
    $('[data-title]').textContent = poll.title;
    document.title = poll.title + ' | Human Shaped';
    $('[data-from]').textContent = 'From ' + poll.teacher + ', who would like to find the weekly time that works for the most people.';
    var note = $('[data-note]');
    note.textContent = poll.note || '';
    note.hidden = !poll.note;
    var line = 'Each time is when a weekly session of ' + poll.session_minutes + ' minutes would start.';
    if (poll.starts_on) {
      var d = new Date(poll.starts_on + 'T12:00:00Z');
      line += ' The first week begins ' + d.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric' }) + '.';
    }
    line += ' Tap a time to mark it, and tap it again to clear it.';
    $('[data-session-line]').textContent = line;
    $('[data-closed]').hidden = poll.open;
    form.querySelectorAll('input, textarea, button[type="submit"]').forEach(function (n) {
      if (n.name !== 'zone') n.disabled = !poll.open;
    });
    G.fillZones($('[data-zone]'), zone);
  }

  function keepLink() {
    if (!mine) { $('[data-keep]').hidden = true; return; }
    var url = location.origin + location.pathname + '#' + link.token + '~' + mine.id + '~' + mine.secret;
    $('[data-keep-link]').value = url;
    $('[data-keep]').hidden = false;
  }

  function readMine() {
    if (!mine) return Promise.resolve();
    return db.rpc('my_time_poll_answer', { t: link.token, answer: mine.id, secret: mine.secret }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) { mine = null; remember(null); return; }
      form.elements.name.value = r.data.name;
      form.elements.contact.value = r.data.contact || '';
      form.elements.comment.value = r.data.comment || '';
      marks = {};
      r.data.works.forEach(function (s) { marks[s] = 'works'; });
      r.data.if_need_be.forEach(function (s) { marks[s] = 'if_need_be'; });
      tally = r.data.tally;
    });
  }

  function afterAnswer() {
    $('[data-submit]').textContent = mine ? 'Save my changes' : 'Send my answer';
    $('[data-withdraw]').hidden = !mine || !poll.open;
    keepLink();
  }

  function load() {
    link = T.parseHash(location.hash);
    if (!link) return show('missing');
    show('loading');
    db.rpc('time_poll', { t: link.token }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) return show('missing');
      poll = r.data;
      mine = link.answer || remembered();
      if (link.answer) {
        remember(link.answer);
        history.replaceState(null, '', location.pathname + '#' + link.token);
      }
      return readMine().then(function () {
        fill();
        draw();
        afterAnswer();
        show('poll');
      });
    }).catch(function (e) {
      $('[data-error-text]').textContent = 'The page could not reach the hub: ' + said(e) + '.';
      show('error');
    });
  }

  $('[data-zone]').addEventListener('change', function (e) { zone = e.target.value; draw(); });
  $('[data-retry]').addEventListener('click', load);
  $('[data-copy-keep]').addEventListener('click', function (e) {
    var input = $('[data-keep-link]');
    var done = function () { e.target.textContent = 'Copied'; };
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(done, function () { input.select(); });
    else input.select();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    if (!name) { status('Add your name, so the teacher knows who can come.'); form.elements.name.focus(); return; }
    var works = [], maybe = [];
    Object.keys(marks).forEach(function (s) { (marks[s] === 'works' ? works : maybe).push(+s); });
    if (!works.length && !maybe.length) { status('Mark at least one time you could make.'); return; }
    var btn = $('[data-submit]');
    btn.disabled = true;
    status('Saving…');
    G.within(db.rpc('answer_time_poll', {
      t: link.token, name: name, works: works, if_need_be: maybe,
      contact: form.elements.contact.value.trim() || null,
      comment: form.elements.comment.value.trim() || null,
      answer: mine ? mine.id : null, secret: mine ? mine.secret : null
    }), db).then(function (r) {
      if (r.error) throw r.error;
      var first = !mine;
      mine = r.data;
      remember(mine);
      return readMine().then(function () {
        draw();
        afterAnswer();
        status('');
        var saved = $('[data-saved]');
        saved.textContent = first
          ? 'Thank you, ' + name + '. Your answer is saved, and the numbers now show how many people can make each time so far.'
          : 'Your changes are saved.';
        saved.hidden = false;
        saved.focus();
      });
    }).catch(function (err) {
      status('Your answer was not saved: ' + said(err) + '.');
    }).then(function () { btn.disabled = !poll.open; });
  });

  $('[data-withdraw]').addEventListener('click', function () {
    if (!mine) return;
    G.within(db.rpc('withdraw_time_poll_answer', { t: link.token, answer: mine.id, secret: mine.secret }), db).then(function (r) {
      if (r.error) throw r.error;
      mine = null; tally = null; marks = {}; touched = {}; cal.reset();
      remember(null);
      form.reset();
      $('[data-zone]').value = zone;
      draw();
      afterAnswer();
      var saved = $('[data-saved]');
      saved.textContent = 'Your answer has been taken back, and the teacher no longer sees it.';
      saved.hidden = false;
      saved.focus();
    }).catch(function (err) { status('Your answer was not taken back: ' + said(err) + '.'); });
  });

  // ---- checking a Google Calendar (times-calendar.js) ----------------
  var cal = window.TimesCalendar ? window.TimesCalendar.mount($('[data-calendar]'), {
    poll: function () { return poll; },
    marks: function () { return marks; },
    touched: function () { return touched; },
    canMark: function () { return poll.open; },
    refresh: function () { G.refresh(table, cell); },
    after: 'Look them over before you send.'
  }) : { busy: function () { return null; }, reset: function () {} };

  window.addEventListener('hashchange', load);
  load();
})();
