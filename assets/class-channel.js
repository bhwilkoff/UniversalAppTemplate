// The class channel in the Meet panel (R10, R11): the reaction row, the
// stance a person holds, and who has the class open, all on the cohort's
// private Realtime channel 'class:<cohort id>' (migration
// 20261005010000_class_channel.sql). Nothing here is written to a table;
// when the call ends, it is gone. Logic in ReactLib (react-lib.js).
//
//   ClassChannel.start({
//     db, auth,           the supabase client, and the session (its token)
//     cohort, me, name,   the cohort, the signed-in user, their name
//     mount,              the element the reaction row is drawn in
//     onStage(payload),   sends a ReactLib.stageMessage to this person's stage
//     onPresence(state)   the channel's presence state, whenever it changes
//   }) -> { setPresence(fields), presence(), stop() }
(function () {
  var R = window.ReactLib;
  if (!R) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function start(o) {
    var mount = o.mount, me = o.me, live = false, channel = null;
    var mine = [], seen = {}, pending = [], flushTimer = null, held = null, extra = {}, nudged = {};

    // The row: eight reactions and three stances, each with its key.
    mount.replaceChildren();
    var row = el('div', 'react-row');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'React to what is happening now');
    R.REACTIONS.forEach(function (r) {
      var b = el('button', 'react-btn');
      b.type = 'button';
      b.setAttribute('aria-label', r.label + ' (key ' + r.key + ')');
      b.title = r.label + ' (' + r.key + ')';
      b.appendChild(el('span', 'react-emoji', r.emoji)).setAttribute('aria-hidden', 'true');
      b.appendChild(el('span', 'react-key', r.key)).setAttribute('aria-hidden', 'true');
      b.addEventListener('click', function () { react(r.id, b); });
      b.setAttribute('data-r', r.id);
      row.appendChild(b);
    });
    mount.appendChild(row);
    var stances = el('div', 'stance-row');
    stances.setAttribute('role', 'group');
    stances.setAttribute('aria-label', 'Where you stand on what is being said');
    R.STANCES.forEach(function (s) {
      var b = el('button', 'stance-btn', s.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.title = s.label + ' (' + s.key.toUpperCase() + ')';
      b.setAttribute('data-s', s.id);
      b.addEventListener('click', function () { hold(s.id); });
      stances.appendChild(b);
    });
    mount.appendChild(stances);
    // Where I am on the path (R11), shared only if the person picks it,
    // and remembered in this browser for the next call.
    var RL = window.RosterLib, memKey = o.cohort ? 'hs-path-stage:' + o.cohort.id : null;
    if (RL) {
      var where = el('label', 'path-pick');
      where.appendChild(el('span', null, 'Where I am on the path'));
      var sel = el('select');
      sel.appendChild(new Option('Not sharing', ''));
      RL.STAGE_IDS.forEach(function (id) { sel.appendChild(new Option(RL.STAGE_SHORT[id], id)); });
      try { var saved = memKey && localStorage.getItem(memKey); if (saved && RL.isStage(saved)) { sel.value = saved; extra.stage = saved; } } catch (e) {}
      sel.addEventListener('change', function () {
        extra.stage = sel.value || null;
        try { if (memKey) { if (sel.value) localStorage.setItem(memKey, sel.value); else localStorage.removeItem(memKey); } } catch (e) {}
        track();
      });
      where.appendChild(sel);
      mount.appendChild(where);
    }
    var line = el('p', 'react-line small', 'Keys 1 to 8 react, and A, U, and D say where you stand, while this panel has focus.');
    mount.appendChild(line);

    function flash(b) {
      if (!b) return;
      b.classList.remove('sent'); void b.offsetWidth; b.classList.add('sent');
    }

    // A reaction goes to everyone (and comes back to this panel, so the
    // sender's own stage shows it too).
    function react(id, button) {
      var a = R.allow(mine, Date.now());
      mine = a.times;
      if (!a.ok) { line.textContent = 'That is a lot of reactions at once. Give it a moment.'; return; }
      flash(button || row.querySelector('[data-r="' + id + '"]'));
      var msg = R.message(id, o.name);
      if (live && channel) channel.send({ type: 'broadcast', event: 'react', payload: msg });
      else heard({ payload: msg, self: true });
    }

    // A stance is held until it is changed, and pressing it again lets go.
    function hold(id) {
      held = held === id ? null : id;
      stances.querySelectorAll('[data-s]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-s') === held)); });
      track();
    }
    function track() {
      if (live && channel) channel.track(Object.assign({}, extra, { name: o.name || null, stance: held }));
    }

    // Every reaction heard, each sender held to the same limit.
    function heard(m) {
      var r = R.read(m && m.payload);
      if (!r) return;
      var who = (m.payload && m.payload.n) || '?';
      var a = R.allow(seen[who], Date.now());
      seen[who] = a.times;
      if (!a.ok) return;
      pending.push(r);
      if (!flushTimer) flushTimer = setTimeout(flush, 400);
    }
    function counts() { return channel ? R.stanceCounts(channel.presenceState()) : { agree: 0, unsure: 0, disagree: 0, total: 0 }; }
    function flush() {
      flushTimer = null;
      if (o.onStage) o.onStage(R.stageMessage(pending, counts()));
      pending = [];
    }

    document.addEventListener('keydown', function (e) {
      var k = R.keyFor(e);
      if (!k) return;
      e.preventDefault();
      if (k.reaction) react(k.reaction);
      else hold(k.stance);
    });

    if (o.db && o.db.channel && o.cohort) {
      if (o.db.realtime && o.db.realtime.setAuth && o.auth && o.auth.access_token) o.db.realtime.setAuth(o.auth.access_token);
      channel = o.db.channel('class:' + o.cohort.id, { config: { private: true, broadcast: { self: true }, presence: { key: me.id } } });
      channel
        .on('broadcast', { event: 'react' }, heard)
        // A nudge that something changed elsewhere (the chat, R15), so
        // every panel reads it again at once; the nudge itself carries
        // nothing but its name.
        .on('broadcast', { event: 'nudge' }, function (m) {
          var what = m && m.payload && typeof m.payload.what === 'string' ? m.payload.what : null;
          (nudged[what] || []).forEach(function (fn) { try { fn(); } catch (e) {} });
        })
        .on('presence', { event: 'sync' }, function () {
          if (!flushTimer) flushTimer = setTimeout(flush, 400);
          if (o.onPresence) o.onPresence(channel.presenceState());
        })
        .subscribe(function (state) {
          live = state === 'SUBSCRIBED';
          if (live) track();
          if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') line.textContent = 'Reactions are not reaching the class just now. They will come back when the connection does.';
        });
    }

    return {
      // Other parts of the panel (R11) add to what this person shares.
      setPresence: function (fields) { extra = Object.assign({}, extra, fields || {}); track(); },
      nudge: function (what) { if (live && channel) channel.send({ type: 'broadcast', event: 'nudge', payload: { what: String(what) } }); },
      onNudge: function (what, fn) { (nudged[what] = nudged[what] || []).push(fn); },
      presence: function () { return channel ? channel.presenceState() : {}; },
      stop: function () { if (channel) { o.db.removeChannel(channel); channel = null; } }
    };
  }

  window.ClassChannel = { start: start };
})();
