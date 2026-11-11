// A session's event on its leader's own calendar: what it says, and how
// the leader's browser brings the calendar up to date with a short-lived
// token (research/notes/calendar-ownership-notes.md). Tested in
// tools/test/calendar-lib.test.mjs. Words by Claude, awaiting Ben's review.
(function (root) {
  var SITE = 'https://humanshaped.org';
  var API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  var LISTING = 'https://workspace.google.com/marketplace/app/human_shaped/1086485459450';

  function label(s) {
    if (s.schedule === 'custom') return 'Session ' + Number(s.number);
    return Number(s.number) === 0 ? 'Prep' : 'Week ' + s.number;
  }
  function sessionName(s) {
    var l = label(s), t = String(s.title || '').trim();
    return t && t !== l && t !== 'Week ' + s.number && t !== 'Session ' + s.number ? l + ': ' + t : l;
  }
  function sessionPage(s) { return SITE + '/session/?c=' + encodeURIComponent(s.slug) + '&s=' + Number(s.number); }

  function description(s) {
    return [
      'What to bring, and the plan for the hour: ' + sessionPage(s),
      '',
      'Not in the cohort yet? Join here first: ' + SITE + '/account/?join=' + encodeURIComponent(s.slug),
      '',
      'Join with the Google Meet link on this event. Each session has its own link.',
      '',
      'In the call, open Human Shaped from Activities.',
      'Add it to Google Meet once, from a computer: ' + LISTING,
      '',
      'Sessions are recorded, and the host says so at the start.',
      'Recordings are shared only with this cohort.',
      'If you would rather not appear, keep your camera off and use the chat.'
    ].join('\n');
  }

  function meetCodeOf(url) {
    var m = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})$/.exec(String(url || ''));
    return m ? m[1] : null;
  }
  function meetLinkOf(event) {
    if (event && event.hangoutLink) return event.hangoutLink;
    var points = (event && event.conferenceData && event.conferenceData.entryPoints) || [];
    var v = points.filter(function (p) { return p.entryPointType === 'video'; })[0];
    return v ? v.uri : null;
  }

  function resource(s, isNew) {
    var start = new Date(s.starts_at), end = new Date(start.getTime() + Number(s.minutes) * 60000);
    var r = {
      summary: s.cohort_title + ': ' + sessionName(s),
      description: description(s),
      start: { dateTime: start.toISOString(), timeZone: s.time_zone },
      end: { dateTime: end.toISOString(), timeZone: s.time_zone },
      attendees: (s.guests || []).map(function (email) { return { email: email }; }),
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      extendedProperties: { private: { hsSessionId: s.session_id, hsCohortId: s.slug } }
    };
    var code = meetCodeOf(s.meet_url);
    if (isNew && code) {
      r.conferenceData = { conferenceId: code, conferenceSolution: { key: { type: 'hangoutsMeet' } },
        entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/' + code, label: 'meet.google.com/' + code }] };
    } else if (isNew) {
      r.conferenceData = { createRequest: { requestId: 'hs-' + s.session_id, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
    }
    return r;
  }

  // Whom Google should email: everyone when the time or name moved or
  // someone was added, and no one when a guest only left.
  function notice(before, after) {
    var had = ((before && before.attendees) || []).map(function (a) { return String(a.email || '').toLowerCase(); });
    var want = (after.attendees || []).map(function (a) { return a.email; });
    var moved = !before || !before.start || before.summary !== after.summary
      || Date.parse(before.start.dateTime) !== Date.parse(after.start.dateTime)
      || Date.parse(before.end.dateTime) !== Date.parse(after.end.dateTime);
    return moved || want.some(function (e) { return had.indexOf(e) < 0; }) ? 'all' : 'none';
  }

  // Brings the calendar up to date, one session at a time, and says how
  // each went through done(row, { event_id, meet_url, problem, cancelled }).
  function sync(o) {
    var f = o.fetch, wait = o.wait || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    function call(method, url, body) {
      return f(url, { method: method, headers: Object.assign({ Authorization: 'Bearer ' + o.token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined })
        .then(function (r) {
          return r.text().then(function (t) {
            var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
            return { ok: r.ok, status: r.status, body: j };
          });
        });
    }
    function fail(r) { throw new Error((r.body && r.body.error && r.body.error.message) || 'Google answered ' + r.status); }
    function untilMeet(event, tries) {
      if (meetLinkOf(event) || tries <= 0) return Promise.resolve(event);
      return wait(1000).then(function () { return call('GET', API + '/' + encodeURIComponent(event.id)); })
        .then(function (r) { return untilMeet(r.ok ? r.body : event, tries - 1); });
    }
    function insert(s) {
      var fresh = resource(s, true);
      return call('POST', API + '?conferenceDataVersion=1&sendUpdates=all', fresh).then(function (r) {
        if (r.ok) return untilMeet(r.body, 8);
        if (!meetCodeOf(s.meet_url)) fail(r);
        delete fresh.conferenceData;
        fresh.location = s.meet_url;
        return call('POST', API + '?sendUpdates=all', fresh).then(function (again) { if (!again.ok) fail(again); return again.body; });
      });
    }
    function one(s) {
      if (s.want === 'cancel') {
        return call('DELETE', API + '/' + encodeURIComponent(s.event_id) + '?sendUpdates=all').then(function (r) {
          if (!r.ok && r.status !== 404 && r.status !== 410) fail(r);
          return { cancelled: true };
        });
      }
      var made = s.event_id
        ? call('GET', API + '/' + encodeURIComponent(s.event_id)).then(function (g) {
            // Only an event that is truly gone is made again: any other failed
            // read would leave a second event, with its own Meet link, on the
            // calendar (found November 6, 2026: five orphans from November 3).
            if (g.status === 404 || g.status === 410 || (g.ok && g.body && g.body.status === 'cancelled')) return insert(s);
            if (!g.ok || !g.body) fail(g);
            var patch = resource(s, false);
            return call('PATCH', API + '/' + encodeURIComponent(s.event_id) + '?sendUpdates=' + notice(g.body, patch), patch)
              .then(function (r) { if (!r.ok) fail(r); return r.body; });
          })
        : insert(s);
      return made.then(function (event) { return { event_id: event.id, meet_url: meetLinkOf(event) }; });
    }
    return (o.rows || []).reduce(function (chain, s, i) {
      return chain.then(function (tally) {
        if (o.progress) o.progress(i + 1, o.rows.length);
        return one(s).catch(function (e) { return { problem: String((e && e.message) || e).slice(0, 900) }; }).then(function (result) {
          if (result.problem) tally.failed += 1; else tally.done += 1;
          return Promise.resolve(o.done(s, result)).then(function () { return tally; });
        });
      });
    }, Promise.resolve({ done: 0, failed: 0 }));
  }

  var lib = { description: description, resource: resource, notice: notice, meetLinkOf: meetLinkOf, sessionName: sessionName, sync: sync };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CalendarLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
