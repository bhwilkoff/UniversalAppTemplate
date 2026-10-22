// Watching the cohort's repository on GitHub, from its Conversation
// section: GitHub then emails the person about new discussions, issues,
// and files, by their own notification settings, at no cost to anyone
// (research/notes/cohort-repository-design.md, "Notifications"). Read
// and changed with the person's own GitHub token. Until the Human Shaped
// Hub app has the Watching permission, GitHub refuses, and the control
// stays out of the way.
(function (root) {
  var D = root.DiscussionsLib, U = root.UI;
  if (!D || !U) return;

  function stores() {
    var s = null, l = null;
    try { s = root.sessionStorage; } catch (e) {}
    try { l = root.localStorage; } catch (e) {}
    return { session: s, local: l };
  }

  function ask(token, method, repo, body) {
    return fetch('https://api.github.com/repos/' + repo + '/subscription', {
      method: method,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; });
    }, function () { return { status: 0, body: {} }; });
  }

  // Resolves to a span holding the control, or null when GitHub will not
  // say whether this person watches.
  function control(o) {
    var token = D.tokenFrom(o.session, stores(), Date.now(), o.db && o.db.auth && o.db.auth.storageKey);
    if (!token || !o.repo) return Promise.resolve(null);
    return ask(token, 'GET', o.repo).then(function (r) {
      // 404 means not watching. Anything else but 200 means GitHub will
      // not tell this page, so the person gets the repository's own
      // Watch button instead.
      if (r.status !== 200 && r.status !== 404) return U.link('Watch on GitHub', 'https://github.com/' + o.repo);
      var watching = r.status === 200 && r.body.subscribed === true;
      var wrap = U.el('span', 'watch-control');
      var b = U.button('', 'btn-secondary');
      var said = U.el('span', 'ui-inline-status');
      said.setAttribute('role', 'status');
      function draw() {
        b.textContent = watching ? 'Stop watching' : 'Watch on GitHub';
        b.setAttribute('aria-pressed', watching ? 'true' : 'false');
        U.say(said, watching ? 'Watching' : '');
      }
      b.addEventListener('click', function () {
        b.disabled = true;
        var q = watching ? ask(token, 'DELETE', o.repo) : ask(token, 'PUT', o.repo, { subscribed: true, ignored: false });
        q.then(function (x) {
          b.disabled = false;
          if (x.status === 200 || x.status === 204) { watching = !watching; draw(); return; }
          // GitHub would not let this page change it, so send the person
          // to the repository, where its own Watch button is.
          wrap.replaceChildren(U.link('Watch on GitHub', 'https://github.com/' + o.repo));
        });
      });
      draw();
      wrap.appendChild(b);
      wrap.appendChild(said);
      return wrap;
    });
  }

  root.CohortWatch = { control: control };
})(window);
