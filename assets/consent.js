// The consent page for connecting a student's own AI agent
// (/oauth/consent/). Supabase's OAuth server sends people here with an
// authorization_id; this page signs them in with GitHub if needed, shows
// what the agent is asking for, and sends their answer back. What an
// agent can and cannot read is enforced by the database (migration 6),
// not by this page.
(function () {
  var root = document.querySelector('[data-consent]');
  if (!root || !window.supabase || !window.HUB) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var id = new URLSearchParams(location.search).get('authorization_id');

  function $(sel) { return root.querySelector(sel); }
  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function fail(message) { $('[data-error-text]').textContent = message; show('error'); }
  function host(url) { try { return new URL(url).host || url; } catch (e) { return url; } }

  $('[data-sign-in]').addEventListener('click', function () {
    db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.href } })
      .then(function (r) { if (r.error) fail(r.error.message); });
  });

  function answer(approve) {
    root.querySelectorAll('[data-approve], [data-deny]').forEach(function (b) { b.disabled = true; });
    var call = approve ? db.auth.oauth.approveAuthorization(id) : db.auth.oauth.denyAuthorization(id);
    call.then(function (r) {
      if (r.error) return fail('Your answer could not be sent: ' + r.error.message);
      $('[data-done-text]').textContent = approve
        ? 'Connected. Your agent is on its way back to you, and you can close this page.'
        : 'Not connected. Nothing was shared, and you can close this page.';
      show('done');
    });
  }
  $('[data-approve]').addEventListener('click', function () { answer(true); });
  $('[data-deny]').addEventListener('click', function () { answer(false); });

  if (!id) return fail('This page opens from your agent when you connect it to Human Shaped, so there is nothing to answer here yet.');

  db.auth.getSession().then(function (s) {
    var session = s.data && s.data.session;
    if (!session) return show('signed-out');
    return db.auth.oauth.getAuthorizationDetails(id).then(function (r) {
      if (r.error) return fail('This request could not be read: ' + r.error.message + '. It may have expired, so start again from your agent.');
      var d = r.data;
      // Already allowed before: Supabase sends the agent straight back.
      if (!('authorization_id' in d)) { location.href = d.redirect_url; return; }
      $('[data-client-name]').textContent = d.client && d.client.name ? d.client.name : 'An AI agent';
      var meta = session.user.user_metadata || {};
      $('[data-who]').textContent = meta.user_name ? '@' + meta.user_name : (d.user && d.user.email) || 'you';
      $('[data-redirect]').textContent = host(d.redirect_uri);
      show('ask');
    });
  }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
})();
