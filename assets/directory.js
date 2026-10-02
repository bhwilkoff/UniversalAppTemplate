// Adds listings from the open directory (github.com/humanshaped/directory)
// to /apps/. The founding apps are already on the page, so only the rest
// are drawn here, and the section stays hidden when there are none.
(function () {
  var list = document.querySelector('[data-directory]');
  if (!list) return;
  var SOURCE = 'https://raw.githubusercontent.com/humanshaped/directory/main/directory.json';
  var PLATFORMS = { web: 'the web', iphone: 'iPhone', ipad: 'iPad', mac: 'Mac', 'apple-tv': 'Apple TV',
    android: 'Android', 'google-tv': 'Google TV', 'fire-tv': 'Fire TV', roku: 'Roku', windows: 'Windows' };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function joinWithAnd(items) {
    if (items.length < 3) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }
  function link(href, text) {
    var li = el('li'); var a = el('a', null, text);
    a.href = href; li.appendChild(a); return li;
  }
  function safeUrl(u) { return /^https:\/\//.test(u || '') ? u : null; }

  fetch(SOURCE, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var apps = (data.apps || []).filter(function (a) { return a.status !== 'founding'; });
      if (!apps.length) return;
      apps.forEach(function (app) {
        var li = el('li', 'app');
        li.appendChild(el('h3', null, app.name));
        if (app.in_its_own_words) li.appendChild(el('p', 'own', '“' + app.in_its_own_words + '”'));
        var names = (app.platforms || []).map(function (p) { return PLATFORMS[p] || p; });
        var facts = [];
        if (app.builder) facts.push('Built by ' + app.builder);
        if (names.length) facts.push('on ' + joinWithAnd(names));
        if (facts.length) li.appendChild(el('p', 'facts', facts.join(', ') + '.'));
        var links = el('ul', 'links');
        links.setAttribute('aria-label', app.name + ' links');
        if (safeUrl(app.website)) links.appendChild(link(app.website, app.website.replace(/^https:\/\//, '').replace(/\/$/, '')));
        if (safeUrl(app.declaration)) links.appendChild(link(app.declaration, 'How it is human-shaped'));
        if (safeUrl(app.repository)) links.appendChild(link(app.repository, 'Its repository'));
        li.appendChild(links);
        list.appendChild(li);
      });
      document.getElementById('more-apps').hidden = false;
    })
    .catch(function () { /* The founding apps are already on the page. */ });
})();
