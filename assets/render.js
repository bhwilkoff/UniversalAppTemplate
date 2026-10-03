/* Renders a page of the Universal App Template's own markdown into the
   reading view, so the site and the template can never drift. The page
   names its source with data-doc on the article; everything else here is
   shared by every reading page. */
(function () {
  'use strict';

  var REPO = 'bhwilkoff/UniversalAppTemplate';
  var BRANCH = 'main';
  var RAW = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
  var BLOB = 'https://github.com/' + REPO + '/blob/' + BRANCH + '/';
  var TREE = 'https://github.com/' + REPO + '/tree/' + BRANCH + '/';

  // Template files that have a page of their own on this site.
  var SITE = {
    'docs/path/setup.md': '/path/setup/',
    'docs/path/00-why-we-build.md': '/path/00/',
    'docs/path/01-first-prototype.md': '/path/01/',
    'docs/path/02-shape-of-an-app.md': '/path/02/',
    'docs/path/03-going-native.md': '/path/03/',
    'docs/path/04-seeing-it-work.md': '/path/04/',
    'docs/path/05-shipping.md': '/path/05/',
    'docs/path/06-keeping-it-running.md': '/path/06/',
    'docs/path/07-raising-the-ceiling.md': '/path/07/',
    'docs/path/08-working-with-ai.md': '/path/08/',
    'docs/teaching/README.md': '/teach/guide/weeks/',
    'docs/teaching/before.md': '/teach/guide/before/',
    'docs/teaching/week-1.md': '/teach/guide/week-1/',
    'docs/teaching/week-2.md': '/teach/guide/week-2/',
    'docs/teaching/week-3.md': '/teach/guide/week-3/',
    'docs/teaching/week-4.md': '/teach/guide/week-4/',
    'docs/teaching/week-5.md': '/teach/guide/week-5/',
    'docs/teaching/': '/teach/guide/weeks/',
    'docs/path/talking-to-your-agent.md': '/path/talking-to-your-agent/',
    'docs/path/showing-your-work.md': '/path/showing-your-work/',
    'COURSE.md': '/teach/guide/',
    'docs/path/README.md': '/path/',
    'docs/path/': '/path/',
    'docs/human-shaped/PRINCIPLES.md': '/principles/',
    'docs/human-shaped/computer-shaped-problems.md': '/why/',
    'docs/human-shaped/not-vibe-coding.md': '/why/not-vibe-coding/',
    'docs/human-shaped/case-study-archive-watch.md': '/why/archive-watch/'
  };

  var article = document.querySelector('[data-doc]');
  if (!article) return;
  var src = article.getAttribute('data-doc');
  var body = article.querySelector('[data-doc-body]');
  var status = article.querySelector('[data-doc-status]');
  var titleEl = document.querySelector('[data-doc-title]');
  var numEl = document.querySelector('[data-doc-num]');
  var ledeEl = document.querySelector('[data-doc-lede]');
  var metaEl = document.querySelector('[data-doc-meta]');
  var tocEl = document.querySelector('[data-doc-toc]');
  var githubUrl = BLOB + src;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  // Resolve a link written inside the markdown, relative to its own file.
  function resolve(href) {
    var u;
    try { u = new URL(href, 'https://repo.invalid/' + src); } catch (e) { return null; }
    if (u.host !== 'repo.invalid') return null;
    var path = u.pathname.replace(/^\//, '');
    if (SITE[path]) return SITE[path] + u.hash;
    if (path === '' || /\/$/.test(path)) return TREE + path + u.hash;
    return BLOB + path + u.hash;
  }

  function slug(text, seen) {
    var s = text.toLowerCase().trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s/g, '-');
    var out = s, i = 1;
    while (seen[out]) { out = s + '-' + i++; }
    seen[out] = true;
    return out;
  }

  function onlyChild(p, tag) {
    var kids = Array.prototype.filter.call(p.childNodes, function (n) {
      return !(n.nodeType === 3 && !n.textContent.trim());
    });
    return kids.length === 1 && kids[0].nodeName === tag;
  }

  function showLoading() {
    article.setAttribute('aria-busy', 'true');
    status.innerHTML = '';
    var box = el('div', { 'class': 'doc-loading' });
    box.appendChild(el('p', null, 'Reading the current text from the template on GitHub.'));
    for (var i = 0; i < 5; i++) box.appendChild(el('span', { 'class': 'line', 'aria-hidden': 'true' }));
    status.appendChild(box);
  }

  function showError() {
    article.removeAttribute('aria-busy');
    status.innerHTML = '';
    var box = el('div', { 'class': 'doc-error', role: 'alert' });
    box.appendChild(el('h2', null, 'This page could not reach GitHub just now.'));
    box.appendChild(el('p', null, 'Its text lives in the template on GitHub, and the request for it did not come back, which usually means a network hiccup on one side or the other. The same page is always readable on GitHub itself.'));
    var actions = el('div', { 'class': 'actions' });
    var gh = el('a', { 'class': 'btn-quiet', href: githubUrl }, 'Read it on GitHub');
    var retry = el('button', { 'class': 'btn-quiet', type: 'button' }, 'Try again');
    retry.addEventListener('click', load);
    actions.appendChild(gh);
    actions.appendChild(retry);
    box.appendChild(actions);
    status.appendChild(box);
  }

  function render(markdown) {
    var html = window.DOMPurify.sanitize(window.marked.parse(markdown, { gfm: true }));
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    var root = tpl.content;

    // The title goes in the page head, not the article.
    var h1 = root.querySelector('h1');
    if (h1) {
      var t = h1.textContent.trim();
      var m = t.match(/^(\d\d)\.\s+(.*)$/);
      if (m) {
        if (titleEl) titleEl.textContent = m[2];
        if (numEl) numEl.textContent = 'Stage ' + m[1] + ' of 08';
      } else if (titleEl) {
        titleEl.textContent = t;
      }
      h1.remove();
    }

    // "Where you are." or an italic version line becomes the lede.
    var first = root.firstElementChild;
    if (first && first.nodeName === 'P') {
      var strong = first.firstElementChild;
      if (strong && strong.nodeName === 'STRONG' && /^where you are\.?$/i.test(strong.textContent.trim()) && ledeEl) {
        strong.remove();
        ledeEl.innerHTML = first.innerHTML.trim();
        ledeEl.hidden = false;
        first.remove();
      } else if (onlyChild(first, 'EM') && metaEl) {
        metaEl.innerHTML = first.firstElementChild.innerHTML;
        metaEl.hidden = false;
        first.remove();
      }
    }

    // A paragraph that is one bold line is a thesis.
    root.querySelectorAll('p').forEach(function (p) {
      if (onlyChild(p, 'STRONG') && p.textContent.length < 140) p.classList.add('thesis');
    });

    // The closing line: "Be ready to..." on a stage, or a short last line elsewhere.
    var last = root.lastElementChild;
    if (last && last.nodeName === 'P') {
      var lm = last.innerHTML.match(/^(Be ready to \w+)/);
      if (lm) {
        last.innerHTML = '<strong>' + lm[1] + '</strong>' + last.innerHTML.slice(lm[1].length);
        last.classList.add('bring-back');
      } else if (last.textContent.length < 120 && !last.classList.contains('thesis')) {
        last.classList.add('bring-back');
      }
    }

    // Links: other path pages become this site's pages; other repo files go to GitHub.
    root.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.charAt(0) === '#') return;
      var to = resolve(href);
      if (to) a.setAttribute('href', to);
    });

    // A file name in code that has a page here becomes a link to it.
    root.querySelectorAll('code').forEach(function (c) {
      if (c.closest('a, pre')) return;
      var t = c.textContent.trim();
      if (!/^[\w./-]+\.md(#[\w-]+)?$/.test(t)) return;
      var to = resolve(t);
      if (!to || to.indexOf('https://') === 0) return;
      var a = el('a', { href: to });
      c.parentNode.insertBefore(a, c);
      a.appendChild(c);
    });

    // Images from the repository load from it.
    root.querySelectorAll('img[src]').forEach(function (img) {
      var s = img.getAttribute('src');
      if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
        img.setAttribute('src', new URL(s, RAW + src).href);
      }
      img.setAttribute('loading', 'lazy');
    });

    // Tables scroll inside themselves on a phone, never the page.
    // Each one is named for the heading above it, so a screen reader's list
    // of regions tells them apart, and a header row left empty in the
    // Markdown is dropped rather than read as blank headers.
    var named = {};
    root.querySelectorAll('table').forEach(function (table) {
      var head = table.querySelector('thead');
      if (head) {
        var ths = head.querySelectorAll('th');
        var blank = [].filter.call(ths, function (th) { return !th.textContent.trim(); });
        if (blank.length === ths.length) head.remove();
        else blank.forEach(function (th) { th.replaceWith(el('td')); });
      }
      var near = null, n = table;
      while (n && !near) {
        var p = n.previousElementSibling;
        while (p && !/^H[2-4]$/.test(p.tagName)) p = p.previousElementSibling;
        if (p) near = p; else n = n.parentElement === root ? null : n.parentElement;
      }
      var name = near ? near.textContent.trim().replace(/[.:]$/, '') : 'A table';
      named[name] = (named[name] || 0) + 1;
      if (named[name] > 1) name += ' (' + named[name] + ')';
      var wrap = el('div', { 'class': 'table-wrap', tabindex: '0', role: 'region', 'aria-label': name + ', a table that scrolls sideways' });
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    // Headings get the same anchors GitHub gives them.
    var seen = {};
    root.querySelectorAll('h2, h3').forEach(function (h) { h.id = slug(h.textContent, seen); });

    body.innerHTML = '';
    body.appendChild(root);

    if (tocEl) {
      tocEl.innerHTML = '';
      body.querySelectorAll('h2').forEach(function (h) {
        var li = el('li');
        li.appendChild(el('a', { href: '#' + h.id }, h.textContent));
        tocEl.appendChild(li);
      });
      var box = tocEl.closest('[hidden]');
      if (box && tocEl.children.length) box.hidden = false;
    }

    status.innerHTML = '';
    article.removeAttribute('aria-busy');

    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  function load() {
    showLoading();
    if (!window.marked || !window.DOMPurify) { showError(); return; }
    fetch(RAW + src, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(render)
      .catch(function (e) {
        console.log('[render] could not load', src, e);
        showError();
      });
  }

  load();
})();
