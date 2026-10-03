// Pure helpers for live signals (migration 20261003140000): which signal
// shows, how much time is left, whose room comes first, who is on stage,
// and the teacher's saved cards. No DOM and no network, so /live/, /card/,
// and the Meet add-on can all load it. Tested in
// tools/test/signals-lib.test.mjs.
//
// Every clock here is worked out from a stored end time and the reader's
// own "now", so someone who opens the page late sees the same countdown
// as everyone else, whatever their time zone.
(function (root) {
  var MINUTE = 60000;
  // Longer than any session can run (sessions are at most 240 minutes),
  // so a signal the teacher forgot to clear never leaks into next week.
  var STALE_MS = 4 * 60 * MINUTE;
  // How long "come back to the main room" stays up after it is sent, and
  // after the rooms' time runs out, when nobody takes it down.
  var BACK_FOR_MS = 10 * MINUTE;
  // The warning before the rooms' time is up.
  var WARN_S = 120;
  // How often a page reads the signals again when Realtime cannot connect.
  var POLL_MS = 15000;

  function ms(iso) { var t = Date.parse(iso); return isNaN(t) ? null : t; }
  function at(now) { return typeof now === 'number' ? now : now.getTime(); }
  function newestFirst(a, b) { return (ms(b.created_at) || 0) - (ms(a.created_at) || 0); }

  // What is showing now, one signal of each kind at most.
  //   rooms      until the teacher calls everyone back, or ten minutes
  //              after its time runs out
  //   together   for ten minutes, unless the teacher sends people to
  //              their rooms again or takes it down
  //   card, stage, recording   until the teacher clears them or sends a
  //              newer one of the same kind
  // Nothing older than four hours shows.
  function state(rows, now) {
    var t = at(now);
    var fresh = (rows || []).filter(function (r) {
      var c = ms(r.created_at);
      // A signal stamped a little in the future only means this device's
      // clock runs behind the database's, so it still counts.
      return c != null && t - c < STALE_MS;
    }).sort(newestFirst);
    function newest(kind, alsoCleared) {
      return fresh.filter(function (r) { return r.kind === kind && (alsoCleared || !r.cleared_at); })[0] || null;
    }
    var out = { rooms: null, together: null, card: newest('card'), stage: newest('stage'), recording: newest('recording') };
    var lastRooms = newest('rooms', true), lastBack = newest('together', true);
    var roomsNewer = lastRooms && (!lastBack || ms(lastRooms.created_at) >= ms(lastBack.created_at));
    if (roomsNewer && !lastRooms.cleared_at) {
      var end = ms(lastRooms.ends_at);
      if (end == null || t - end < BACK_FOR_MS) out.rooms = lastRooms;
    }
    if (!roomsNewer && lastBack && !lastBack.cleared_at && t - ms(lastBack.created_at) < BACK_FOR_MS) out.together = lastBack;
    return out;
  }

  // The time left on a countdown. Fine: minutes and seconds, ticking.
  // Coarse (for people who ask for reduced motion): whole minutes, which
  // change at most once a minute.
  function countdown(endsAt, now, coarse) {
    var end = ms(endsAt);
    if (end == null) return null;
    var left = Math.max(0, Math.ceil((end - at(now)) / 1000));
    var text;
    if (!left) text = 'Time is up';
    else if (coarse) text = left <= 60 ? 'Less than a minute left' : 'About ' + Math.ceil(left / 60) + ' minutes left';
    else text = clock(left) + ' left';
    return { left: left, done: !left, warn: left > 0 && left <= WARN_S, text: text };
  }

  function clock(seconds) {
    var s = Math.max(0, Math.round(seconds));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
  }

  // Where everyone should be, which is the banner that wins at the top of
  // the page: in the rooms (with the clock, if there is one), or back in
  // the main room, because the teacher called everyone back or because
  // the rooms' time is up.
  function where(st, now, coarse) {
    if (st.rooms) {
      var c = countdown(st.rooms.ends_at, now, coarse);
      if (c && c.done) return { kind: 'back', because: 'time', signal: st.rooms };
      return { kind: 'rooms', signal: st.rooms, clock: c, warn: !!(c && c.warn) };
    }
    if (st.together) return { kind: 'back', because: 'called', signal: st.together };
    return null;
  }

  // The one thing a shared screen (/card/, the add-on's main stage) shows
  // large: a card first, then where people should be, then who is on stage.
  function screen(st, now, coarse) {
    if (st.card) return { kind: 'card', signal: st.card, clock: countdown(st.card.ends_at, now, coarse) };
    var w = where(st, now, coarse);
    if (w) return w;
    if (st.stage) return { kind: 'stage', signal: st.stage };
    return null;
  }

  // How long until the page needs drawing again, so a clock ticks once a
  // second only while one is showing.
  function nextTick(st, now, coarse) {
    var t = at(now), soonest = null;
    [st.rooms, st.card].forEach(function (s) {
      var end = s && ms(s.ends_at);
      if (end != null && end > t) soonest = soonest == null ? end : Math.min(soonest, end);
    });
    if (soonest != null) return coarse ? Math.min(15000, Math.max(1000, soonest - t)) : 1000;
    return 30000;
  }

  // The rooms a person sees when everyone goes to their rooms: their own
  // group's first. A student sees only their own; a teacher sees every
  // group, to visit each in turn.
  function roomsFor(groups, meId, teaching) {
    var list = (groups || []).map(function (g) {
      var mine = (g.group_members || []).some(function (m) { return m.user_id === meId; });
      return { id: g.id, name: g.name, url: /^https:\/\//.test(g.meet_url || '') ? g.meet_url : null, mine: mine };
    }).filter(function (r) { return teaching || r.mine; });
    return list.sort(function (a, b) {
      return (b.mine - a.mine) || String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    });
  }

  // Who is on stage: the first person presents, and the rest respond.
  function stageRoles(signal) {
    return ((signal && signal.people) || []).map(function (id, i) { return { id: id, role: i ? 'responding' : 'presenting' }; });
  }

  function list(names) {
    if (names.length < 2) return names.join('');
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  // "Bea is presenting, and Cal and Eve are responding." nameOf turns an
  // id into a name ("You" for the reader).
  function stageText(signal, nameOf) {
    var roles = stageRoles(signal);
    if (!roles.length) return '';
    var lead = nameOf(roles[0].id);
    var rest = roles.slice(1).map(function (r) { var n = nameOf(r.id); return n === 'You' ? 'you' : n; });
    var first = lead + (lead === 'You' ? ' are presenting' : ' is presenting');
    if (!rest.length) return first + '.';
    return first + ', and ' + list(rest) + (rest.length === 1 && rest[0] !== 'you' ? ' is' : ' are') + ' responding.';
  }

  // Who the teacher chose, in order, without blanks or repeats.
  function stagePeople(ids) {
    var out = [];
    (ids || []).forEach(function (id) { if (id && out.indexOf(id) < 0) out.push(id); });
    if (!out.length) return { error: 'Choose who is presenting first.' };
    if (out.length > 3) return { error: 'Three people is the most the stage holds, as many as Meet can pin for everyone.' };
    return { people: out };
  }

  // Minutes typed into a box: empty means no countdown.
  function parseMinutes(text) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return { minutes: null };
    if (!/^\d+$/.test(s)) return { error: 'Minutes are a whole number, like 5.' };
    var n = Number(s);
    if (n < 1 || n > 240) return { error: 'A countdown runs from 1 to 240 minutes.' };
    return { minutes: n };
  }

  // A card's words and its optional countdown.
  function parseCard(body, minutesText) {
    var b = String(body || '').trim().replace(/\s+/g, ' ');
    if (!b) return { error: 'Write the card’s words first.' };
    if (b.length > 200) return { error: 'Keep a card under 200 characters, so it reads from across the room.' };
    var m = parseMinutes(minutesText);
    if (m.error) return m;
    return { body: b, minutes: m.minutes };
  }

  // The end time to store for a countdown of so many minutes.
  function endsAt(minutes, now) {
    return minutes ? new Date(at(now) + minutes * MINUTE).toISOString() : null;
  }

  // Five more minutes: from the current end, or from now if it has passed.
  function extend(ends, minutes, now) {
    var t = at(now), end = ms(ends);
    return new Date(Math.max(end == null ? t : end, t) + minutes * MINUTE).toISOString();
  }

  // Cards a teacher can reuse until they save their own (words by Claude,
  // awaiting Ben's review; the first is Ben's own example).
  var DEFAULT_CARDS = [
    { body: 'You have 5 minutes of worktime left', minutes: 5 },
    { body: 'Take a ten-minute break, and come back when the clock runs out', minutes: 10 }
  ];

  function norm(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  // The saved cards first, oldest first so they keep their places, then
  // any default the teacher has not saved in the same words.
  function presets(saved, defaults) {
    var mine = (saved || []).slice().sort(function (a, b) { return String(a.created_at || '').localeCompare(String(b.created_at || '')); })
      .map(function (p) { return { id: p.id, body: p.body, minutes: p.minutes == null ? null : p.minutes, saved: true }; });
    var seen = mine.map(function (p) { return norm(p.body); });
    var rest = (defaults || DEFAULT_CARDS).filter(function (d) { return seen.indexOf(norm(d.body)) < 0; })
      .map(function (d) { return { id: null, body: d.body, minutes: d.minutes == null ? null : d.minutes, saved: false }; });
    return mine.concat(rest);
  }

  // Whether a card is already saved, so the page offers "Save it" only
  // for new words.
  function isSaved(saved, body) {
    var n = norm(body);
    return (saved || []).some(function (p) { return norm(p.body) === n; });
  }

  function presetLabel(p) { return p.body + (p.minutes ? ' (' + p.minutes + ' min)' : ''); }

  // Which session a page is about, from CohortLib.currentAndNext's answer:
  // the one happening now, or else the next one, or else the latest. The
  // same rule on /live/ and /card/, so both read the same signals.
  function sessionFor(t) {
    if (!t) return null;
    return t.live ? t.next : (t.next || t.current || null);
  }

  var lib = {
    STALE_MS: STALE_MS, BACK_FOR_MS: BACK_FOR_MS, WARN_S: WARN_S, POLL_MS: POLL_MS, DEFAULT_CARDS: DEFAULT_CARDS,
    state: state, countdown: countdown, clock: clock, where: where, screen: screen, nextTick: nextTick,
    roomsFor: roomsFor, stageRoles: stageRoles, stageText: stageText, stagePeople: stagePeople, list: list,
    parseMinutes: parseMinutes, parseCard: parseCard, endsAt: endsAt, extend: extend,
    presets: presets, isSaved: isSaved, presetLabel: presetLabel, sessionFor: sessionFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SignalsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
