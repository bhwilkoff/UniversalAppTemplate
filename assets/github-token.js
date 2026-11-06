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
  // Trading the refresh token retires the access token that came with it, so
  // that one is held only if the trade fails (found November 6, 2026: every
  // fresh sign-in left a tab holding a dead token, and GitHub answered 401). A
  // sign-in fires more than one auth event; the trade happens once.
  var trading = {};
  function keep(db, session) {
    var refresh = session && session.provider_refresh_token;
    if (!refresh) return Promise.resolve(have());
    if (!trading[refresh]) trading[refresh] = ask(db, { action: 'keep', refresh_token: refresh }).then(function (t) {
      return t ? hold(t) : session.provider_token ? hold(session.provider_token) : have();
    });
    return trading[refresh];
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
    function patch(t) {
      return fetch('https://api.github.com/user/memberships/orgs/humanshaped', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'active' })
      });
    }
    return ensure(db, session).then(function (t) {
      if (!t) return false;
      return patch(t).then(function (r) {
        if (r.status !== 401) return r.ok;
        // A token this tab kept from before can have been retired.
        return fresh(db).then(function (n) { return n ? patch(n).then(function (x) { return x.ok; }) : false; });
      });
    }).catch(function () { return false; });
  }
  function fresh(db) {
    if (D) D.forget(tab());
    return ask(db, { action: 'get' }).then(hold);
  }

  function forget(db) { return db ? ask(db, { action: 'forget' }) : Promise.resolve(null); }

  window.GitHubToken = { keep: keep, ensure: ensure, fresh: fresh, acceptOrg: acceptOrg, forget: forget };
})();
