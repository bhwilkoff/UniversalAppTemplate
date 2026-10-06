// Pure helpers for the public app pages (/apps/, /apps/app/, and the home
// page's feed), tested in tools/test/apps-lib.test.mjs. Everything about
// an app is read live from the open directory and from GitHub; these
// functions only shape what was read.
(function (root) {
  var PLATFORMS = {
    web: 'the web', iphone: 'iPhone', ios: 'iPhone', ipad: 'iPad', ipados: 'iPad', mac: 'Mac', macos: 'Mac',
    'apple-tv': 'Apple TV', tvos: 'Apple TV', 'vision-pro': 'Vision Pro', visionos: 'Vision Pro',
    android: 'Android', 'google-tv': 'Google TV', 'android-tv': 'Google TV', 'fire-tv': 'Fire TV',
    roku: 'Roku', windows: 'Windows'
  };
  var STORES = { 'app-store': 'App Store', 'google-play': 'Google Play', amazon: 'Amazon Appstore', roku: 'Roku Channel Store', microsoft: 'Microsoft Store' };

  function joinWithAnd(items) {
    if (items.length < 3) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  // owner/repo from a GitHub link or from owner/repo itself.
  function repoPath(text) {
    var m = String(text || '').trim().replace(/^https:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/$/, '')
      .match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
    return m ? m[1] + '/' + m[2] : null;
  }

  function safeUrl(u) { return /^https:\/\/[^\s]+$/.test(u || '') ? u : null; }

  function platformNames(list) {
    var seen = {};
    return (list || []).map(function (p) { return PLATFORMS[String(p).toLowerCase()] || String(p); })
      .filter(function (n) { if (seen[n]) return false; seen[n] = true; return true; });
  }

  // One list of apps from the directory and from the hub's public_apps()
  // (cohort apps, then builders' own apps outside any cohort),
  // each with its repository as owner/repo, keyed case-insensitively so a
  // cohort app already in the directory is not listed twice.
  function mergeApps(directoryApps, cohortApps) {
    var out = [], seen = {};
    (directoryApps || []).forEach(function (a) {
      var repo = repoPath(a.repository);
      var app = Object.assign({}, a, { repo: repo, source: 'directory' });
      if (repo) { if (seen[repo.toLowerCase()]) return; seen[repo.toLowerCase()] = true; }
      out.push(app);
    });
    (cohortApps || []).forEach(function (c) {
      var repo = repoPath(c.app_repo);
      if (!repo || seen[repo.toLowerCase()]) return;
      seen[repo.toLowerCase()] = true;
      // A builder's own app (outside any cohort) says so; anything else
      // from the hub is a cohort's, as before the hub said which.
      var kind = c.kind === 'builder' ? 'builder' : 'cohort';
      out.push({ name: c.app_name || repo.split('/')[1], repo: repo, website: safeUrl(c.app_url), status: kind, active: true, source: kind });
    });
    return out;
  }

  function findApp(apps, repo) {
    var key = String(repo || '').toLowerCase();
    return (apps || []).filter(function (a) { return a.repo && a.repo.toLowerCase() === key; })[0] || null;
  }

  // Which repositories the feed reads: active apps first, at most `cap`,
  // so one visit never spends more than `cap` of GitHub's 60 hourly calls.
  function feedRepos(apps, cap) {
    var withRepo = (apps || []).filter(function (a) { return a.repo; });
    var ordered = withRepo.filter(function (a) { return a.active !== false; })
      .concat(withRepo.filter(function (a) { return a.active === false; }));
    return ordered.slice(0, cap);
  }

  // Automated commits: GitHub's bot accounts, any author named or mailed
  // as a bot (scheduled jobs often commit as "something-bot"), and
  // commits that ask CI to skip them, which only machines write.
  function automated(c, login) {
    var who = c.commit && c.commit.author || {};
    if (/\[bot\]$/.test(login) || login === 'bot' || (c.author && c.author.type === 'Bot')) return true;
    if (/(^|[-_.\s\[])bot(\]|$)/i.test(who.name || '') || /^bot@|[-+.\[]bot[\].@]/i.test(who.email || '')) return true;
    return /\[(skip ci|ci skip)\]/i.test(c.commit && c.commit.message || '');
  }

  // A commit from GitHub's API, as the pages use it.
  function commitFrom(c) {
    var login = c.author && c.author.login || '';
    return {
      sha: c.sha,
      message: c.commit && c.commit.message || '',
      date: c.commit && (c.commit.committer && c.commit.committer.date || c.commit.author && c.commit.author.date) || null,
      url: c.html_url,
      merge: (c.parents || []).length > 1,
      bot: automated(c, login)
    };
  }

  // Work people did: no merge commits and no automated accounts.
  function isWork(c) { return !c.merge && !c.bot && !!c.date; }

  // A page of commits with nothing but automatic updates in it sends the
  // pages to the owner's own commits (apps.js), which GitHub filters by
  // author for the same one call.
  function needsOwnerLook(list) { return !!list && list.length > 0 && !list.some(isWork); }
  function ownerCommitsPath(repo, n) {
    var owner = String(repo || '').split('/')[0];
    return 'repos/' + repo + '/commits?author=' + encodeURIComponent(owner) + '&per_page=' + (n || 20);
  }

  // The feed: the newest work across apps, at most `perApp` from any one
  // app so a busy repository does not drown the others out.
  function feed(perRepo, limit, perApp) {
    var all = [];
    (perRepo || []).forEach(function (r) {
      (r.commits || []).filter(isWork).slice(0, perApp || 3).forEach(function (c) { all.push({ app: r.app, commit: c }); });
    });
    all.sort(function (a, b) { return Date.parse(b.commit.date) - Date.parse(a.commit.date); });
    return all.slice(0, limit);
  }

  // What GitHub's answer means for a person reading the page.
  function trouble(status, remaining, reset, now) {
    if (status === 404) return { kind: 'missing' };
    if (status === 409) return { kind: 'empty' };
    if ((status === 403 || status === 429) && String(remaining) === '0') {
      var at = reset ? new Date(Number(reset) * 1000) : null;
      var mins = at ? Math.max(1, Math.ceil((at.getTime() - now.getTime()) / 60000)) : null;
      return { kind: 'limited', minutes: mins };
    }
    if (status >= 200 && status < 300) return null;
    return { kind: 'unavailable' };
  }

  function troubleText(t) {
    if (!t) return '';
    if (t.kind === 'missing') return 'This repository is private, has moved, or no longer exists, so its recent work cannot be shown here.';
    if (t.kind === 'empty') return 'Nothing has been committed to this repository yet.';
    if (t.kind === 'limited') return 'GitHub lets one visitor read only so much each hour, and this browser has reached that limit' +
      (t.minutes ? ', so recent work will be back in about ' + t.minutes + (t.minutes === 1 ? ' minute.' : ' minutes.') : '.') +
      ' Signing in with GitHub raises the limit.';
    return 'GitHub could not be reached just now, so recent work is not shown.';
  }

  // HUMAN-SHAPED.md: its header, what it is for, and each principle's
  // answer in the builder's own words (the template's own format,
  // docs/human-shaped/HUMAN-SHAPED-template.md).
  function unquote(v) {
    v = v.trim();
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    return v;
  }
  function frontMatter(text) {
    var m = String(text || '').match(/^---\s*\n([\s\S]*?)\n---/);
    var out = {};
    if (!m) return out;
    m[1].split('\n').forEach(function (line) {
      line = line.replace(/\s+#.*$/, '').trim();
      if (!line || line[0] === '#' || line.indexOf(':') < 0) return;
      var key = line.slice(0, line.indexOf(':')).trim();
      var val = line.slice(line.indexOf(':') + 1).trim();
      if (/^\[.*\]$/.test(val)) out[key] = val.slice(1, -1).split(',').map(unquote).filter(Boolean);
      else out[key] = unquote(val);
    });
    return out;
  }
  function plain(md) {
    return String(md || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function answerOf(text) {
    var t = plain(text).toLowerCase().replace(/[.:]$/, '');
    if (/\//.test(t)) return null; // the template's "meets / not yet / does not apply", left unanswered
    if (/^meets\b/.test(t)) return 'meets';
    if (/^not yet\b/.test(t)) return 'not yet';
    if (/^does not apply\b/.test(t)) return 'does not apply';
    return null;
  }
  function field(body, name) {
    var re = new RegExp('\\*\\*' + name + ':?\\*\\*:?([\\s\\S]*?)(?=\\n\\*\\*[A-Z][^*\\n]*:?\\*\\*|\\n#{1,3} |$)');
    var m = body.match(re);
    return m ? m[1].trim() : '';
  }
  function links(text) {
    var out = [];
    String(text || '').replace(/\]\((https:\/\/[^)\s]+)\)|<(https:\/\/[^>\s]+)>|(?:^|\s)(https:\/\/[^\s)]+)/g, function (_, a, b, c) {
      out.push(a || b || c); return _;
    });
    return out;
  }
  function parseDeclaration(md) {
    var text = String(md || '').replace(/\r\n/g, '\n');
    var meta = frontMatter(text);
    var body = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
    var purposeMatch = body.match(/\*\*What it is for, and who it is for\.?\*\*([\s\S]*?)(?=\n#{1,3} |\n---|$)/);
    var purpose = purposeMatch ? plain(purposeMatch[1]) : '';
    if (/^One or two sentences, in your own words\.?$/i.test(purpose)) purpose = '';
    var principles = [];
    var re = /\n## (\d{1,2})\. ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g, m;
    while ((m = re.exec('\n' + body))) {
      var section = m[3];
      var words = plain(field(section, 'In my words'));
      principles.push({
        n: Number(m[1]),
        title: plain(m[2]),
        answer: answerOf(field(section, 'Answer')),
        words: words,
        evidence: links(field(section, 'Evidence'))
      });
    }
    var status = String(meta.status || '').toLowerCase();
    if (['declared', 'working toward', 'withdrawn'].indexOf(status) < 0) status = principles.length ? 'working toward' : '';
    return {
      app: meta.app && meta.app !== "Your app's name" ? meta.app : '',
      status: status,
      version: meta.principles_version || '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date || '') ? meta.date : '',
      declaredBy: meta.declared_by && meta.declared_by !== 'Your name' ? meta.declared_by : '',
      website: safeUrl(meta.website) && meta.website !== 'https://' ? meta.website : null,
      platforms: Array.isArray(meta.platforms) ? meta.platforms : [],
      purpose: purpose,
      principles: principles,
      counts: principles.reduce(function (c, p) { c[p.answer || 'unanswered'] = (c[p.answer || 'unanswered'] || 0) + 1; return c; }, {})
    };
  }

  // The app's own words: its declaration's purpose first, then its
  // directory listing, then the repository's description on GitHub.
  function ownWords(app, declaration, repoInfo) {
    if (declaration && declaration.purpose) return { text: declaration.purpose, from: 'declaration' };
    if (app && app.in_its_own_words) return { text: app.in_its_own_words, from: 'directory' };
    if (repoInfo && repoInfo.description) return { text: repoInfo.description, from: 'repository' };
    return null;
  }

  // One line that says where an app stands, in the two marks' words
  // (DECISIONS.md, October 5, 2026): an app whose HUMAN-SHAPED.md
  // answers the principles is aligned with Human Shaped, whether every
  // answer is "meets" yet or not, and one made from the template is
  // endorsed by it.
  function statusText(app, declaration) {
    if (declaration && declaration.status === 'withdrawn') return 'Its answers to the principles have been withdrawn';
    if (declaration && declaration.principles && declaration.principles.length) return 'Aligned with Human Shaped';
    if (declaration && (declaration.status === 'declared' || declaration.status === 'working toward')) return 'Aligned with Human Shaped';
    if (app && app.status === 'founding') return 'One of the four apps the method came from';
    if (app && app.status === 'cohort') return 'Being built in a cohort';
    if (app && app.status === 'builder') return 'Shown here by the person building it';
    if (app && app.status === 'template') return 'Endorsed by Human Shaped, made from the template';
    return 'In the directory';
  }

  // A builder's own app has no teacher watching over it, so its page says
  // how anyone can tell the people who decide what the hub shows: an
  // issue in the open directory, with the app named and nothing else
  // filled in. Cohort apps have their teachers, and directory apps their
  // listing, so they get no such link.
  function reportHref(app) {
    if (!app || app.source !== 'builder' || !app.repo) return null;
    var title = 'Something is wrong with ' + app.repo + ' on humanshaped.org';
    var body = 'The app: https://humanshaped.org' + appHref(app.repo) + '\n\nWhat is wrong:\n';
    return 'https://github.com/humanshaped/directory/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  // Where to talk about it: the repository's Discussions if it has them,
  // its Issues otherwise.
  function conversation(repo, repoInfo) {
    if (!repo || !repoInfo) return null;
    if (repoInfo.has_discussions) return { href: 'https://github.com/' + repo + '/discussions', kind: 'discussions' };
    if (repoInfo.has_issues) return { href: 'https://github.com/' + repo + '/issues', kind: 'issues' };
    return null;
  }

  // A picture of the app for its card (Ben, October 5: pages that feel
  // alive): a screenshot the listing names (an https address, or a path
  // in the app's own repository), else GitHub's own preview of the
  // repository, which the page already reads from. A drawn cover sits
  // behind either one, so a card never shows an empty box.
  function imageOf(app) {
    var img = app && typeof app.image === 'string' ? app.image.trim() : '';
    var repo = app && (app.repo || repoPath(app.repository));
    if (img && safeUrl(img)) return img;
    if (img && repo && /^[A-Za-z0-9._\/-]+\.(png|jpe?g|webp|gif|svg)$/i.test(img) && img.indexOf('..') < 0) {
      return 'https://raw.githubusercontent.com/' + repo + '/HEAD/' + img.replace(/^\/+/, '');
    }
    return repo ? 'https://opengraph.githubassets.com/humanshaped/' + repo : null;
  }

  // Screens from the stores: the screenshots each founding app submitted
  // to its store listings, copied small into assets/apps/ (sources in
  // assets/apps/README.md). A wide set is a TV app; the rest are phones.
  var SHOTS = {
    'archive-watch': { n: 2 },
    'tidbits-trivia': { n: 2 },
    'boba-playbook': { n: 2 },
    'bsky-dreams': { n: 2 }
  };
  function shotsOf(app) {
    var repo = app && (app.repo || repoPath(app.repository));
    var key = String((app && app.slug) || (repo ? repo.split('/')[1] : '') || '').toLowerCase();
    var s = SHOTS[key];
    if (!s) return null;
    var files = [];
    for (var i = 1; i <= s.n; i++) files.push('/assets/apps/' + key + '-' + i + '.webp');
    return { wide: !!s.wide, files: files };
  }

  // The drawn cover: the app's initials on one of the site's tones, picked
  // by the card's place in the list (index) so that neighbors always
  // differ, or by the app's name when it stands alone.
  var COVER_TONES = ['#1F4D3A', '#2F6D8C', '#6A5A8C', '#3F7A4F', '#8C6A1F', '#8C3F6A', '#3F6F7A', '#5A5F66'];
  function coverOf(app, index) {
    var name = String((app && app.name) || '?').trim();
    var words = name.split(/[\s-]+/).filter(Boolean);
    var initials = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
    // FNV-1a, which spreads short names across the tones better than a
    // plain multiply.
    var h = 2166136261;
    for (var i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    var at = typeof index === 'number' && index >= 0 ? index : h;
    return { initials: initials, tone: COVER_TONES[at % COVER_TONES.length] };
  }

  function storeLinks(stores) {
    return Object.keys(stores || {}).filter(function (k) { return safeUrl(stores[k]); })
      .map(function (k) { return { href: stores[k], text: STORES[k] || k }; });
  }

  function appHref(repo) { return '/apps/app/?r=' + repo; }

  var lib = {
    imageOf: imageOf, coverOf: coverOf, shotsOf: shotsOf,
    joinWithAnd: joinWithAnd, repoPath: repoPath, safeUrl: safeUrl, platformNames: platformNames,
    mergeApps: mergeApps, findApp: findApp, feedRepos: feedRepos, commitFrom: commitFrom, isWork: isWork,
    feed: feed, needsOwnerLook: needsOwnerLook, ownerCommitsPath: ownerCommitsPath, trouble: trouble, troubleText: troubleText, parseDeclaration: parseDeclaration,
    ownWords: ownWords, statusText: statusText, conversation: conversation, storeLinks: storeLinks, appHref: appHref, reportHref: reportHref
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.AppsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
