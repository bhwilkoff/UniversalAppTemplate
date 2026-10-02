// The live session page (/live/?c=<slug>), kept open beside Google Meet.
// Meet cannot be embedded in another page, so this page holds what Meet
// does not: the agenda with a timer for each part, this week's challenge
// and stages, and what people brought back.
(function () {
  var root = document.querySelector('[data-live]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.CohortLib;
  var slug = new URLSearchParams(location.search).get('c') || '';
  var timer = null;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }

  // A timer anyone can run for the part of the session they are in. It
  // counts down quietly and says so when the time is up; it never
  // makes a sound.
  function runTimer(button, minutes) {
    if (timer) { clearInterval(timer.id); timer.button.textContent = 'Start ' + timer.minutes + ' min'; if (timer.button === button) { timer = null; return; } }
    var end = Date.now() + minutes * 60000;
    function tick() {
      var left = Math.max(0, end - Date.now());
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      button.textContent = left ? m + ':' + String(s).padStart(2, '0') + ' left (stop)' : 'Time is up';
      if (!left) { clearInterval(timer.id); timer = null; }
    }
    timer = { id: setInterval(tick, 1000), button: button, minutes: minutes };
    tick();
  }

  function load() {
    if (!slug) return fail('This page needs to know which cohort’s session to show. Open it from your cohort page.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) return show('signed-out');
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This session could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        var cohort = c.data;
        return db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number').then(function (ss) {
          if (ss.error) return fail('The sessions could not be loaded: ' + ss.error.message);
          if (!ss.data.length) return show('not-member');
          var t = lib.currentAndNext(ss.data, new Date(), cohort.session_minutes);
          var session = t.live ? t.next : (t.next || t.current);
          var prev = ss.data.filter(function (x) { return x.number === session.number - 1; })[0];
          var since = prev && prev.starts_at ? prev.starts_at : new Date(Date.now() - 8 * 86400000).toISOString();
          return db.from('shares').select('id, user_id, kind, url, note, created_at').eq('cohort_id', cohort.id).eq('kind', 'bring-back').gte('created_at', since).order('created_at', { ascending: false }).then(function (sh) {
            return db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id).then(function (en) {
              draw(cohort, session, t.live, sh.data || [], en.data || []);
            });
          });
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  function draw(cohort, session, live, shares, people) {
    $('[data-kicker]').textContent = cohort.title + (live ? ', live now' : '');
    $('[data-title]').textContent = 'Week ' + session.number + (session.title && session.title !== 'Week ' + session.number ? ': ' + session.title : '');
    $('[data-scope]').textContent = session.scope || 'This week’s challenge will be here once your teacher writes it.';
    var top = $('[data-top-actions]'); top.replaceChildren();
    if (safe(session.meet_url)) { var j = el('a', 'btn-github', live ? 'Join the session' : 'The Meet link'); j.href = session.meet_url; j.target = '_blank'; j.rel = 'noopener'; top.appendChild(j); }
    var back = el('a', 'btn-quiet', 'Your cohort page'); back.href = '/cohort/?c=' + encodeURIComponent(cohort.slug); top.appendChild(back);
    $('[data-cohort-link]').href = back.href;

    var ol = $('[data-agenda]'); ol.replaceChildren();
    lib.agenda(cohort.session_minutes).forEach(function (p) {
      var li = el('li', 'agenda-part');
      var h = el('h3', null, p.name); li.appendChild(h);
      li.appendChild(el('p', 'small', 'Minute ' + p.start + ', for ' + p.minutes + ' minutes'));
      li.appendChild(el('p', null, p.what));
      var b = el('button', 'btn-quiet', 'Start ' + p.minutes + ' min'); b.type = 'button';
      b.addEventListener('click', function () { runTimer(b, p.minutes); });
      li.appendChild(b);
      ol.appendChild(li);
    });

    var stages = lib.stagesForWeek(session.number);
    $('[data-stages-section]').hidden = !stages.length;
    var ul = $('[data-stages]'); ul.replaceChildren();
    stages.forEach(function (n) { var li = el('li'); var a = el('a', null, 'Stage ' + n); a.href = '/path/' + n + '/'; li.appendChild(a); ul.appendChild(li); });

    var names = {}; people.forEach(function (p) { if (p.profiles) names[p.user_id] = p.profiles.display_name || p.profiles.github_login; });
    var box = $('[data-brought]'); box.replaceChildren();
    if (!shares.length) box.appendChild(el('p', 'small', 'Nothing has been brought back yet for this session.'));
    shares.forEach(function (s) {
      var card = el('article', 'cohort-card');
      card.appendChild(el('h3', null, names[s.user_id] || 'Someone'));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (safe(s.url)) { var a = el('a', null, s.url.replace(/^https:\/\//, '')); a.href = s.url; card.appendChild(el('p')).appendChild(a); }
      box.appendChild(card);
    });
    show('ready');
  }

  $('[data-reload]').addEventListener('click', load);
  load();
})();
