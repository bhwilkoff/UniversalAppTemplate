// The hub's shared interface pieces (DESIGN-KIT.md). A page builds its
// state, privacy, lists, and empty places from these, so the same idea
// always looks and reads the same, and a new feature starts from parts
// people already know instead of a sentence explaining itself.
(function (root) {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '/assets/icons.svg?v=20261021a#' + name);
    svg.appendChild(use);
    return svg;
  }

  // A thing's state, as an icon and a word: done, waiting, off, or alert.
  var TONE_ICON = { done: 'check-circle', waiting: 'circle-dashed', off: 'circle-dashed', alert: 'warning-circle', time: 'clock' };
  function status(tone, label) {
    var s = el('span', 'ui-status ui-status-' + tone);
    s.appendChild(icon(TONE_ICON[tone] || 'circle-dashed'));
    s.appendChild(el('span', null, label));
    return s;
  }

  // Who can see something, the same words and icon everywhere.
  var WHO = {
    me: ['lock-simple', 'Only you'],
    device: ['lock-simple', 'Stays on this computer'],
    teachers: ['user', 'You and your teachers'],
    cohort: ['users', 'Your cohort'],
    members: ['users', 'Human Shaped members'],
    link: ['globe-simple', 'Anyone with the link'],
    public: ['globe-simple', 'Everyone']
  };
  function visibility(who, label) {
    var w = WHO[who] || WHO.me;
    var s = el('span', 'ui-visibility');
    s.appendChild(icon(w[0]));
    s.appendChild(el('span', null, label || w[1]));
    return s;
  }

  // Key facts about one thing, as a list of names and values.
  function facts(pairs) {
    var dl = el('dl', 'ui-facts');
    pairs.forEach(function (p) {
      if (p == null || p[1] == null || p[1] === '') return;
      var d = el('div');
      d.appendChild(el('dt', null, p[0]));
      var dd = el('dd');
      if (p[1] instanceof Node) dd.appendChild(p[1]); else dd.textContent = p[1];
      d.appendChild(dd);
      dl.appendChild(d);
    });
    return dl;
  }

  // One listed thing: its title (a link when it has a page), a line of
  // meta, a state, and its actions on the right.
  function row(o) {
    var li = el('li', 'ui-row');
    var main = el('div', 'ui-row-main');
    var title = o.href ? el('a', 'ui-row-title', o.title) : el('span', 'ui-row-title', o.title);
    if (o.href) title.href = o.href;
    main.appendChild(title);
    if (o.meta) main.appendChild(el('span', 'ui-row-meta', o.meta));
    if (o.detail) main.appendChild(o.detail);
    li.appendChild(main);
    var side = el('div', 'ui-row-side');
    if (o.status) side.appendChild(o.status);
    (o.actions || []).forEach(function (a) { side.appendChild(a); });
    li.appendChild(side);
    return li;
  }
  function rows() { return el('ul', 'ui-rows'); }

  // An empty place: one short line, and at most one way to fill it.
  function empty(text, action) {
    var d = el('div', 'ui-empty');
    d.appendChild(el('p', null, text));
    if (action) d.appendChild(action);
    return d;
  }

  // Detail most people never need, closed until asked for.
  function disclosure(summary, content) {
    var d = el('details', 'ui-disclosure');
    d.appendChild(el('summary', null, summary));
    if (content instanceof Node) d.appendChild(content); else d.appendChild(el('p', null, content));
    return d;
  }

  function button(label, cls, onClick) {
    var b = el('button', cls || 'btn-secondary', label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function link(label, href, cls) {
    var a = el('a', cls || 'btn-secondary', label);
    a.href = href;
    return a;
  }

  // A hard-to-undo action asks once more, on the page: the first press
  // turns the button into the consequence ("Delete Kit test") and shows the
  // warning beside it; the second press runs it. Leaving the button, or
  // waiting, puts it back.
  function confirmStep(button, o) {
    var label = button.textContent, note = o.status || null, timer = null;
    function reset() {
      button.removeAttribute('data-armed');
      button.textContent = label;
      if (note) note.textContent = '';
      clearTimeout(timer);
    }
    button.addEventListener('click', function () {
      if (!button.hasAttribute('data-armed')) {
        button.setAttribute('data-armed', '');
        button.textContent = o.confirm;
        if (note && o.warning) note.textContent = o.warning;
        timer = setTimeout(reset, 8000);
        return;
      }
      reset();
      o.run();
    });
    button.addEventListener('blur', function () { if (button.hasAttribute('data-armed')) setTimeout(function () { if (document.activeElement !== button) reset(); }, 200); });
    return { reset: reset };
  }

  // A number of things waiting, beside the name of where they are.
  function count(n, label) {
    var s = el('span', 'ui-count', String(n));
    s.setAttribute('aria-label', label || String(n));
    return s;
  }

  // Sections of one page that each have their own address (?t=<key>):
  // links, so they can be opened in a new tab and shared, with the one
  // you are on marked, and the panels with data-tab="<key>" shown one at
  // a time without a reload. Returns { go(key), current() }.
  function tabs(mount, items, panelsRoot, opts) {
    opts = opts || {};
    var nav = el('nav', 'area-nav ui-tabs');
    nav.setAttribute('aria-label', opts.label || 'Sections');
    var ul = el('ul'), links = {};
    items.forEach(function (it) {
      var li = el('li'), a = el('a', null, it.label);
      var u = new URL(location.href);
      if (it.key === items[0].key) u.searchParams.delete('t'); else u.searchParams.set('t', it.key);
      a.href = u.pathname + u.search;
      if (it.count) a.appendChild(count(it.count, it.count + ' waiting'));
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        go(it.key, true);
      });
      links[it.key] = a;
      li.appendChild(a); ul.appendChild(li);
    });
    nav.appendChild(ul);
    mount.replaceChildren(nav);
    var now = null;
    function go(key, push) {
      if (!links[key]) key = items[0].key;
      now = key;
      Object.keys(links).forEach(function (k) {
        if (k === key) links[k].setAttribute('aria-current', 'page'); else links[k].removeAttribute('aria-current');
      });
      panelsRoot.querySelectorAll('[data-tab]').forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== key; });
      if (push) history.pushState({ t: key }, '', links[key].getAttribute('href'));
      if (opts.onChange) opts.onChange(key);
    }
    window.addEventListener('popstate', function () { go(new URLSearchParams(location.search).get('t') || items[0].key, false); });
    go(new URLSearchParams(location.search).get('t') || items[0].key, false);
    return { go: function (k) { go(k, true); }, current: function () { return now; }, link: function (k) { return links[k] && links[k].getAttribute('href'); } };
  }

  root.UI = { el: el, icon: icon, status: status, visibility: visibility, facts: facts, row: row, rows: rows, empty: empty, disclosure: disclosure, button: button, link: link, count: count, tabs: tabs, confirmStep: confirmStep, WHO: WHO };
})(typeof window !== 'undefined' ? window : this);
