// Breakouts, in the leader's panel. Meet cannot move anyone, so a room is its
// own call: Launch lends the cohort rooms and tells every panel to go, each
// person presses one button and opens the add-on in their room, and Call
// everyone back tells those panels to return. The leader stays in the main call
// and sees it all here. Breakouts.start({ db, mount, cohort, session, people,
// groups(), presence(), signals, reload() }) returns { draw() }.
(function () {
  var L = window.BreakoutsLib;
  if (!L) return;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  function start(o) {
    var box = o.mount, count = null, minutes = 10, placed = {}, said = '';

    function everyone() { return o.people(); }
    function stable() { return o.groups().filter(function (g) { return !g.breakout && /^https:/.test(g.meet_url || ''); }); }
    function roomsNow() { return o.groups().filter(function (g) { return g.breakout; }).concat(stable()); }

    function plan() {
      var ids = everyone().map(function (p) { return p.id; });
      var n = count || L.roomCount(ids.length);
      var dealt = L.split(ids, n);
      var rooms = dealt.map(function () { return []; });
      dealt.forEach(function (room, i) {
        room.forEach(function (id) {
          var at = placed[id] != null && placed[id] < n ? placed[id] : i;
          rooms[at].push(id);
        });
      });
      return rooms;
    }

    function status(text) { said = text || ''; var s = box.querySelector('[data-breakout-status]'); if (s) s.textContent = said; }

    function launch() {
      var mins = Number(minutes);
      status('Launching…');
      var ready = stable().length ? Promise.resolve({}) : o.db.rpc('launch_breakouts', { session: o.session.id, rooms: plan() });
      Promise.resolve(ready).then(function (r) {
        if (r.error) { status('Not launched: ' + r.error.message); return null; }
        return o.reload().then(function () {
          return o.signals.send('rooms', { ends_at: new Date(Date.now() + mins * 60000).toISOString() }, { textContent: '' });
        }).then(function () { placed = {}; status(''); draw(); });
      });
    }
    function callBack() { o.signals.send('together', {}, { textContent: '' }).then(draw); }
    function more() {
      var st = o.signals.state();
      if (!st.rooms) return;
      var from = Math.max(Date.parse(st.rooms.ends_at) || 0, Date.now());
      o.db.from('live_signals').update({ ends_at: new Date(from + 5 * 60000).toISOString() }).eq('id', st.rooms.id).then(function () { return o.signals.refresh(); }).then(draw);
    }
    function finish() {
      var st = o.signals.state();
      var clearing = st.together ? o.db.from('live_signals').update({ cleared_at: new Date().toISOString() }).eq('id', st.together.id) : Promise.resolve();
      Promise.resolve(clearing).then(function () { return o.db.rpc('end_breakouts', { c: o.cohort.id }); })
        .then(function (r) { if (r && r.error) status('Not ended: ' + r.error.message); return o.reload(); })
        .then(function () { return o.signals.refresh(); }).then(draw);
    }

    function setup() {
      var d = el('details', 'breakouts-setup');
      d.appendChild(el('summary', null, 'Breakouts'));
      var rooms = plan();
      var fixed = stable();
      var row = el('div', 'breakouts-fields');
      if (!fixed.length) {
        var nl = el('label', null, 'Rooms');
        var n = el('input'); n.type = 'number'; n.min = '1'; n.max = '40'; n.value = String(rooms.length);
        n.addEventListener('change', function () { count = Math.max(1, Math.min(40, Number(n.value) || 1)); placed = {}; d.open = true; draw(true); });
        nl.appendChild(n); row.appendChild(nl);
      }
      var ml = el('label', null, 'Minutes');
      var m = el('input'); m.type = 'number'; m.min = '1'; m.max = '120'; m.value = String(minutes);
      m.addEventListener('change', function () { minutes = Math.max(1, Math.min(120, Number(m.value) || 10)); });
      ml.appendChild(m); row.appendChild(ml);
      d.appendChild(row);
      if (fixed.length) {
        var fl = el('ul', 'breakouts-rooms');
        fixed.forEach(function (g) { fl.appendChild(el('li', null, g.name)); });
        d.appendChild(fl);
      } else {
        var list = el('ul', 'breakouts-people');
        rooms.forEach(function (room, i) {
          room.forEach(function (id) {
            var who = everyone().filter(function (p) { return p.id === id; })[0];
            var li = el('li');
            li.appendChild(el('span', null, who ? who.name : 'Someone'));
            var sel = el('select');
            sel.setAttribute('aria-label', 'Room for ' + (who ? who.name : 'this person'));
            rooms.forEach(function (_, k) { sel.appendChild(new Option('Room ' + (k + 1), String(k))); });
            sel.value = String(i);
            sel.addEventListener('change', function () { placed[id] = Number(sel.value); d.open = true; draw(true); });
            li.appendChild(sel);
            list.appendChild(li);
          });
        });
        d.appendChild(list);
      }
      var acts = el('div', 'actions');
      acts.appendChild(button('Launch breakouts', 'btn-primary', launch));
      d.appendChild(acts);
      d.appendChild(statusLine());
      return d;
    }
    function statusLine() { var s = el('p', 'small', said); s.setAttribute('data-breakout-status', ''); s.setAttribute('role', 'status'); return s; }

    function list(presence) {
      var ul = el('ul', 'breakouts-rooms');
      roomsNow().forEach(function (g) {
        var a = L.arrived(g, presence), li = el('li');
        var names = (g.group_members || []).map(function (m) { return o.nameOf(m.user_id); }).join(', ');
        li.appendChild(el('span', 'breakouts-room-name', g.name));
        li.appendChild(el('span', 'small', a.here.length + ' of ' + a.total + ' there'));
        if (names) li.appendChild(el('span', 'small breakouts-names', names));
        if (/^https:/.test(g.meet_url || '')) { var v = el('a', 'btn-secondary small', 'Visit'); v.href = g.meet_url; v.target = '_blank'; v.rel = 'noopener'; li.appendChild(v); }
        ul.appendChild(li);
      });
      return ul;
    }

    function draw(keep) {
      var st = o.signals.state() || {}, presence = o.presence() || {};
      var open = keep === true;
      box.replaceChildren();
      if (st.rooms) {
        box.appendChild(el('h3', null, 'In breakouts'));
        box.appendChild(list(presence));
        var acts = el('div', 'actions');
        acts.appendChild(button('Call everyone back', 'btn-primary', callBack));
        acts.appendChild(button('Add 5 minutes', 'btn-secondary', more));
        box.appendChild(acts);
      } else if (st.together || o.groups().some(function (g) { return g.breakout; })) {
        box.appendChild(el('h3', null, st.together ? 'Coming back' : 'Breakouts are over'));
        var waiting = roomsNow().reduce(function (n, g) { return n + L.arrived(g, presence).here.length; }, 0);
        box.appendChild(el('p', 'small', waiting ? waiting + ' still in a room' : 'No one is in a room'));
        var acts2 = el('div', 'actions');
        acts2.appendChild(button('End breakouts', 'btn-secondary', finish));
        box.appendChild(acts2);
      } else {
        var s = setup();
        s.open = open;
        box.appendChild(s);
      }
    }
    draw();
    return { draw: function () { if (!box.querySelector('select:focus, input:focus')) draw(!!box.querySelector('details[open]')); } };
  }
  window.Breakouts = { start: start };
})();
