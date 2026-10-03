(function () {
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('hs-theme', next); } catch (e) {}
    });
  });
})();

(function () {
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var text = document.getElementById(b.getAttribute('data-copy')).textContent;
      navigator.clipboard.writeText(text).then(function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = label; }, 2000);
      }, function () {
        b.textContent = 'Select the code above to copy it';
      });
    });
  });
})();

// When someone is signed in, the header's sign-in button names them and
// goes to their account. Supabase keeps the session in this browser under
// sb-<project>-auth-token; nothing is fetched to read it.
(function () {
  var link = document.querySelector('.site-header .btn-github');
  if (!link) return;
  var meta = null;
  try {
    var raw = localStorage.getItem('sb-bifrieqzkihuxfzttgvd-auth-token');
    var s = raw && JSON.parse(raw);
    if (s && s.user && s.expires_at * 1000 > Date.now() - 7 * 864e5) meta = s.user.user_metadata || {};
  } catch (e) { return; }
  if (!meta) return;
  var login = meta.user_name || meta.preferred_username;
  var label = link.querySelector('span');
  if (label) label.textContent = login ? '@' + login : 'Your account';
  link.setAttribute('aria-label', 'Your account' + (login ? ', signed in as @' + login : ''));
  link.href = '/account/';
})();
