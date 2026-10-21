// The top of every page that belongs to one cohort (PAGES.md, "How you
// find your way"): a breadcrumb to where the page sits, and the cohort's
// row of links, the same on its home, its live session, and, for its
// teachers, its teaching page. Used by cohort.js, live.js, teach-cohort.js.
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

  // o: { cohort: {id, slug, title}, teaching, member, current: 'home' | 'live' | 'teach' }
  function draw(mount, o) {
    if (!mount) return;
    var c = o.cohort, slug = encodeURIComponent(c.slug);
    var home = '/cohort/?c=' + slug, live = '/live/?c=' + slug, teach = '/teach/cohort/?c=' + c.id;
    var root = o.member ? ['/', 'Home'] : ['/teach/', 'Teaching'];
    var trail = o.current === 'live' ? [root, [home, c.title]] : o.current === 'teach' ? [['/teach/', 'Teaching']] : [root];
    var bar = el('nav', 'area-nav cohort-nav'), ul = el('ul');
    bar.setAttribute('aria-label', c.title);
    [['home', home, 'Cohort home'], ['live', live, 'Live session']].concat(o.teaching ? [['teach', teach, 'Teaching it']] : []).forEach(function (x) {
      var li = el('li'), a = el('a', null, x[2]);
      a.href = x[1];
      if (x[0] === o.current) a.setAttribute('aria-current', 'page');
      li.appendChild(a); ul.appendChild(li);
    });
    bar.appendChild(ul);
    mount.replaceChildren(crumbs(trail), bar);
    mount.hidden = false;
  }

  window.CohortNav = { draw: draw };
})();
