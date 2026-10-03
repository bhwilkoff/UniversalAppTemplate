// The card page (/card/?c=<slug>): what a teacher presents in Meet, or
// puts in OBS as a browser source, so that everyone in the call sees the
// card, where people should be, and who is on stage, large. It reads the
// same session and the same signals as /live/ (SignalsLib.sessionFor),
// and has no controls: the teacher sends from /live/.
(function () {
  var root = document.querySelector('[data-card-page]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib || !window.LiveSignals) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var slug = new URLSearchParams(location.search).get('c') || '';

  function $(s) { return root.querySelector(s); }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }

  if (!slug) return fail('This page needs to know which cohort’s cards to show. Open it from the live session page.');
  db.auth.getSession().then(function (s) {
    if (!s.data || !s.data.session) return show('signed-out');
    var me = s.data.session.user;
    return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
      if (c.error) return fail('The cards could not be opened: ' + c.error.message);
      if (!c.data) return show('not-member');
      var cohort = c.data;
      return Promise.all([
        db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
        db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id).neq('status', 'left'),
        db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
        db.from('groups').select('*, group_members(user_id)').eq('cohort_id', cohort.id).order('name')
      ]).then(function (res) {
        var bad = res.filter(function (r) { return r.error; })[0];
        if (bad) return fail('The cards could not be loaded: ' + bad.error.message);
        var teachers = res[2].data, people = res[1].data;
        var teaching = teachers.some(function (t) { return t.user_id === me.id; });
        if (!teaching && !people.some(function (p) { return p.user_id === me.id; })) return show('not-member');
        var session = window.SignalsLib.sessionFor(window.CohortLib.currentAndNext(res[0].data, new Date(), cohort.session_minutes));
        if (!session) return show('not-member');
        var names = {};
        people.concat(teachers).forEach(function (p) { if (p.profiles) names[p.user_id] = p.profiles.display_name || p.profiles.github_login; });
        $('[data-card-cohort]').textContent = cohort.title + ', week ' + session.number;
        $('[data-card-heading]').textContent = cohort.title + ', week ' + session.number;
        document.title = cohort.title + ' | Human Shaped';
        show('ready');
        // On a shared screen, nobody is "you": every name is a name.
        window.LiveSignals.start({
          db: db, cohort: cohort, session: session, meId: me.id, teaching: teaching, groups: res[3].data,
          nameOf: function (id) { return names[id] || 'Someone'; }, people: [],
          mounts: { screen: $('[data-screen]'), screenRecording: $('[data-screen-rec]') }
        });
      });
    });
  }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
})();
