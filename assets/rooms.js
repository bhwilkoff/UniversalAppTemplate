// The room board (migration 20261003180000; research/notes/
// meet-classroom-design.md, Wishes 7 and 8): each group's room, which
// step of a turn it is on and whose turn it is, and "We would like the
// teacher". A teacher sees every group, to visit each room in turn and
// see who has asked; anyone else sees their own group. Used by /live/
// and the Meet add-on. The logic is RoomsLib's; the turn is LiveLib's.
//
// Nothing is read from Meet. A group that never touches the board shows
// only its room, which is fine. The teacher joins a room visibly, and
// says so when arriving; there is no listening in.
//
// Live updates: Supabase Realtime nudges the board when a group moves,
// and it reads the session's rows again through the cohort's read rule,
// or every fifteen seconds if Realtime cannot connect.
//
// Copy by Claude, awaiting Ben's review.
(function (root) {
  var R = root.RoomsLib, L = root.LiveLib;
  if (!R || !L) return;
  var POLL = 15000;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function link(label, cls, href) { var a = el('a', cls, label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }

  // opts: db, cohort, session, meId, teaching, groups (with
  // group_members), people (enrollments with user_id), names { id: name }
  // (for the order of turns, the same on every screen), nameOf(id) ("You"
  // for the reader, for what the board says), mount, onlyGroup (the add-on in one group's room),
  // showLinks (false inside a room's own call), onChange(byGroup).
  function start(opts) {
    var db = opts.db, box = opts.mount;
    var rows = [], seen = null, channel = null, poller = null, nudgeTimer = null, available = true;
    var steps = L.TURN.length;

    function groups() {
      return opts.onlyGroup ? opts.groups.filter(function (g) { return g.id === opts.onlyGroup; }) : opts.groups;
    }
    function orderOf(g) {
      var ids = (g.group_members || []).map(function (m) { return m.user_id; });
      return L.presentingOrder(opts.people.filter(function (p) { return ids.indexOf(p.user_id) >= 0; })
        .map(function (p) { return { id: p.user_id, name: (opts.names || {})[p.user_id] || 'Someone' }; }), opts.session.number)
        .map(function (p) { return p.id; });
    }
    function stateOf(groupId) {
      var r = rows.filter(function (x) { return x.group_id === groupId; })[0];
      return r ? { step: r.step, presenter: r.presenter } : null;
    }
    function canMove(g) {
      return opts.teaching || (g.group_members || []).some(function (m) { return m.user_id === opts.meId; });
    }

    function refresh() {
      return db.from('live_room_state').select('*').eq('session_id', opts.session.id).then(function (r) {
        // Before the database has the table, the board stays away.
        if (r.error) { available = false; box.hidden = true; return; }
        available = true;
        var before = seen;
        rows = r.data || [];
        seen = JSON.stringify(rows);
        if (seen !== before) draw();
      });
    }

    function write(g, patch, status) {
      if (!canMove(g)) return Promise.resolve();
      var row = Object.assign({ cohort_id: opts.cohort.id, session_id: opts.session.id, group_id: g.id }, patch);
      return db.from('live_room_state').upsert(row, { onConflict: 'session_id,group_id' }).then(function (r) {
        if (r.error && status) status.textContent = 'Not saved: ' + r.error.message + '.';
        return refresh();
      });
    }

    // Starting a step's timer on /live/ says the group is on that step.
    function setStep(groupId, index) {
      var g = opts.groups.filter(function (x) { return x.id === groupId; })[0];
      if (!g || !available) return;
      var next = R.atStep(stateOf(g.id), orderOf(g), index);
      return write(g, { step: next.step, presenter: next.presenter });
    }

    function askingText(at, now) {
      return opts.teaching
        ? 'They would like you here, asked ' + R.agoText(at, now) + '.'
        : 'You asked for your teacher ' + R.agoText(at, now) + '. They will say so when they arrive.';
    }

    function draw() {
      var cards = R.board(groups(), rows, opts.meId, opts.teaching || !!opts.onlyGroup);
      box.hidden = !cards.length;
      // A redraw keeps keyboard focus on the same card's button, or on
      // the card's first button when the one pressed has changed.
      var active = document.activeElement, focusCard = null, focusText = null;
      if (active && box.contains(active) && active.closest('[data-group]')) {
        focusCard = active.closest('[data-group]').getAttribute('data-group'); focusText = active.textContent;
      }
      box.replaceChildren();
      var now = Date.now(), byGroup = {};
      cards.forEach(function (c) {
        var g = opts.groups.filter(function (x) { return x.id === c.id; })[0];
        var order = orderOf(g);
        var place = R.placeText(c.state, order, L.TURN, opts.nameOf);
        byGroup[c.id] = { step: c.state && !place.done ? c.state.step : null, presenter: place.presenter || null, done: place.done, asking: !!c.helpAt };
        var card = el('article', 'room-card' + (c.helpAt ? ' is-asking' : ''));
        card.setAttribute('data-group', c.id);
        card.appendChild(el('h3', null, opts.teaching || !c.mine ? c.name : 'Your group, ' + c.name));
        card.appendChild(el('p', 'room-place', place.text));
        if (c.helpAt) {
          var asking = el('p', 'room-asking', askingText(c.helpAt, now));
          asking.setAttribute('data-asked', c.helpAt);
          card.appendChild(asking);
        }
        var acts = el('div', 'actions');
        if (opts.showLinks !== false && c.url) acts.appendChild(link(opts.teaching && !c.mine ? 'Visit its room' : 'Join your group’s room', c.mine ? 'btn-github' : 'btn-quiet', c.url));
        var status = el('span', 'small'); status.setAttribute('role', 'status');
        if (canMove(g)) {
          if (!place.done) {
            acts.appendChild(button(place.started ? 'Next step' : 'Start the first turn', 'btn-quiet', function () {
              var next = place.started ? R.advance(c.state, order, steps) : R.start(order);
              write(g, { step: next.step, presenter: next.presenter }, status);
            }));
          } else {
            acts.appendChild(button('Start the turns again', 'btn-quiet', function () {
              var first = R.start(order);
              write(g, { step: first.step, presenter: first.presenter }, status);
            }));
          }
          if (opts.teaching && c.helpAt) {
            acts.appendChild(button('I am here', 'btn-quiet', function () { write(g, { help_at: null }, status); }));
          } else if (!opts.teaching && c.helpAt) {
            acts.appendChild(button('We are fine now', 'btn-quiet', function () { write(g, { help_at: null }, status); }));
          } else if (!opts.teaching) {
            acts.appendChild(button('We would like the teacher', 'btn-quiet', function () { write(g, { help_at: new Date().toISOString() }, status); }));
          }
        }
        if (acts.children.length) card.appendChild(acts);
        card.appendChild(status);
        box.appendChild(card);
      });
      if (focusCard) {
        var again = box.querySelector('[data-group="' + focusCard + '"]');
        var btns = again ? Array.prototype.slice.call(again.querySelectorAll('button')) : [];
        var same = btns.filter(function (b) { return b.textContent === focusText; })[0] || btns[0];
        if (same) same.focus();
      }
      if (opts.onChange) opts.onChange(byGroup);
    }

    function poll(on) {
      if (on && !poller) poller = setInterval(refresh, POLL);
      if (!on && poller) { clearInterval(poller); poller = null; }
    }
    function listen() {
      if (!available) return;
      if (!db.channel) return poll(true);
      channel = db.channel('rooms:' + opts.cohort.id);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'live_room_state', filter: 'cohort_id=eq.' + opts.cohort.id }, function () {
        clearTimeout(nudgeTimer); nudgeTimer = setTimeout(refresh, 200);
      });
      poll(true);
      channel.subscribe(function (s) {
        if (s === 'SUBSCRIBED') { poll(false); refresh(); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') poll(true);
      });
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && available) refresh(); });
    // "Asked 3 minutes ago" stays true without a redraw that moves focus:
    // only the asking lines are rewritten, once a minute.
    setInterval(function () {
      box.querySelectorAll('[data-asked]').forEach(function (p) { p.textContent = askingText(p.getAttribute('data-asked'), Date.now()); });
    }, 60000);

    refresh().then(listen);
    return { refresh: refresh, setStep: setStep };
  }

  root.RoomBoard = { start: start };
})(typeof globalThis !== 'undefined' ? globalThis : this);
