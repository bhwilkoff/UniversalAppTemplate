// Pure helpers for the cohort page, tested in tools/test/cohort-lib.test.mjs.
(function (root) {
  // The week the cohort is in: the most recent session that has started,
  // or the first one if none has. "next" is the first session still to
  // come (a session counts as still to come until it has ended).
  function currentAndNext(sessions, now, minutes) {
    var sorted = sessions.filter(function (s) { return s.starts_at; })
      .slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var length = (minutes || 75) * 60000;
    var t = now.getTime();
    var started = sorted.filter(function (s) { return Date.parse(s.starts_at) <= t; });
    var upcoming = sorted.filter(function (s) { return Date.parse(s.starts_at) + length > t; });
    return {
      current: started.length ? started[started.length - 1] : (sorted[0] || null),
      next: upcoming[0] || null,
      live: !!(upcoming[0] && Date.parse(upcoming[0].starts_at) <= t)
    };
  }

  // A commit as a person reads it: the first line of its message, cut to
  // a sensible length, and how long ago it happened.
  function commitLine(message) {
    var first = String(message || '').split('\n')[0].trim();
    return first.length > 90 ? first.slice(0, 87).trimEnd() + '…' : first;
  }

  function ago(iso, now) {
    var s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
    if (s < 90) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' minutes ago';
    var h = Math.round(m / 60); if (h < 36) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago');
    var w = Math.round(d / 7); return w + ' weeks ago';
  }

  function repoPath(text) {
    var m = String(text || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '')
      .match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
    return m ? m[1] + '/' + m[2] : null;
  }

  // The live session's agenda, from the course's session shape: arrive,
  // show what you brought back in your group, one value at work, read one
  // real prompt together, build, and close. Built for 75 minutes and
  // scaled to the cohort's own session length.
  var PARTS = [
    ['Arrive', 5, 'One line in the chat: what you shipped this week, or where you are stuck. Cameras welcome, never required.'],
    ['Show what you brought back', 25, 'In your group, each person shows this week\u2019s bring-back on the real device, then hears three questions: where are you going, how is it going, and what comes next.'],
    ['One value at work', 7, 'One person shares a decision their values changed this week, and what it cost them.'],
    ['Read one real prompt', 20, 'Write the prompt you would send for the situation on screen, compare it with a partner, then see the real one and talk about what it fixed.'],
    ['Build', 15, 'Quiet building time, with a room open for anyone who is stuck.'],
    ['Close', 3, 'One line each: what you learned, why it matters, and what you will bring back next week.']
  ];
  function agenda(minutes) {
    var total = 75, scale = (minutes || total) / total, start = 0;
    return PARTS.map(function (p, i) {
      var len = i === PARTS.length - 1 ? Math.max(1, Math.round((minutes || total) - start)) : Math.max(1, Math.round(p[1] * scale));
      var part = { name: p[0], start: start, minutes: len, what: p[2] };
      start += len;
      return part;
    });
  }

  // Which stages of the path each week covers (COURSE.md, five weeks).
  var WEEK_STAGES = { 1: ['00', '01'], 2: ['02', '03'], 3: ['04'], 4: ['05', '06'], 5: ['07', '08'] };
  function stagesForWeek(n) { return WEEK_STAGES[n] || []; }

  var lib = { agenda: agenda, stagesForWeek: stagesForWeek, currentAndNext: currentAndNext, commitLine: commitLine, ago: ago, repoPath: repoPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CohortLib = lib;
})(this);
