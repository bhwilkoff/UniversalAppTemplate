// The leader's button for their cohort's calendar: their browser asks
// Google for a short-lived token, makes or updates every session's event
// on their own calendar, and lets the token go (CalendarLib does the work).
//   LeaderCalendar.mount(box, { db, cohort, me, after })
(function () {
  var L = window.CalendarLib;
  var SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned';
  var gis = null;

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
  function connect() {
    if (!window.HUB || !window.HUB.googleClientId) return Promise.reject(new Error('Google is not set up on this site'));
    return loadGoogle().then(function (oauth) {
      return new Promise(function (resolve, reject) {
        oauth.initTokenClient({
          client_id: window.HUB.googleClientId, scope: SCOPE,
          callback: function (r) { r && r.access_token ? resolve(r.access_token) : reject(new Error(r && r.error ? 'Google said ' + r.error.replace(/_/g, ' ') : 'Google did not answer')); },
          error_callback: function (e) { reject(new Error(e && e.type === 'popup_closed' ? 'the Google window was closed first' : 'Google could not be reached')); }
        }).requestAccessToken();
      });
    });
  }

  function mount(box, o) {
    var c = o.cohort;
    box.replaceChildren();
    box.hidden = true;
    if (c.calendar_by !== 'leader' || c.status === 'draft') return;
    if (c.calendar_owner && c.calendar_owner !== o.me) return;
    o.db.rpc('my_calendar_work', { c: c.id }).then(function (r) {
      var rows = (r.data || []).map(function (s) { return Object.assign({ schedule: c.schedule }, s); });
      var head = document.createElement('h2'); head.textContent = 'Calendar';
      var said = document.createElement('p'); said.className = 'small'; said.setAttribute('role', 'status');
      box.append(head);
      box.hidden = false;
      if (r.error) { said.textContent = 'The calendar could not be read: ' + r.error.message; box.append(said); return; }
      if (!rows.length) { said.textContent = 'Every session is on your calendar, and everyone is invited.'; box.append(said); return; }
      var first = !c.calendar_owner;
      var go = document.createElement('button');
      go.type = 'button'; go.className = 'btn-primary'; go.setAttribute('data-calendar-go', '');
      go.textContent = first ? 'Send calendar invitations' : 'Update calendar invitations';
      box.append(go, said);
      go.addEventListener('click', function () {
        go.disabled = true; said.textContent = 'Connecting your Google Calendar…';
        connect().then(function (token) {
          return L.sync({ rows: rows, token: token, fetch: window.fetch.bind(window),
            progress: function (i, n) { said.textContent = 'Session ' + i + ' of ' + n + '…'; },
            done: function (s, x) {
              return o.db.rpc('my_calendar_done', { s: s.session_id, event_id: x.event_id || null, meet_url: x.meet_url || null, synced: s.want, problem: x.problem || null, cancelled: !!x.cancelled });
            } });
        }).then(function (t) {
          if (t.failed) { go.disabled = false; said.textContent = t.failed + ' could not be added, so press again to retry.'; return; }
          if (o.after) o.after();
        }, function (e) { go.disabled = false; said.textContent = 'Not sent: ' + (e && e.message ? e.message : 'no details') + '.'; });
      });
    });
  }
  window.LeaderCalendar = { mount: mount };
})();
