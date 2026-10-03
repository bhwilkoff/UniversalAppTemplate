// Pure calculations for the teacher page, kept apart from the page so
// they can be tested on their own (tools/test/teach-lib.test.mjs).
(function (root) {
  var WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // The UTC instant for a wall-clock date and time in a time zone, so a
  // 5pm session in Denver stays 5pm in Denver across a daylight saving
  // change, whatever time zone the teacher's own computer is in.
  function zonedToUtc(dateStr, timeStr, timeZone) {
    var d = dateStr.split('-').map(Number);
    var t = (timeStr || '00:00').split(':').map(Number);
    var wall = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    function offsetAt(instant) {
      var p = {};
      fmt.formatToParts(new Date(instant)).forEach(function (x) { p[x.type] = x.value; });
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - instant;
    }
    var guess = wall - offsetAt(wall);
    return new Date(wall - offsetAt(guess));
  }

  // The first session falls on the first chosen weekday on or after the
  // cohort's first day, then one a week.
  function sessionDates(startsOn, weekday, weeks) {
    var d = startsOn.split('-').map(Number);
    var day = new Date(Date.UTC(d[0], d[1] - 1, d[2]));
    while (day.getUTCDay() !== Number(weekday)) day.setUTCDate(day.getUTCDate() + 1);
    var out = [];
    for (var i = 0; i < weeks; i++) {
      var s = new Date(day.getTime() + i * 7 * 86400000);
      out.push(s.toISOString().slice(0, 10));
    }
    return out;
  }

  function sessionRows(cohort) {
    if (!cohort.starts_on || cohort.session_weekday == null || !cohort.session_time) return null;
    return sessionDates(cohort.starts_on, cohort.session_weekday, cohort.weeks).map(function (date, i) {
      return {
        cohort_id: cohort.id,
        number: i + 1,
        starts_at: zonedToUtc(date, cohort.session_time.slice(0, 5), cohort.time_zone).toISOString(),
        title: 'Week ' + (i + 1)
      };
    });
  }

  // The cohort in the shape tools/meet-events/Code.gs reads.
  function meetSetup(cohort, emails, teacherEmails) {
    var first = cohort.starts_on && cohort.session_weekday != null
      ? sessionDates(cohort.starts_on, cohort.session_weekday, 1)[0] : null;
    return {
      id: cohort.slug,
      title: cohort.title,
      startDate: first,
      weekday: cohort.session_weekday != null ? WEEKDAYS[cohort.session_weekday] : null,
      startTime: cohort.session_time ? cohort.session_time.slice(0, 5) : null,
      timeZone: cohort.time_zone,
      minutes: cohort.session_minutes,
      sessions: cohort.weeks,
      members: emails.join(', '),
      teachers: (teacherEmails || []).join(', '),
      sessionUrl: 'https://humanshaped.org/live/?c=' + encodeURIComponent(cohort.slug)
    };
  }

  // What is waiting for a teacher: every share that asks for feedback or
  // asks a question, with no answer yet from anyone who teaches its
  // cohort, oldest first so nobody's request sinks under newer ones.
  // A classmate's feedback is welcome, and it does not take the request
  // off the teacher's list.
  function waitingForFeedback(shares, teachersByCohort) {
    return shares.filter(function (s) {
      if (s.kind !== 'for-feedback' && s.kind !== 'question') return false;
      var teachers = teachersByCohort[s.cohort_id] || [];
      return !(s.feedback || []).some(function (f) { return teachers.indexOf(f.author_id) >= 0; });
    }).sort(function (a, b) { return a.created_at.localeCompare(b.created_at); });
  }

  var lib = { zonedToUtc: zonedToUtc, sessionDates: sessionDates, sessionRows: sessionRows, meetSetup: meetSetup, waitingForFeedback: waitingForFeedback, WEEKDAYS: WEEKDAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.TeachLib = lib;
})(this);
