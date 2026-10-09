// Checking Google Calendars against a weekly-time poll, for the people
// answering (/times/) and for the teacher's own times (/teach/times/).
// Each check adds an account to a list the person can tick on and off; a
// time is busy if it is busy on any ticked calendar, so adding a second
// account never frees a time the first one filled (Ben, October 9, 2026).
// Free/busy only, asked for when the person presses the button, read in
// this browser, and let go as soon as it is read. Free times that start
// within the person's waking hours, on their own clock, are marked as
// working; a time the person set by hand is never changed.
//
//   var cal = TimesCalendar.mount(box, { poll(), marks(), touched(),
//     canMark(), refresh(), after })
//   cal.busy()   -> { weeks, busy: { slot: weeks busy } } or null
//   cal.reset()  -> forget the check (a different poll, a cleared answer)
(function () {
  var T = window.TimesLib, G = window.TimesGrid;
  var SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/userinfo.email';
  var gis = null;

  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function loadGoogle() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve(window.google.accounts.oauth2);
    if (gis) return gis;
    gis = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { window.google && window.google.accounts ? resolve(window.google.accounts.oauth2) : reject(new Error('Google did not load')); };
      s.onerror = function () { gis = null; reject(new Error('Google could not be reached')); };
      document.head.appendChild(s);
    });
    return gis;
  }
  function readCalendar(poll, token) {
    var span = T.checkSpan(poll);
    return fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: span.timeMin, timeMax: span.timeMax, items: [{ id: 'primary' }] })
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error((body.error && body.error.message) || ('Google answered ' + r.status));
        var cal = body.calendars && body.calendars.primary;
        if (cal && cal.errors && cal.errors.length) throw new Error('Google could not read that calendar (' + cal.errors[0].reason + ')');
        return (cal && cal.busy) || [];
      });
    });
  }

  // Which account a check read, so the list can name it.
  function whoIs(token) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (u) { return u.email || null; }, function () { return null; });
  }

  function mount(box, opts) {
    var busy = null, auto = {}, accounts = [];
    var list = document.createElement('ul');
    list.className = 'times-cal-list';
    list.setAttribute('aria-label', 'Calendars checked');
    list.hidden = true;
    box.insertBefore(list, box.querySelector('[data-cal-line]'));
    var button = box.querySelector('[data-cal-check]');
    function combine() {
      var on = accounts.filter(function (a) { return a.on; });
      if (!on.length) { busy = null; auto = clearAuto(); opts.refresh(); say(accounts.length ? 'No calendar is ticked, so nothing is marked busy.' : ''); wake.hidden = true; return; }
      busy = T.busyWeeks(opts.poll(), [].concat.apply([], on.map(function (a) { return a.blocks; })));
      wake.hidden = !opts.canMark();
      markFree();
    }
    function clearAuto() {
      var marks = opts.marks(), touched = opts.touched();
      Object.keys(auto).forEach(function (s) { if (!touched[s] && marks[s] === 'works') delete marks[s]; });
      return {};
    }
    function drawList() {
      list.replaceChildren();
      list.hidden = !accounts.length;
      accounts.forEach(function (a) {
        var li = document.createElement('li'), label = document.createElement('label'), box2 = document.createElement('input');
        label.className = 'check';
        box2.type = 'checkbox';
        box2.checked = a.on;
        box2.addEventListener('change', function () { a.on = box2.checked; combine(); });
        label.appendChild(box2);
        label.appendChild(document.createTextNode(' ' + a.name));
        li.appendChild(label);
        list.appendChild(li);
      });
      button.textContent = accounts.length ? 'Add another Google Calendar' : 'Check my Google Calendar';
    }
    var line = box.querySelector('[data-cal-line]'), wake = box.querySelector('[data-cal-wake]');
    var from = box.querySelector('[data-wake-from]'), to = box.querySelector('[data-wake-to]');
    function say(text) { line.textContent = text; }
    function markFree() {
      var poll = opts.poll(), marks = opts.marks(), touched = opts.touched();
      var a = T.minutesOf(from.value), b = T.minutesOf(to.value);
      Object.keys(auto).forEach(function (s) { if (!touched[s] && marks[s] === 'works') delete marks[s]; });
      auto = {};
      var marked = 0, can = opts.canMark();
      if (can && a != null && b != null) {
        T.freeInHours(poll, busy, G.myZone(), a, b).forEach(function (s) {
          if (touched[s] || marks[s]) return;
          marks[s] = 'works';
          auto[s] = true;
          marked++;
        });
      }
      opts.refresh();
      var n = Object.keys(busy.busy).filter(function (s) { return busy.busy[s]; }).length;
      var text = can ? (marked ? marked + (marked === 1 ? ' free time is' : ' free times are') + ' marked.' : 'No free times in those hours were left to mark.') : '';
      var cals = accounts.filter(function (x) { return x.on; }).length > 1 ? 'any of your ticked calendars' : 'your calendar';
      text += n ? ' A corner mark means busy on ' + cals + ' in at least one of the first ' + busy.weeks + ' weeks.' : ' You are free on ' + cals + ' at all of these times for the first ' + busy.weeks + ' weeks.';
      if (can && opts.after) text += ' ' + opts.after;
      say(text.trim());
    }
    if (!window.HUB || !window.HUB.googleClientId) return { busy: function () { return null; }, reset: function () {} };
    box.hidden = false;
    box.querySelector('[data-cal-check]').addEventListener('click', function () {
      say('Asking Google…');
      loadGoogle().then(function (oauth) {
        oauth.initTokenClient({
          client_id: window.HUB.googleClientId,
          scope: SCOPE,
          prompt: 'select_account',
          callback: function (resp) {
            if (!resp || resp.error || !resp.access_token) { say('Your calendar was not checked' + (resp && resp.error ? ' (' + resp.error + ')' : '') + '.'); return; }
            Promise.all([readCalendar(opts.poll(), resp.access_token), whoIs(resp.access_token)]).then(function (both) {
              var name = both[1] || 'Google account ' + (accounts.length + 1);
              var same = accounts.filter(function (a) { return a.name === name; })[0];
              if (same) { same.blocks = both[0]; same.on = true; }
              else accounts.push({ name: name, blocks: both[0], on: true });
              drawList();
              combine();
            }).catch(function (e) {
              say('Your calendar was not checked: ' + said(e) + '.');
            }).then(function () {
              try { oauth.revoke(resp.access_token, function () {}); } catch (e) { /* it expires within the hour anyway */ }
            });
          },
          error_callback: function (e) { say('Your calendar was not checked' + (e && e.type ? ' (' + e.type.replace(/_/g, ' ') + ')' : '') + '.'); }
        }).requestAccessToken();
      }).catch(function (e) { say('Your calendar was not checked: ' + said(e) + '.'); });
    });
    [from, to].forEach(function (input) {
      input.addEventListener('change', function () { if (busy) markFree(); });
    });
    return {
      busy: function () { return busy; },
      reset: function () { busy = null; auto = {}; accounts = []; drawList(); say(''); wake.hidden = true; }
    };
  }

  window.TimesCalendar = { mount: mount };
})();
