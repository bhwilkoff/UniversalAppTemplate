// The cohort page (/cohort/?c=<slug>). The hub's database says who is in
// the cohort and what they chose to share; everyone's work is read live
// from GitHub, never copied, because it belongs to them.
(function () {
  var root = document.querySelector('[data-cohort-page]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib) return;
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key);
  var lib = window.CohortLib;
  var slug = new URLSearchParams(location.search).get('c') || '';
  var me = null, cohort = null, token = null;

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text) { var a = el('a', null, text); a.href = href; return a; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function when(iso) {
    return new Date(iso).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  }
  function nameOf(p) { return p ? (p.display_name || p.github_login) : 'Someone'; }

  // Commits, read from GitHub with the visitor's own sign-in when there
  // is one, and remembered for ten minutes so a busy cohort page stays
  // under GitHub's limits.
  function commits(repo) {
    var key = 'hs-commits:' + repo;
    try {
      var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (hit && Date.now() - hit.at < 600000) return Promise.resolve(hit.data);
    } catch (e) {}
    var headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch('https://api.github.com/repos/' + repo + '/commits?per_page=3', { headers: headers })
      .then(function (r) {
        if (r.status === 404) return { missing: true };
        if (r.status === 409) return { empty: true };
        if (!r.ok) return { unavailable: r.status };
        return r.json().then(function (list) {
          return { list: list.map(function (c) { return { message: c.commit.message, date: c.commit.author && c.commit.author.date, url: c.html_url }; }) };
        });
      })
      .catch(function () { return { unavailable: 0 }; })
      .then(function (data) {
        if (data.list) { try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {} }
        return data;
      });
  }

  function personCard(e) {
    var card = el('article', 'app');
    card.appendChild(el('h3', null, e.app_name || nameOf(e.profiles)));
    var by = el('p', 'facts');
    by.appendChild(document.createTextNode((e.app_name ? 'Built by ' + nameOf(e.profiles) + ', ' : '')));
    if (e.profiles) by.appendChild(link('https://github.com/' + encodeURIComponent(e.profiles.github_login), '@' + e.profiles.github_login));
    card.appendChild(by);
    var repo = lib.repoPath(e.app_repo);
    var links = el('ul', 'links');
    if (safe(e.app_url)) links.appendChild(el('li')).appendChild(link(e.app_url, 'Use it'));
    if (repo) links.appendChild(el('li')).appendChild(link('https://github.com/' + repo, 'Its repository'));
    card.appendChild(links);
    var log = el('div', 'commits');
    card.appendChild(log);
    if (!repo) { log.appendChild(el('p', 'small', 'No repository shared yet.')); return card; }
    log.appendChild(el('p', 'small', 'Reading recent work from GitHub…'));
    commits(repo).then(function (d) {
      log.replaceChildren();
      if (d.missing) return log.appendChild(el('p', 'small', 'This repository is private or has moved, so its recent work cannot be shown here.'));
      if (d.empty) return log.appendChild(el('p', 'small', 'Nothing has been committed yet.'));
      if (!d.list) return log.appendChild(el('p', 'small', 'GitHub could not be reached just now, so recent work is not shown.'));
      var ul = el('ul', 'commit-list');
      d.list.forEach(function (c) {
        var li = el('li');
        li.appendChild(link(c.url, lib.commitLine(c.message)));
        if (c.date) li.appendChild(el('span', 'small', ' ' + lib.ago(c.date, new Date())));
        ul.appendChild(li);
      });
      log.appendChild(ul);
    });
    return card;
  }

  function drawShares(shares, people) {
    var box = $('[data-shares]');
    box.replaceChildren();
    if (!shares.length) { box.appendChild(el('p', 'small', 'Nothing has been shared yet this cohort.')); return; }
    var byId = {};
    people.forEach(function (p) { byId[p.user_id] = p.profiles; });
    var KIND = { 'bring-back': 'Bring-back', 'for-feedback': 'Asking for feedback', 'ai-review': 'A review from their AI agent', question: 'A question' };
    shares.forEach(function (s) {
      var card = el('article', 'cohort-card share');
      card.appendChild(el('p', 'kicker', KIND[s.kind] + ' from ' + nameOf(byId[s.user_id]) + ', ' + lib.ago(s.created_at, new Date())));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (safe(s.url)) card.appendChild(el('p')).appendChild(link(s.url, s.url.replace(/^https:\/\//, '')));
      (s.feedback || []).sort(function (a, b) { return a.created_at.localeCompare(b.created_at); }).forEach(function (f) {
        var q = el('blockquote', 'feedback');
        q.appendChild(el('p', null, f.body));
        q.appendChild(el('p', 'small', nameOf(byId[f.author_id] || (f.author_id === me.id ? { display_name: 'You' } : null))));
        card.appendChild(q);
      });
      var form = el('form', 'inline-form');
      var label = el('label', null, 'Your feedback');
      var input = el('textarea'); input.rows = 2; input.required = true; input.maxLength = 8000;
      label.appendChild(input); form.appendChild(label);
      var b = el('button', 'btn-quiet', 'Send'); b.type = 'submit';
      var a = el('div', 'actions'); a.appendChild(b); form.appendChild(a);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        db.from('feedback').insert({ share_id: s.id, author_id: me.id, body: input.value.trim() }).then(function (r) {
          if (r.error) { b.textContent = 'Not sent, try again'; return; }
          load();
        });
      });
      card.appendChild(form);
      box.appendChild(card);
    });
  }

  function load() {
    if (!slug) return fail('This page needs to know which cohort to show. Open it from your account.');
    show('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) return show('signed-out');
      me = session.user;
      token = session.provider_token || null;
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This cohort could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        cohort = c.data;
        return Promise.all([
          db.from('enrollments').select('user_id, role, status, app_name, app_repo, app_url, profiles(github_login, display_name)').eq('cohort_id', cohort.id).neq('status', 'left'),
          db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
          db.from('groups').select('id, name, expectations, group_members(user_id)').eq('cohort_id', cohort.id),
          db.from('shares').select('id, user_id, kind, url, note, created_at, feedback(id, author_id, body, created_at)').eq('cohort_id', cohort.id).order('created_at', { ascending: false }).limit(40),
          db.from('calendar_contacts').select('email').eq('cohort_id', cohort.id).eq('user_id', me.id).maybeSingle()
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('This cohort could not be loaded: ' + bad.error.message);
          var people = res[0].data;
          var mine = people.filter(function (p) { return p.user_id === me.id; })[0];
          if (!mine && !res[1].data.length && !people.length) return show('not-member');
          draw(people, mine, res[1].data, res[2].data, res[3].data, res[4].data);
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  function draw(people, mine, sessions, groups, shares, contact) {
    $('[data-title]').textContent = cohort.title;
    $('[data-lead]').textContent = cohort.description || '';
    var t = lib.currentAndNext(sessions, new Date(), cohort.session_minutes);
    $('[data-week-title]').textContent = t.current ? 'Week ' + t.current.number + (t.current.title && t.current.title !== 'Week ' + t.current.number ? ': ' + t.current.title : '') : 'This week';
    $('[data-week-scope]').textContent = t.current && t.current.scope ? t.current.scope : 'Your teacher will put this week’s challenge here.';
    var na = $('[data-next-actions]'); na.replaceChildren();
    if (t.next) {
      $('[data-next-when]').textContent = (t.live ? 'Happening now: ' : '') + when(t.next.starts_at) + ', for ' + cohort.session_minutes + ' minutes.';
      if (safe(t.next.meet_url)) { var j = link(t.next.meet_url, t.live ? 'Join the session now' : 'The Meet link'); j.className = 'btn-github'; na.appendChild(j); }
    } else {
      $('[data-next-when]').textContent = sessions.length ? 'The last session has happened.' : 'The sessions have not been scheduled yet.';
    }
    var past = sessions.filter(function (s) { return safe(s.recording_url); });
    past.forEach(function (s) { na.appendChild(link(s.recording_url, 'Week ' + s.number + ' recording')); });

    var myGroup = groups.filter(function (g) { return g.group_members.some(function (m) { return m.user_id === me.id; }); })[0];
    $('[data-group-section]').hidden = !myGroup;
    if (myGroup) {
      var gb = $('[data-group]'); gb.replaceChildren();
      gb.appendChild(el('p', null, myGroup.name + (myGroup.expectations ? ': ' + myGroup.expectations : '')));
      var names = people.filter(function (p) { return p.user_id !== me.id && myGroup.group_members.some(function (m) { return m.user_id === p.user_id; }); }).map(function (p) { return nameOf(p.profiles); });
      gb.appendChild(el('p', 'small', names.length ? 'With ' + names.join(', ') + '.' : 'Your teacher will add the others soon.'));
    }

    var form = $('[data-my-app]');
    form.hidden = !mine;
    if (mine) {
      form.elements.app_name.value = mine.app_name || '';
      form.elements.app_repo.value = mine.app_repo || '';
      form.elements.app_url.value = mine.app_url || '';
      form.elements.email.value = contact && contact.email ? contact.email : '';
    }
    var box = $('[data-people]'); box.replaceChildren();
    people.filter(function (p) { return p.role === 'student' || p.role === 'mentor'; }).forEach(function (p) { box.appendChild(personCard(p)); });
    if (!box.children.length) box.appendChild(el('p', 'small', 'No one has joined yet.'));
    drawShares(shares, people);
    show('ready');
  }

  $('[data-my-app]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target.elements, msg = $('[data-my-app-message]');
    var repo = f.app_repo.value.trim() ? lib.repoPath(f.app_repo.value) : null;
    if (f.app_repo.value.trim() && !repo) { msg.textContent = 'Give the repository as owner/name, for example bea/garden-swap, or paste its GitHub link.'; return; }
    msg.textContent = 'Saving…';
    var email = f.email.value.trim();
    Promise.all([
      db.from('enrollments').update({ app_name: f.app_name.value.trim() || null, app_repo: repo, app_url: f.app_url.value.trim() || null }).eq('cohort_id', cohort.id).eq('user_id', me.id),
      email
        ? db.from('calendar_contacts').upsert({ cohort_id: cohort.id, user_id: me.id, email: email })
        : db.from('calendar_contacts').delete().eq('cohort_id', cohort.id).eq('user_id', me.id)
    ]).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      msg.textContent = bad ? 'Not saved: ' + bad.error.message : 'Saved.';
      if (!bad) load();
    });
  });

  $('[data-share-form]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target.elements, msg = $('[data-share-message]');
    var url = f.url.value.trim();
    if (url && !safe(url)) { msg.textContent = 'Links need to start with https://.'; return; }
    msg.textContent = 'Sharing…';
    db.from('shares').insert({ cohort_id: cohort.id, user_id: me.id, kind: f.kind.value, url: url || null, note: f.note.value.trim() }).then(function (r) {
      if (r.error) { msg.textContent = 'Not shared: ' + r.error.message; return; }
      ev.target.reset(); msg.textContent = 'Shared with your cohort.';
      load();
    });
  });

  $('[data-reload]').addEventListener('click', load);
  load();
})();
