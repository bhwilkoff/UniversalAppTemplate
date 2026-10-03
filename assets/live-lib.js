// Pure helpers for the live session page (/live/): the "show your work"
// queue and checks for understanding. Tested in tools/test/live-lib.test.mjs.
(function (root) {
  // What a link is, read from its address alone, so a person can paste
  // anything from GitHub and the queue says what it is.
  function classifyLink(url) {
    var u;
    try { u = new URL(String(url || '').trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    var href = u.href;
    if (u.hostname === 'github.com') {
      var p = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      var repo = p.length >= 2 ? p[0] + '/' + p[1] : null;
      if (repo && p[2] === 'commit' && /^[0-9a-f]{7,40}$/i.test(p[3] || '')) {
        return { kind: 'commit', url: href, label: 'Commit ' + p[3].slice(0, 7) + ' in ' + repo };
      }
      if (repo && p[2] === 'issues' && /^\d+$/.test(p[3] || '')) return { kind: 'issue', url: href, label: 'Issue #' + p[3] + ' in ' + repo };
      if (repo && p[2] === 'pull' && /^\d+$/.test(p[3] || '')) return { kind: 'pull', url: href, label: 'Pull request #' + p[3] + ' in ' + repo };
      if (repo && p[2] === 'discussions' && /^\d+$/.test(p[3] || '')) return { kind: 'discussion', url: href, label: 'Discussion #' + p[3] + ' in ' + repo };
      if (repo && p.length === 2) return { kind: 'repo', url: href, label: repo + ' on GitHub' };
    }
    var short = (u.hostname + u.pathname).replace(/\/$/, '');
    return { kind: 'link', url: href, label: short.length > 60 ? short.slice(0, 57) + '…' : short };
  }

  // How an item in the queue reads, from what kind of thing it is.
  function itemLabel(item) {
    if (item.kind === 'app') return 'The app, live at ' + hostOf(item.url);
    if (item.kind === 'share') return 'Shared on the cohort page: ' + hostOf(item.url);
    var c = classifyLink(item.url);
    return c ? c.label : item.url;
  }
  function hostOf(url) { try { return new URL(url).hostname + new URL(url).pathname.replace(/\/$/, ''); } catch (e) { return url; } }

  // The queue in order: still to show, oldest first (the order people
  // asked in), then what has been shown, most recent first.
  function queue(items) {
    var waiting = items.filter(function (i) { return i.state !== 'shown'; })
      .sort(function (a, b) { return a.created_at.localeCompare(b.created_at); });
    var shown = items.filter(function (i) { return i.state === 'shown'; })
      .sort(function (a, b) { return String(b.shown_at || '').localeCompare(String(a.shown_at || '')); });
    return { waiting: waiting, shown: shown };
  }

  // The person who added an item and the cohort's teachers may mark it
  // shown or take it off; nobody else can (the database says the same).
  function canManage(item, meId, teaching) { return !!teaching || item.user_id === meId; }

  // A teacher's question: in their own words (no choices), or two to six
  // choices, one per line.
  function parseCheck(prompt, mode, choicesText) {
    var p = String(prompt || '').trim();
    if (!p) return { error: 'Write the question first.' };
    if (p.length > 500) return { error: 'Keep the question under 500 characters.' };
    if (mode !== 'choices') return { prompt: p, choices: null };
    var list = String(choicesText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (list.length < 2) return { error: 'Give at least two choices, one on each line.' };
    if (list.length > 6) return { error: 'Six choices is the most a question can have.' };
    if (list.some(function (s) { return s.length > 120; })) return { error: 'Keep each choice under 120 characters.' };
    return { prompt: p, choices: list };
  }

  // The anonymous tally, from check_tally's rows ({ choice, answers }).
  // Every choice is listed, even the ones nobody chose.
  function tally(check, rows) {
    var total = rows.reduce(function (n, r) { return n + Number(r.answers); }, 0);
    if (!check.choices) return { total: total, rows: [] };
    var by = {};
    rows.forEach(function (r) { by[r.choice] = Number(r.answers); });
    return {
      total: total,
      rows: check.choices.map(function (label, i) {
        var n = by[i + 1] || 0;
        return { label: label, count: n, share: total ? Math.round((n / total) * 100) : 0 };
      })
    };
  }

  function answerText(check, answer) {
    if (!answer) return null;
    if (check.choices) return check.choices[answer.choice - 1] || null;
    return answer.body;
  }

  function counted(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  var lib = { classifyLink: classifyLink, itemLabel: itemLabel, queue: queue, canManage: canManage, parseCheck: parseCheck, tally: tally, answerText: answerText, counted: counted };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.LiveLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
