// Pure helpers for the room board (migration 20261003180000; research/
// notes/meet-classroom-design.md, Wishes 7 and 8): where each group is in
// its turns, whose turn it is, whether it has asked for the teacher, and
// reading the room line meet-events prints. Used by assets/rooms.js on
// /live/ and in the Meet add-on, and by /teach/; tested in
// tools/test/rooms-lib.test.mjs.
//
// A group's place is { step, presenter }: the step of the turn, by its
// place in LiveLib.TURN, and whose turn it is. Nothing here times,
// counts, or ranks anyone.
(function (root) {
  // Where a group starts: the first step of the first person's turn.
  function start(order) { return { step: 0, presenter: order && order.length ? order[0] : null }; }

  function isDone(state, steps) { return !!state && state.presenter == null && state.step >= steps; }

  // The place after this one: the next step of the same turn, or the
  // first step of the next person's, or done once every turn is over. A
  // presenter who is no longer in the group starts the order again.
  function advance(state, order, steps) {
    order = order || [];
    // A group with nobody on the hub (they came only through Meet) still
    // moves through the steps, once, with no one named.
    if (!order.length) {
      var at = state ? state.step : -1;
      return at + 1 < steps ? { step: at + 1, presenter: null } : { step: steps, presenter: null };
    }
    if (!state || (state.presenter == null && !isDone(state, steps))) state = start(order);
    if (isDone(state, steps)) return { step: steps, presenter: null };
    var i = order.indexOf(state.presenter);
    if (i < 0) return start(order);
    if (state.step < steps - 1) return { step: state.step + 1, presenter: state.presenter };
    if (i + 1 < order.length) return { step: 0, presenter: order[i + 1] };
    return { step: steps, presenter: null };
  }

  // Starting a step's timer says the group is on that step, in the turn
  // it is already in (or the first person's, if it has not begun).
  function atStep(state, order, index) {
    var who = state && state.presenter && (order || []).indexOf(state.presenter) >= 0 ? state.presenter : start(order).presenter;
    return { step: index, presenter: who };
  }

  // How a group's place reads. turn is LiveLib.TURN; nameOf(id) gives a
  // name, or "You" for the person reading.
  function placeText(state, order, turn, nameOf) {
    var steps = turn.length;
    if (!state) return { done: false, started: false, text: 'Not started yet.' };
    if (isDone(state, steps)) return { done: true, started: true, text: 'Every turn is done.' };
    var who = state.presenter && (order || []).indexOf(state.presenter) >= 0 ? state.presenter : null;
    var step = turn[Math.min(state.step, steps - 1)];
    var name = who ? nameOf(who) : null;
    var whose = name ? (name === 'You' ? 'Your turn, s' : name + '’s turn, s') : (order && order.length ? 'Between turns, s' : 'S');
    return {
      done: false, started: true, step: state.step, presenter: who,
      text: whose + 'tep ' + (Math.min(state.step, steps - 1) + 1) + ' of ' + steps + ': ' + step.name + '.'
    };
  }

  // The board's cards: every group for a teacher, only your own for
  // anyone else, yours first and then by name. The order never changes
  // when a group asks for the teacher, so nothing moves under anyone's
  // pointer; the card lights up instead.
  function board(groups, states, meId, teaching) {
    var bySession = {};
    (states || []).forEach(function (s) { bySession[s.group_id] = s; });
    return (groups || []).map(function (g) {
      var mine = (g.group_members || []).some(function (m) { return m.user_id === meId; });
      var st = bySession[g.id] || null;
      return {
        id: g.id, name: g.name, mine: mine,
        url: /^https:\/\//.test(g.meet_url || '') ? g.meet_url : null,
        state: st ? { step: st.step, presenter: st.presenter } : null,
        helpAt: st && st.help_at ? st.help_at : null
      };
    }).filter(function (r) { return teaching || r.mine; }).sort(function (a, b) {
      return (b.mine - a.mine) || String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    });
  }

  // Who is presenting and what everyone else in the room does, for the
  // person reading (R6): their own turn, or someone else's with the
  // step's line as the audience's job. place: placeText's answer.
  function roleText(place, meId, nameOf, step) {
    if (!place || !place.started || place.done || !place.presenter) return null;
    var what = step && step.what ? step.what : '';
    if (place.presenter === meId) return { presenting: true, text: 'You are presenting.', job: what };
    return { presenting: false, text: nameOf(place.presenter) + ' is presenting, and you are the audience.', job: what };
  }

  // Seconds left in a room's step, counted from when the database
  // started its clock (step_started_at), or null without one.
  function stepLeft(row, seconds, now) {
    if (!row || !row.step_started_at || !seconds) return null;
    var t = Date.parse(row.step_started_at);
    if (!isFinite(t)) return null;
    return Math.max(0, Math.round((t + seconds * 1000 - now) / 1000));
  }

  // How long ago a group asked, in whole minutes, in words.
  function agoText(iso, now) {
    var m = Math.max(0, Math.floor((now - Date.parse(iso)) / 60000));
    return m < 1 ? 'just now' : m === 1 ? 'a minute ago' : m + ' minutes ago';
  }

  // The line meet-events prints for each group's room, pasted on /teach/:
  // a Meet link, and, when meet@ made the room through the Meet REST
  // API, the room's name there ("spaces/…"), in either order.
  function parseRoomLine(text) {
    var t = String(text || '').trim();
    if (!t) return { url: null, space: null };
    var url = null, space = null, bad = null;
    t.split(/[\s|,]+/).filter(Boolean).forEach(function (part) {
      if (/^https:\/\//.test(part)) { if (part.length > 500) bad = 'That link is too long to be a Meet link.'; else url = part; }
      else if (/^spaces\/[A-Za-z0-9_-]{1,100}$/.test(part)) space = part;
      else bad = 'Paste the room’s Meet link, which starts with https://, and its spaces/ name if setup printed one.';
    });
    if (bad) return { error: bad };
    if (!url) return { error: 'A room needs its Meet link, which starts with https://.' };
    return { url: url, space: space };
  }

  var lib = { start: start, isDone: isDone, advance: advance, atStep: atStep, placeText: placeText, board: board, agoText: agoText, parseRoomLine: parseRoomLine, roleText: roleText, stepLeft: stepLeft };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RoomsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
