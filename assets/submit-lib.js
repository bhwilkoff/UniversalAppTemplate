// Submitting an app by the end of a cohort (DECISIONS.md, "Showing apps
// in public"), as pure logic for /cohort/ and /teach/, tested in
// tools/test/submit-lib.test.mjs.
//
// Submitting means the student's own "it is ready" switch is on
// (enrollments.app_public), with a repository and a live address. A
// teacher's hide (app_hides) takes the app out of public view and does
// not undo the submission, because the student's part is done.
(function (root) {
  var WEEK = 7 * 86400000;

  // When the cohort is "near its end", and so when the cohort page tells
  // a student what their app still needs, and the teacher sees who has
  // not submitted yet: from the start of the second-to-last session (week
  // 4 of 5) to the end. Week 4 is where COURSE.md has the app installed
  // on someone else's device, so asking earlier would ask for something
  // the path has not reached yet, and week 5's showing is where every app
  // is seen, so this leaves a full week, and one more session, to get
  // there. With one session, the week before it; with no sessions yet,
  // the same week counted from the cohort's first day. A finished cohort
  // is always past it.
  function submissionWindow(cohort, sessions, now) {
    var t = now.getTime();
    var times = (sessions || []).filter(function (s) { return s.starts_at; })
      .map(function (s) { return Date.parse(s.starts_at); })
      .filter(function (x) { return !isNaN(x); })
      .sort(function (a, b) { return a - b; });
    var opens = null, last = null;
    if (times.length >= 2) { opens = times[times.length - 2]; last = times[times.length - 1]; }
    else if (times.length === 1) { opens = times[0] - WEEK; last = times[0]; }
    else if (cohort && cohort.starts_on) {
      var first = Date.parse(cohort.starts_on + 'T00:00:00Z');
      if (!isNaN(first)) opens = first + ((cohort.weeks || 5) - 2) * WEEK;
    }
    var finished = !!(cohort && cohort.status === 'finished');
    return {
      open: finished || (opens != null && t >= opens),
      opensAt: opens != null ? new Date(opens).toISOString() : null,
      lastSessionAt: last != null ? new Date(last).toISOString() : null,
      ended: finished || (last != null && t > last)
    };
  }

  // What an enrollment still needs before it counts as submitted, in the
  // order a student would add them on the cohort page.
  function submission(e) {
    var missing = [];
    if (!e || !e.app_repo) missing.push('repo');
    if (!e || !/^https:\/\/\S+$/.test(e.app_url || '')) missing.push('address');
    if (!e || !e.app_public) missing.push('ready');
    return { submitted: missing.length === 0, missing: missing };
  }

  function list(items) {
    if (items.length < 2) return items.join('');
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  var WORDS = {
    student: { repo: 'its repository on GitHub', address: 'the address where people can use it', ready: 'your word that it is ready to show' },
    teacher: { repo: 'a repository', address: 'a live address', ready: 'their word that it is ready' }
  };
  function missingText(missing, who) {
    var w = WORDS[who] || WORDS.student;
    return list(missing.map(function (k) { return w[k]; }));
  }

  // The note on a student's own cohort page: nothing until the window
  // opens, nothing once they have submitted, and otherwise one calm,
  // specific paragraph. lastSessionText is the last session's date as the
  // page writes it, or null.
  function studentNote(mine, win, lastSessionText) {
    if (!mine || mine.role !== 'student' || !win || !win.open) return null;
    var s = submission(mine);
    if (s.submitted) return null;
    var first;
    if (win.ended) {
      first = 'The cohort has come to its end, and every app in it is meant to be shown on humanshaped.org/apps/, yours included.';
    } else {
      first = 'Your app goes up on humanshaped.org/apps/ when you say it is ready, and every app in this cohort is up by the time the cohort ends' +
        (lastSessionText ? ', with the last session on ' + lastSessionText : '') + '.';
    }
    return {
      missing: s.missing,
      text: first + ' Yours still needs ' + missingText(s.missing, 'student') +
        (s.missing.length > 1 ? ', all of which you can add' : ', which you can add') + ' under Your app below.'
    };
  }

  function nameOf(p) { return p && p.profiles ? (p.profiles.display_name || p.profiles.github_login || '') : ''; }

  // The teacher's view of a cohort: who has submitted (with any hide),
  // and who has not yet (with what is missing), students only, people who
  // left set aside, each list in name order. A hide on an app that is not
  // submitted (the student turned their switch off afterwards) stays
  // visible to the teacher, so it can be lifted.
  function teacherView(people, hides) {
    var byUser = {};
    (hides || []).forEach(function (h) { byUser[h.user_id] = h; });
    var out = { submitted: [], notYet: [] };
    (people || []).filter(function (p) { return p.status !== 'left' && p.role === 'student'; })
      .slice().sort(function (a, b) { return nameOf(a).toLowerCase().localeCompare(nameOf(b).toLowerCase()); })
      .forEach(function (p) {
        var s = submission(p);
        var row = { person: p, hide: byUser[p.user_id] || null, missing: s.missing };
        (s.submitted ? out.submitted : out.notYet).push(row);
      });
    return out;
  }

  var lib = { submissionWindow: submissionWindow, submission: submission, missingText: missingText, studentNote: studentNote, teacherView: teacherView };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SubmitLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
