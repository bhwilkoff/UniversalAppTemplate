// /principles/: the fifteen principles, read live from the template's
// PRINCIPLES.md (PrinciplesLib.page). Each statement is drawn the same
// way, and opens to what it means and how you can tell. The page's own
// list is only what shows before the file arrives.
(function () {
  var P = window.PrinciplesLib, list = document.querySelector('[data-p-list]');
  if (!P || !list) return;
  var SRC = 'docs/human-shaped/PRINCIPLES.md';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function md(text) {
    if (!window.marked || !window.DOMPurify) { var p = el('p', null, text); return p.outerHTML; }
    var holder = document.createElement('div');
    holder.innerHTML = window.DOMPurify.sanitize(window.marked.parse(text, { gfm: true }));
    holder.querySelectorAll('a[href]').forEach(function (a) {
      var to = window.HSDocs ? window.HSDocs.siteHref(SRC, a.getAttribute('href')) : null;
      if (to) a.setAttribute('href', to);
      if (/^https?:/.test(a.getAttribute('href'))) a.rel = 'noopener';
    });
    return holder.innerHTML;
  }

  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var li = document.getElementById(id);
    if (!li || !list.contains(li)) return;
    var d = li.querySelector('details');
    if (d) d.open = true;
    li.scrollIntoView({ block: 'start' });
  }

  function draw(page) {
    if (!page.principles.length) return;
    var put = function (sel, text) { var n = document.querySelector(sel); if (n && text) n.textContent = text; };
    put('[data-p-intro]', page.intro);
    if (page.version) put('[data-p-version]', 'Version ' + page.version + ', by Ben Wilkoff, and open to argument.');
    put('[data-p-stem]', page.stem);
    put('[data-p-notyet]', page.notYet);
    list.replaceChildren();
    page.principles.forEach(function (p) {
      var li = el('li'); li.id = p.anchor;
      var d = el('details');
      var s = el('summary');
      s.appendChild(el('span', 'p-n', String(p.n)));
      s.appendChild(el('span', 'p-s', p.statement));
      var caret = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      caret.setAttribute('class', 'icon p-caret'); caret.setAttribute('aria-hidden', 'true'); caret.setAttribute('focusable', 'false');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '/assets/icons.svg#caret-down');
      caret.appendChild(use); s.appendChild(caret);
      d.appendChild(s);
      var more = el('div', 'p-more');
      more.appendChild(el('p', 'p-label', 'What it means'));
      var body = el('div', 'p-body'); body.innerHTML = md(p.body); more.appendChild(body);
      if (p.tell) {
        var tell = el('div', 'p-tell');
        tell.appendChild(el('p', 'p-label', 'How you can tell'));
        var t = el('div'); t.innerHTML = md(p.tell.charAt(0).toUpperCase() + p.tell.slice(1)); tell.appendChild(t);
        more.appendChild(tell);
      }
      d.appendChild(more);
      li.appendChild(d);
      list.appendChild(li);
    });
    openFromHash();
  }

  // The why used to open this page (/principles/#why and its sections),
  // and now lives on /about/; an old link to any part of it lands there.
  var h = decodeURIComponent(location.hash.slice(1));
  if (h && !document.getElementById(h)) { location.replace('/about/#' + encodeURIComponent(h)); return; }

  window.addEventListener('hashchange', openFromHash);
  openFromHash();
  fetch(P.RAW).then(function (r) { return r.ok ? r.text() : ''; }).then(function (text) {
    if (text) draw(P.page(text));
  }).catch(function () {});
})();
