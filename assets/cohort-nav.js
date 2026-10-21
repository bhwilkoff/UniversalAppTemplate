// The top of every page that belongs to one cohort (PAGES.md, "How you
// find your way"; DESIGN-KIT.md, Tabs): a breadcrumb to where the page
// sits, and one row of the cohort's places, the same everywhere. On the
// cohort's home the row's first places are its tabs (?t=); the live
// session and, for its teachers, the teaching page are their own pages in
// the same row. Used by cohort.js, live.js, teach-cohort.js.
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

  // The cohort's places, in their fixed order.
  function places(o) {
    var c = o.cohort, slug = encodeURIComponent(c.slug), home = '/cohort/?c=' + slug;
    var list = [
      { key: 'week', label: 'This week', page: home },
      { key: 'talk', label: 'Conversation', page: home + '&t=talk' },
      { key: 'exchanges', label: 'Exchanges', page: home + '&t=exchanges' },
      { key: 'people', label: 'People', page: home + '&t=people' }
    ];
    if (o.member) list.push({ key: 'mine', label: 'Your work', page: home + '&t=mine' });
    list.push({ key: 'live', label: 'Live session', href: '/live/?c=' + slug });
    if (o.teaching) list.push({ key: 'teach', label: 'Teaching it', href: '/teach/cohort/?c=' + c.id });
    return list;
  }

  // o: { cohort: {id, slug, title}, teaching, member, current: 'home' | 'live' | 'teach',
  //      panels (the element holding [data-tab] panels, on the cohort's home), noBar }
  // noBar: the page draws its own row (the teaching page's tabs), so two
  // rows of links never stack. Returns the tabs on the cohort's home.
  function draw(mount, o) {
    if (!mount) return null;
    var c = o.cohort, slug = encodeURIComponent(c.slug);
    var root = o.member ? ['/', 'Home'] : ['/teach/', 'Teaching'];
    var trail = o.current === 'live' ? [root, ['/cohort/?c=' + slug, c.title]] : o.current === 'teach' ? [['/teach/', 'Teaching']] : [root];
    mount.replaceChildren(crumbs(trail));
    mount.hidden = false;
    if (o.noBar) return null;
    var list = places(o);
    var holder = el('div');
    mount.appendChild(holder);
    if (o.current === 'home' && o.panels && window.UI) {
      return window.UI.tabs(holder, list.map(function (p) { return p.href ? p : { key: p.key, label: p.label }; }), o.panels, { label: c.title, onChange: o.onChange });
    }
    var bar = el('nav', 'area-nav cohort-nav'), ul = el('ul');
    bar.setAttribute('aria-label', c.title);
    list.forEach(function (p) {
      var li = el('li'), a = el('a', null, p.label);
      a.href = p.href || p.page;
      if (p.key === o.current) a.setAttribute('aria-current', 'page');
      li.appendChild(a); ul.appendChild(li);
    });
    bar.appendChild(ul);
    holder.appendChild(bar);
    return null;
  }

  window.CohortNav = { draw: draw, places: places };
})();
