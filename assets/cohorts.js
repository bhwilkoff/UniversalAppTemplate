// The open cohorts on /cohorts/, read straight from the hub. Anyone may
// read a cohort that is not a draft; joining happens on /account/, after
// sign-in, where the person is asked once more.
(function () {
  var box = document.querySelector('[data-open-list]');
  if (!box || !window.supabase || !window.HUB || !window.TeachLib) return;
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  db.from('cohorts')
    .select('slug, title, description, starts_on, weeks, capacity, session_weekday, session_time, session_minutes, time_zone')
    .eq('status', 'open').order('starts_on')
    .then(function (r) {
      if (r.error || !r.data.length) return;
      // Someone already signed in joins without being asked to sign in again.
      var signedIn = false;
      try { signedIn = !!localStorage.getItem('sb-bifrieqzkihuxfzttgvd-auth-token'); } catch (e) {}
      r.data.forEach(function (c) {
        var card = el('article', 'open-cohort');
        card.appendChild(el('h3', null, c.title));
        card.appendChild(el('p', 'small', TeachLib.openingLine(c)));
        card.appendChild(el('p', 'small', TeachLib.scheduleText(c, zone)));
        if (c.description) card.appendChild(el('p', null, c.description));
        var join = el('a', 'btn-primary', signedIn ? 'Join this cohort' : 'Join with GitHub');
        join.href = '/account/?join=' + encodeURIComponent(c.slug);
        var actions = el('div', 'actions'); actions.appendChild(join); card.appendChild(actions);
        box.appendChild(card);
      });
      box.hidden = false;
      document.querySelector('[data-none-open]').hidden = true;
      document.querySelector('[data-some-open]').hidden = false;
    });

  // Someone who holds the credential can join an open or running cohort as
  // a mentor (moved here from the account page; PAGES.md). The database
  // decides who may (can_mentor, join_as_mentor).
  var section = document.querySelector('[data-mentor-section]');
  if (!section || !window.MentorLib) return;
  db.auth.getSession().then(function (s) {
    var uid = s.data && s.data.session && s.data.session.user.id;
    if (!uid) return;
    return db.rpc('can_mentor').then(function (r) {
      if (r.error || !r.data) return;
      return Promise.all([
        db.from('cohorts').select('id, slug, title, starts_on, weeks, description, status, session_weekday, session_time, session_minutes, time_zone').in('status', ['open', 'running']).order('starts_on'),
        db.from('enrollments').select('cohort_id, status').eq('user_id', uid),
        db.from('cohort_teachers').select('cohort_id').eq('user_id', uid)
      ]).then(function (res) {
        if (res.some(function (x) { return x.error; })) return;
        var choices = window.MentorLib.mentorChoices(res[0].data, res[1].data, res[2].data.map(function (t) { return t.cohort_id; }));
        var box = section.querySelector('[data-mentor-cohorts]');
        box.replaceChildren();
        choices.forEach(function (c) {
          var card = el('article', 'open-cohort');
          card.appendChild(el('h4', null, c.title));
          card.appendChild(el('p', 'small', (c.status === 'running' ? 'Running now. ' : 'Open for sign-up. ') + TeachLib.openingLine(c)));
          if (c.description) card.appendChild(el('p', null, c.description));
          var join = el('button', 'btn-secondary', 'Mentor this cohort');
          join.type = 'button';
          var msg = el('span', 'small'); msg.setAttribute('role', 'status');
          join.addEventListener('click', function () {
            join.disabled = true;
            db.rpc('join_as_mentor', { c: c.id }).then(function (j) {
              if (j.error) { join.disabled = false; msg.textContent = 'Not joined: ' + j.error.message; return; }
              db.functions.invoke('cohort-access', { body: { action: 'join', cohort_id: c.id } }).catch(function () {});
if (window.HS && window.HS.forgetRoles) window.HS.forgetRoles(); location.assign('/cohort/?c=' + encodeURIComponent(c.slug));
            });
          });
          var actions = el('div', 'actions'); actions.appendChild(join); actions.appendChild(msg);
          card.appendChild(actions);
          box.appendChild(card);
        });
        section.hidden = !choices.length;
      });
    });
  });
})();
