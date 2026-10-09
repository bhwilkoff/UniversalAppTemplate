// Where the hub's database lives. Both values are public by design: the
// rules about who can see and change what are enforced in the database
// (supabase/migrations), never here.
window.HUB = {
  url: 'https://bifrieqzkihuxfzttgvd.supabase.co',
  key: 'sb_publishable_bdJoZ7bc6Lk0Ug2Z37yn2g_A8AjkjKC',
  // The Google sign-in client in the human-shaped Cloud project. Public by
  // design: Google checks the page's origin, and Supabase checks the token.
  googleClientId: '1086485459450-me3ejointl1dq4kd2qpq4d6tqla696uf.apps.googleusercontent.com'
};

// One connection per page, shared by every script on it (AGENTS.md: "All
// API calls through one shared client"). Two clients on one page renewed
// the same session at once on October 9, 2026, and Safari then waited
// forever on sign-in checks. Each request to the hub's data and sign-in
// gets 20 seconds, so a stalled one fails and is tried again rather than
// holding up every check behind it; and the sign-in library's last steps
// (names only, never tokens) are kept for /signin-check/ to show.
(function () {
  var HUB = window.HUB, db = null, trace = [];
  var LIMIT = 20000;
  function timedFetch(url, opts) {
    var u = String(url && url.url || url);
    if (u.indexOf(HUB.url + '/rest/v1/') !== 0 && u.indexOf(HUB.url + '/auth/v1/') !== 0) return fetch(url, opts);
    var ctl = new AbortController(), o = Object.assign({}, opts);
    if (o.signal) {
      if (o.signal.aborted) ctl.abort();
      else o.signal.addEventListener('abort', function () { ctl.abort(); });
    }
    o.signal = ctl.signal;
    var timer = setTimeout(function () { note('request gave up after 20s: ' + u.replace(HUB.url, '').replace(/\?.*/, '')); ctl.abort(); }, LIMIT);
    return fetch(url, o).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }
  function note(text) {
    trace.push(new Date().toISOString().slice(11, 23) + ' ' + text);
    if (trace.length > 120) trace.shift();
  }
  HUB.trace = function () { return trace.slice(); };
  HUB.client = function () {
    if (!db) {
      db = window.supabase.createClient(HUB.url, HUB.key, {
        global: { fetch: timedFetch },
        auth: { debug: function () {
          note(Array.prototype.slice.call(arguments, 1).filter(function (a) { return typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean'; }).join(' ').replace(/\([\w-]{3,}\.\.\.\)/g, '(…)').replace(/eyJ[\w.-]+/g, '[hidden]').slice(0, 160));
        } }
      });
    }
    return db;
  };
})();

