// "During class" on /live/ (research/notes/meet-classroom-design.md, C6):
// for the cohort's teachers, the commits pushed to the cohort's
// repositories since the session began, newest first, each linking to
// GitHub. Read live from GitHub's public API in the teacher's own browser
// (with their GitHub sign-in when the page has it), remembered for two
// minutes in this tab the way /cohort/ remembers commits, and never
// stored anywhere else. A commit signed by an agent says so.
(function () {
  var F = window.FollowupLib, C = window.CohortLib;
  if (!F || !C) return;
  var FRESH = 120000;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function read(who, since, token, fresh) {
    var key = 'hs-pushed:' + who.repo + ':' + since;
    if (!fresh) {
      try {
        var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (hit && Date.now() - hit.at < FRESH) return Promise.resolve(hit.data);
      } catch (e) {}
    }
    var headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(F.commitsUrl(who.repo, since), { headers: headers })
      .then(function (r) {
        if (r.status === 404) return { repo: who.repo, missing: true };
        if (r.status === 409) return { repo: who.repo, list: [] };
        if (!r.ok) return { repo: who.repo, unavailable: r.status };
        return r.json().then(function (list) { return { repo: who.repo, list: F.normalizeCommits(list, who) }; });
      })
      .catch(function () { return { repo: who.repo, unavailable: 0 }; })
      .then(function (data) {
        if (data.list) { try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {} }
        return data;
      });
  }

  // o: { teaching, people, since (the session's start), token }
  function draw(root, o) {
    var section = root.querySelector('[data-pushed-section]');
    if (!section) return;
    section.hidden = !o.teaching;
    if (!o.teaching) return;
    var list = section.querySelector('[data-pushed]');
    var status = section.querySelector('[data-pushed-status]');
    var again = section.querySelector('[data-pushed-reload]');
    var repos = F.cohortRepos(o.people);
    var started = o.since && Date.parse(o.since) <= Date.now();

    function run(fresh) {
      list.replaceChildren();
      again.hidden = !started || !repos.length;
      if (!started) { status.textContent = 'The session has not begun, so nothing has been pushed during it yet.'; return; }
      if (!repos.length) { status.textContent = 'No one has added their repository yet, so there is nothing to read.'; return; }
      status.textContent = 'Reading ' + repos.length + (repos.length === 1 ? ' repository' : ' repositories') + ' on GitHub…';
      again.disabled = true;
      Promise.all(repos.map(function (who) { return read(who, o.since, o.token, fresh); })).then(function (results) {
        again.disabled = false;
        var commits = F.pushedSince(results.filter(function (r) { return r.list; }).map(function (r) { return r.list; }), o.since, 30);
        var now = new Date();
        commits.forEach(function (c) {
          var li = el('li');
          if (c.url) { var a = el('a', null, c.line || c.sha); a.href = c.url; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(a); }
          else li.appendChild(document.createTextNode(c.line || c.sha));
          li.appendChild(el('span', 'small', ' ' + c.name + ', ' + C.ago(c.date, now) + (c.agent ? ', with ' + c.agent : '')));
          list.appendChild(li);
        });
        var unread = F.unreadText(results);
        status.textContent = (commits.length ? '' : 'Nothing has been pushed since the session began. ') + unread;
      });
    }
    again.onclick = function () { run(true); };
    run(false);
  }

  window.LiveCommits = { draw: draw };
})();
