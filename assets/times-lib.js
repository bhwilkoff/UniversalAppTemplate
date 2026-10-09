// Pure helpers for finding a weekly time (/times/ and /teach/times/;
// migration 20261009010000). A time is one integer, weekday * 1440 +
// minutes after midnight, in the poll's own time zone, so it means the
// same thing every week. Everyone sees the grid in their own time zone:
// the poll's times are placed on the dates of the week the cohort begins
// (or this week), then read back on the viewer's clock. Tested in
// tools/test/times-lib.test.mjs.
(function (root) {
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function slotOf(day, minute) { return day * 1440 + minute; }
  function dayOf(slot) { return Math.floor(slot / 1440); }
  function minuteOf(slot) { return slot % 1440; }

  // Every time a poll offers, in its own zone, in order.
  function minutesOfPoll(poll) {
    if (poll.minutes && poll.minutes.length) return poll.minutes.slice().sort(function (a, b) { return a - b; });
    var out = [];
    for (var m = poll.first_minute; m <= poll.last_minute; m += poll.step_minutes) out.push(m);
    return out;
  }
  function slotsOf(poll) {
    var out = [], mins = minutesOfPoll(poll);
    poll.days.slice().sort().forEach(function (d) {
      mins.forEach(function (m) { out.push(slotOf(d, m)); });
    });
    return out;
  }

  // The parts of the day a teacher can offer, as the start times in each
  // (from, up to but not including to).
  var PARTS = [
    { key: 'early', name: 'Early morning', from: 360, to: 480 },
    { key: 'morning', name: 'Morning', from: 480, to: 720 },
    { key: 'midday', name: 'Midday', from: 720, to: 840 },
    { key: 'afternoon', name: 'Afternoon', from: 840, to: 1020 },
    { key: 'evening', name: 'Evening', from: 1020, to: 1260 },
    { key: 'late', name: 'Late evening', from: 1260, to: 1380 }
  ];
  function partsMinutes(keys, step) {
    var out = [];
    PARTS.forEach(function (p) {
      if (keys.indexOf(p.key) < 0) return;
      for (var m = p.from; m < p.to; m += step) out.push(m);
    });
    return out;
  }

  // "8:00 AM to 11:30 AM and 5:00 PM to 8:30 PM": the start times a poll
  // offers, run together where they follow one another.
  function hoursText(poll, locale) {
    var mins = minutesOfPoll(poll), runs = [];
    mins.forEach(function (m) {
      var last = runs[runs.length - 1];
      if (last && m - last[1] === poll.step_minutes) last[1] = m; else runs.push([m, m]);
    });
    var parts = runs.map(function (r) { return r[0] === r[1] ? timeText(r[0], locale) : timeText(r[0], locale) + ' to ' + timeText(r[1], locale); });
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + (parts.length > 2 ? ',' : '') + ' and ' + parts[parts.length - 1] : parts[0] || '';
  }

  // Minutes a zone is ahead of UTC at an instant.
  function offsetAt(zone, ms) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).formatToParts(new Date(ms)).forEach(function (p) { parts[p.type] = p.value; });
    var asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
  }

  // The instant a wall-clock time in a zone falls on.
  function instantOf(zone, y, mo, d, minute) {
    var guess = Date.UTC(y, mo - 1, d, 0, minute);
    var first = guess - offsetAt(zone, guess) * 60000;
    return guess - offsetAt(zone, first) * 60000;
  }

  // The first day of the week the times are placed on: the Sunday on or
  // before the cohort begins, or before today.
  function referenceSunday(startsOn, today) {
    var base = startsOn && /^\d{4}-\d{2}-\d{2}$/.test(startsOn)
      ? new Date(startsOn + 'T00:00:00Z')
      : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return new Date(base.getTime() - base.getUTCDay() * 86400000);
  }

  // Where a poll's time falls on another zone's clock: its weekday and
  // minute there.
  function placeIn(poll, slot, viewZone, today) {
    var sunday = referenceSunday(poll.starts_on, today || new Date());
    var date = new Date(sunday.getTime() + dayOf(slot) * 86400000);
    var ms = instantOf(poll.time_zone, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), minuteOf(slot));
    var local = new Date(ms + offsetAt(viewZone, ms) * 60000);
    return { day: local.getUTCDay(), minute: local.getUTCHours() * 60 + local.getUTCMinutes(), ms: ms };
  }

  // The grid as one person sees it: the days and start times on their own
  // clock, and which poll time sits in each cell. Columns run Sunday to
  // Saturday from the first day any time lands on, so a week that crosses
  // midnight still reads in order.
  function gridFor(poll, viewZone, today) {
    var cells = {}, days = {}, minutes = {};
    slotsOf(poll).forEach(function (slot) {
      var at = placeIn(poll, slot, viewZone, today);
      cells[at.day + ':' + at.minute] = slot;
      days[at.day] = true;
      minutes[at.minute] = true;
    });
    var cols = Object.keys(days).map(Number).sort(function (a, b) { return a - b; });
    var rows = Object.keys(minutes).map(Number).sort(function (a, b) { return a - b; });
    return {
      days: cols,
      minutes: rows,
      slotAt: function (day, minute) {
        var s = cells[day + ':' + minute];
        return s == null ? null : s;
      }
    };
  }

  function timeText(minute, locale) {
    return new Date(Date.UTC(2026, 0, 4, 0, minute)).toLocaleTimeString(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  }

  // "Monday at 6:00 PM", on the viewer's clock.
  function slotText(poll, slot, viewZone, locale, today) {
    var at = placeIn(poll, slot, viewZone, today);
    return DAYS[at.day] + ' at ' + timeText(at.minute, locale);
  }

  function zoneName(zone) { return String(zone || '').replace(/_/g, ' '); }

  // The link's fragment: the poll's token, and optionally the answer's id
  // and secret after a tilde, so a person can change their answer from
  // another browser.
  function parseHash(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var m = /^([0-9a-f]{32})(?:~([0-9a-f-]{36})~([0-9a-f-]{36}))?$/.exec(h);
    if (!m) return null;
    return { token: m[1], answer: m[2] ? { id: m[2], secret: m[3] } : null };
  }

  // A teacher's form, checked before saving. Times arrive as "HH:MM".
  function minutesOf(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function checkPoll(input) {
    var title = String(input.title || '').trim();
    var days = (input.days || []).map(Number).filter(function (d) { return d >= 0 && d <= 6; });
    var step = +input.step || 30;
    var mins = partsMinutes(input.parts || [], step);
    if (!title) return { error: 'Give the poll a name people will recognize.' };
    if (!days.length) return { error: 'Choose at least one day.' };
    if (!mins.length) return { error: 'Choose at least one part of the day.' };
    if (!input.time_zone) return { error: 'Choose the time zone these times are in.' };
    var first = mins[0], last = mins[mins.length - 1];
    return {
      row: {
        title: title,
        host_name: String(input.host_name || '').trim().slice(0, 80) || null,
        note: String(input.note || '').trim() || null,
        time_zone: input.time_zone,
        days: days.sort(),
        first_minute: first,
        last_minute: last,
        step_minutes: step,
        minutes: mins,
        session_minutes: +input.session_minutes || 75,
        starts_on: input.starts_on || null,
        cohort_id: input.cohort_id || null
      }
    };
  }

  // Counts per time from a teacher's rows of answers, and the times the
  // most people can make, most first. The teacher still chooses.
  function tallyOf(answers) {
    var works = {}, maybe = {};
    answers.forEach(function (a) {
      (a.works || []).forEach(function (s) { works[s] = (works[s] || 0) + 1; });
      (a.if_need_be || []).forEach(function (s) { maybe[s] = (maybe[s] || 0) + 1; });
    });
    return { answers: answers.length, works: works, if_need_be: maybe };
  }
  function bestTimes(tally, limit) {
    var keys = {};
    Object.keys(tally.works).concat(Object.keys(tally.if_need_be)).forEach(function (k) { keys[k] = true; });
    return Object.keys(keys).map(function (k) {
      return { slot: +k, works: tally.works[k] || 0, if_need_be: tally.if_need_be[k] || 0 };
    }).sort(function (a, b) {
      return (b.works + b.if_need_be) - (a.works + a.if_need_be) || b.works - a.works || a.slot - b.slot;
    }).slice(0, limit || 5);
  }

  // A Google Calendar check (free/busy only) looks at the cohort's first
  // weeks, because a weekly time is only free if it stays free. These say
  // which span to ask about and how many of those weeks each time is busy.
  var CHECK_WEEKS = 4;
  function weekPoll(poll, w, today) {
    var sunday = referenceSunday(poll.starts_on, today || new Date());
    var d = new Date(sunday.getTime() + w * 7 * 86400000);
    var copy = {};
    Object.keys(poll).forEach(function (k) { copy[k] = poll[k]; });
    copy.starts_on = d.toISOString().slice(0, 10);
    return copy;
  }
  function checkSpan(poll, today, weeks) {
    var n = weeks || CHECK_WEEKS;
    var first = weekPoll(poll, 0, today), last = weekPoll(poll, n, today);
    return {
      timeMin: new Date(placeIn(first, 0, 'UTC').ms - 86400000).toISOString(),
      timeMax: new Date(placeIn(last, 0, 'UTC').ms + 86400000).toISOString()
    };
  }
  // busy: [{ start, end }] as ISO strings, the way Google returns them.
  function busyWeeks(poll, busy, today, weeks) {
    var n = weeks || CHECK_WEEKS;
    var blocks = busy.map(function (b) { return [Date.parse(b.start), Date.parse(b.end)]; });
    var out = {};
    var polls = [];
    for (var w = 0; w < n; w++) polls.push(weekPoll(poll, w, today));
    slotsOf(poll).forEach(function (slot) {
      var count = 0;
      polls.forEach(function (p) {
        var start = placeIn(p, slot, 'UTC').ms, end = start + poll.session_minutes * 60000;
        if (blocks.some(function (b) { return b[0] < end && b[1] > start; })) count++;
      });
      out[slot] = count;
    });
    return { weeks: n, busy: out };
  }

  // The times to mark after a calendar check: free in every week checked,
  // and starting within the person's waking hours on their own clock
  // (from and to are minutes after midnight, both included).
  function freeInHours(poll, checked, zone, from, to, today) {
    return slotsOf(poll).filter(function (slot) {
      if (checked.busy[slot]) return false;
      var m = placeIn(poll, slot, zone, today).minute;
      return m >= from && m <= to;
    });
  }

  var api = {
    DAYS: DAYS, SHORT: SHORT, slotOf: slotOf, dayOf: dayOf, minuteOf: minuteOf, slotsOf: slotsOf,
    offsetAt: offsetAt, instantOf: instantOf, placeIn: placeIn, gridFor: gridFor,
    timeText: timeText, slotText: slotText, PARTS: PARTS, partsMinutes: partsMinutes, hoursText: hoursText, minutesOfPoll: minutesOfPoll, zoneName: zoneName, parseHash: parseHash,
    minutesOf: minutesOf, checkPoll: checkPoll, tallyOf: tallyOf, bestTimes: bestTimes,
    CHECK_WEEKS: CHECK_WEEKS, freeInHours: freeInHours, checkSpan: checkSpan, busyWeeks: busyWeeks
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TimesLib = api;
})(this);
