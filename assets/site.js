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

// When someone is signed in, the site is their workspace (PAGES.md, "How
// you find your way"): a sidebar of their own things (home, each of their
// cohorts, exchanges, teaching, running the hub) with the public pages in
// a quieter group below, and in place of the sign-in button their picture
// opening home, account, and sign out. The head marks <html
// data-signed-in> before the page draws, from the session Supabase keeps
// in this browser; what the sidebar lists comes from a note pages keep
// (HS.roles), read again in the background on pages with the hub's client.
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
  var here = location.pathname, query = new URLSearchParams(location.search);

  // ---- the note of what this person holds ------------------------------
  window.HS = window.HS || {};
  function readNote() {
    try { var c = JSON.parse(localStorage.getItem('hs-roles') || 'null'); return c && c.uid === user.id ? c : null; } catch (e) { return null; }
  }
  window.HS.roles = function (r) {
    if (r === undefined) return readNote();
    var kept = Object.assign({ cohorts: [] }, readNote() || {}, r, { uid: user.id, at: Date.now() });
    try { localStorage.setItem('hs-roles', JSON.stringify(kept)); } catch (e) {}
    drawNav(kept);
    return kept;
  };
  window.HS.forgetRoles = function () { try { localStorage.removeItem('hs-roles'); } catch (e) {} };

  // ---- the sidebar ------------------------------------------------------
  var nav = el('nav', 'app-nav');
  nav.id = 'app-nav';
  nav.setAttribute('aria-label', 'Your Human Shaped');
  function item(list, href, text, current, cls) {
    var li = el('li', cls || null), a = el('a', null, text);
    a.href = href;
    if (current) a.setAttribute('aria-current', 'page');
    li.appendChild(a); list.appendChild(li);
    return li;
  }
  function cohortHere(c) {
    var slug = query.get('c');
    return (slug === c.slug && /^\/(cohort|live|board)\//.test(here)) || (slug === c.id && /^\/teach\/cohort\//.test(here));
  }
  function drawNav(r) {
    r = r || {};
    nav.replaceChildren();
    var main = el('ul', 'app-nav-list');
    item(main, '/', 'Home', here === '/' && !query.has('public'));
    var cohorts = (r.cohorts || []).filter(function (c) { return c.status !== 'finished'; });
    if (cohorts.length) {
      var g = el('li', 'app-nav-group');
      g.appendChild(el('span', 'app-nav-label', 'Your cohorts'));
      var sub = el('ul');
      cohorts.forEach(function (c) {
        item(sub, c.role === 'teacher' ? '/teach/cohort/?c=' + c.id : '/cohort/?c=' + encodeURIComponent(c.slug), c.title, cohortHere(c));
      });
      g.appendChild(sub);
      main.appendChild(g);
    }
    item(main, '/exchanges/', 'Exchanges', /^\/exchange/.test(here));
    if (r.teacher) item(main, '/teach/', 'Teaching', /^\/teach\//.test(here) && !/^\/teach\/(cohort|guide)\//.test(here));
    if (r.admin) item(main, '/admin/', 'Running the hub', /^\/admin\//.test(here));
    nav.appendChild(main);
    nav.appendChild(el('span', 'app-nav-label', 'Human Shaped'));
    var quiet = el('ul', 'app-nav-list app-nav-quiet');
    item(quiet, '/cohorts/', 'Open cohorts', here === '/cohorts/');
    item(quiet, '/apps/', 'Apps', /^\/apps\//.test(here) && here !== '/apps/mine/');
    item(quiet, '/events/', 'Events', here === '/events/');
    item(quiet, '/principles/', 'Principles', here === '/principles/');
    if (r.teacher) item(quiet, '/teach/guide/', 'Teaching guide', /^\/teach\/guide\//.test(here));
    nav.appendChild(quiet);
    // An area's row shows at once from the note, so the page does not jump
    // when the hub answers; the page still checks before drawing anything.
    if (r.teacher) document.querySelectorAll('[data-area-nav="teaching"]').forEach(function (n) {
      n.hidden = false;
      n.querySelectorAll('[data-needs-right]').forEach(function (li) { li.hidden = !r[li.getAttribute('data-needs-right')]; });
    });
    if (r.admin) document.querySelectorAll('[data-area-nav="admin"]').forEach(function (n) { n.hidden = false; });
  }
  var header = document.querySelector('.site-header');
  var withNav = !document.body.hasAttribute('data-no-app-nav');
  if (withNav) header.after(nav);
  drawNav(readNote());
  function headerHeight() { document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px'); }
  headerHeight();
  window.addEventListener('resize', headerHeight);

  // At phone and tablet width the sidebar is a drawer behind Menu.
  var menu = el('button', 'app-menu-button');
  menu.type = 'button';
  menu.setAttribute('aria-controls', 'app-nav');
  menu.setAttribute('aria-expanded', 'false');
  menu.appendChild(el('span', null, 'Menu'));
  function setOpen(open) {
    document.documentElement.classList.toggle('app-nav-open', open);
    menu.setAttribute('aria-expanded', String(open));
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
  }
  menu.addEventListener('click', function () { setOpen(!document.documentElement.classList.contains('app-nav-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.documentElement.classList.contains('app-nav-open')) { setOpen(false); menu.focus(); } });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  var wordmark = header.querySelector('.wordmark');
  if (withNav) { if (wordmark) wordmark.after(menu); else header.querySelector('.wrap').prepend(menu); }

  // ---- the account button -----------------------------------------------
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
    var li = el('li'), a = el('a', null, x[1]);
    a.href = x[0];
    li.appendChild(a);
    list.appendChild(li);
  });
  wrap.appendChild(button);
  wrap.appendChild(list);
  link.replaceWith(wrap);

  // Read again in the background when the note is five minutes old, on a
  // page that already has the hub's client: rights and cohorts together.
  window.addEventListener('load', function () {
    var kept = readNote();
    if (kept && kept.cohorts && Date.now() - kept.at < 3e5) return;
    if (!window.HUB || !window.supabase) return;
    var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
    Promise.all([
      db.from('teachers').select('*').eq('user_id', user.id).maybeSingle(),
      db.from('enrollments').select('role, status, cohorts(id, slug, title, status)').eq('user_id', user.id).neq('status', 'left'),
      db.from('cohort_teachers').select('cohorts(id, slug, title, status)').eq('user_id', user.id)
    ]).then(function (res) {
      if (res.some(function (x) { return x.error; })) return;
      var t = res[0].data, seen = {}, cohorts = [];
      res[2].data.forEach(function (x) { var c = x.cohorts; if (c && !seen[c.id]) { seen[c.id] = 1; cohorts.push({ id: c.id, slug: c.slug, title: c.title, status: c.status, role: 'teacher' }); } });
      res[1].data.forEach(function (x) { var c = x.cohorts; if (c && !seen[c.id]) { seen[c.id] = 1; cohorts.push({ id: c.id, slug: c.slug, title: c.title, status: c.status, role: x.role }); } });
      window.HS.roles({ teacher: !!t, admin: !!(t && t.can_admin), can_approve: !!(t && t.can_approve), can_sign: !!(t && t.can_sign), cohorts: cohorts });
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
