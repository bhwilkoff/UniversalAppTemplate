// The top of every page that belongs to one cohort (PAGES.md, "One
// cohort, one page, six sections"; DESIGN-KIT.md, Tabs): a breadcrumb, the
// person's role in the cohort, and one row of the cohort's six sections,
// the same for everyone: Google Classroom's pattern, one structure, with
// a leader's tools inside the shared sections. The sections are on the
// cohort's page (?t=); the live session (/live/) is a session while it
// runs, so its row marks Sessions. Used by cohort.js and live.js.
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function crumbs(items) {
    var nav = el('nav', 'crumbs'), ol = el('ol');
    nav.setAttribute('aria-label', 'Breadcrumb');
    items.forEach(function (x) {
      var li = el('li'), a = el('a', null, x[1]);
      a.href = x[0];
      li.appendChild(a); ol.appendChild(li);
    });
    nav.appendChild(ol);
    return nav;
  }

  // The cohort's sections, in their fixed order.
  function places(o) {
    var list = [
      { key: 'week', label: 'This week' },
      { key: 'sessions', label: 'Sessions' },
      { key: 'talk', label: 'Conversation' },
      { key: 'files', label: 'Files' },
      { key: 'exchanges', label: 'Exchanges' },
      { key: 'people', label: 'People' }
    ];
    if (o.member) list.push({ key: 'mine', label: 'Your work' });
    if (o.teaching) list.push({ key: 'settings', label: 'Settings' });
    return list;
  }
  function href(o, p) {
    return '/cohort/?c=' + encodeURIComponent(o.cohort.slug) + (p.key === 'week' ? '' : '&t=' + p.key);
  }

  // o: { cohort: {id, slug, title, status}, teaching, member,
  //      current: 'home' | 'live', panels (the cohort page's [data-tab]
  //      panels), onChange }
  // Returns the tabs control on the cohort's page.
  function draw(mount, o) {
    if (!mount) return null;
    var c = o.cohort, slug = encodeURIComponent(c.slug);
    var root = o.teaching ? ['/teach/', 'Leading'] : ['/', 'Home'];
    mount.replaceChildren(crumbs(o.current === 'live' ? [root, ['/cohort/?c=' + slug, c.title]] : [root]));
    mount.hidden = false;
    var role = mount.parentNode && mount.parentNode.querySelector('[data-cohort-role]');
    if (role && window.UI) {
      role.replaceChildren(window.UI.tag(o.teaching ? 'Leader' : 'Learner'));
      if (o.teaching && o.member) role.appendChild(window.UI.tag('Learner'));
      role.hidden = false;
    }
    var list = places(o);
    // The row sits under the cohort's name and role when the page has a
    // header beside the crumbs: crumb, name, role, then the sections.
    var holder = el('div', 'cohort-row');
    var head = mount.parentNode && mount.parentNode.querySelector(':scope > .page-head');
    if (head) { mount.parentNode.querySelectorAll(':scope > .cohort-row').forEach(function (n) { n.remove(); }); head.after(holder); }
    else mount.appendChild(holder);
    if (!window.UI) return null;
    var tabs = window.UI.tabs(holder, list.map(function (p) {
      return o.current === 'live' ? { key: p.key, label: p.label, href: href(o, p) } : { key: p.key, label: p.label };
    }), o.current === 'live' ? null : o.panels, { label: c.title, onChange: o.onChange });
    if (o.current === 'live') {
      var here = holder.querySelector('a[href$="&t=sessions"]');
      if (here) { here.setAttribute('aria-current', 'page'); window.dispatchEvent(new Event('resize')); }
      return null;
    }
    return tabs;
  }

  window.CohortNav = { draw: draw, places: places, href: href };
})();
