// Running the hub, its overview (/admin/; PAGES.md): how many people and
// teachers there are, who the admins are, and what waits, each a count
// that links to its page.
(function () {
  var root = document.querySelector('[data-admin]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var el = window.TeachPage.el, A = window.AdminLib;
  function row(box, text, href, label) {
    var li = el('li');
    li.appendChild(el('span', null, text + ' '));
    if (href) { var a = el('a', 'btn-secondary small', label); a.href = href; li.appendChild(a); }
    box.appendChild(li);
  }
  var page = window.AdminPage.start(root, function (db, me) {
    return Promise.all([
      db.rpc('admin_people', { q: null }),
      db.from('teacher_requests').select('user_id', { count: 'exact', head: true }).eq('state', 'waiting'),
      db.rpc('credentials_to_sign'),
      db.rpc('admin_changes', { lim: 5 })
    ]).then(function (res) {
      if (res[0].error) return page.fail('The hub could not be read: ' + res[0].error.message);
      var people = res[0].data, teachers = people.filter(function (p) { return p.teacher; }), admins = people.filter(function (p) { return p.can_admin; });
      var box = root.querySelector('[data-overview]');
      box.replaceChildren();
      row(box, people.length + (people.length === 1 ? ' person has' : ' people have') + ' signed in, and ' + teachers.length + (teachers.length === 1 ? ' teaches.' : ' teach.'), '/admin/people/', 'See everyone');
      row(box, 'Admins: ' + admins.map(A.nameOf).join(', ') + '.', null);
      if (admins.length < 2) row(box, 'There is only one admin. A second one means the hub is never locked if an account is lost.', '/admin/people/', 'Choose a second admin');
      var waiting = res[1].count || 0;
      if (waiting) row(box, waiting === 1 ? 'One person is asking to teach.' : waiting + ' people are asking to teach.', '/teach/requests/', 'Read the requests');
      var toSign = res[2].error ? 0 : res[2].data.length;
      if (toSign) row(box, toSign === 1 ? 'One credential is waiting to be signed.' : toSign + ' credentials are waiting to be signed.', '/teach/signing/', 'Sign them');
      var log = root.querySelector('[data-recent]');
      log.replaceChildren();
      var changes = res[3].error ? [] : res[3].data;
      if (!changes.length) log.appendChild(el('li', 'small', 'No rights have been changed here yet.'));
      changes.forEach(function (c) {
        log.appendChild(el('li', null, (c.actor_name || 'Someone') + ' ' + A.changeText(c, c.subject_name || 'someone') + ', ' + new Date(c.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.'));
      });
    });
  });
})();
