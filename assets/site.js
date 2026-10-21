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

  // Teaching, second, for anyone who teaches; Run the hub in the account
  // menu for an admin (PAGES.md, "How you find your way"). The roles come
  // from HS.roles, which pages that read them keep in this browser.
  var teachItem = null, adminItem = null;
  function drawRoles(r) {
    var teaching = !!(r && r.teacher), admin = !!(r && r.admin);
    // An area's row shows at once from the note, so the page does not jump
    // when the hub answers; the page still checks before drawing anything.
    if (teaching) document.querySelectorAll('[data-area-nav="teaching"]').forEach(function (n) { n.hidden = false; });
    if (admin) document.querySelectorAll('[data-area-nav="admin"]').forEach(function (n) { n.hidden = false; });
    if (nav && teaching && !teachItem) {
      teachItem = el('li');
      var a = el('a', null, 'Teaching');
      a.href = '/teach/';
      if (/^\/teach\//.test(location.pathname)) {
        nav.querySelectorAll('[aria-current]').forEach(function (x) { x.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'page');
      }
      teachItem.appendChild(a);
      nav.insertBefore(teachItem, nav.children[1] || null);
    } else if (teachItem && !teaching) { teachItem.remove(); teachItem = null; }
    if (admin && !adminItem) {
      adminItem = el('li');
      var b = el('a', null, 'Run the hub');
      b.href = '/admin/';
      adminItem.appendChild(b);
      list.insertBefore(adminItem, list.children[2] || null);
    } else if (adminItem && !admin) { adminItem.remove(); adminItem = null; }
  }
  window.HS = window.HS || {};
  window.HS.roles = function (r) {
    if (r === undefined) {
      try { var c = JSON.parse(localStorage.getItem('hs-roles') || 'null'); return c && c.uid === user.id ? c : null; } catch (e) { return null; }
    }
    var kept = { uid: user.id, teacher: !!r.teacher, admin: !!r.admin, at: Date.now() };
    try { localStorage.setItem('hs-roles', JSON.stringify(kept)); } catch (e) {}
    drawRoles(kept);
    return kept;
  };

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
  drawRoles(window.HS.roles());

  // Roles change rarely, so the note is read again only when it is a day
  // old, on a page that already has the hub's client.
  window.addEventListener('load', function () {
    var kept = window.HS.roles();
    if (kept && Date.now() - kept.at < 864e5) return;
    if (!window.HUB || !window.supabase) return;
    var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
    db.from('teachers').select('*').eq('user_id', user.id).maybeSingle().then(function (r) {
      if (!r.error) window.HS.roles({ teacher: !!r.data, admin: !!(r.data && r.data.can_admin) });
    });
  });

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

// An area's row of links (.area-nav: Teaching, Run the hub, one cohort)
// marks the page you are on, by its address (PAGES.md).
(function () {
  function mark() {
    document.querySelectorAll('.area-nav').forEach(function (nav) {
      var best = null, bestLen = -1;
      nav.querySelectorAll('a[href]').forEach(function (a) {
        a.removeAttribute('aria-current');
        var u = new URL(a.href, location.href);
        var exact = u.pathname === location.pathname && (!u.search || u.search === location.search);
        var len = exact ? 1e6 : (location.pathname.indexOf(u.pathname) === 0 && u.pathname.length > 1 && a.hasAttribute('data-prefix') ? u.pathname.length : -1);
        var also = a.getAttribute('data-also');
        if (also && location.pathname.indexOf(also) === 0) len = Math.max(len, also.length);
        if (len > bestLen) { best = a; bestLen = len; }
      });
      if (best && bestLen >= 0) best.setAttribute('aria-current', 'page');
    });
  }
  window.HS = window.HS || {};
  window.HS.markAreaNav = mark;
  mark();
})();
