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

  // The cohort in the shape tools/meet-events/Code.gs reads. Groups, when
  // given ({ id, name, emails }), ask the script for one Meet room each,
  // because Meet on Workspace for Education Fundamentals has no breakout
  // rooms; a group's key is the start of its id, so the script can find
  // the room it made last time even if the group is renamed.
  function meetSetup(cohort, emails, teacherEmails, groups) {
    var first = cohort.starts_on && cohort.session_weekday != null
      ? sessionDates(cohort.starts_on, cohort.session_weekday, 1)[0] : null;
    var out = {
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
    if (groups && groups.length) {
      out.groups = groups.map(function (g) {
        return { key: 'g-' + String(g.id).replace(/-/g, '').slice(0, 8), name: g.name, members: (g.emails || []).join(', ') };
      });
    }
    return out;
  }

  // The session that started most recently, or null before the first.
  function lastStarted(sessions, now) {
    var t = now.getTime();
    return (sessions || []).filter(function (s) { return s.starts_at && Date.parse(s.starts_at) <= t; })
      .sort(function (a, b) { return b.starts_at.localeCompare(a.starts_at); })[0] || null;
  }

  // Not seen this week, for a cohort's teachers alone: the students and
  // mentors still in the cohort with nothing shared, queued, answered, or
  // said in feedback since the last session began, so that the teacher can
  // reach out within two days. It is worked out on the teacher's page from
  // what the teacher can already read, and it is never stored. It does
  // not count attendance or cameras (the hub knows neither), and it is in
  // name order, which ranks no one. Each activity is { user_id, at }.
  function notSeen(people, since, activity) {
    if (!since) return [];
    var t = Date.parse(since), seen = {};
    (activity || []).forEach(function (a) { if (a && a.user_id && Date.parse(a.at) >= t) seen[a.user_id] = true; });
    function name(p) { return p.profiles ? (p.profiles.display_name || p.profiles.github_login || '') : ''; }
    return (people || []).filter(function (p) {
      return p.status !== 'left' && (p.role === 'student' || p.role === 'mentor') && !seen[p.user_id];
    }).sort(function (a, b) { return name(a).toLowerCase().localeCompare(name(b).toLowerCase()); });
  }

  // A session's checks with their answers, for the teacher: each question
  // in the order it was asked, and each answer in the person's words (or
  // the choice they picked), in the order they answered. Nothing is
  // scored, because a check has no right answer.
  function checkAnswers(checks, answers, nameOf) {
    return (checks || []).slice().sort(function (a, b) { return a.created_at.localeCompare(b.created_at); }).map(function (k) {
      var rows = (answers || []).filter(function (a) { return a.check_id === k.id; })
        .sort(function (a, b) { return String(a.updated_at || a.created_at).localeCompare(String(b.updated_at || b.created_at)); })
        .map(function (a) {
          var text = k.choices ? (k.choices[a.choice - 1] || '') : (a.body || '');
          return { user_id: a.user_id, name: nameOf(a.user_id), text: text };
        });
      return { id: k.id, prompt: k.prompt, choices: k.choices || null, answers: rows };
    });
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

  // A cohort's weekly session in words, in the cohort's own time zone,
  // and in the reader's when that is a different clock time:
  // "Tuesdays at 5:00 PM MDT, for 75 minutes (7:00 PM EDT where you are)."
  var DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  function scheduleText(c, viewerZone, locale) {
    if (c.session_weekday == null || !c.session_time) return 'The weekly session time is still to come.';
    var day = c.starts_on || new Date().toISOString().slice(0, 10);
    var at = zonedToUtc(day, c.session_time.slice(0, 5), c.time_zone);
    function clock(zone) {
      return new Intl.DateTimeFormat(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(at);
    }
    var theirs = clock(c.time_zone);
    var text = DAY_NAMES[c.session_weekday] + ' at ' + theirs + ', for ' + c.session_minutes + ' minutes';
    if (viewerZone && viewerZone !== c.time_zone) {
      var yours = clock(viewerZone);
      var sameDay = new Intl.DateTimeFormat('en-US', { timeZone: viewerZone, weekday: 'long' }).format(at) ===
        new Intl.DateTimeFormat('en-US', { timeZone: c.time_zone, weekday: 'long' }).format(at);
      if (yours !== theirs) {
        text += ' (' + (sameDay ? '' : new Intl.DateTimeFormat(locale, { timeZone: viewerZone, weekday: 'long' }).format(at) + 's at ') + yours + ' where you are)';
      }
    }
    return text + '.';
  }

  // A teacher's setup before a cohort's first session, each step checked
  // off by what the hub can see: the cohort's own fields, its sessions,
  // and the teacher's own access to the cohort's conversation. A Meet
  // link on a week is the hub's only sign that a host exists, so the
  // host step is done when one week has a link, and the event step when
  // every week has one.
  function cohortSetupSteps(cohort, sessions, myAccess) {
    sessions = sessions || [];
    var slug = encodeURIComponent(cohort.slug || '');
    var linked = sessions.filter(function (s) { return !!s.meet_url; }).length;
    var steps = [
      { key: 'schedule', label: 'Set the first day, the session day, and the time', action: 'edit',
        done: !!(cohort.starts_on && cohort.session_weekday != null && cohort.session_time) },
      { key: 'sessions', label: 'Make the weekly sessions', action: 'sessions', done: sessions.length > 0 },
      { key: 'host', label: 'Choose the Google account you will host the sessions from', href: '/teach/guide/#host', done: linked > 0 },
      { key: 'event', label: 'Make the weekly event with its Meet link, and put the link in each week', href: '/teach/guide/#event',
        done: sessions.length > 0 && linked === sessions.length },
      { key: 'repo', label: 'Name the cohort’s private repository and team, once Ben has made them in humanshaped', action: 'edit',
        done: !!(cohort.github_repo && cohort.github_team) }
    ];
    if (cohort.github_repo && cohort.github_team) {
      steps.push({ key: 'talk', label: 'Open the cohort’s conversation yourself, so you know it works', href: '/cohort/?c=' + slug + '#talk-title',
        done: !!(myAccess && myAccess.state === 'member') });
    }
    steps.push({ key: 'open', label: 'Open the cohort, so people can join', action: 'edit', done: cohort.status !== 'draft' });
    return steps;
  }

  // Which part of the request to teach a signed-in person sees.
  function requestState(isTeacher, request) {
    if (isTeacher) return 'teacher';
    if (!request) return 'ask';
    return request.state === 'declined' ? 'declined' : 'waiting';
  }

  // Requests still waiting for an answer, oldest first.
  function waitingRequests(requests) {
    return (requests || []).filter(function (r) { return r.state === 'waiting'; })
      .sort(function (a, b) { return a.created_at.localeCompare(b.created_at); });
  }

  var lib = { zonedToUtc: zonedToUtc, sessionDates: sessionDates, sessionRows: sessionRows, meetSetup: meetSetup, lastStarted: lastStarted, notSeen: notSeen, checkAnswers: checkAnswers, waitingForFeedback: waitingForFeedback, scheduleText: scheduleText, cohortSetupSteps: cohortSetupSteps, requestState: requestState, waitingRequests: waitingRequests, WEEKDAYS: WEEKDAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.TeachLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
