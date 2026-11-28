// Ideas at Play's interactive teaching models as a tool in a call (Ben,
// November 28, 2026; Alexis Diamond approved the use under the site's own
// terms). The host picks a model and it goes on the main stage, where every
// person in the call has their own copy to use: each stage is its own page.
// The list is read from Ideas at Play's pages (tools/ideas-at-play/catalog.py),
// each model at its newest version, and every model is CC BY 4.0, so wherever
// one shows, its title, author, source, and licence show with it.
// ModelPicker.mount(box, { send(message), done() })
// ModelPicker.credit(url) -> Promise of { title, author, url } or null
(function (root) {
  var SRC = '/assets/ideas-at-play.json?v=20261128a';
  var PLAY = /^https:\/\/ideasatplay\.org\/play\/([a-z0-9-]{1,140})\?v=(\d{1,4})$/;
  var catalog = null;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function load() {
    if (!catalog) catalog = fetch(SRC).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (d) { return d.models || []; });
    return catalog;
  }
  function playUrl(m) { return 'https://ideasatplay.org/play/' + m.slug + '?v=' + m.v; }
  function pageUrl(m) { return 'https://ideasatplay.org/artifacts/' + m.slug; }
  function find(url) {
    var x = PLAY.exec(String(url || ''));
    if (!x) return Promise.resolve(null);
    return load().then(function (list) { return list.filter(function (m) { return m.slug === x[1]; })[0] || null; }, function () { return null; });
  }
  function credit(url) {
    return find(url).then(function (m) { return m ? { title: m.title, author: m.author, url: pageUrl(m) } : null; });
  }
  function matches(m, q) {
    if (!q) return true;
    var hay = (m.title + ' ' + (m.author || '') + ' ' + (m.about || '')).toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function mount(box, o) {
    var line = el('p', 'small'); line.setAttribute('role', 'status');
    var search = el('input', 'model-search'); search.type = 'search'; search.placeholder = 'Find a model'; search.setAttribute('aria-label', 'Find a model');
    var list = el('ul', 'model-list');
    var credit = el('p', 'small model-source');
    credit.appendChild(document.createTextNode('From '));
    var a = el('a', null, 'Ideas at Play'); a.href = 'https://ideasatplay.org/'; a.target = '_blank'; a.rel = 'noopener';
    credit.appendChild(a);
    credit.appendChild(document.createTextNode(', each CC BY 4.0'));
    box.appendChild(search); box.appendChild(list); box.appendChild(line); box.appendChild(credit);
    line.textContent = 'Loading the models…';
    load().then(function (models) {
      line.textContent = '';
      function draw() {
        list.replaceChildren();
        var shown = models.filter(function (m) { return matches(m, search.value.trim()); });
        if (!shown.length) list.appendChild(el('li', 'small', 'No model matches that.'));
        shown.forEach(function (m) {
          var li = el('li'), b = el('button', 'model-pick'); b.type = 'button';
          b.appendChild(el('span', 'model-title', m.title));
          if (m.author) b.appendChild(el('span', 'model-by', m.author));
          if (m.about) b.title = m.about;
          b.addEventListener('click', function () {
            o.send({ t: 'site', url: playUrl(m), name: m.title.slice(0, 80) });
            line.textContent = 'On everyone’s stage, a copy for each person.';
            if (o.done) o.done();
          });
          li.appendChild(b); list.appendChild(li);
        });
      }
      search.addEventListener('input', draw);
      draw();
    }, function () { line.textContent = 'The models could not be loaded. Try again in a minute.'; });
  }

  root.ModelPicker = { mount: mount, credit: credit, playUrl: playUrl, isModel: function (url) { return PLAY.test(String(url || '')); } };
})(typeof window !== 'undefined' ? window : this);
