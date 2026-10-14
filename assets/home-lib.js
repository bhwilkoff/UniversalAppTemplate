// Pure helpers for the signed-in home page (assets/home.js), tested in
// tools/test/home-lib.test.mjs. research/notes/signed-in-experience-notes.md
// says why the page is ordered the way it is.
(function (root) {
  var HOUR = 3600000, DAY = 24 * HOUR;

  // Where one cohort stands for this person: a session on now, the next
  // one, the cohort not yet begun, or finished. `sessions` are that
  // cohort's rows; `minutes` its session length.
  function cohortNow(c, sessions, now) {
    var t = now.getTime();
    var length = (c.session_minutes || 75) * 60000;
    var dated = (sessions || []).filter(function (s) { return s.starts_at; })
      .slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var live = dated.filter(function (s) { var at = Date.parse(s.starts_at); return at <= t && at + length > t; })[0] || null;
    var next = dated.filter(function (s) { return Date.parse(s.starts_at) > t; })[0] || null;
    var started = dated.filter(function (s) { return Date.parse(s.starts_at) <= t; });
    var week = started.length ? started[started.length - 1].number : 0;
    var kind = c.status === 'finished' ? 'finished'
      : live ? 'live'
      : c.status === 'draft' ? 'draft'
      : next ? (week ? 'between' : 'before')
      : dated.length ? 'over' : 'unscheduled';
    return { kind: kind, live: live, next: next, week: week, weeks: c.weeks || dated.length };
  }

  // The sessions worth naming at the top of the page: any on now, and any
  // within the next eight days, soonest first.
  function comingUp(cohorts, now) {
    var t = now.getTime();
    return cohorts.map(function (c) {
      var n = c.now;
      if (!n) return null;
      if (n.live) return { cohort: c, session: n.live, live: true, at: Date.parse(n.live.starts_at) };
      if (n.next && Date.parse(n.next.starts_at) - t < 8 * DAY) return { cohort: c, session: n.next, live: false, at: Date.parse(n.next.starts_at) };
      return null;
    }).filter(Boolean).sort(function (a, b) { return (b.live - a.live) || (a.at - b.at); });
  }

  // "Today at 5:00 PM", "Tomorrow at 5:00 PM", "Tuesday at 5:00 PM", or
  // "Tuesday, October 20, at 5:00 PM", on the reader's own clock.
  function whenText(iso, now, zone, locale) {
    var at = new Date(iso);
    var opt = zone ? { timeZone: zone } : {};
    var day = function (d) { return new Intl.DateTimeFormat('en-CA', Object.assign({ year: 'numeric', month: '2-digit', day: '2-digit' }, opt)).format(d); };
    var clock = new Intl.DateTimeFormat(locale, Object.assign({ hour: 'numeric', minute: '2-digit' }, opt)).format(at);
    var gap = Math.round((Date.parse(day(at)) - Date.parse(day(now))) / DAY);
    if (gap === 0) return 'Today at ' + clock;
    if (gap === 1) return 'Tomorrow at ' + clock;
    var weekday = new Intl.DateTimeFormat(locale, Object.assign({ weekday: 'long' }, opt)).format(at);
    if (gap > 1 && gap < 7) return weekday + ' at ' + clock;
    return new Intl.DateTimeFormat(locale, Object.assign({ weekday: 'long', month: 'long', day: 'numeric' }, opt)).format(at) + ', at ' + clock;
  }

  // One line under a cohort's name.
  function cohortLine(c, n) {
    var role = c.myRole === 'teacher' ? 'You teach it. ' : c.myRole === 'mentor' ? 'You are a mentor in it. ' : '';
    if (n.kind === 'live') return role + 'Week ' + n.live.number + ' is on right now.';
    if (n.kind === 'between') return role + 'Week ' + n.week + ' of ' + n.weeks + '.';
    if (n.kind === 'before') {
      var d = c.starts_on ? new Date(c.starts_on + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : null;
      return role + (d ? 'It begins ' + d + '.' : 'Its dates are still to come.');
    }
    if (n.kind === 'draft') return role + 'A draft, not yet open for people to join.';
    if (n.kind === 'finished') return role + 'Finished.';
    if (n.kind === 'over') return role + 'Every session has happened.';
    return role + 'Its sessions are still to be set.';
  }

  // The tokens of the time polls this browser has answered (times.js keeps
  // each answer's secret under hs-times-<token>).
  function answeredPolls(keys) {
    return (keys || []).map(function (k) { var m = /^hs-times-([0-9a-f]{32})$/.exec(k); return m ? m[1] : null; }).filter(Boolean);
  }

  // What is new for someone since they last opened this page, and what
  // waits on them as a teacher, as lines with a place to go. Counts only,
  // like the daily email.
  function waiting(w) {
    var out = [];
    function plural(n, one, many) { return n === 1 ? one : n + ' ' + many; }
    if (w.requests) out.push({ text: plural(w.requests, 'A request to teach is', 'requests to teach are') + ' waiting for your answer.', href: '/teach/#requests', action: 'Answer' });
    if (w.feedback) out.push({ text: plural(w.feedback, 'Someone is', 'people are') + ' waiting for your feedback.', href: '/teach/#waiting', action: 'Give feedback' });
    if (w.notes) out.push({ text: plural(w.notes, 'A teacher wrote you a note', 'notes from your teachers') + (w.notes === 1 ? '.' : ' are new.'), href: '/account/#notes', action: 'Read' });
    if (w.answers) out.push({ text: plural(w.answers, 'Someone answered what you shared', 'answers to what you shared') + (w.answers === 1 ? '.' : ' are new.'), href: w.answersHref || '/account/', action: 'Read' });
    if (w.videos) out.push({ text: plural(w.videos, 'A new video came in', 'new videos came in') + ' on your exchanges.', href: '#exchanges', action: 'Watch' });
    return out;
  }

  // Which of the page's sections a person sees, in order. Everyone sees
  // their cohorts (or how to join one), their exchanges, and their own app;
  // the rest appear when there is something in them or something to do.
  function sections(m) {
    var out = [];
    if (m.comingUp && m.comingUp.length) out.push('next');
    if (m.waiting && m.waiting.length) out.push('waiting');
    out.push('cohorts', 'exchanges');
    if (m.teacher || (m.polls && m.polls.length)) out.push('times');
    out.push('app');
    if (m.lastMark) out.push('stages');
    out.push('more');
    return out;
  }

  // The stage someone last marked, as a place to go back to.
  function lastStage(marks) {
    var latest = (marks || []).filter(function (m) { return m.updated_at; })
      .sort(function (a, b) { return b.updated_at.localeCompare(a.updated_at); })[0];
    return latest ? { stage: latest.stage, at: latest.updated_at } : null;
  }

  function newerThan(rows, field, since) {
    return (rows || []).filter(function (r) { return r[field] && (!since || r[field] > since); }).length;
  }

  var lib = { cohortNow: cohortNow, comingUp: comingUp, whenText: whenText, cohortLine: cohortLine, answeredPolls: answeredPolls, waiting: waiting, sections: sections, lastStage: lastStage, newerThan: newerThan };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.HomeLib = lib;
})(this);
