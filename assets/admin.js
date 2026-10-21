// Running the hub, its overview (/admin/; PAGES.md): how many people and
// teachers there are, who the admins are, and what waits, each a count
// that links to its page.
(function () {
  var root = document.querySelector('[data-admin]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var el = window.TeachPage.el, A = window.AdminLib;
  var page = window.AdminPage.start(root, function (db, me) {
    return Promise.all([
      db.rpc('admin_people', { q: null }),
      db.from('teacher_requests').select('user_id', { count: 'exact', head: true }).eq('state', 'waiting'),
      db.rpc('credentials_to_sign'),
      db.rpc('admin_changes', { lim: 5 })
    ]).then(function (res) {
      if (res[0].error) return page.fail('The hub could not be read: ' + res[0].error.message);
      var people = res[0].data, teachers = people.filter(function (p) { return p.teacher; }), admins = people.filter(function (p) { return p.can_admin; });
      var U = window.UI;
      document.querySelector('[data-admin-facts]').replaceChildren(U.facts([
        ['People', String(people.length)], ['Teachers', String(teachers.length)], ['Admins', admins.map(A.nameOf).join(', ')]
      ]));
      var warn = root.querySelector('[data-one-admin]');
      warn.hidden = admins.length > 1;
      var box = root.querySelector('[data-overview]');
      box.replaceChildren();
      var waiting = res[1].count || 0, toSign = res[2].error ? 0 : res[2].data.length;
      if (waiting) box.appendChild(U.row({ title: 'Requests to teach', href: '/teach/requests/', status: U.count(waiting, 'waiting') }));
      if (toSign) box.appendChild(U.row({ title: 'Signing', href: '/teach/signing/', status: U.count(toSign, 'to sign') }));
      if (!box.children.length) box.appendChild(U.empty('Nothing waiting'));
      var log = root.querySelector('[data-recent]');
      log.replaceChildren();
      var changes = res[3].error ? [] : res[3].data;
      if (!changes.length) log.appendChild(U.empty('No changes yet'));
      changes.forEach(function (c) {
        log.appendChild(U.row({ title: (c.actor_name || 'Someone') + ' ' + A.changeText(c, c.subject_name || 'someone'), href: '/admin/person/?u=' + c.subject, meta: new Date(c.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) }));
      });
    });
  });
})();
