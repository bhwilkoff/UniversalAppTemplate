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

  // The two questions a teacher can ask at the close of every session,
  // answered privately (the notes' 6.1 and 6.2, item 6; awaiting Ben's
  // review). The teacher reads both before the next session.
  var CLOSING_CHECKS = [
    'What can you decide or judge about your app now that you could not last week?',
    'What is still muddy?'
  ];

  // The trio protocol (the notes' 3.3 and 6.1: the Tuning protocol and
  // Liz Lerman's Critical Response Process, in the course's own words):
  // each builder's turn, in steps, with relative lengths that add up to
  // eight. Data, so the steps can change in one place.
  var TURN = [
    { key: 'ask', name: 'Their question', weight: 1, what: 'The builder says, in a line, what they want to know.' },
    { key: 'show', name: 'Show it, and one decision', weight: 3, what: 'On the real device, and then one decision explained with the agent closed.' },
    { key: 'clarify', name: 'One clarifying question', weight: 1, what: 'Partners ask one question to understand it, not to judge it. “What did you give up?” is a good one.' },
    { key: 'three', name: 'The three questions', weight: 2, what: 'Partners answer where it is going, how it is going, and what is next, while the builder listens.' },
    { key: 'next', name: 'What comes next', weight: 1, what: 'The builder says what they will do next.' }
  ];

  // Each step's length in seconds, so that every builder in the group has
  // a whole turn inside the part's minutes, rounded to quarter minutes and
  // never under thirty seconds.
  function turnSteps(partMinutes, builders) {
    var n = Math.max(1, builders || 1);
    var weights = TURN.reduce(function (s, t) { return s + t.weight; }, 0);
    var unit = (partMinutes * 60) / (n * weights);
    return TURN.map(function (t) {
      return { key: t.key, name: t.name, what: t.what, seconds: Math.max(30, Math.round((t.weight * unit) / 15) * 15) };
    });
  }

  // The order builders take their turns in a group: by name, moved along
  // by one each week, so a different person goes first every session. It
  // is the same order on every screen, and nobody's partners change.
  function presentingOrder(people, week) {
    var sorted = (people || []).slice().sort(function (a, b) {
      return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()) || String(a.id).localeCompare(String(b.id));
    });
    if (!sorted.length) return sorted;
    var k = ((Math.max(1, week || 1) - 1) % sorted.length + sorted.length) % sorted.length;
    return sorted.slice(k).concat(sorted.slice(0, k));
  }

  // A builder's newest bring-back from a list already limited to this
  // session's window.
  function latestBringBack(shares, userId) {
    return (shares || []).filter(function (s) { return s.user_id === userId && s.kind === 'bring-back'; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); })[0] || null;
  }

  function clock(seconds) {
    var s = Math.max(0, Math.round(seconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  var lib = {
    classifyLink: classifyLink, itemLabel: itemLabel, queue: queue, canManage: canManage, parseCheck: parseCheck, tally: tally, answerText: answerText, counted: counted,
    CLOSING_CHECKS: CLOSING_CHECKS, TURN: TURN, turnSteps: turnSteps, presentingOrder: presentingOrder, latestBringBack: latestBringBack, clock: clock
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.LiveLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
