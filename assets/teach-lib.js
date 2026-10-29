// Pure calculations for the teacher page, kept apart from the page so
// they can be tested on their own (tools/test/teach-lib.test.mjs).
(function (root) {
  // What someone answered, in words, for every kind of question (R4):
  // LiveLib knows them all; without it, a choice or their own words.
  function answerText(k, a) {
    var L = root.LiveLib || (typeof require === 'function' ? require('./live-lib.js') : null);
    if (L) return L.answerText(k, a) || '';
    return k.choices ? (k.choices[a.choice - 1] || '') : (a.body || '');
  }

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

  // The prep session comes first, on the first meeting day, and the
  // weeks follow it (COURSE.md: Cohort Prep, then weeks 1 to 5), so a
  // five-week cohort has six sessions, numbered 0 to 5.
  function sessionRows(cohort) {
    if (!cohort.starts_on || cohort.session_weekday == null || !cohort.session_time) return null;
    return sessionDates(cohort.starts_on, cohort.session_weekday, cohort.weeks + 1).map(function (date, i) {
      return {
        cohort_id: cohort.id,
        number: i,
        starts_at: zonedToUtc(date, cohort.session_time.slice(0, 5), cohort.time_zone).toISOString(),
        title: i === 0 ? 'Prep' : 'Week ' + i
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
      sessionUrl: 'https://humanshaped.org/session/?c=' + encodeURIComponent(cohort.slug)
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
          var text = answerText(k, a);
          return { user_id: a.user_id, name: nameOf(a.user_id), text: text };
        });
      return { id: k.id, kind: k.kind || null, prompt: k.prompt, choices: k.choices || null, points: k.points || null, answers: rows };
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

  // A leader's setup before a cohort's first session (JOURNEYS.md, L4):
  // only what a leader decides or presses. What the site does on its own
  // (each session's calendar event and Meet link, the invitations) is a
  // note beside the step it follows, never a step of its own, because
  // nobody should have to ask for mechanical work. Groups wait until a
  // cohort has eight learners or more (Ben's decision 8), so they are not
  // a step. `meetRequest` and `more` are kept for older callers.
  function cohortSetupSteps(cohort, sessions, myAccess, meetRequest, more) {
    sessions = sessions || [];
    var slug = encodeURIComponent(cohort.slug || '');
    var steps = [
      { key: 'schedule', label: 'Set the day and time', action: 'edit',
        done: !!(cohort.starts_on && cohort.session_weekday != null && cohort.session_time) },
      { key: 'sessions', label: 'Make the sessions', action: 'sessions', done: sessions.length > 0,
        note: calendarNote(cohort, sessions) },
      { key: 'repo', label: 'Make the GitHub repository', action: 'provision',
        done: !!(cohort.github_repo && cohort.github_team) }
    ];
    if (cohort.github_repo && cohort.github_team) {
      steps.push({ key: 'talk', label: 'Open the conversation', href: '/cohort/?c=' + slug + '&t=talk',
        done: !!(myAccess && myAccess.state === 'member') });
    }
    steps.push({ key: 'open', label: 'Open for joining', action: 'edit', done: cohort.status !== 'draft' });
    steps.push({ key: 'meet', label: 'Add Human Shaped to Google Meet', href: '/meet/#add',
      done: false, optional: true });
    var first = sessions.slice().sort(function (a, b) { return a.number - b.number; })[0];
    if (first) {
      steps.push({ key: 'plan', label: 'Read the ' + (first.number === 0 ? 'prep session' : 'first session') + '’s plan',
        href: '/session/?c=' + slug + '&s=' + first.number, done: false, optional: true });
    }
    steps.push({ key: 'agent', label: 'Connect your agent', href: '/connect/',
      done: false, optional: true });
    return steps;
  }

  // Whether the sessions to come are on everyone's calendar yet, from
  // what meet@'s script last said about each (migration 20261023010000).
  function calendarNote(cohort, sessions, now) {
    var t = (now || new Date()).getTime();
    var ahead = (sessions || []).filter(function (s) { return s.starts_at && Date.parse(s.starts_at) > t; });
    if (!ahead.length) return null;
    var failed = ahead.filter(function (s) { return s.calendar_error; })[0];
    if (failed) return 'The calendar said: ' + failed.calendar_error;
    if (cohort.status === 'draft') return 'They go on everyone’s calendar once the cohort is open.';
    if (ahead.every(function (s) { return !!s.calendar_event_id; })) return 'On everyone’s calendar, each with its own Meet link.';
    return 'Going on everyone’s calendar within the hour, each with its own Meet link.';
  }

  // Where a request to meet@ stands, in a line beside its step.
  function meetRequestNote(r) {
    if (!r) return null;
    if (r.state === 'waiting' || r.state === 'working') return 'Asked. meet@ picks it up within the hour, and the links appear on each week by themselves.';
    if (r.state === 'failed') return 'It did not work: ' + (r.detail || 'no reason given') + ' Fix that, and ask again.';
    if (r.state === 'done') return 'Done' + (r.detail ? ': ' + r.detail : '.') + ' If a week is still missing its link, make the weekly sessions first and ask again.';
    return null;
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

  // A cohort's short name for its address, made from its title:
  // lowercase letters, numbers, and single hyphens, as the database
  // requires (cohorts_slug_check). "Fall 2026: Evenings!" -> "fall-2026-evenings".
  function slugFrom(text) {
    return String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  }
  // Why a short name cannot be used, in plain words, or null when it can.
  function slugProblem(slug) {
    if (!slug) return 'Give the cohort a short name for its address.';
    if (!/^[a-z0-9-]+$/.test(slug)) return 'The short name can only use lowercase letters, numbers, and hyphens.';
    if (slug.length > 60) return 'The short name can be at most 60 characters.';
    return null;
  }
  // The line under a cohort's title on /cohorts/, and in the teacher's
  // preview of it.
  function openingLine(c, locale) {
    var first = c.starts_on
      ? 'Begins ' + new Date(c.starts_on + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Dates to come';
    return first + ', for ' + c.weeks + ' weeks' + (c.capacity ? ', with room for ' + c.capacity + ' people' : '') + '.';
  }

  var lib = { zonedToUtc: zonedToUtc, sessionDates: sessionDates, sessionRows: sessionRows, meetSetup: meetSetup, lastStarted: lastStarted, notSeen: notSeen, checkAnswers: checkAnswers, waitingForFeedback: waitingForFeedback, scheduleText: scheduleText, slugFrom: slugFrom, slugProblem: slugProblem, openingLine: openingLine, cohortSetupSteps: cohortSetupSteps, calendarNote: calendarNote, meetRequestNote: meetRequestNote, requestState: requestState, waitingRequests: waitingRequests, WEEKDAYS: WEEKDAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.TeachLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
