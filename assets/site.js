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
  // One structure for everyone (PAGES.md, "The signed-in platform"): Home,
  // the cohorts you learn in, the cohorts you lead with the leader's own
  // places, exchanges, and Admin for admins, then the public pages. Each
  // item has an icon so the collapsed sidebar still reads.
  var ICONS = '/assets/icons.svg?v=20261022j#';
  function svgIcon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', ICONS + name);
    svg.appendChild(use);
    return svg;
  }
  var nav = el('nav', 'app-nav');
  nav.id = 'app-nav';
  nav.setAttribute('aria-label', 'Human Shaped');
  function item(list, href, text, icon, current, note) {
    var li = el('li'), a = el('a');
    a.href = href;
    a.appendChild(svgIcon(icon));
    a.appendChild(el('span', 'app-nav-text', text));
    if (note) a.appendChild(el('span', 'app-nav-note', note));
    a.setAttribute('data-tip', note ? text + ', ' + note : text);
    if (current) a.setAttribute('aria-current', 'page');
    li.appendChild(a); list.appendChild(li);
    return li;
  }
  function section(label, href, current) {
    var g = el('li', 'app-nav-group');
    var head = href ? el('a', 'app-nav-label', label) : el('span', 'app-nav-label', label);
    if (href) { head.href = href; if (current) head.setAttribute('aria-current', 'page'); }
    if (label) g.appendChild(head);
    var sub = el('ul');
    g.appendChild(sub);
    return { li: g, list: sub };
  }
  function cohortHere(c) {
    var slug = query.get('c');
    return (slug === c.slug && /^\/(cohort|live|board)\//.test(here)) || (slug === c.id && /^\/teach\/cohort\//.test(here));
  }
  function drawNav(r) {
    r = r || {};
    nav.replaceChildren();
    var main = el('ul', 'app-nav-list');
    item(main, '/', 'Home', 'house', here === '/' && !query.has('public'));
    var cohorts = (r.cohorts || []).filter(function (c) { return c.status !== 'finished'; });
    var learning = cohorts.filter(function (c) { return c.role !== 'teacher'; });
    var leading = cohorts.filter(function (c) { return c.role === 'teacher'; });
    if (learning.length) {
      var l = section('Learning');
      learning.forEach(function (c) { item(l.list, '/cohort/?c=' + encodeURIComponent(c.slug), c.title, 'student', cohortHere(c)); });
      main.appendChild(l.li);
    }
    if (r.teacher) {
      var t = section('Leading');
      leading.forEach(function (c) { item(t.list, '/cohort/?c=' + encodeURIComponent(c.slug), c.title, 'chalkboard-teacher', cohortHere(c), c.status === 'draft' ? 'Draft' : null); });
      item(t.list, '/teach/feedback/', 'Feedback', 'chat-circle-text', here === '/teach/feedback/');
      item(t.list, '/teach/times/', 'Polls', 'calendar-check', /^\/teach\/times\//.test(here));
      if (r.can_approve) item(t.list, '/teach/requests/', 'Requests to lead', 'user-plus', here === '/teach/requests/');
      if (r.can_sign) item(t.list, '/teach/signing/', 'Signing', 'seal-check', here === '/teach/signing/');
      item(t.list, '/teach/guide/', "Leader's guide", 'book-open-text', /^\/teach\/guide\//.test(here));
      main.appendChild(t.li);
    }
    var o = section('');
    o.li.classList.add('app-nav-plain');
    item(o.list, '/exchanges/', 'Exchanges', 'video-camera', /^\/exchange/.test(here));
    if (r.admin) item(o.list, '/admin/', 'Admin', 'shield-check', /^\/admin\//.test(here));
    main.appendChild(o.li);
    nav.appendChild(main);
    var pub = el('ul', 'app-nav-list app-nav-quiet');
    var p = section('Human Shaped');
    item(p.list, '/cohorts/', 'Open cohorts', 'door-open', here === '/cohorts/');
    item(p.list, '/apps/', 'Apps', 'app-window', /^\/apps\//.test(here) && here !== '/apps/mine/');
    item(p.list, '/events/', 'Events', 'calendar-blank', here === '/events/');
    item(p.list, '/principles/', 'Principles', 'compass', here === '/principles/');
    pub.appendChild(p.li);
    nav.appendChild(pub);
    nav.appendChild(collapse);
  }

  // From 64rem the sidebar collapses to its icons; the choice is this
  // browser's own (the head script applies it before the page draws).
  var collapse = el('button', 'app-nav-collapse');
  collapse.type = 'button';
  collapse.appendChild(svgIcon('sidebar-simple'));
  var collapseText = el('span', 'app-nav-text');
  collapse.appendChild(collapseText);
  function collapsed() { return document.documentElement.getAttribute('data-nav') === 'collapsed'; }
  function drawCollapse() {
    var c = collapsed();
    collapseText.textContent = c ? 'Expand sidebar' : 'Collapse sidebar';
    collapse.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar');
    collapse.setAttribute('aria-expanded', String(!c));
    collapse.setAttribute('data-tip', c ? 'Expand sidebar' : 'Collapse sidebar');
  }
  collapse.addEventListener('click', function () {
    var c = !collapsed();
    if (c) document.documentElement.setAttribute('data-nav', 'collapsed'); else document.documentElement.removeAttribute('data-nav');
    try { if (c) localStorage.setItem('hs-nav', 'collapsed'); else localStorage.removeItem('hs-nav'); } catch (e) {}
    drawCollapse();
  });
  try { if (localStorage.getItem('hs-nav') === 'collapsed') document.documentElement.setAttribute('data-nav', 'collapsed'); } catch (e) {}
  drawCollapse();
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
