// What happened in a session, read from what was kept (session_events, and
// the answers, requests, and queue rows that keep their own times). Facts
// only: people are listed by name, never ordered by how much they did, and
// nothing here adds up to a score. No page, no network. Tested in
// tools/test/session-story-lib.test.mjs.
(function (root) {
  function time(x) { return new Date(x).getTime(); }

  // Whole minutes a person's add-on was open: one 'here' row a minute.
  function minutesHere(events, userId) {
    return (events || []).filter(function (e) { return e.kind === 'here' && e.user_id === userId; }).length;
  }

  // Seconds a person was marked as speaking in the recording.
  function secondsSpoken(talk, userId) {
    return (talk || []).reduce(function (n, t) { return t.user_id === userId ? n + t.ended_s - t.started_s : n; }, 0);
  }

  // Seconds as a person says them: "5 min", or "40 sec" when under a minute.
  function spoken(seconds) {
    return seconds < 60 ? seconds + ' sec' : Math.round(seconds / 60) + ' min';
  }

  var UNMATCHED = 'A name that could not be read';

  // A name on a tile that was no one in the cohort, with its seconds.
  function others(talk) {
    var by = {};
    (talk || []).forEach(function (t) {
      if (t.user_id) return;
      var n = t.name || UNMATCHED;
      by[n] = (by[n] || 0) + t.ended_s - t.started_s;
    });
    return Object.keys(by).sort().map(function (n) { return { name: n, spoke: by[n] }; });
  }

  // Each reaction a person sent, as [id, count], in the order first sent.
  function reactionsOf(events, userId) {
    var seen = {}, order = [];
    (events || []).forEach(function (e) {
      if (e.kind !== 'reaction' || e.user_id !== userId || !e.detail) return;
      if (!seen[e.detail]) { seen[e.detail] = 0; order.push(e.detail); }
      seen[e.detail]++;
    });
    return order.map(function (id) { return [id, seen[id]]; });
  }

  // One line a person, sorted by name. Someone with nothing kept is left in,
  // with zeros, only if the caller asks: absence of a row is not absence
  // from the call, since the add-on may simply have been closed.
  function people(input) {
    var names = input.names || {};
    return Object.keys(names).map(function (id) {
      return {
        id: id, name: names[id],
        minutes: minutesHere(input.events, id),
        spoke: secondsSpoken(input.talk, id),
        reactions: reactionsOf(input.events, id),
        answers: (input.answers || []).filter(function (a) { return a.user_id === id; }).length,
        requests: (input.requests || []).filter(function (r) { return r.user_id === id; }).length,
        shown: (input.queue || []).filter(function (q) { return q.user_id === id && q.shown_at; }).length
      };
    }).filter(function (p) {
      return p.minutes || p.spoke || p.reactions.length || p.answers || p.requests || p.shown;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  // How the session moved: each stop on the stage and how long it lasted.
  // The last stop has no end, so it runs to the last thing kept.
  function stops(events) {
    var all = (events || []).slice().sort(function (a, b) { return time(a.at) - time(b.at); });
    var moves = all.filter(function (e) { return e.kind === 'stage'; });
    var end = all.length ? time(all[all.length - 1].at) : 0;
    return moves.map(function (m, i) {
      var parts = String(m.detail || '').split(':');
      var next = moves[i + 1] ? time(moves[i + 1].at) : end;
      return { stage: parts[0], scene: parts.slice(1).join(':') || null, at: m.at, minutes: Math.round((next - time(m.at)) / 60000) };
    });
  }

  var api = { UNMATCHED: UNMATCHED, secondsSpoken: secondsSpoken, spoken: spoken, others: others, minutesHere: minutesHere, reactionsOf: reactionsOf, people: people, stops: stops };
  root.SessionStoryLib = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
