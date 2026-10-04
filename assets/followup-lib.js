// Pure helpers for what a teacher reads during and after a session
// (research/notes/meet-classroom-design.md, C6 and C7): the commits
// pushed to the cohort's repositories since the session began, and, for
// each student, what they contributed on purpose, with a follow-up the
// teacher writes. Used by /teach/, /live/, and the hub's MCP server, and
// tested in tools/test/followup-lib.test.mjs.
//
// Nothing here writes a word to a student. The follow-up is the
// teacher's own text, kept in the teacher's browser until they send it.
(function (root) {
  // What someone answered, in words, for every kind of question (R4):
  // LiveLib knows them all; without it, a choice or their own words.
  function answerText(k, a) {
    var L = root.LiveLib || (typeof require === 'function' ? require('./live-lib.js') : null);
    if (L) return L.answerText(k, a) || '';
    return k.choices ? (k.choices[a.choice - 1] || '') : (a.body || '');
  }

  // ------------------------------------------------------------------
  // Commits during class
  // ------------------------------------------------------------------

  var REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

  // Each repository in the cohort once, with whose it is. Only people
  // still in the cohort, and only repositories given as owner/name.
  function cohortRepos(people) {
    var seen = {}, out = [];
    (people || []).forEach(function (p) {
      if (p.status === 'left' || !p.app_repo || !REPO.test(p.app_repo)) return;
      var key = p.app_repo.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      var prof = p.profiles || {};
      out.push({ repo: p.app_repo, user_id: p.user_id, name: prof.display_name || prof.github_login || 'Someone', login: prof.github_login || null });
    });
    return out;
  }

  // GitHub's list of commits for one repository since a time, newest
  // first (docs.github.com/en/rest/commits/commits). Public repositories
  // need no sign-in, at 60 requests an hour; signed in, 5,000.
  function commitsUrl(repo, sinceIso, perPage) {
    return 'https://api.github.com/repos/' + repo + '/commits?since=' + encodeURIComponent(sinceIso) + '&per_page=' + (perPage || 30);
  }

  // Which agent worked on a commit, read from its Co-Authored-By lines,
  // the way agents sign their work. Null when no agent signed it. This
  // reads only the commit's own message, and asks no agent anything.
  var AGENTS = [
    [/claude|anthropic/i, 'Claude'],
    [/gemini|jules/i, 'Gemini'],
    [/copilot/i, 'Copilot'],
    [/codex|openai|chatgpt/i, 'Codex'],
    [/cursor/i, 'Cursor']
  ];
  function agentOf(message) {
    var lines = String(message || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^\s*co-authored-by:\s*(.+)$/i);
      if (!m) continue;
      for (var j = 0; j < AGENTS.length; j++) if (AGENTS[j][0].test(m[1])) return AGENTS[j][1];
    }
    return null;
  }

  function firstLine(message) {
    var first = String(message || '').split('\n')[0].trim();
    return first.length > 90 ? first.slice(0, 87).trimEnd() + '…' : first;
  }

  // One repository's commits from GitHub's answer, as the page and the
  // agent read them. The time is when the commit was made on the
  // builder's machine or by their agent (the committer's date), which is
  // the closest GitHub's list comes to when it was pushed.
  function normalizeCommits(apiList, who) {
    if (!Array.isArray(apiList)) return [];
    return apiList.map(function (c) {
      var commit = c.commit || {};
      var date = (commit.committer && commit.committer.date) || (commit.author && commit.author.date) || null;
      return {
        repo: who.repo, user_id: who.user_id || null, name: who.name || null,
        sha: String(c.sha || '').slice(0, 7), line: firstLine(commit.message), date: date,
        url: /^https:\/\/github\.com\//.test(c.html_url || '') ? c.html_url : null,
        agent: agentOf(commit.message)
      };
    }).filter(function (c) { return c.date && c.sha; });
  }

  // Every repository's commits together, since the session began,
  // newest first, at most `limit` of them.
  function pushedSince(lists, sinceIso, limit) {
    var since = Date.parse(sinceIso);
    var all = [].concat.apply([], lists || []).filter(function (c) { return Date.parse(c.date) >= since; });
    all.sort(function (a, b) { return Date.parse(b.date) - Date.parse(a.date) || a.repo.localeCompare(b.repo); });
    return typeof limit === 'number' ? all.slice(0, limit) : all;
  }

  // A plain line about what GitHub could not show, from each repository's
  // result ({ repo, list } or { repo, missing } or { repo, unavailable }).
  function unreadText(results) {
    var missing = results.filter(function (r) { return r.missing; }).map(function (r) { return r.repo; });
    var down = results.filter(function (r) { return r.unavailable != null; }).map(function (r) { return r.repo; });
    var out = [];
    if (missing.length) out.push(listText(missing) + (missing.length === 1 ? ' is' : ' are') + ' private or moved, so ' + (missing.length === 1 ? 'its' : 'their') + ' commits are not shown.');
    if (down.length) out.push('GitHub did not answer for ' + listText(down) + ' just now, perhaps because of its hourly limit.');
    return out.join(' ');
  }

  function listText(items) {
    if (items.length < 3) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  // ------------------------------------------------------------------
  // Follow-ups after a session
  // ------------------------------------------------------------------

  // The stretch of time that belongs to a session: from the previous
  // session's start (bring-backs are made before a session) to the next
  // one's start. Without a previous session, the week before it; without
  // a next one, open-ended.
  function sessionWindow(sessions, session) {
    var sorted = (sessions || []).filter(function (s) { return s.starts_at; })
      .slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var i = sorted.map(function (s) { return s.id; }).indexOf(session.id);
    var prev = i > 0 ? sorted[i - 1] : null;
    var next = i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : null;
    var from = prev ? prev.starts_at : new Date(Date.parse(session.starts_at) - 7 * 86400000).toISOString();
    return { from: from, to: next ? next.starts_at : null };
  }

  function within(iso, w) {
    var t = Date.parse(iso);
    return t >= Date.parse(w.from) && (!w.to || t < Date.parse(w.to));
  }

  function isMuddy(prompt) { return /muddy/i.test(String(prompt || '')); }

  // What one student contributed to a session, on purpose, from what the
  // teacher can already read. data: shares (the cohort's, each with its
  // feedback), queue and checks (this session's), answers (this
  // session's, everyone's, which only teachers can read), notes (sent to
  // students), and teacherIds. Nothing here counts or scores anything.
  function contributions(userId, w, data) {
    var teacherIds = data.teacherIds || [];
    var shares = (data.shares || []).filter(function (s) { return within(s.created_at, w); });
    var mine = shares.filter(function (s) { return s.user_id === userId; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var checks = {};
    (data.checks || []).forEach(function (k) { checks[k.id] = k; });
    var answers = (data.answers || []).filter(function (a) { return a.user_id === userId && checks[a.check_id]; }).map(function (a) {
      var k = checks[a.check_id];
      return { prompt: k.prompt, kind: k.kind || (k.choices ? 'choice' : 'short'), text: answerText(k, a), muddy: isMuddy(k.prompt), at: k.created_at };
    }).sort(function (a, b) { return (b.muddy - a.muddy) || String(a.at).localeCompare(String(b.at)); });
    var given = [], received = [], fromTeachers = [];
    (data.shares || []).forEach(function (s) {
      (s.feedback || []).forEach(function (f) {
        if (!within(f.created_at, w)) return;
        if (f.author_id === userId && s.user_id !== userId) given.push({ to: s.user_id, body: f.body, created_at: f.created_at });
        if (s.user_id === userId && f.author_id !== userId) {
          var row = { from: f.author_id, body: f.body, created_at: f.created_at, share_id: s.id, feedback_id: f.id };
          (teacherIds.indexOf(f.author_id) >= 0 ? fromTeachers : received).push(row);
        }
      });
    });
    (data.notes || []).forEach(function (n) {
      if (n.student_id === userId && within(n.created_at, w)) fromTeachers.push({ from: n.author_id, body: n.body, created_at: n.created_at, note_id: n.id });
    });
    fromTeachers.sort(function (a, b) { return a.created_at.localeCompare(b.created_at); });
    var c = {
      bringBacks: mine.filter(function (s) { return s.kind === 'bring-back'; }),
      otherShares: mine.filter(function (s) { return s.kind !== 'bring-back'; }),
      queue: (data.queue || []).filter(function (q) { return q.user_id === userId; })
        .sort(function (a, b) { return a.created_at.localeCompare(b.created_at); }),
      answers: answers,
      given: given,
      received: received,
      fromTeachers: fromTeachers
    };
    c.empty = !c.bringBacks.length && !c.otherShares.length && !c.queue.length && !c.answers.length && !c.given.length;
    c.muddy = answers.filter(function (a) { return a.muddy && a.text; })[0] || null;
    return c;
  }

  // ------------------------------------------------------------------
  // The follow-up built from the show (R8)
  // ------------------------------------------------------------------

  var KIND_NAMES = { talk: 'Talk', presenter: 'Presenter', question: 'Question', design: 'Design stage', rooms: 'Rehearsal rooms', 'break': 'Break', reflection: 'Reflection' };

  // The session's run of show as it was planned, in order, for the top
  // of the follow-ups: each scene's kind, title, and minutes.
  function showAsRun(scenes) {
    return (scenes || []).slice().sort(function (a, b) { return a.position - b.position; }).map(function (s) {
      return { kind: KIND_NAMES[s.kind] || s.kind, title: s.title, minutes: s.minutes };
    });
  }

  // A student's trio for this session, with their partners' names, or
  // null when they are in no group.
  function roomOf(userId, groups, nameOf) {
    var g = (groups || []).filter(function (x) { return (x.group_members || []).some(function (m) { return m.user_id === userId; }); })[0];
    if (!g) return null;
    var partners = g.group_members.map(function (m) { return m.user_id; }).filter(function (id) { return id !== userId; });
    return { name: g.name, partners: partners.map(nameOf) };
  }

  // What they put in the wings, split into what they presented to
  // everyone and what the session ran out of time for.
  function presented(queue) {
    var q = queue || [];
    return { shown: q.filter(function (x) { return x.state === 'shown'; }), waiting: q.filter(function (x) { return x.state !== 'shown'; }) };
  }

  // Where a follow-up goes so the student will see it: as feedback on
  // their newest bring-back from this session, or, when there is none, as
  // a note to them alone on their cohort page.
  function followupTarget(c) {
    var bb = c && c.bringBacks && c.bringBacks[0];
    return bb ? { kind: 'feedback', share_id: bb.id } : { kind: 'note' };
  }

  // The order of the follow-up list: anyone who said something is still
  // muddy first (so it is answered soonest), then everyone else, by name.
  // It ranks no one by how much they did.
  function followupOrder(people, byId) {
    function name(p) { return String((p.profiles && (p.profiles.display_name || p.profiles.github_login)) || '').toLowerCase(); }
    return (people || []).filter(function (p) {
      return p.status !== 'left' && (p.role === 'student' || p.role === 'mentor');
    }).slice().sort(function (a, b) {
      var ma = byId[a.user_id] && byId[a.user_id].muddy ? 1 : 0;
      var mb = byId[b.user_id] && byId[b.user_id].muddy ? 1 : 0;
      return (mb - ma) || name(a).localeCompare(name(b));
    });
  }

  // A follow-up as the teacher sends it: their own words, trimmed, and
  // within what the database takes.
  function checkBody(text) {
    var t = String(text || '').trim();
    if (!t) return { error: 'Write the follow-up first.' };
    if (t.length > 8000) return { error: 'Keep it under 8,000 characters.' };
    return { body: t };
  }

  // ------------------------------------------------------------------
  // Drafts, in the teacher's browser only
  // ------------------------------------------------------------------

  // A draft lives in this browser's storage under one key per cohort,
  // session, and student, so the database never holds words about a
  // student that the student cannot read. Sending clears it. Storage can
  // be missing or refuse (a private window), so every call is guarded.
  var PREFIX = 'hs-followup:';
  function draftKey(cohortId, sessionId, userId) { return PREFIX + cohortId + ':' + sessionId + ':' + userId; }
  function loadDraft(store, key) {
    try { return (store && store.getItem(key)) || ''; } catch (e) { return ''; }
  }
  function saveDraft(store, key, text) {
    try {
      if (!store) return false;
      if (String(text || '').trim()) store.setItem(key, String(text));
      else store.removeItem(key);
      return true;
    } catch (e) { return false; }
  }
  function clearDraft(store, key) { return saveDraft(store, key, ''); }
  // How many follow-ups are still in drafts for one cohort, in this browser.
  function draftCount(store, cohortId) {
    try {
      var n = 0, p = PREFIX + cohortId + ':';
      for (var i = 0; i < store.length; i++) { var k = store.key(i); if (k && k.indexOf(p) === 0) n++; }
      return n;
    } catch (e) { return 0; }
  }

  var lib = {
    cohortRepos: cohortRepos, commitsUrl: commitsUrl, agentOf: agentOf, normalizeCommits: normalizeCommits, pushedSince: pushedSince, unreadText: unreadText,
    sessionWindow: sessionWindow, within: within, contributions: contributions, showAsRun: showAsRun, roomOf: roomOf, presented: presented, followupTarget: followupTarget, followupOrder: followupOrder, checkBody: checkBody,
    draftKey: draftKey, loadDraft: loadDraft, saveDraft: saveDraft, clearDraft: clearDraft, draftCount: draftCount
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.FollowupLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
