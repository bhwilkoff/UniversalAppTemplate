// "Try my app": the cohort's one board, with one purpose (JOURNEYS.md,
// Ben's decision 3, October 23, 2026). A learner asks for their app to be
// tried on a device they do not have; someone takes it, tries it, and
// marks it tried with what they saw. That is the work of weeks 3 and 4
// (someone else's hands, someone else's device), and the one thing a
// board does that a conversation cannot: who has it, and whether it is
// done. Each request is an issue in the cohort's repository with the
// label "try-my-app": open with no one on it is Waiting, open with
// someone on it is Someone is trying it, closed is Tried. Nothing here
// counts or compares people. Tested in tools/test/asks-lib.test.mjs.
(function (root) {
  var API = 'https://api.github.com';
  var LABEL = 'try-my-app';
  var DONE_DAYS = 14;

  var COLUMNS = [
    { key: 'asked', label: 'Waiting' },
    { key: 'taken', label: 'Someone is trying it' },
    { key: 'done', label: 'Tried' }
  ];

  // The devices a learner might not have, in the words people use.
  var DEVICES = ['An iPhone', 'An iPad', 'An Android phone', 'An Android tablet', 'A Mac', 'A Windows computer', 'An Apple TV', 'An Android or Fire TV', 'Any web browser', 'Something else'];

  function login(u) { return u && typeof u.login === 'string' ? u.login : null; }

  // The device and address a request names, from the lines newTry writes.
  function detailsOf(body) {
    var text = String(body || '');
    var d = text.match(/^\*\*On:\*\* (.+)$/m), u = text.match(/^\*\*Where:\*\* (https:\/\/\S+)$/m);
    return { device: d ? d[1].trim() : null, url: u ? u[1] : null };
  }

  // GitHub's issues as cards in their columns. Tried keeps two weeks, so
  // the board stays about what is going on now.
  function columns(issues, now) {
    var out = { asked: [], taken: [], done: [] };
    var since = (now || new Date()).getTime() - DONE_DAYS * 86400000;
    (issues || []).forEach(function (i) {
      if (!i || i.pull_request || typeof i.number !== 'number') return;
      var who = (i.assignees || []).map(login).filter(Boolean);
      var more = detailsOf(i.body);
      var card = {
        number: i.number, title: String(i.title || ''), url: i.html_url, by: login(i.user),
        holders: who, comments: i.comments || 0, at: i.updated_at || i.created_at, device: more.device, app: more.url
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

  // What this person can do with a card: take one that is waiting (not
  // their own), and, once they have it, let it go or mark it tried. The
  // person who asked can ask again once it is tried.
  function moves(card, column, me) {
    var mine = card.by === me;
    if (column === 'asked') return mine ? [] : ['take'];
    if (column === 'taken') return card.holders.indexOf(me) !== -1 ? ['release', 'done'] : (mine ? [] : ['take']);
    return mine ? ['reopen'] : [];
  }

  // The request each move makes. Marking it tried also posts what they
  // saw first (sawComment), so the person who asked hears it.
  function request(repo, card, move, me) {
    var base = API + '/repos/' + repo + '/issues/' + card.number;
    if (move === 'take') return { method: 'POST', url: base + '/assignees', body: { assignees: [me] } };
    if (move === 'release') return { method: 'DELETE', url: base + '/assignees', body: { assignees: [me] } };
    if (move === 'done') return { method: 'PATCH', url: base, body: { state: 'closed', state_reason: 'completed' } };
    if (move === 'reopen') return { method: 'PATCH', url: base, body: { state: 'open' } };
    return null;
  }

  function sawComment(repo, card, text) {
    var t = String(text || '').trim();
    if (!t) return { problem: 'Say what you saw' };
    return { method: 'POST', url: API + '/repos/' + repo + '/issues/' + card.number + '/comments', body: { body: '**What I saw:** ' + t } };
  }

  var MOVE_LABELS = { take: 'I’ll try it', release: 'Let it go', done: 'Tried it', reopen: 'Ask again' };

  function listUrl(repo) { return API + '/repos/' + repo + '/issues?labels=' + LABEL + '&state=all&per_page=100&sort=created&direction=asc'; }
  function createUrl(repo) { return API + '/repos/' + repo + '/issues'; }

  // A new request: what to try, on which device, where the app is, and
  // anything else the person trying it should know.
  function newTry(what, device, url, details) {
    var t = String(what || '').replace(/\s+/g, ' ').trim();
    if (!t) return { problem: 'Say what they should try' };
    if (t.length > 200) return { problem: 'Keep it to 200 characters; add the rest below' };
    if (DEVICES.indexOf(device) === -1) return { problem: 'Choose the device' };
    var u = String(url || '').trim();
    if (u && !/^https:\/\/\S+$/.test(u)) return { problem: 'The app’s address starts with https://' };
    var lines = ['**On:** ' + device];
    if (u) lines.push('**Where:** ' + u);
    var more = String(details || '').trim();
    if (more) lines.push('', more);
    return { body: { title: t, body: lines.join('\n'), labels: [LABEL] } };
  }

  var lib = {
    LABEL: LABEL, COLUMNS: COLUMNS, DEVICES: DEVICES, MOVE_LABELS: MOVE_LABELS, columns: columns, moves: moves, request: request,
    sawComment: sawComment, listUrl: listUrl, createUrl: createUrl, newTry: newTry, detailsOf: detailsOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.AsksLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
