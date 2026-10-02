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

  var lib = { currentAndNext: currentAndNext, commitLine: commitLine, ago: ago, repoPath: repoPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CohortLib = lib;
})(this);
