// A GitHub token for this tab, without asking the person to sign in again
// (migration 20261023020000, supabase/functions/github-token). Right after
// a GitHub sign-in or link, the session carries GitHub's refresh token for
// one moment; keep() hands it to the server before DiscussionsLib scrubs
// it from this browser. Later, any page whose tab has no token calls
// ensure(), which asks the server for a fresh one and keeps it in this tab
// only (sessionStorage), as before.
(function () {
  var D = window.DiscussionsLib;
  function tab() { try { return window.sessionStorage; } catch (e) { return null; } }
  function have() { return D ? D.read(tab(), Date.now()) : null; }
  function hold(token) { if (D && token) D.remember({ provider_token: token }, tab(), Date.now()); return token || null; }
  function ask(db, body) {
    return db.functions.invoke('github-token', { body: body }).then(function (r) {
      return r && r.data && r.data.token ? r.data.token : null;
    }, function () { return null; });
  }

  // Right after sign-in: keep the refresh token on the server.
  function keep(db, session) {
    var refresh = session && session.provider_refresh_token;
    if (!refresh) return Promise.resolve(have());
    if (session.provider_token) hold(session.provider_token);
    return ask(db, { action: 'keep', refresh_token: refresh }).then(function (t) { return t ? hold(t) : have(); });
  }

  // Any time: this tab's token, or a fresh one from the server.
  function ensure(db, session) {
    if (session && session.provider_refresh_token) return keep(db, session);
    var t = have();
    if (t) return Promise.resolve(t);
    if (!db || !session) return Promise.resolve(null);
    return ask(db, { action: 'get' }).then(hold);
  }

  // Joining a cohort is the person's yes, so the waiting organization
  // invitation is accepted with their own token. A refusal changes nothing:
  // GitHub's own page still works.
  function acceptOrg(db, session) {
    return ensure(db, session).then(function (t) {
      if (!t) return false;
      return fetch('https://api.github.com/user/memberships/orgs/humanshaped', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'active' })
      }).then(function (r) { console.log('[invite] accept', r.status); return r.ok; });
    }).catch(function () { return false; });
  }

  function forget(db) { return db ? ask(db, { action: 'forget' }) : Promise.resolve(null); }

  window.GitHubToken = { keep: keep, ensure: ensure, acceptOrg: acceptOrg, forget: forget };
})();
