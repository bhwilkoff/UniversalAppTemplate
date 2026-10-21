// Everyone who has signed in (/admin/people/; PAGES.md), found by name and
// narrowed by right, each opening their own page.
(function () {
  var root = document.querySelector('[data-admin-people]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var el = window.TeachPage.el, A = window.AdminLib;
  var db = null, timer = null, last = [];
  function $(sel) { return root.querySelector(sel); }
  function draw() {
    var only = $('[data-only]').value;
    var list = last.filter(function (p) { return !only || p[only]; });
    var body = $('[data-people]');
    body.replaceChildren();
    $('[data-count]').textContent = list.length + (list.length === 1 ? ' person' : ' people') + (list.length === 200 ? ', the first 200' : '') + '.';
    list.forEach(function (p) {
      var tr = el('tr');
      var td = el('td'), a = el('a', null, A.nameOf(p));
      a.href = '/admin/person/?u=' + p.id;
      td.appendChild(a);
      if (p.github_login && p.display_name) td.appendChild(el('span', 'small', ' @' + p.github_login));
      tr.appendChild(td);
      tr.appendChild(el('td', null, A.rightsText(p)));
      tr.appendChild(el('td', null, String(p.teaching)));
      tr.appendChild(el('td', null, String(p.enrolled)));
      tr.appendChild(el('td', null, new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })));
      body.appendChild(tr);
    });
  }
  function load() {
    return db.rpc('admin_people', { q: $('[data-q]').value.trim() || null }).then(function (r) {
      if (r.error) return page.fail('Everyone could not be read: ' + r.error.message);
      last = r.data;
      draw();
    });
  }
  $('[data-q]').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 250); });
  $('[data-only]').addEventListener('change', draw);
  var page = window.AdminPage.start(root, function (client) { db = client; return load(); });
})();
