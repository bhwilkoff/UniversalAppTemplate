// Roles (/admin/; PAGES.md): everyone who has signed in, with the roles
// and rights they hold, found by name and narrowed by role, each opening
// their own page to change them; and the latest changes, newest first.
(function () {
  var root = document.querySelector('[data-admin]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var A = window.AdminLib, U = window.UI;
  var db = null, timer = null, last = [];
  function $(sel) { return root.querySelector(sel); }
  function draw() {
    var only = $('[data-only]').value;
    var list = last.filter(function (p) { return !only || (only === 'learner' ? p.enrolled > 0 : p[only]); });
    var box = $('[data-people]');
    box.replaceChildren();
    $('[data-count]').textContent = list.length + (list.length === 1 ? ' person' : ' people') + (list.length === 200 ? ', the first 200' : '');
    if (!list.length) { box.appendChild(U.empty('No one matches')); return; }
    list.forEach(function (p) {
      var tags = U.el('span', 'ui-tags');
      A.rolesOf(p).forEach(function (t) { tags.appendChild(U.tag(t)); });
      box.appendChild(U.row({ title: A.nameOf(p), href: '/admin/person/?u=' + p.id, meta: p.github_login && p.display_name ? '@' + p.github_login : null, status: tags }));
    });
  }
  function load() {
    return db.rpc('admin_people', { q: $('[data-q]').value.trim() || null }).then(function (r) {
      if (r.error) return page.fail('Everyone could not be read: ' + r.error.message);
      last = r.data;
      if (!$('[data-q]').value.trim()) $('[data-one-admin]').hidden = last.filter(function (p) { return p.can_admin; }).length > 1;
      draw();
    });
  }
  function loadChanges() {
    return db.rpc('admin_changes', { lim: 20 }).then(function (r) {
      var log = $('[data-recent]');
      log.replaceChildren();
      var changes = r.error ? [] : r.data;
      if (!changes.length) log.appendChild(U.empty('No changes yet'));
      changes.forEach(function (c) {
        log.appendChild(U.row({ title: (c.actor_name || 'Someone') + ' ' + A.changeText(c, c.subject_name || 'someone'), href: '/admin/person/?u=' + c.subject, meta: new Date(c.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + (c.note ? ', ' + c.note : '') }));
      });
    });
  }
  $('[data-q]').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 250); });
  $('[data-only]').addEventListener('change', draw);
  var page = window.AdminPage.start(root, function (client) {
    db = client;
    return Promise.all([load(), loadChanges()]);
  });
})();
