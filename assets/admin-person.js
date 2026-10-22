// One person's hub-wide rights (/admin/person/?u=<id>; PAGES.md): each
// right with what it allows and one button to give or take it, their
// cohorts and role in each, and every change to their rights. Only
// admin_set_right changes a right, and it refuses what the hub forbids
// (migration 20261021020000); the page asks once more only for admin, and
// for taking teaching from someone who holds more.
(function () {
  var root = document.querySelector('[data-admin-person]');
  if (!root || !window.AdminPage || !window.AdminLib) return;
  var el = window.TeachPage.el, said = window.TeachPage.said, A = window.AdminLib;
  var id = new URLSearchParams(location.search).get('u');
  var db = null, me = null, person = null;
  function $(sel) { return root.querySelector(sel); }
  var STATUS = { draft: 'a draft', open: 'open for joining', running: 'running', finished: 'finished' };

  function drawRights() {
    var box = $('[data-rights]');
    box.replaceChildren();
    A.RIGHTS.forEach(function (r) {
      var has = !!person[r.key], self = person.id === me.id;
      var item = el('li', 'right-row');
      var text = el('div');
      var nm = el('p', 'right-name', r.name + ' '); nm.appendChild(window.UI.status('right', has ? 'held' : 'none')); text.appendChild(nm);
      text.appendChild(el('p', 'small', r.what));
      item.appendChild(text);
      var acts = el('div', 'actions');
      var msg = el('p', 'small'); msg.setAttribute('role', 'status');
      if (self && has && (r.key === 'can_admin' || r.key === 'teacher')) {
        text.appendChild(el('p', 'small', 'Only another admin can take this from you'));
      } else {
        var b = el('button', 'btn-secondary small', has ? r.take : r.give);
        b.type = 'button';
        b.addEventListener('click', function () {
          var ask = A.confirmFor(r.key, !has, person);
          (ask ? window.UI.confirm({ title: (has ? r.take : r.give) + ' for ' + A.nameOf(person) + '?', body: ask, action: has ? r.take : r.give, danger: has }) : Promise.resolve(true)).then(function (ok) { if (ok) change(); });
        });
        function change() {
          b.disabled = true;
          msg.textContent = 'Saving…';
          db.rpc('admin_set_right', { u: person.id, which: r.key, value: !has, note: $('[data-note]').value.trim() || null }).then(function (res) {
            if (res.error) throw res.error;
            person = res.data;
            $('[data-note]').value = '';
            draw();
            $('[data-saved]').textContent = 'Saved';
            if (person.id === me.id && window.HS && window.HS.roles) window.HS.roles({ teacher: person.teacher, admin: person.can_admin });
          }).catch(function (e) { b.disabled = false; msg.textContent = 'Nothing changed: ' + said(e); });
        }
        acts.appendChild(b);
      }
      item.appendChild(acts);
      item.appendChild(msg);
      box.appendChild(item);
    });
  }
  function drawCohorts() {
    var box = $('[data-cohorts]');
    box.replaceChildren();
    if (!person.cohorts.length) { box.appendChild(el('li', 'small', 'Not in a cohort, and not leading one.')); return; }
    person.cohorts.forEach(function (c) {
      var role = c.role === 'teacher' ? 'Leader' : c.role === 'mentor' ? 'Learner, returning' : 'Learner';
      if (c.member_status === 'left') role += ', and has left';
      else if (c.member_status === 'finished') role += ', and finished';
      box.appendChild(el('li', null, c.title + ': ' + role + '. It is ' + (STATUS[c.status] || c.status) + '.'));
    });
  }
  function drawChanges() {
    var box = $('[data-person-changes]');
    box.replaceChildren();
    if (!person.changes.length) { box.appendChild(el('li', 'small', 'No one has changed their rights here.')); return; }
    person.changes.forEach(function (c) {
      box.appendChild(el('li', null, (c.actor || 'Someone') + ' ' + A.changeText(c, 'them') + ', ' +
        new Date(c.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '.' + (c.note ? ' ' + c.note : '')));
    });
  }
  function draw() {
    var name = A.nameOf(person);
    document.title = name + ' | Human Shaped';
    document.querySelector('[data-person-name]').textContent = name;
    var facts = (person.github_login ? '@' + person.github_login + ' on GitHub. ' : 'Signed in with Google, with no GitHub linked. ') +
      'First signed in ' + new Date(person.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '.';
    $('[data-person-facts]').textContent = facts;
    $('[data-may-title]').textContent = person.id === me.id ? 'What you may do' : 'What they may do';
    var req = $('[data-request]');
    req.hidden = !(person.request && person.request.state === 'waiting');
    drawRights();
    drawCohorts();
    drawChanges();
  }
  var page = window.AdminPage.start(root, function (client, user) {
    db = client; me = user;
    if (!id) return page.show('missing');
    return db.rpc('admin_person', { u: id }).then(function (r) {
      if (r.error) return page.fail('This person could not be read: ' + r.error.message);
      if (!r.data) return page.show('missing');
      person = r.data;
      draw();
    });
  });
})();
