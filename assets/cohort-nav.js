// The top of every page that belongs to one cohort (PAGES.md, "The
// signed-in platform"; DESIGN-KIT.md, Tabs): a breadcrumb, the person's
// role in the cohort, and one row of the cohort's sections, the same for
// everyone, with the leader's sections added at the end (Google
// Classroom's pattern: one structure, items added for the role you hold).
// The sections live on three pages (the cohort's home, its live session,
// and the leader's tools); on each page its own sections switch in place
// (?t=) and the others are links, so the row never changes as you move.
// Used by cohort.js, live.js, teach-cohort.js.
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

  // The cohort's sections, in their fixed order. at: the page that holds it.
  function places(o) {
    var c = o.cohort;
    var list = [
      { key: 'week', label: 'This week', at: 'home' },
      { key: 'talk', label: 'Conversation', at: 'home' },
      { key: 'exchanges', label: 'Exchanges', at: 'home' },
      { key: 'people', label: 'People', at: o.teaching ? 'teach' : 'home' }
    ];
    if (o.member) list.push({ key: 'mine', label: 'Your work', at: 'home' });
    list.push({ key: 'live', label: 'Live session', at: 'live' });
    if (o.teaching) {
      if (c.status === 'draft' || c.status === 'open') list.push({ key: 'setup', label: 'Setup', at: 'teach' });
      list.push(
        { key: 'sessions', label: 'Sessions', at: 'teach' },
        { key: 'followup', label: 'Follow-up', at: 'teach' },
        { key: 'groups', label: 'Groups', at: 'teach' },
        { key: 'apps', label: 'Apps', at: 'teach' },
        { key: 'credentials', label: 'Credentials', at: 'teach' },
        { key: 'settings', label: 'Settings', at: 'teach' }
      );
    }
    return list;
  }
  function href(o, p) {
    var c = o.cohort, slug = encodeURIComponent(c.slug);
    if (p.at === 'live') return '/live/?c=' + slug;
    if (p.at === 'teach') return '/teach/cohort/?c=' + c.id + '&t=' + p.key;
    return '/cohort/?c=' + slug + (p.key === 'week' ? '' : '&t=' + p.key);
  }

  // o: { cohort: {id, slug, title, status}, teaching, member,
  //      current: 'home' | 'live' | 'teach', panels (the element holding this
  //      page's [data-tab] panels), onChange }
  // Returns the tabs control on the home and leader pages.
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
      return p.at === o.current && o.current !== 'live' ? { key: p.key, label: p.label } : { key: p.key, label: p.label, href: href(o, p) };
    }), o.current === 'live' ? null : o.panels, { label: c.title, onChange: o.onChange });
    if (o.current === 'live') {
      var here = holder.querySelector('a[href^="/live/"]');
      if (here) { here.setAttribute('aria-current', 'page'); window.dispatchEvent(new Event('resize')); }
      return null;
    }
    return tabs;
  }

  window.CohortNav = { draw: draw, places: places, href: href };
})();
