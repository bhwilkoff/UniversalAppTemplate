// The hub's connection to its database (Supabase), used by /account/.
// The project address and the publishable key are public by design; the
// rules about who can see and change what live in the database itself
// (supabase/migrations), not here.
(function () {
  var HUB = window.HUB;
  var root = document.querySelector('[data-account]');
  if (!root || !window.supabase || !HUB) return;
  var db = window.supabase.createClient(HUB.url, HUB.key);

  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) {
      s.hidden = s.getAttribute('data-state') !== state;
    });
  }
  function fail(message) {
    root.querySelector('[data-error-text]').textContent = message;
    show('error');
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function when(dateText) {
    if (!dateText) return 'Dates to come';
    var d = new Date(dateText + 'T12:00:00');
    return 'Begins ' + d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // GitHub sends people back here with an error in the address when
  // something goes wrong (for example, if sign-in is not switched on).
  var params = new URLSearchParams(location.search + '&' + location.hash.replace(/^#/, ''));
  var arrivalError = params.get('error_description')
    ? 'GitHub sign-in did not finish: ' + params.get('error_description') + '. Nothing was saved.'
    : null;

  root.querySelector('[data-sign-in]').addEventListener('click', function () {
    db.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: location.origin + '/account/' }
    }).then(function (r) { if (r.error) fail(r.error.message); });
  });
  root.querySelector('[data-retry]').addEventListener('click', function () {
    history.replaceState(null, '', '/account/');
    arrivalError = null;
    load();
  });
  root.querySelector('[data-sign-out]').addEventListener('click', function () {
    db.auth.signOut().then(load);
  });

  var deleteDialog = document.querySelector('[data-delete-dialog]');
  root.querySelector('[data-delete-open]').addEventListener('click', function () { deleteDialog.showModal(); });
  deleteDialog.addEventListener('close', function () {
    if (deleteDialog.returnValue !== 'delete') return;
    db.rpc('delete_my_account').then(function (r) {
      if (r.error) return fail('Your account could not be deleted just now: ' + r.error.message);
      db.auth.signOut().then(function () {
        show('signed-out');
        root.querySelector('[data-state="signed-out"] .small').textContent =
          'Your account and everything you shared here have been deleted.';
      });
    });
  });

  var leaveDialog = document.querySelector('[data-leave-dialog]');
  var leavingCohort = null;
  leaveDialog.addEventListener('close', function () {
    if (leaveDialog.returnValue !== 'leave' || !leavingCohort) return;
    db.rpc('leave_cohort', { c: leavingCohort }).then(function (r) {
      if (r.error) return fail('You could not leave just now: ' + r.error.message);
      load();
    });
  });

  function cohortCard(c, mine) {
    var card = el('article', 'cohort-card');
    card.appendChild(el('h3', null, c.title));
    var weeks = c.weeks + ' weeks';
    card.appendChild(el('p', 'small', when(c.starts_on) + ', ' + weeks + '.'));
    if (c.description) card.appendChild(el('p', null, c.description));
    var actions = el('div', 'actions');
    if (mine) {
      var open = el('a', 'btn-github', 'Open your cohort');
      open.href = '/cohort/?c=' + encodeURIComponent(c.slug);
      actions.appendChild(open);
      var leave = el('button', 'btn-quiet', 'Leave this cohort');
      leave.type = 'button';
      leave.addEventListener('click', function () { leavingCohort = c.id; leaveDialog.showModal(); });
      actions.appendChild(leave);
    } else {
      var join = el('button', 'btn-quiet', 'Join this cohort');
      join.type = 'button';
      join.addEventListener('click', function () {
        join.disabled = true;
        db.auth.getUser().then(function (u) {
          return db.from('enrollments').insert({ cohort_id: c.id, user_id: u.data.user.id });
        }).then(function (r) {
          if (r.error) { join.disabled = false; return fail('You could not join just now: ' + r.error.message); }
          load();
        });
      });
      actions.appendChild(join);
    }
    card.appendChild(actions);
    return card;
  }

  function load() {
    show('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) {
        if (arrivalError) fail(arrivalError); else show('signed-out');
        return;
      }
      var uid = session.user.id;
      return Promise.all([
        db.from('profiles').select('github_login, display_name, avatar_url').eq('id', uid).single(),
        db.from('enrollments').select('status, cohorts(id, slug, title, starts_on, weeks, description, status)').eq('user_id', uid).neq('status', 'left'),
        db.from('cohorts').select('id, title, starts_on, weeks, description, status').eq('status', 'open').order('starts_on')
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) return fail('Your account could not be loaded just now: ' + bad.error.message);
        var p = res[0].data;
        root.querySelector('[data-name]').textContent = p.display_name || p.github_login;
        var a = root.querySelector('[data-github-link]');
        a.textContent = '@' + p.github_login;
        a.href = 'https://github.com/' + encodeURIComponent(p.github_login);
        var img = root.querySelector('[data-avatar]');
        if (p.avatar_url && /^https:\/\//.test(p.avatar_url)) img.src = p.avatar_url; else img.hidden = true;

        var mine = res[1].data.map(function (e) { return e.cohorts; }).filter(Boolean);
        var mineIds = mine.map(function (c) { return c.id; });
        var myBox = root.querySelector('[data-my-cohorts]');
        myBox.replaceChildren();
        if (!mine.length) myBox.appendChild(el('p', 'small', 'You are not in a cohort yet.'));
        mine.forEach(function (c) { myBox.appendChild(cohortCard(c, true)); });

        var open = res[2].data.filter(function (c) { return mineIds.indexOf(c.id) === -1; });
        var openBox = root.querySelector('[data-open-cohorts]');
        openBox.replaceChildren();
        if (!open.length) openBox.appendChild(el('p', 'small', 'No cohort is open for sign-up right now. When one opens, it will be here, and on the cohorts page.'));
        open.forEach(function (c) { openBox.appendChild(cohortCard(c, false)); });
        show('signed-in');
      });
    }).catch(function (err) {
      fail('Something went wrong while signing in: ' + (err && err.message ? err.message : 'no details') + '.');
    });
  }

  load();
})();
