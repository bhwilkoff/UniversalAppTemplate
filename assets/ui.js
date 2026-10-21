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

  root.UI = { el: el, icon: icon, status: status, visibility: visibility, facts: facts, row: row, rows: rows, empty: empty, disclosure: disclosure, button: button, link: link, WHO: WHO };
})(typeof window !== 'undefined' ? window : this);
