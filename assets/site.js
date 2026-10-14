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
  // A button's own words changing is not announced, so the result is
  // also said once in a quiet line that screen readers read out.
  var said = null;
  function say(text) {
    if (!said) {
      said = document.createElement('p');
      said.className = 'visually-hidden';
      said.setAttribute('role', 'status');
      document.body.appendChild(said);
    }
    said.textContent = '';
    setTimeout(function () { said.textContent = text; }, 50);
  }
  var buttons = document.querySelectorAll('[data-copy]');
  if (buttons.length) say('');
  buttons.forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var text = document.getElementById(b.getAttribute('data-copy')).textContent;
      navigator.clipboard.writeText(text).then(function () {
        b.textContent = 'Copied';
        say('Copied.');
        setTimeout(function () { b.textContent = label; }, 2000);
      }, function () {
        b.textContent = 'Select the code above to copy it';
        say('It could not be copied, so select the code above to copy it.');
      });
    });
  });
})();

// When someone is signed in, the header is theirs: a labeled Home first in
// the menu (their own home, not the pitch), and in place of the sign-in
// button, their picture and name opening a short list: home, account, and
// sign out (research/notes/signed-in-experience-notes.md). Supabase keeps
// the session in this browser under sb-<project>-auth-token; nothing is
// fetched to read it.
(function () {
  var link = document.querySelector('.site-header .header-actions .btn-primary');
  if (!link) return;
  var user = null;
  try {
    var raw = localStorage.getItem('sb-bifrieqzkihuxfzttgvd-auth-token');
    var s = raw && JSON.parse(raw);
    if (s && s.user && s.expires_at * 1000 > Date.now() - 7 * 864e5) user = s.user;
  } catch (e) { return; }
  if (!user) return;
  var meta = user.user_metadata || {};
  var login = meta.user_name || meta.preferred_username;
  var label = login ? '@' + login : (meta.full_name || meta.name || 'Your account');
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var nav = document.querySelector('.site-header .nav ul');
  if (nav) {
    var li = el('li'), home = el('a', null, 'Home');
    home.href = '/';
    if (location.pathname === '/' && !/[?&]public\b/.test(location.search)) home.setAttribute('aria-current', 'page');
    li.appendChild(home);
    nav.insertBefore(li, nav.firstChild);
  }

  var wrap = el('div', 'account-menu');
  var button = el('button', 'account-button');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'account-menu-list');
  if (/^https:\/\//.test(meta.avatar_url || '')) {
    var img = el('img');
    img.src = meta.avatar_url; img.alt = ''; img.width = 28; img.height = 28;
    button.appendChild(img);
  }
  button.appendChild(el('span', 'account-name', label));
  button.setAttribute('aria-label', 'Your account, signed in as ' + label);
  var list = el('ul', 'account-menu-list');
  list.id = 'account-menu-list';
  list.hidden = true;
  [['/', 'Your home'], ['/account/', 'Your account'], ['/account/?sign-out', 'Sign out']].forEach(function (x) {
    var item = el('li'), a = el('a', null, x[1]);
    a.href = x[0];
    item.appendChild(a);
    list.appendChild(item);
  });
  wrap.appendChild(button);
  wrap.appendChild(list);
  link.replaceWith(wrap);

  function close(focus) {
    if (list.hidden) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focus) button.focus();
  }
  button.addEventListener('click', function () {
    var opening = list.hidden;
    list.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  });
  wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(false); });
  wrap.addEventListener('focusout', function (e) { if (e.relatedTarget && !wrap.contains(e.relatedTarget)) close(false); });
})();
