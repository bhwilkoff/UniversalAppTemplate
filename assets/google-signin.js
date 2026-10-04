// Sign in with Google beside GitHub (DECISIONS.md, "Google sign-in beside
// GitHub"): Google's own button and, where wanted, its One Tap prompt.
// Google hands back an ID token, and the hub's Supabase either signs in
// with it or links it to the account already signed in. Nothing here
// redirects: the hub's Google provider has no client secret, so the
// ID-token way is the only way in.
//
//   HSGoogle.mount({ db, button: el, prompt: true, link: false, theme,
//                    onSession(session), onError(message) })
//
// Google's script is loaded only when this is mounted. Words by Claude,
// awaiting Ben's review.
(function () {
  var G = window.GoogleSignInLib;
  var SCRIPT = 'https://accounts.google.com/gsi/client';
  var loading = null;

  function load() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve(window.google.accounts.id);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SCRIPT; s.async = true;
      s.onload = function () { window.google && window.google.accounts ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not load.')); };
      s.onerror = function () { loading = null; reject(new Error('Google sign-in could not be reached.')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function mount(opts) {
    var clientId = window.HUB && window.HUB.googleClientId;
    var onError = opts.onError || function () {};
    if (!G || !clientId) { if (opts.button) opts.button.hidden = true; return Promise.resolve(false); }
    return Promise.all([load(), G.nonce(window.crypto)]).then(function (both) {
      var id = both[0], n = both[1];
      id.initialize({
        client_id: clientId,
        nonce: n.hashed,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: opts.link ? 'use' : 'signin',
        callback: function (response) {
          if (!response || !response.credential) return onError('Google did not send a sign-in back.');
          var call = opts.link
            ? opts.db.auth.linkIdentity({ provider: 'google', token: response.credential, nonce: n.raw })
            : opts.db.auth.signInWithIdToken({ provider: 'google', token: response.credential, nonce: n.raw });
          call.then(function (r) {
            if (r.error) return onError(r.error);
            // A nonce is good once; the next try needs a new one.
            mount(Object.assign({}, opts, { prompt: false }));
            if (opts.onSession) opts.onSession(r.data && r.data.session, r.data && r.data.user);
          }, function (e) { onError(e); });
        }
      });
      if (opts.button) {
        opts.button.hidden = false;
        opts.button.replaceChildren();
        id.renderButton(opts.button, G.buttonOptions(opts.theme));
      }
      if (opts.prompt) id.prompt();
      return true;
    }, function (e) {
      if (opts.button) opts.button.hidden = true;
      onError(e);
      return false;
    });
  }

  window.HSGoogle = { mount: mount };
})();
