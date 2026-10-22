// A learner's feedback, from wherever it lives, as one list
// (research/notes/cohort-repository-design.md, section 5). Ben, October
// 22, 2026: "humanshaped.org should seemlessly pull in these different
// types of feedback and the discussions going on and present them in a
// single interface that is easily understood by learners." Each item
// keeps where it lives and who can see it, so the list never hides
// either. Tested in tools/test/feedback-lib.test.mjs.
(function (root) {
  // kind      where it lives                         who can see it
  //   note    humanshaped.org, a leader to them       them and their leaders
  //   share   humanshaped.org, on what they shared    their cohort
  //   cohort  the cohort's repository on GitHub        their cohort
  //   app     their app's repository on GitHub         everyone (a public repository)
  var AUDIENCE = { note: 'teachers', share: 'cohort', cohort: 'cohort', app: 'public' };

  function login(u) { return u && typeof u.login === 'string' ? u.login : null; }

  // o: { me (their id), myLogin, names ({id: name}), notes, shares,
  //      cohortIssues, appIssues, appRepo }
  function merge(o) {
    var names = o.names || {};
    var who = function (id) { return names[id] || 'Someone'; };
    var items = [];
    (o.notes || []).forEach(function (n) {
      items.push({ kind: 'note', id: 'note:' + n.id, noteId: n.id, who: who(n.author_id), at: n.created_at, text: n.body, href: null, about: null });
    });
    (o.shares || []).forEach(function (s) {
      if (s.user_id && o.me && s.user_id !== o.me) return;
      (s.feedback || []).forEach(function (f) {
        if (f.author_id === o.me) return;
        items.push({ kind: 'share', id: 'share:' + f.id, who: who(f.author_id), at: f.created_at, text: f.body, href: null, about: s.note || null });
      });
    });
    (o.cohortIssues || []).forEach(function (i) {
      if (!i || !i.html_url || login(i.user) === o.myLogin) return;
      items.push({ kind: 'cohort', id: 'cohort:' + i.html_url, who: login(i.user) ? '@' + login(i.user) : 'Someone', at: i.updated_at || i.created_at, text: i.title, href: i.html_url, about: null });
    });
    (o.appIssues || []).forEach(function (i) {
      // GitHub lists pull requests among issues; feedback is the issues.
      if (!i || !i.html_url || i.pull_request || login(i.user) === o.myLogin) return;
      items.push({ kind: 'app', id: 'app:' + i.html_url, who: login(i.user) ? '@' + login(i.user) : 'Someone', at: i.created_at, text: i.title, href: i.html_url, about: o.appRepo || null });
    });
    items.forEach(function (x) { x.audience = AUDIENCE[x.kind]; });
    return items.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  }

  // Where it lives, in a few words, for the row's meta line.
  function where(item) {
    if (item.kind === 'note') return 'A note from a leader';
    if (item.kind === 'share') return item.about ? 'On “' + cut(item.about, 60) + '”' : 'On what you shared';
    if (item.kind === 'cohort') return 'In the cohort’s repository';
    return item.about ? 'An issue on ' + item.about : 'An issue on your app';
  }

  function cut(text, max) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }

  // The GitHub searches the list reads: issues in the cohort's
  // repository that mention them, and their app's open issues.
  function cohortSearchUrl(repo, myLogin) {
    return 'https://api.github.com/search/issues?per_page=20&sort=updated&q=' + encodeURIComponent('repo:' + repo + ' mentions:' + myLogin);
  }
  function appIssuesUrl(appRepo) {
    return /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(appRepo || '') ? 'https://api.github.com/repos/' + appRepo + '/issues?state=open&per_page=20' : null;
  }

  var lib = { merge: merge, where: where, cut: cut, cohortSearchUrl: cohortSearchUrl, appIssuesUrl: appIssuesUrl, AUDIENCE: AUDIENCE };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.FeedbackLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
