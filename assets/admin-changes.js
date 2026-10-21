// The log of every change to a hub-wide right (/admin/changes/; PAGES.md),
// newest first. No one can edit it (migration 20261021020000).
(function () {
  var root = document.querySelector('[data-admin-changes]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var el = window.TeachPage.el, A = window.AdminLib;
  var page = window.AdminPage.start(root, function (db) {
    return db.rpc('admin_changes', { lim: 500 }).then(function (r) {
      if (r.error) return page.fail('The log could not be read: ' + r.error.message);
      var body = root.querySelector('[data-changes]');
      body.replaceChildren();
      root.querySelector('[data-empty]').hidden = !!r.data.length;
      r.data.forEach(function (c) {
        var tr = el('tr');
        tr.appendChild(el('td', null, new Date(c.at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })));
        tr.appendChild(el('td', null, c.actor_name || 'Someone'));
        var who = el('td'), a = el('a', null, c.subject_name || 'someone');
        a.href = '/admin/person/?u=' + c.subject;
        who.appendChild(a);
        tr.appendChild(who);
        tr.appendChild(el('td', null, A.changeText(c, 'them').replace(/^\w/, function (x) { return x.toUpperCase(); })));
        tr.appendChild(el('td', null, c.note || ''));
        body.appendChild(tr);
      });
    });
  });
})();
