// What every teacher page for time polls shares (/teach/times/, /new/,
// /poll/): one hub client, the signed-out and not-a-teacher states, and the
// teacher's own name. Each page draws only its own content.
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }

  // start(root, ready): ready(db, me, myName) runs once a teacher is signed in.
  function start(root, ready) {
    var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
    function show(state) {
      root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
    }
    function fail(message) { root.querySelector('[data-error-text]').textContent = message; show('error'); }
    function load() {
      show('loading');
      db.auth.getSession().then(function (s) {
        var session = s.data && s.data.session;
        if (!session) return show('signed-out');
        var me = session.user;
        return db.from('teachers').select('user_id').eq('user_id', me.id).maybeSingle().then(function (r) {
          if (r.error) return fail('Your teaching access could not be checked: ' + r.error.message);
          if (!r.data) return show('not-teacher');
          return db.from('profiles').select('display_name, github_login').eq('id', me.id).maybeSingle().then(function (pr) {
            var name = pr.data ? ((pr.data.display_name || '').trim() || pr.data.github_login || '') : '';
            show('teacher');
            return ready(db, me, name);
          });
        });
      }).catch(function (err) { fail('Something went wrong: ' + said(err) + '.'); });
    }
    var retry = root.querySelector('[data-reload]');
    if (retry) retry.addEventListener('click', load);
    load();
    return { show: show, fail: fail, reload: load };
  }

  window.TeachTimesPage = { start: start, el: el, said: said };
})();
