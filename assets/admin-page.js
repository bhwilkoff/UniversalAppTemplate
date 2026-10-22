// What every admin page shares (/admin/…; PAGES.md): signing
// in, the not-an-admin state, and the area's row of links. The database
// checks every request again (migration 20261021020000).
(function () {
  function start(root, ready) {
    var page = window.TeachPage.start(root, function (db, me, name, teacher) {
      if (!teacher.can_admin) return page.show('not-admin');
      return ready(db, me, name, teacher);
    }, { notTeacher: function () { page.show('not-admin'); } });
    return page;
  }
  window.AdminPage = { start: start };
})();
