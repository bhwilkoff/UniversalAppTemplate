// Pure helpers for signing in with Google beside GitHub (DECISIONS.md,
// "Google sign-in beside GitHub"). Used by assets/google-signin.js on
// /account/ and in the Meet add-on, and tested in
// tools/test/google-signin-lib.test.mjs.
//
// Google's sign-in hands the page an ID token, and the hub's Supabase
// signs in with it (signInWithIdToken), or links it to the account
// already signed in (linkIdentity with a token). Google is told a hashed
// nonce and Supabase the raw one, because Supabase hashes it to compare
// (supabase.com/docs/guides/auth/social-login/auth-google).
(function (root) {
  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  // A fresh nonce for one sign-in: { raw, hashed }. `cryptoObj` is the
  // page's window.crypto (or node's webcrypto in the tests).
  function nonce(cryptoObj) {
    var bytes = new Uint8Array(32);
    cryptoObj.getRandomValues(bytes);
    var raw = hex(bytes.buffer);
    return cryptoObj.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (d) {
      return { raw: raw, hashed: hex(d) };
    });
  }

  // Which of the two accounts a person has linked, from Supabase's
  // user.identities (or getUserIdentities()).
  function linked(identities) {
    var list = Array.isArray(identities) ? identities : [];
    var has = function (p) { return list.some(function (i) { return i && i.provider === p; }); };
    return { github: has('github'), google: has('google'), count: list.length };
  }

  // Supabase refuses to unlink the last way in, and so do we: a person
  // can unlink one only while another stays.
  function canUnlink(identities, provider) {
    var l = linked(identities);
    return l.count >= 2 && !!l[provider];
  }

  // The identity object to hand unlinkIdentity, or null.
  function identityFor(identities, provider) {
    var list = Array.isArray(identities) ? identities : [];
    return list.filter(function (i) { return i && i.provider === provider; })[0] || null;
  }

  // Someone signed in without GitHub cannot join a cohort or see one,
  // because the cohort's team and conversation are on GitHub.
  function needsGitHub(profile) {
    return !profile || !profile.github_login;
  }

  // Supabase's answer when the GitHub (or Google) account being linked
  // already belongs to another account here. Its code is
  // identity_already_exists; older servers said it only in words.
  function alreadyLinkedElsewhere(error) {
    if (!error) return false;
    if (error.code === 'identity_already_exists') return true;
    return /already (been )?linked|already exists/i.test(String(error.message || ''));
  }

  // An account that is safe to remove when its person would rather use
  // the account their GitHub already has: it has Google and nothing else,
  // and no GitHub name, so it can hold no cohort, share, or credential.
  function emptyGoogleOnly(identities, profile) {
    var l = linked(identities);
    return l.google && !l.github && l.count === 1 && needsGitHub(profile);
  }

  // The window the panel opens to link GitHub, and the messages between
  // them: the window asks for the panel's sign-in, the panel answers with
  // it (AddonLib.handoff's shape), and the window answers back with the
  // sign-in that now includes GitHub.
  var WANT = 'hs-want-session';
  function linkWindowUrl(origin) { return origin + '/account/?link=github&handoff=meet'; }
  function wantMessage() { return { type: WANT }; }
  function isWant(event, origin, opened) {
    return !!(event && event.origin === origin && opened && event.source === opened && event.data && event.data.type === WANT);
  }

  // Options for Google's own button, the same on every page.
  function buttonOptions(theme) {
    return { type: 'standard', theme: theme === 'dark' ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 280 };
  }

  var lib = {
    nonce: nonce, linked: linked, canUnlink: canUnlink, identityFor: identityFor, needsGitHub: needsGitHub,
    alreadyLinkedElsewhere: alreadyLinkedElsewhere, emptyGoogleOnly: emptyGoogleOnly,
    linkWindowUrl: linkWindowUrl, wantMessage: wantMessage, isWant: isWant, buttonOptions: buttonOptions
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.GoogleSignInLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
