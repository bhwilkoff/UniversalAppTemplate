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
  // showLinks (false inside a room's own call), onChange(byGroup),
  // turn (the room's own scenes, LiveLib.roomTurn; the trio protocol's
  // steps without it), prompt (what the rooms scene asks the rooms to
  // do), and boardLink(groupId) (a group's board, or null).
  // setPlan({ turn, prompt }) changes the room's scenes when the run of
  // show moves to another rooms scene (R6).
  function start(opts) {
    var db = opts.db, box = opts.mount;
    var rows = [], seen = null, channel = null, poller = null, nudgeTimer = null, available = true, boards = {};
    var turn = opts.turn && opts.turn.length ? opts.turn : L.TURN;
    var steps = turn.length;

    function groups() {
      return opts.onlyGroup ? opts.groups.filter(function (g) { return g.id === opts.onlyGroup; }) : opts.groups;
    }
    function orderOf(g) {
      var ids = (g.group_members || []).map(function (m) { return m.user_id; });
      return L.presentingOrder(opts.people.filter(function (p) { return ids.indexOf(p.user_id) >= 0; })
        .map(function (p) { return { id: p.user_id, name: (opts.names || {})[p.user_id] || 'Someone' }; }), opts.session.number)
        .map(function (p) { return p.id; });
    }
    function rowOf(groupId) { return rows.filter(function (x) { return x.group_id === groupId; })[0] || null; }
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
        // Which groups have a board this session: a student can open only
        // one their teacher has made (open_board), a teacher any.
        return (opts.boardLink ? db.from('boards').select('group_id').eq('session_id', opts.session.id) : Promise.resolve({ data: [] })).then(function (b) {
          boards = {};
          ((b && b.data) || []).forEach(function (x) { if (x.group_id) boards[x.group_id] = true; });
          seen = JSON.stringify([rows, boards, steps, opts.prompt || '']);
          if (seen !== before) draw();
        });
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
        var place = R.placeText(c.state, order, turn, opts.nameOf);
        // What the main stage's rooms view shows of this room (R12).
        var stepNow = place.started && !place.done ? turn[Math.min(c.state.step, steps - 1)] : null;
        var startedAt = rowOf(c.id) && rowOf(c.id).step_started_at ? Date.parse(rowOf(c.id).step_started_at) : NaN;
        byGroup[c.id] = { step: c.state && !place.done ? c.state.step : null, presenter: place.presenter || null, done: place.done, asking: !!c.helpAt,
          name: c.name, text: place.text, endsAt: stepNow && stepNow.seconds && isFinite(startedAt) ? startedAt + stepNow.seconds * 1000 : null };
        var card = el('article', 'room-card' + (c.helpAt ? ' is-asking' : ''));
        card.setAttribute('data-group', c.id);
        card.appendChild(el('h3', null, opts.teaching || !c.mine ? c.name : 'Your group, ' + c.name));
        card.appendChild(el('p', 'room-place', place.text));
        // Inside the room (R6): whose turn it is, what everyone else does,
        // and the step's clock, the same on every screen in the room.
        if (c.mine || opts.onlyGroup) {
          var step = place.started && !place.done ? turn[Math.min(c.state.step, steps - 1)] : null;
          var role = R.roleText(place, opts.meId, opts.nameOf, step);
          if (role) {
            card.appendChild(el('p', 'room-role' + (role.presenting ? ' is-presenting' : ''), role.text));
            if (role.job) card.appendChild(el('p', 'small room-job', role.job));
          }
        }
        if (place.started && !place.done) {
          var clock = el('p', 'room-clock');
          clock.setAttribute('data-room-clock', c.id);
          card.appendChild(clock);
        }
        if (opts.prompt && (c.mine || opts.onlyGroup) && !place.done) card.appendChild(el('p', 'room-prompt', opts.prompt));
        if (c.helpAt) {
          var asking = el('p', 'room-asking', askingText(c.helpAt, now));
          asking.setAttribute('data-asked', c.helpAt);
          card.appendChild(asking);
        }
        var acts = el('div', 'actions');
        if (opts.showLinks !== false && c.url) acts.appendChild(link(opts.teaching && !c.mine ? 'Visit its room' : 'Join your group’s room', c.mine ? 'btn-github' : 'btn-quiet', c.url));
        var boardHref = opts.boardLink && (opts.teaching || boards[c.id]) ? opts.boardLink(c.id) : null;
        if (boardHref) acts.appendChild(link(opts.teaching && !boards[c.id] ? 'Make its board' : 'The room’s board', 'btn-quiet', boardHref));
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
      tickClocks();
      if (opts.onChange) opts.onChange(byGroup);
    }

    // Each room's step clock, rewritten in place every second so nothing
    // a person is pointing at moves.
    function tickClocks() {
      var now = Date.now();
      box.querySelectorAll('[data-room-clock]').forEach(function (p) {
        var id = p.getAttribute('data-room-clock');
        var st = stateOf(id);
        var stepNow = st ? turn[Math.min(st.step, steps - 1)] : null;
        var left = stepNow ? R.stepLeft(rowOf(id), stepNow.seconds, now) : null;
        p.hidden = left == null;
        p.classList.toggle('is-over', left === 0);
        p.textContent = left == null ? '' : left === 0 ? 'This step’s time is up. Move on when you are ready.' : L.clock(left) + ' left in this step';
      });
    }
    setInterval(tickClocks, 1000);

    function setPlan(plan) {
      var t = plan && plan.turn && plan.turn.length ? plan.turn : L.TURN;
      var p = plan && plan.prompt ? String(plan.prompt) : null;
      if (JSON.stringify([t, p]) === JSON.stringify([turn, opts.prompt || null])) return;
      turn = t; steps = t.length; opts.prompt = p;
      seen = null;
      if (available) draw();
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
    return { refresh: refresh, setStep: setStep, setPlan: setPlan };
  }

  root.RoomBoard = { start: start };
})(typeof globalThis !== 'undefined' ? globalThis : this);
