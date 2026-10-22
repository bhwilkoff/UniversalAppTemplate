// The cohort's asks: the board Ben asked for, holding what only a board
// can, shared work with a state and an owner that anyone can move
// (research/notes/cohort-repository-design.md, section 6). Each ask is an
// issue in the cohort's repository with the label "ask": open with no one
// on it is Asked, open with someone on it is Someone has it, closed is
// Done. Nothing here counts or compares people. Tested in
// tools/test/asks-lib.test.mjs.
(function (root) {
  var API = 'https://api.github.com';
  var LABEL = 'ask';
  var DONE_DAYS = 14;

  var COLUMNS = [
    { key: 'asked', label: 'Asked' },
    { key: 'taken', label: 'Someone has it' },
    { key: 'done', label: 'Done' }
  ];

  function login(u) { return u && typeof u.login === 'string' ? u.login : null; }

  // GitHub's issues as cards in their columns. Done keeps two weeks, so
  // the board stays about what is going on now.
  function columns(issues, now) {
    var out = { asked: [], taken: [], done: [] };
    var since = (now || new Date()).getTime() - DONE_DAYS * 86400000;
    (issues || []).forEach(function (i) {
      if (!i || i.pull_request || typeof i.number !== 'number') return;
      var who = (i.assignees || []).map(login).filter(Boolean);
      var card = {
        number: i.number, title: String(i.title || ''), url: i.html_url, by: login(i.user),
        holders: who, comments: i.comments || 0, at: i.updated_at || i.created_at
      };
      if (i.state === 'closed') { if (Date.parse(i.closed_at || i.updated_at) >= since) out.done.push(card); }
      else if (who.length) out.taken.push(card);
      else out.asked.push(card);
    });
    out.asked.sort(function (a, b) { return a.number - b.number; });
    out.taken.sort(function (a, b) { return a.number - b.number; });
    out.done.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    return out;
  }

  // What this person can do with a card, by where it is and whether it
  // is theirs.
  function moves(card, column, me) {
    if (column === 'asked') return ['take', 'done'];
    if (column === 'taken') return card.holders.indexOf(me) !== -1 ? ['release', 'done'] : ['take', 'done'];
    return ['reopen'];
  }

  // The request each move makes.
  function request(repo, card, move, me) {
    var base = API + '/repos/' + repo + '/issues/' + card.number;
    if (move === 'take') return { method: 'POST', url: base + '/assignees', body: { assignees: [me] } };
    if (move === 'release') return { method: 'DELETE', url: base + '/assignees', body: { assignees: [me] } };
    if (move === 'done') return { method: 'PATCH', url: base, body: { state: 'closed', state_reason: 'completed' } };
    if (move === 'reopen') return { method: 'PATCH', url: base, body: { state: 'open' } };
    return null;
  }

  var MOVE_LABELS = { take: 'Take it', release: 'Let it go', done: 'Mark done', reopen: 'Reopen' };

  function listUrl(repo) { return API + '/repos/' + repo + '/issues?labels=' + LABEL + '&state=all&per_page=100&sort=created&direction=asc'; }
  function createUrl(repo) { return API + '/repos/' + repo + '/issues'; }
  function newAsk(title, details) {
    var t = String(title || '').replace(/\s+/g, ' ').trim();
    if (!t) return { problem: 'Say what you are asking' };
    if (t.length > 200) return { problem: 'Keep the ask to 200 characters; add the rest below it' };
    return { body: { title: t, body: String(details || '').trim() || null, labels: [LABEL] } };
  }

  var lib = {
    LABEL: LABEL, COLUMNS: COLUMNS, MOVE_LABELS: MOVE_LABELS, columns: columns, moves: moves, request: request,
    listUrl: listUrl, createUrl: createUrl, newAsk: newAsk
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.AsksLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
