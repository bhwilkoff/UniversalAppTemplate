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
  var SRC = '/assets/ideas-at-play.json?v=20261128b';
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
  // The copy of a model's own file kept on this site (catalog.py), which a
  // shared model runs so its state can travel through the call's room.
  function copyOf(url) { return find(url).then(function (m) { return m && m.copy ? m.copy : null; }); }
  // The one change a shared model gets: a bridge that hands its state
  // (window.artifact, the model's own interface for shared sessions) to the
  // stage and takes the call's state back.
  var BRIDGE = '<script>(function(){var last="";function send(){try{var s=JSON.stringify(window.artifact.getState());if(s!==last){last=s;parent.postMessage({hsModel:"state",state:s},"*");}}catch(e){}}' +
    'window.addEventListener("message",function(e){var d=e.data;if(!d||d.hsModel!=="set"||e.source!==parent)return;try{last=d.state;window.artifact.setState(JSON.parse(d.state));}catch(x){}});' +
    'function hook(n){if(!window.artifact||!window.artifact.onChange){if(n<50)setTimeout(function(){hook(n+1);},200);return;}window.artifact.onChange(send);parent.postMessage({hsModel:"ready"},"*");}hook(0);})();<\/script>';
  function withBridge(html) {
    html = String(html || '');
    var at = html.toLowerCase().lastIndexOf('</body>');
    return at < 0 ? html + BRIDGE : html.slice(0, at) + BRIDGE + html.slice(at);
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
    // A copy for each person, or one model the whole call changes together.
    var together = false;
    var how = el('div', 'model-how'); how.setAttribute('role', 'radiogroup'); how.setAttribute('aria-label', 'Who uses it');
    var group = 'model-how-' + Math.random().toString(36).slice(2, 7);
    [[false, 'A copy for each person'], [true, 'One model everyone shares']].forEach(function (x) {
      var lab = el('label', 'check'), r = el('input'); r.type = 'radio'; r.name = group; r.checked = x[0] === together;
      r.addEventListener('change', function () { if (r.checked) together = x[0]; });
      lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + x[1])); how.appendChild(lab);
    });
    box.appendChild(how);
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
            var shared = together && !!m.copy;
            o.send({ t: 'site', url: playUrl(m), name: m.title.slice(0, 80), together: shared });
            line.textContent = shared ? 'On everyone’s stage, one model you all change.' : 'On everyone’s stage, a copy for each person.';
            if (o.done) o.done();
          });
          li.appendChild(b); list.appendChild(li);
        });
      }
      search.addEventListener('input', draw);
      draw();
    }, function () { line.textContent = 'The models could not be loaded. Try again in a minute.'; });
  }

  root.ModelPicker = { mount: mount, credit: credit, copyOf: copyOf, withBridge: withBridge, playUrl: playUrl, isModel: function (url) { return PLAY.test(String(url || '')); } };
})(typeof window !== 'undefined' ? window : this);
