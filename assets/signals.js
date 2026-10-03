// Live signals on a page (migration 20261003140000): the banner that says
// where everyone should be, the card, who is on stage, the "recording
// now" notice, and, for a teacher, the controls that send them. Used by
// /live/ and /card/; the Meet add-on can mount the same view. The logic
// (which signal shows, the clock, the order of rooms) is SignalsLib's.
//
// Live updates: Supabase Realtime nudges the page when a signal in this
// cohort changes, and the page reads the session's signals again through
// the cohort's read rule. If Realtime cannot connect, it reads them every
// fifteen seconds instead.
//
// Copy by Claude, awaiting Ben's review.
(function (root) {
  var K = root.SignalsLib;
  if (!K) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function link(label, cls, href) { var a = el('a', cls, label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function reduced() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  // A clock that updates every second is not read aloud each time.
  function clockSpan(c) { var s = el('span', 'signal-clock', c ? c.text : ''); s.setAttribute('aria-live', 'off'); s.setAttribute('role', 'timer'); return s; }

  // opts: db, cohort, session, meId, teaching, groups, nameOf(id),
  // people [{ id, name }] (for choosing the stage), roomMinutes, and
  // mounts { recording, where, card, stage, controls, screen } (any may be
  // left out; /card/ uses only screen).
  function start(opts) {
    var db = opts.db, m = opts.mounts || {};
    var rows = [], saved = [], seen = null, st = K.state([], Date.now()), sig = '', tickTimer = null, channel = null, poller = null, nudgeTimer = null;
    var mainUrl = safe(opts.session.meet_url);
    var C = m.controls ? controls() : null;

    function refresh() {
      var reads = [db.from('live_signals').select('*').eq('session_id', opts.session.id).order('created_at')];
      if (C) reads.push(db.from('card_presets').select('*').order('created_at'));
      return Promise.all(reads).then(function (res) {
        if (res[0].error) return;
        var before = seen;
        rows = res[0].data || [];
        if (res[1] && !res[1].error) saved = res[1].data || [];
        seen = JSON.stringify([rows, saved]);
        // Redraw in full only when something changed, so a nudge that
        // changed nothing never moves anyone's focus.
        draw(seen !== before);
      });
    }

    // ------------------------------------------------------------------
    // Everyone's view
    // ------------------------------------------------------------------

    // Drawn again in full only when what shows changes; in between, the
    // clocks alone are updated, so nothing jumps and no button loses focus.
    function draw(force) {
      var now = Date.now(), coarse = reduced();
      st = K.state(rows, now);
      var w = K.where(st, now, coarse), sc = K.screen(st, now, coarse);
      var next = [w && w.kind, w && w.because, w && w.warn, w && w.signal.id, st.card && st.card.id, st.stage && st.stage.id,
        st.recording && st.recording.id, sc && sc.kind, sc && sc.clock && sc.clock.done, coarse].join('|');
      if (force || next !== sig) {
        sig = next;
        if (m.recording) drawRecording();
        if (m.where) drawWhere(w);
        if (m.card) drawCard(st.card, now, coarse);
        if (m.stage) drawStage(st.stage);
        if (m.screen) drawScreen(sc);
        if (C) C.sync();
      } else {
        updateClocks(now, coarse);
      }
      clearTimeout(tickTimer);
      tickTimer = setTimeout(function () { draw(false); }, K.nextTick(st, now, coarse));
    }

    function updateClocks(now, coarse) {
      [m.where, m.card, m.screen, m.controls].forEach(function (box) {
        if (!box) return;
        box.querySelectorAll('[data-ends]').forEach(function (s) {
          var c = K.countdown(s.getAttribute('data-ends'), now, coarse);
          if (c) s.textContent = (s.getAttribute('data-prefix') || '') + c.text;
        });
      });
    }
    function clockFor(endsAt, now, coarse, prefix) {
      var c = K.countdown(endsAt, now, coarse);
      var s = clockSpan(c);
      if (c) { s.setAttribute('data-ends', endsAt); if (prefix) { s.setAttribute('data-prefix', prefix); s.textContent = prefix + c.text; } }
      return s;
    }

    function drawRecording() {
      m.recording.replaceChildren();
      m.recording.hidden = !st.recording;
      if (st.recording) m.recording.appendChild(el('p', null, opts.teaching
        ? 'You are recording now, and everyone in the cohort sees this line until you say it has stopped.'
        : 'Your teacher is recording now, on their own computer, and only the people in this cohort will see it.'));
    }

    function drawWhere(w) {
      var box = m.where; box.replaceChildren();
      box.hidden = !w;
      box.classList.toggle('is-warn', !!(w && w.warn));
      box.classList.toggle('is-back', !!(w && w.kind === 'back'));
      if (!w) return;
      var now = Date.now(), coarse = reduced();
      if (w.kind === 'back') {
        box.appendChild(el('p', 'signal-title', 'Come back to the main room'));
        box.appendChild(el('p', null, w.because === 'time' ? 'The time in the rooms is up.' : 'Your teacher is calling everyone back.'));
        var acts = el('div', 'actions');
        if (mainUrl) acts.appendChild(link('Back to the main room', 'btn-github', mainUrl));
        else acts.appendChild(el('p', 'small', 'The main room is the session’s own Meet call.'));
        box.appendChild(acts);
        return;
      }
      var rooms = K.roomsFor(opts.groups, opts.meId, opts.teaching);
      var mine = rooms.filter(function (r) { return r.mine; })[0];
      var title = el('p', 'signal-title', opts.teaching ? 'Everyone is in their rooms' : 'Go to your group’s room');
      box.appendChild(title);
      if (w.signal.ends_at) {
        var line = el('p', 'signal-time');
        line.appendChild(clockFor(w.signal.ends_at, now, coarse, ''));
        box.appendChild(line);
        if (w.warn) box.appendChild(el('p', null, 'Finish the thought you are on, and then come back to the main room.'));
      }
      if (!opts.teaching && !mine) {
        title.textContent = 'Everyone is going to their groups’ rooms';
        box.appendChild(el('p', null, 'You are not in a group yet, so stay in the main room, and your teacher will say where to go.'));
        return;
      }
      if (!opts.teaching && !mine.url) {
        title.textContent = 'Everyone is going to their groups’ rooms';
        box.appendChild(el('p', null, 'Your group has no room of its own yet, so stay in the main room.'));
        return;
      }
      var acts2 = el('div', 'actions');
      rooms.forEach(function (r) {
        if (!r.url) return;
        acts2.appendChild(link(opts.teaching && !r.mine ? 'Visit ' + r.name : 'Join ' + (opts.teaching ? r.name + '’s' : 'your group’s') + ' room', r.mine ? 'btn-github' : 'btn-quiet', r.url));
      });
      if (mainUrl) acts2.appendChild(link('The main room', 'btn-quiet', mainUrl));
      box.appendChild(acts2);
      var none = rooms.filter(function (r) { return !r.url; }).map(function (r) { return r.name; });
      if (opts.teaching && none.length) box.appendChild(el('p', 'small', K.list(none) + (none.length === 1 ? ' has' : ' have') + ' no room yet, so ' + (none.length === 1 ? 'it stays' : 'they stay') + ' in the main room.'));
    }

    function drawCard(card, now, coarse) {
      var box = m.card; box.replaceChildren();
      box.hidden = !card;
      if (!card) return;
      box.appendChild(el('p', 'signal-card-text', card.body));
      if (card.ends_at) box.appendChild(el('p', 'signal-time')).appendChild(clockFor(card.ends_at, now, coarse, ''));
    }

    function drawStage(stage) {
      var box = m.stage; box.replaceChildren();
      box.hidden = !stage;
      if (!stage) return;
      box.appendChild(el('p', 'kicker', 'On stage'));
      box.appendChild(el('p', 'signal-stage-text', K.stageText(stage, opts.nameOf)));
      var onIt = stage.people.indexOf(opts.meId) >= 0;
      box.appendChild(el('p', 'small', opts.teaching ? 'Everyone else is watching.' : onIt
        ? 'Everyone else is watching, so take your time.'
        : 'Everyone else is watching. Your teacher pins them for everyone in Meet, but Meet on a phone does not show pins, so these names are how you know who is talking.'));
    }

    // The one thing a shared screen shows, large (/card/).
    function drawScreen(sc) {
      var box = m.screen, now = Date.now(), coarse = reduced();
      box.replaceChildren();
      box.setAttribute('data-kind', sc ? sc.kind : 'idle');
      if (!sc) {
        box.appendChild(el('p', 'screen-title', opts.cohort.title));
        box.appendChild(el('p', 'screen-sub', 'Week ' + opts.session.number + (opts.session.title && opts.session.title !== 'Week ' + opts.session.number ? ': ' + opts.session.title : '')));
      } else if (sc.kind === 'card') {
        box.appendChild(el('p', 'screen-card', sc.signal.body));
        if (sc.signal.ends_at) box.appendChild(el('p', 'screen-clock')).appendChild(clockFor(sc.signal.ends_at, now, coarse, ''));
      } else if (sc.kind === 'rooms') {
        box.appendChild(el('p', 'screen-title', 'Everyone is in their groups’ rooms'));
        if (sc.signal.ends_at) box.appendChild(el('p', 'screen-clock')).appendChild(clockFor(sc.signal.ends_at, now, coarse, ''));
      } else if (sc.kind === 'back') {
        box.appendChild(el('p', 'screen-title', 'Come back to the main room'));
        box.appendChild(el('p', 'screen-sub', sc.because === 'time' ? 'The time in the rooms is up.' : 'Your teacher is calling everyone back.'));
      } else if (sc.kind === 'stage') {
        box.appendChild(el('p', 'screen-sub', 'On stage'));
        box.appendChild(el('p', 'screen-title', K.stageText(sc.signal, opts.nameOf)));
      }
      if (m.screenRecording) {
        m.screenRecording.hidden = !st.recording;
        m.screenRecording.textContent = st.recording ? 'Recording now, for this cohort only' : '';
      }
    }

    // ------------------------------------------------------------------
    // The teacher's controls
    // ------------------------------------------------------------------

    function send(kind, fields, status) {
      var me = opts.meId, sid = opts.session.id;
      // Sending clears what it replaces, so the database says what shows.
      var clears = { rooms: ['rooms', 'together'], together: ['rooms', 'together'], card: ['card'], stage: ['stage'], recording: ['recording'] }[kind];
      status.textContent = 'Sending…';
      return db.from('live_signals').update({ cleared_at: new Date().toISOString() }).eq('session_id', sid).in('kind', clears).is('cleared_at', null)
        .then(function () {
          return db.from('live_signals').insert(Object.assign({ cohort_id: opts.cohort.id, session_id: sid, created_by: me, kind: kind }, fields || {}));
        }).then(function (r) {
          status.textContent = r.error ? 'Not sent: ' + r.error.message : '';
          return refresh();
        });
    }
    function clear(signal, status) {
      status.textContent = '';
      return db.from('live_signals').update({ cleared_at: new Date().toISOString() }).eq('id', signal.id).then(function (r) {
        if (r.error) status.textContent = 'Not cleared: ' + r.error.message;
        return refresh();
      });
    }

    function controls() {
      var box = m.controls;
      function q(s) { return box.querySelector(s); }
      var status = {
        rooms: q('[data-sig-rooms-status]'), card: q('[data-sig-card-status]'),
        stage: q('[data-sig-stage-status]'), rec: q('[data-sig-rec-status]')
      };

      // Rooms: send, with an optional clock, or call everyone back.
      var minutes = q('[data-sig-rooms-minutes]');
      if (opts.roomMinutes && !minutes.value) minutes.value = String(opts.roomMinutes);
      var ask = q('[data-sig-rooms-ask]');
      function sendRooms() {
        var parsed = K.parseMinutes(minutes.value);
        if (parsed.error) { status.rooms.textContent = parsed.error; return; }
        ask.hidden = true;
        send('rooms', { ends_at: K.endsAt(parsed.minutes, Date.now()) }, status.rooms);
      }
      q('[data-sig-rooms-send]').addEventListener('click', function () {
        var none = K.roomsFor(opts.groups, opts.meId, true).filter(function (r) { return !r.url; }).map(function (r) { return r.name; });
        if (!opts.groups.length) none = null;
        if (none === null || none.length) {
          q('[data-sig-rooms-ask-text]').textContent = none === null
            ? 'This cohort has no groups yet, so everyone will stay in the main room. Send the signal anyway?'
            : K.list(none) + (none.length === 1 ? ' has' : ' have') + ' no room of its own yet, so ' + (none.length === 1 ? 'its people stay' : 'their people stay') + ' in the main room. Send everyone anyway?';
          ask.hidden = false;
          return;
        }
        sendRooms();
      });
      q('[data-sig-rooms-yes]').addEventListener('click', sendRooms);
      q('[data-sig-rooms-no]').addEventListener('click', function () { ask.hidden = true; });
      q('[data-sig-rooms-back]').addEventListener('click', function () { send('together', {}, status.rooms); });
      q('[data-sig-rooms-more]').addEventListener('click', function () {
        if (!st.rooms) return;
        db.from('live_signals').update({ ends_at: K.extend(st.rooms.ends_at, 5, Date.now()) }).eq('id', st.rooms.id).then(function (r) {
          status.rooms.textContent = r.error ? 'Not changed: ' + r.error.message : '';
          refresh();
        });
      });
      q('[data-sig-back-clear]').addEventListener('click', function () { if (st.together) clear(st.together, status.rooms); });

      // A card, typed or chosen from the saved ones.
      var words = q('[data-sig-card-words]'), cardMinutes = q('[data-sig-card-minutes]');
      var saveBtn = q('[data-sig-card-save]');
      function syncSave() { var p = K.parseCard(words.value, ''); saveBtn.hidden = !!p.error || K.isSaved(saved, p.body); }
      words.addEventListener('input', syncSave);
      q('[data-sig-card-form]').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var p = K.parseCard(words.value, cardMinutes.value);
        if (p.error) { status.card.textContent = p.error; return; }
        send('card', { body: p.body, ends_at: K.endsAt(p.minutes, Date.now()) }, status.card);
      });
      saveBtn.addEventListener('click', function () {
        var p = K.parseCard(words.value, cardMinutes.value);
        if (p.error) { status.card.textContent = p.error; return; }
        db.from('card_presets').insert({ user_id: opts.meId, body: p.body, minutes: p.minutes }).then(function (r) {
          status.card.textContent = r.error ? 'Not saved: ' + r.error.message : 'Saved.';
          refresh();
        });
      });
      q('[data-sig-card-clear]').addEventListener('click', function () { if (st.card) clear(st.card, status.card); });

      // On stage: one presenter and up to two responding.
      var picks = box.querySelectorAll('[data-sig-stage-pick]');
      picks.forEach(function (sel, i) {
        var none = el('option', null, i ? 'Nobody' : 'Choose someone'); none.value = ''; sel.appendChild(none);
        opts.people.forEach(function (p) { var o = el('option', null, p.name); o.value = p.id; sel.appendChild(o); });
      });
      q('[data-sig-stage-send]').addEventListener('click', function () {
        var chosen = K.stagePeople(Array.prototype.map.call(picks, function (s) { return s.value; }));
        if (chosen.error) { status.stage.textContent = chosen.error; return; }
        send('stage', { people: chosen.people }, status.stage);
      });
      q('[data-sig-stage-clear]').addEventListener('click', function () { if (st.stage) clear(st.stage, status.stage); });

      // Recording: a notice only; the recorder itself runs on the
      // teacher's computer and is started and stopped there.
      q('[data-sig-rec-on]').addEventListener('click', function () { send('recording', {}, status.rec); });
      q('[data-sig-rec-off]').addEventListener('click', function () { if (st.recording) clear(st.recording, status.rec); });

      function drawPresets() {
        var list = q('[data-sig-presets]'); list.replaceChildren();
        K.presets(saved).forEach(function (p) {
          var li = el('li', 'signal-preset');
          li.appendChild(button(K.presetLabel(p), 'btn-quiet', function () {
            words.value = p.body; cardMinutes.value = p.minutes ? String(p.minutes) : '';
            syncSave();
            status.card.textContent = 'Ready to show.';
            q('[data-sig-card-show]').focus();
          }));
          if (p.saved) {
            var rm = button('Remove', 'btn-quiet danger', function () { rm.hidden = true; confirm.hidden = false; });
            rm.setAttribute('aria-label', 'Remove the saved card: ' + p.body);
            var confirm = el('span', 'signal-confirm'); confirm.hidden = true;
            confirm.appendChild(el('span', null, 'Remove it? '));
            confirm.appendChild(button('Remove', 'btn-quiet danger', function () {
              db.from('card_presets').delete().eq('id', p.id).then(function () { refresh(); });
            }));
            confirm.appendChild(button('Keep it', 'btn-quiet', function () { confirm.hidden = true; rm.hidden = false; }));
            li.appendChild(rm); li.appendChild(confirm);
          }
          list.appendChild(li);
        });
        syncSave();
      }

      // What is showing now, beside each control.
      function sync() {
        var now = Date.now(), coarse = reduced();
        var w = K.where(st, now, coarse);
        q('[data-sig-rooms-idle]').hidden = !!(w && w.kind === 'rooms');
        q('[data-sig-rooms-live]').hidden = !(w && w.kind === 'rooms');
        q('[data-sig-rooms-more]').hidden = !(st.rooms && st.rooms.ends_at);
        q('[data-sig-back-live]').hidden = !st.together;
        var rnow = q('[data-sig-rooms-now]'); rnow.replaceChildren();
        if (w && w.kind === 'rooms') {
          rnow.appendChild(document.createTextNode('Everyone is in their rooms' + (st.rooms.ends_at ? ', with ' : '.')));
          if (st.rooms.ends_at) { rnow.appendChild(clockFor(st.rooms.ends_at, now, coarse, '')); rnow.appendChild(document.createTextNode('.')); }
        }
        q('[data-sig-card-live]').hidden = !st.card;
        q('[data-sig-card-now]').textContent = st.card ? 'Showing now: “' + st.card.body + '”' : '';
        q('[data-sig-stage-live]').hidden = !st.stage;
        q('[data-sig-stage-now]').textContent = st.stage ? K.stageText(st.stage, opts.nameOf) : '';
        q('[data-sig-rec-on]').hidden = !!st.recording;
        q('[data-sig-rec-live]').hidden = !st.recording;
        drawPresets();
      }
      return { sync: sync };
    }

    // ------------------------------------------------------------------
    // Hearing about changes
    // ------------------------------------------------------------------

    function poll(on) {
      if (on && !poller) poller = setInterval(refresh, K.POLL_MS);
      if (!on && poller) { clearInterval(poller); poller = null; }
    }
    function listen() {
      if (!db.channel) return poll(true);
      channel = db.channel('signals:' + opts.cohort.id);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'live_signals', filter: 'cohort_id=eq.' + opts.cohort.id }, function () {
        clearTimeout(nudgeTimer); nudgeTimer = setTimeout(refresh, 200);
      });
      poll(true);
      channel.subscribe(function (s) {
        if (s === 'SUBSCRIBED') { poll(false); refresh(); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') poll(true);
      });
    }
    // A page that comes back from the background reads again at once.
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    if (root.matchMedia) {
      var mq = root.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', function () { draw(true); });
    }

    refresh().then(listen);
    return { refresh: refresh, state: function () { return st; } };
  }

  root.LiveSignals = { start: start };
})(typeof globalThis !== 'undefined' ? globalThis : this);
