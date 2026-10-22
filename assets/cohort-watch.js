// Watching the cohort's repository on GitHub, from its Conversation
// section: GitHub then emails the person about new discussions, issues,
// and files, by their own notification settings, at no cost to anyone
// (research/notes/cohort-repository-design.md, "Notifications").
//
// GitHub lets an app read which repositories a person watches (the
// Watching permission, /user/subscriptions) but not change it: the
// repository's own subscription endpoint refuses every app token
// (checked October 22, 2026). So this says whether they watch, and the
// change is made with GitHub's own Watch button, one click away.
(function (root) {
  var D = root.DiscussionsLib, U = root.UI;
  if (!D || !U) return;
  var PAGES = 3;

  function stores() {
    var s = null, l = null;
    try { s = root.sessionStorage; } catch (e) {}
    try { l = root.localStorage; } catch (e) {}
    return { session: s, local: l };
  }

  // Whether repo is among the repositories this person watches: true,
  // false, or null when GitHub will not say.
  function watches(token, repo) {
    var want = String(repo).toLowerCase();
    function page(n) {
      return fetch('https://api.github.com/user/subscriptions?per_page=100&page=' + n, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        cache: 'no-store'
      }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }).then(function (list) {
        if (!Array.isArray(list)) return null;
        if (list.some(function (x) { return x && String(x.full_name).toLowerCase() === want; })) return true;
        return list.length === 100 && n < PAGES ? page(n + 1) : false;
      });
    }
    return page(1);
  }

  // Resolves to the control: Watching with a link to change it, or the
  // link to start watching.
  function control(o) {
    if (!o.repo) return Promise.resolve(null);
    var url = 'https://github.com/' + o.repo;
    var start = function () { return U.link('Watch on GitHub', url); };
    var token = D.tokenFrom(o.session, stores(), Date.now(), o.db && o.db.auth && o.db.auth.storageKey);
    if (!token) return Promise.resolve(start());
    return watches(token, o.repo).then(function (yes) {
      if (!yes) return start();
      var wrap = U.el('span', 'watch-control');
      wrap.appendChild(U.status('watch', 'on'));
      var change = U.el('a', null, 'Change on GitHub');
      change.href = url;
      wrap.appendChild(change);
      return wrap;
    });
  }

  root.CohortWatch = { control: control };
})(window);
