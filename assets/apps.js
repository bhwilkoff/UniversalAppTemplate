// The public side of the hub: every app's page (/apps/app/?r=owner/repo),
// the list on /apps/, and the feed of work in progress on /apps/ and the
// home page. Apps come from the open directory and from the cohort apps
// their students chose to show (public_apps, hub-privacy-notes.md); their
// work is read live from GitHub and never copied, because it is theirs.
(function () {
  var lib = window.AppsLib, clib = window.CohortLib;
  if (!lib || !clib) return;
  var DIRECTORY = 'https://raw.githubusercontent.com/humanshaped/directory/main/directory.json';
  var FEED_REPOS = 8;      // at most this many GitHub calls for one visit's feed
  var COMMITS = 20;        // one page of commits, shared by the feed and the app page
  var TTL = 600000;        // remember GitHub's answers for ten minutes

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text, cls) { var a = el('a', cls, text); a.href = href; return a; }
  function li(child) { var l = el('li'); l.appendChild(child); return l; }

  function remember(key, ttl) {
    try {
      var hit = JSON.parse(localStorage.getItem(key) || 'null');
      if (hit && Date.now() - hit.at < ttl) return hit.data;
    } catch (e) {}
    return undefined;
  }
  function keep(key, data) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {} }

  // The visitor's own GitHub sign-in, when they have one on this site,
  // raises GitHub's limit from 60 calls an hour to 5,000.
  // The tab keeps it in sessionStorage for 7.5 hours (discussions-lib.js),
  // and older sign-ins may still have it in the saved session.
  function githubToken() {
    try {
      var held = JSON.parse(sessionStorage.getItem('hs-github-token') || 'null');
      if (held && typeof held.token === 'string' && Date.now() - held.at < 7.5 * 3600000) return held.token;
    } catch (e) {}
    try {
      var s = JSON.parse(localStorage.getItem('sb-bifrieqzkihuxfzttgvd-auth-token') || 'null');
      return s && s.provider_token || null;
    } catch (e) { return null; }
  }

  // One GitHub API call, cached, and honest about why it failed. While
  // GitHub's hourly limit is reached, no further calls are made.
  function github(path, shape) {
    var key = 'hs-gh:' + path;
    var hit = remember(key, TTL);
    if (hit !== undefined) return Promise.resolve(hit);
    var until = remember('hs-gh-limited', 3600000);
    if (until && until > Date.now()) return Promise.resolve({ trouble: { kind: 'limited', minutes: Math.ceil((until - Date.now()) / 60000) } });
    function call(token) {
      var headers = { Accept: 'application/vnd.github+json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      return fetch('https://api.github.com/' + path, { headers: headers }).then(function (r) {
        if (r.status === 401 && token) return call(null);
        var t = lib.trouble(r.status, r.headers.get('x-ratelimit-remaining'), r.headers.get('x-ratelimit-reset'), new Date());
        if (t && t.kind === 'limited') {
          keep('hs-gh-limited', Number(r.headers.get('x-ratelimit-reset')) * 1000 || Date.now() + 600000);
          return { trouble: t };
        }
        if (t) { var out = { trouble: t }; if (t.kind !== 'unavailable') keep(key, out); return out; }
        return r.json().then(function (data) { var out = { data: shape ? shape(data) : data }; keep(key, out); return out; });
      });
    }
    return call(githubToken()).catch(function () { return { trouble: { kind: 'unavailable' } }; });
  }

  function commits(repo) {
    return github('repos/' + repo + '/commits?per_page=' + COMMITS, function (list) {
      return (Array.isArray(list) ? list : []).map(lib.commitFrom);
    }).then(function (r) { return r.data ? { list: r.data } : r; });
  }

  // Cohort apps their students chose to show. Before that rule exists in
  // the hub's database, the call fails and nothing from the hub is shown.
  function shownCohortApps() {
    var hit = remember('hs-public-apps', TTL);
    if (hit !== undefined) return Promise.resolve(hit);
    if (!window.HUB) return Promise.resolve([]);
    return fetch(window.HUB.url + '/rest/v1/rpc/public_apps', {
      method: 'POST', headers: { apikey: window.HUB.key, 'Content-Type': 'application/json' }, body: '{}'
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { rows = Array.isArray(rows) ? rows : []; keep('hs-public-apps', rows); return rows; })
      .catch(function () { return []; });
  }

  function allApps() {
    var dir = fetch(DIRECTORY, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { return d.apps || []; });
    return Promise.all([dir, shownCohortApps()]).then(function (res) { return lib.mergeApps(res[0], res[1]); });
  }

  function commitItem(c, app) {
    var item = el('li');
    if (app) item.appendChild(link(lib.appHref(app.repo), app.name, 'feed-app'));
    item.appendChild(link(c.url, clib.commitLine(c.message), 'feed-line'));
    item.appendChild(el('span', 'feed-when', clib.ago(c.date, new Date())));
    return item;
  }

  // ---------------------------------------------------------------------
  // The feed: newest work across apps, on /apps/ and the home page.
  // ---------------------------------------------------------------------
  function drawFeed(box, apps) {
    var limit = Number(box.getAttribute('data-feed')) || 10;
    var list = box.querySelector('[data-feed-list]');
    var note = box.querySelector('[data-feed-note]');
    var quiet = box.hasAttribute('data-feed-quiet');
    var picked = lib.feedRepos(apps, FEED_REPOS);
    return Promise.all(picked.map(function (app) {
      return commits(app.repo).then(function (r) { return { app: app, commits: r.list || [], trouble: r.trouble }; });
    })).then(function (per) {
      var items = lib.feed(per, limit, 3);
      list.replaceChildren();
      items.forEach(function (i) { list.appendChild(commitItem(i.commit, i.app)); });
      var limited = per.filter(function (p) { return p.trouble && p.trouble.kind === 'limited'; })[0];
      if (!items.length) {
        if (quiet) return;
        note.textContent = limited ? lib.troubleText(limited.trouble) : 'GitHub could not be reached just now, so recent work is not shown.';
      } else if (limited && !quiet) {
        note.textContent = 'Some apps are missing from this list for now. ' + lib.troubleText(limited.trouble);
      }
      box.hidden = false;
    });
  }

  // ---------------------------------------------------------------------
  // /apps/: the directory's other apps, beside the four on the page.
  // ---------------------------------------------------------------------
  function drawDirectory(list, apps) {
    var others = apps.filter(function (a) { return a.status !== 'founding'; });
    if (!others.length) return;
    others.forEach(function (app) {
      var card = el('li', 'app');
      var h = el('h3'); h.appendChild(link(lib.appHref(app.repo), app.name)); card.appendChild(h);
      if (!app.repo) h.replaceChildren(document.createTextNode(app.name));
      card.appendChild(el('p', 'status', lib.statusText(app, null)));
      if (app.in_its_own_words) card.appendChild(el('p', 'own', '“' + app.in_its_own_words + '”'));
      var names = lib.platformNames(app.platforms);
      var facts = [];
      if (app.builder) facts.push('Built by ' + app.builder);
      if (names.length) facts.push('on ' + lib.joinWithAnd(names));
      if (facts.length) card.appendChild(el('p', 'facts', facts.join(', ') + '.'));
      var links = el('ul', 'links');
      links.setAttribute('aria-label', app.name + ' links');
      if (app.repo) links.appendChild(li(link(lib.appHref(app.repo), 'Follow its work')));
      if (lib.safeUrl(app.website)) links.appendChild(li(link(app.website, app.website.replace(/^https:\/\//, '').replace(/\/$/, ''))));
      card.appendChild(links);
      list.appendChild(card);
    });
    document.getElementById('more-apps').hidden = false;
  }

  // ---------------------------------------------------------------------
  // /apps/app/?r=owner/repo: one app's page.
  // ---------------------------------------------------------------------
  function drawAppPage(root, apps) {
    var repo = lib.repoPath(new URLSearchParams(location.search).get('r'));
    var app = repo ? lib.findApp(apps, repo) : null;
    function $(s) { return root.querySelector(s); }
    function show(state) { root.querySelectorAll('[data-state]').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
    if (!app) {
      if (repo) $('[data-unknown-repo]').textContent = repo;
      $('[data-unknown-repo-wrap]').hidden = !repo;
      return show('unknown');
    }
    repo = app.repo;
    document.title = app.name + ' | Human Shaped';
    var here = 'https://humanshaped.org' + lib.appHref(repo);
    var canon = document.querySelector('link[rel="canonical"]'); if (canon) canon.href = here;
    var og = document.querySelector('meta[property="og:url"]'); if (og) og.content = here;
    $('[data-name]').textContent = app.name;
    $('[data-crumb]').textContent = app.name;

    var declaration = fetch('https://raw.githubusercontent.com/' + repo + '/HEAD/HUMAN-SHAPED.md', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { return t ? lib.parseDeclaration(t) : null; })
      .catch(function () { return null; });
    var info = github('repos/' + repo, function (m) {
      return { description: m.description, has_discussions: !!m.has_discussions, has_issues: !!m.has_issues };
    });

    show('ready');
    $('[data-status]').textContent = lib.statusText(app, null);
    drawWhere(app, null);
    drawCommits(repo);
    var report = lib.reportHref(app);
    if (report && $('[data-report]')) { $('[data-report-link]').href = report; $('[data-report]').hidden = false; }

    Promise.all([declaration, info]).then(function (res) {
      var d = res[0], meta = res[1].data || null;
      $('[data-status]').textContent = lib.statusText(app, d);
      var words = lib.ownWords(app, d, meta);
      var own = $('[data-own]');
      own.hidden = !words;
      if (words) own.textContent = '“' + words.text + '”';
      $('[data-own-from]').hidden = !words;
      if (words) $('[data-own-from]').textContent = words.from === 'declaration' ? 'From its declaration.' : words.from === 'repository' ? 'From its repository on GitHub.' : 'From its listing in the directory.';
      drawWhere(app, d);
      drawDeclaration(repo, d);
      drawTalk(repo, meta, res[1].trouble);
    });

    function drawWhere(app, d) {
      var names = lib.platformNames((app.platforms && app.platforms.length) ? app.platforms : d ? d.platforms : []);
      var facts = [];
      var by = app.builder || (d && d.declaredBy);
      if (by) facts.push('Built by ' + by);
      if (names.length) facts.push((facts.length ? 'on ' : 'On ') + lib.joinWithAnd(names));
      $('[data-facts]').textContent = facts.length ? facts.join(', ') + '.' : '';
      var links = $('[data-links]'); links.replaceChildren();
      var site = lib.safeUrl(app.website) || (d && d.website);
      if (site) links.appendChild(li(link(site, site.replace(/^https:\/\//, '').replace(/\/$/, ''))));
      lib.storeLinks(app.stores).forEach(function (s) { links.appendChild(li(link(s.href, s.text))); });
      links.appendChild(li(link('https://github.com/' + repo, 'Its repository')));
      if (app.slug === 'archive-watch') links.appendChild(li(link('/why/archive-watch/', 'How it was built, month by month')));
    }

    function drawCommits(repo) {
      var box = $('[data-commits]');
      commits(repo).then(function (r) {
        box.replaceChildren();
        if (!r.list) return box.appendChild(el('p', 'small', lib.troubleText(r.trouble)));
        var work = r.list.filter(lib.isWork).slice(0, 8);
        if (!work.length) return box.appendChild(el('p', 'small', 'Nothing has been committed here lately except automatic updates.'));
        var ol = el('ol', 'feed');
        work.forEach(function (c) { ol.appendChild(commitItem(c, null)); });
        box.appendChild(ol);
        var more = el('p', 'section-more'); more.appendChild(link('https://github.com/' + repo + '/commits', 'Its whole history, on GitHub'));
        box.appendChild(more);
      });
    }

    function drawDeclaration(repo, d) {
      var box = $('[data-declaration]'); box.replaceChildren();
      var file = 'https://github.com/' + repo + '/blob/HEAD/HUMAN-SHAPED.md';
      if (!d || !d.principles.length) {
        box.appendChild(el('p', null, 'This app has not answered the principles yet. Its builder can do that in a file called HUMAN-SHAPED.md in the app’s own repository, answering each principle in their own words, with evidence anyone can open.'));
        var p = el('p'); p.appendChild(link('/start/#declare', 'How to show that your software is human-shaped')); box.appendChild(p);
        return;
      }
      var c = d.counts, parts = [];
      if (c.meets) parts.push(c.meets + ' met');
      if (c['not yet']) parts.push(c['not yet'] + ' not yet');
      if (c['does not apply']) parts.push(c['does not apply'] + (c['does not apply'] === 1 ? ' that does not apply' : ' that do not apply'));
      if (c.unanswered) parts.push(c.unanswered + ' still unanswered');
      var summary = 'Of the ' + d.principles.length + ' principles' + (d.version ? ' (version ' + d.version + ')' : '') + ', ' + lib.joinWithAnd(parts) + (d.date ? ', as of ' + new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '') + '.';
      box.appendChild(el('p', null, summary));
      var ol = el('ol', 'answers');
      d.principles.forEach(function (pr) {
        var item = el('li', 'answer');
        var head = el('p', 'answer-head');
        head.appendChild(el('span', 'answer-title', pr.n + '. ' + pr.title));
        head.appendChild(el('span', 'answer-tag' + (pr.answer ? ' is-' + pr.answer.replace(/ /g, '-') : ''), pr.answer ? pr.answer.charAt(0).toUpperCase() + pr.answer.slice(1) : 'Unanswered'));
        item.appendChild(head);
        if (pr.words) item.appendChild(el('p', 'answer-words', pr.words));
        if (pr.evidence.length) {
          var ev = el('p', 'small');
          ev.appendChild(link(pr.evidence[0], pr.evidence.length > 1 ? 'Evidence, and ' + (pr.evidence.length - 1) + ' more in the file' : 'Evidence'));
          item.appendChild(ev);
        }
        ol.appendChild(item);
      });
      box.appendChild(ol);
      var more = el('p', 'section-more'); more.appendChild(link(file, 'The whole declaration, on GitHub')); box.appendChild(more);
    }

    function drawTalk(repo, meta, trouble) {
      var box = $('[data-talk]'); box.replaceChildren();
      var talk = lib.conversation(repo, meta);
      if (!meta) {
        if (trouble && trouble.kind === 'missing') { box.appendChild(el('p', 'small', lib.troubleText(trouble))); return; }
        var p = el('p', 'small', 'GitHub could not tell this page just now where the conversation about this app happens, and ');
        p.appendChild(link('https://github.com/' + repo, 'its repository'));
        p.appendChild(document.createTextNode(' is the place to start.'));
        box.appendChild(p);
        return;
      }
      if (!talk) {
        box.appendChild(el('p', null, 'This repository has its conversations switched off on GitHub, so the way to reach its builder is through the app itself.'));
        return;
      }
      box.appendChild(el('p', null, talk.kind === 'discussions'
        ? 'Conversation about this app happens in its repository’s Discussions on GitHub, where anyone with a GitHub account can ask a question, share what they noticed, or say what it meant to them.'
        : 'Conversation about this app happens in its repository’s Issues on GitHub, where anyone with a GitHub account can ask a question or say what they noticed.'));
      var recent = el('div', 'app-threads');
      box.appendChild(recent);
      var a = el('div', 'actions');
      var go = link(talk.href, talk.kind === 'discussions' ? 'Join the conversation' : 'Open its Issues', 'btn-github');
      a.appendChild(go); box.appendChild(a);
      drawThreads(recent, repo, talk.kind);
    }

    // Its newest few threads, read live and never kept beyond the ten
    // minutes every GitHub answer is remembered. Issues need no sign-in;
    // GitHub only lists Discussions to someone signed in, so without a
    // GitHub sign-in this page keeps to the link.
    function drawThreads(box, repo, kind) {
      var C = window.CommunityLib;
      if (!C) return;
      function show(list, trouble) {
        box.replaceChildren();
        if (trouble) { if (trouble.kind === 'limited') box.appendChild(el('p', 'small', lib.troubleText(trouble))); return; }
        if (!list.length) { box.appendChild(el('p', 'small', kind === 'discussions' ? 'No one has started a discussion here yet.' : 'No one has opened an issue here yet.')); return; }
        var ol = el('ol', 'feed');
        list.forEach(function (t) {
          var item = el('li');
          item.appendChild(link(t.url, t.title, 'feed-line'));
          item.appendChild(el('span', 'feed-when', C.threadLine(t, function (iso) { return clib.ago(iso, new Date()); })));
          ol.appendChild(item);
        });
        box.appendChild(ol);
      }
      if (kind === 'issues') {
        github('repos/' + repo + '/issues?state=all&sort=updated&direction=desc&per_page=30', function (list) { return C.fromIssues(list, 3); })
          .then(function (r) { show(r.data || [], r.trouble); });
        return;
      }
      var token = githubToken();
      if (!token) { box.appendChild(el('p', 'small', 'Sign in with GitHub on this site and its newest discussions will show here.')); return; }
      var key = 'hs-gh:discussions:' + repo;
      var hit = remember(key, TTL);
      if (hit !== undefined) return show(hit);
      var parts = repo.split('/');
      fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: C.DISCUSSIONS, variables: { owner: parts[0], name: parts[1], n: 3 } })
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data) return;
          var list = C.fromDiscussions(data, 3);
          keep(key, list);
          show(list);
        })
        .catch(function () {});
    }
  }

  var page = document.querySelector('[data-app-page]');
  var feeds = document.querySelectorAll('[data-feed]');
  var directory = document.querySelector('[data-directory]');
  if (!page && !feeds.length && !directory) return;
  allApps().then(function (apps) {
    if (page) drawAppPage(page, apps);
    if (directory) drawDirectory(directory, apps);
    feeds.forEach(function (box) { drawFeed(box, apps); });
  }).catch(function () {
    if (page) page.querySelectorAll('[data-state]').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== 'error'; });
    feeds.forEach(function (box) {
      if (box.hasAttribute('data-feed-quiet')) return;
      box.querySelector('[data-feed-note]').textContent = 'The directory could not be reached just now, so recent work is not shown.';
      box.hidden = false;
    });
  });
})();
