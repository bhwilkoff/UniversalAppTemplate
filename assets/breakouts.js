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
    var overTimer = null, workTimer = null;
    var box = o.mount, count = null, minutes = 10, minutesSet = false, placed = {}, said = '';

    function everyone() { return o.people(); }
    function stable() { return o.groups().filter(function (g) { return !g.breakout && /^https:/.test(g.meet_url || ''); }); }
    function roomsNow() { return o.groups().filter(function (g) { return g.breakout; }).concat(stable()); }

    // A breakout part can set the number of rooms, the minutes, and random
    // sorting (o.preset, from the current part). The leader can still change each.
    function preset() { return (o.preset && o.preset()) || {}; }
    function plan() {
      var pre = preset();
      var ids = everyone().map(function (p) { return p.id; });
      if (pre.random) ids = L.shuffle(ids, pre.key || o.session.id);
      // A part's room count never makes empty rooms.
      // A part sets the rooms: as many as its group size needs, or its count,
      // and never an empty room.
      var wanted = pre.size ? Math.ceil(ids.length / pre.size) : pre.groups;
      var n = count || (wanted ? Math.max(1, Math.min(wanted, ids.length || 1)) : Math.min(L.roomCount(ids.length), Math.max(1, ids.length)));
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

    // The rooms last launched in this session, kept in this browser, so the
    // same groups can meet again (Course Builder's Re-run Breakout). Only
    // people still in the call go back; anyone new waits to be placed.
    var LAST = 'hs-breakout-last:' + o.session.id;
    function lastRooms() {
      var kept = null;
      try { kept = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch (e) {}
      if (!Array.isArray(kept) || !kept.length) return null;
      var here = {};
      everyone().forEach(function (p) { here[p.id] = true; });
      var rooms = kept.map(function (r) { return (Array.isArray(r) ? r : []).filter(function (id) { return here[id]; }); }).filter(function (r) { return r.length; });
      return rooms.length ? rooms : null;
    }
    // The cohort's own groups, named once and kept on the cohort.
    function saved() {
      var kept = Array.isArray(o.cohort.groups) ? o.cohort.groups.filter(function (g) { return g && Array.isArray(g.members) && g.members.length; }) : [];
      return kept.length ? kept : L.standingGroups(o.groups ? o.groups() : []);
    }
    function launch(again, given) {
      var mins = Number(minutesSet ? minutes : preset().minutes || minutes);
      var rooms = given ? given.rooms : again === true ? lastRooms() : plan();
      if (!rooms || !rooms.length) { status('No rooms from earlier in this session.'); return; }
      status('Launching…');
      if (!stable().length) { try { localStorage.setItem(LAST, JSON.stringify(rooms)); } catch (e) {} }
      var args = { session: o.session.id, rooms: rooms };
      if (given && given.names) args.names = given.names;
      var ready = stable().length ? Promise.resolve({}) : o.db.rpc('launch_breakouts', args);
      Promise.resolve(ready).then(function (r) {
        if (r.error) { status('Not launched: ' + r.error.message); return null; }
        return o.reload().then(function () {
          return o.signals.send('rooms', { ends_at: new Date(Date.now() + mins * 60000).toISOString() }, { textContent: '' });
        }).then(function () { placed = {}; status(''); draw(); });
      });
    }
    // Call everyone back gives the rooms thirty seconds to finish (Meet's own
    // breakouts do the same): the rooms' clock moves to thirty seconds from
    // now, and when it reaches zero every room's panel says come back.
    function callBack() {
      var st = o.signals.state();
      if (!st.rooms) return;
      var left = (Date.parse(st.rooms.ends_at) || Infinity) - Date.now();
      if (left <= 31000) { o.signals.send('together', {}, { textContent: '' }).then(draw); return; }
      o.db.from('live_signals').update({ ends_at: new Date(Date.now() + 30000).toISOString() }).eq('id', st.rooms.id)
        .then(function () { return o.signals.refresh(); }).then(draw);
    }
    function sendNote(text, said) {
      var body = String(text || '').replace(/\s+/g, ' ').trim();
      if (!body) { said.textContent = 'Write the message first.'; return Promise.resolve(false); }
      if (body.length > 200) { said.textContent = 'At most 200 characters.'; return Promise.resolve(false); }
      return o.db.from('live_signals').insert({ cohort_id: o.cohort.id, session_id: o.session.id, created_by: o.meId, kind: 'note', body: body })
        .then(function (r) { said.textContent = r.error ? 'Not sent: ' + r.error.message : ''; return o.signals.refresh().then(function () { return !r.error; }); });
    }
    // Each room's group workbook so far, read at most every fifteen seconds.
    var work = {}, workAt = 0;
    function readWork() {
      var ids = o.groups().filter(function (g) { return g.breakout; }).map(function (g) { return g.id; });
      if (!ids.length || Date.now() - workAt < 10000) return;
      workAt = Date.now();
      o.db.from('workbook_answers').select('group_id, value, updated_at').in('group_id', ids).then(function (r) {
        if (r.error) return;
        var next = {};
        (r.data || []).forEach(function (a) {
          if (a.value == null || String(typeof a.value === 'string' ? a.value : JSON.stringify(a.value)).replace(/[\s"\[\]{}]/g, '') === '') return;
          var w = next[a.group_id] || (next[a.group_id] = { n: 0, at: 0 });
          w.n++; w.at = Math.max(w.at, Date.parse(a.updated_at) || 0);
        });
        var changed = JSON.stringify(next) !== JSON.stringify(work);
        work = next;
        if (changed && !box.querySelector("input:focus, select:focus")) draw();
      });
    }
    function helpFor(g) {
      var ids = (g.group_members || []).map(function (m) { return m.user_id; });
      return (o.requests ? o.requests() : []).filter(function (r) { return r.kind === 'help' && r.state === 'waiting' && (ids.indexOf(r.user_id) >= 0 || r.body === g.name); })[0] || null;
    }
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
      var m = el('input'); m.type = 'number'; m.min = '1'; m.max = '120'; m.value = String(minutesSet ? minutes : preset().minutes || minutes);
      m.addEventListener('change', function () { minutesSet = true; minutes = Math.max(1, Math.min(120, Number(m.value) || 10)); });
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
      acts.appendChild(button('Launch breakouts', 'btn-primary', function () { launch(false); }));
      if (!fixed.length && saved().length) acts.appendChild(button('Launch the cohort’s groups', 'btn-secondary', function () {
        launch(false, L.fromGroups(saved(), everyone().map(function (p) { return p.id; })));
      }));
      if (!stable().length && lastRooms()) acts.appendChild(button('Same rooms as last time', 'btn-secondary', function () { launch(true); }));
      acts.appendChild(button('Practice with pretend learners', 'btn-secondary', startPractice));
      d.appendChild(acts);
      if (!fixed.length) d.appendChild(keepForm(rooms, d));
      d.appendChild(statusLine());
      return d;
    }
    // These rooms, kept as the cohort's groups, each with a name, so the
    // same people can build together week to week.
    function keepForm(rooms, d) {
      var wrap = el('details', 'breakouts-keep');
      wrap.appendChild(el('summary', null, saved().length ? 'Change the cohort’s groups' : 'Keep these rooms as the cohort’s groups'));
      var f = el('form', 'cohort-form');
      var inputs = rooms.map(function (room, i) {
        var lab = el('label', null, 'Room ' + (i + 1) + ': ' + room.map(function (id) { var w = everyone().filter(function (p) { return p.id === id; })[0]; return w ? w.name : 'Someone'; }).join(', '));
        var inp = el('input'); inp.type = 'text'; inp.maxLength = 60;
        var old = saved()[i]; inp.value = old && old.name ? old.name : 'Group ' + (i + 1);
        lab.appendChild(inp); f.appendChild(lab);
        return inp;
      });
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var ok = el('button', 'btn-secondary small', 'Keep these groups'); ok.type = 'submit';
      acts.appendChild(ok); acts.appendChild(said); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var groups = L.toGroups(rooms, inputs.map(function (i) { return i.value; }));
        said.textContent = 'Saving…';
        o.db.from('cohorts').update({ groups: groups }).eq('id', o.cohort.id).select('groups').single().then(function (r) {
          if (r.error) { said.textContent = 'Not kept: ' + r.error.message; return; }
          o.cohort.groups = r.data.groups;
          d.open = true; draw(true);
        });
      });
      wrap.appendChild(f);
      return wrap;
    }

    function ago(t) {
      var s = Math.max(0, Math.round((Date.now() - t) / 1000));
      return s < 60 ? 'just now' : Math.round(s / 60) + (Math.round(s / 60) === 1 ? ' minute ago' : ' minutes ago');
    }
    // A message every room's panel shows while the rooms run.
    function noteForm(note) {
      var f = el('form', 'cohort-form breakouts-note');
      var lab = el('label', null, 'Message every room');
      var inp = el('input'); inp.type = 'text'; inp.maxLength = 200;
      lab.appendChild(inp); f.appendChild(lab);
      var acts = el('div', 'actions'), said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var go = el('button', 'btn-secondary small', 'Send to every room'); go.type = 'submit';
      acts.appendChild(go); acts.appendChild(said); f.appendChild(acts);
      if (note) f.appendChild(el('p', 'small', 'Every room sees: \u201c' + note.body + '\u201d'));
      f.addEventListener('submit', function (ev) {
        ev.preventDefault(); go.disabled = true;
        sendNote(inp.value, said).then(function (ok) { go.disabled = false; if (ok) { inp.value = ''; draw(); } });
      });
      return f;
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
        var w = work[g.id];
        if (g.breakout) li.appendChild(el('span', 'small', w ? w.n + (w.n === 1 ? ' answer' : ' answers') + ' in their workbook, last saved ' + ago(w.at) : 'Nothing saved in their workbook yet'));
        var h = helpFor(g);
        if (h) { li.classList.add('is-asking'); li.appendChild(el('strong', 'breakouts-help', o.nameOf(h.user_id) + ' asks you to come')); }
        if (/^https:/.test(g.meet_url || '')) { var v = el('a', 'btn-secondary small', 'Visit'); v.href = g.meet_url; v.target = '_blank'; v.rel = 'noopener'; li.appendChild(v); }
        ul.appendChild(li);
      });
      return ul;
    }

    // Practice with pretend learners (Hudek's practice mode): the whole
    // In breakouts view, drawn from rooms that exist only in this panel, so a
    // leader can rehearse launching, a help request, a message, and the call
    // back alone. Nothing is written and no one else sees it.
    var practice = null, practiceTimer = null;
    function startPractice() {
      var names = ['Ada', 'Bea', 'Cal', 'Dev', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'];
      practice = { ends: Date.now() + 3 * 60000, note: null, help: null, work: {}, rooms: [0, 1, 2].map(function (i) {
        return { id: 'practice-' + i, name: 'Room ' + (i + 1), people: names.slice(i * 3, i * 3 + 3).map(function (n) { return n + ' (pretend)'; }) };
      }) };
      clearInterval(practiceTimer);
      practiceTimer = setInterval(function () {
        if (!practice) { clearInterval(practiceTimer); return; }
        var r = practice.rooms[Math.floor(Math.random() * 3)];
        practice.work[r.id] = (practice.work[r.id] || 0) + 1;
        if (!practice.help && Date.now() > practice.ends - 2.5 * 60000) practice.help = practice.rooms[1].people[0];
        if (!box.querySelector('input:focus')) draw();
      }, 8000);
      draw();
    }
    function drawPractice() {
      var left = practice.ends - Date.now(), over = left <= 0;
      box.appendChild(el('h3', null, over ? 'Practice: coming back' : 'Practice: in breakouts'));
      box.appendChild(el('p', 'small', 'Pretend learners, in this panel only. No one else sees this.'));
      box.appendChild(el('p', 'small', over ? 'Time is up: every room’s panel would say come back now.' : Math.ceil(left / 1000) + ' seconds left in the rooms'));
      var ul = el('ul', 'breakouts-rooms');
      practice.rooms.forEach(function (r) {
        var li = el('li');
        li.appendChild(el('span', 'breakouts-room-name', r.name));
        li.appendChild(el('span', 'small', '3 of 3 there'));
        li.appendChild(el('span', 'small breakouts-names', r.people.join(', ')));
        var n = practice.work[r.id] || 0;
        li.appendChild(el('span', 'small', n ? n + (n === 1 ? ' answer' : ' answers') + ' in their workbook' : 'Nothing saved in their workbook yet'));
        if (practice.help && r.people.indexOf(practice.help) >= 0) {
          li.classList.add('is-asking');
          li.appendChild(el('strong', 'breakouts-help', practice.help + ' asks you to come'));
          li.appendChild(button('Done', 'btn-secondary small', function () { practice.help = 'answered'; draw(); }));
        }
        ul.appendChild(li);
      });
      box.appendChild(ul);
      var acts = el('div', 'actions');
      if (!over) {
        acts.appendChild(button(left <= 31000 ? 'Call everyone back now' : 'Call everyone back', 'btn-primary', function () { practice.ends = left <= 31000 ? Date.now() : Date.now() + 30000; draw(); }));
        acts.appendChild(button('Add 5 minutes', 'btn-secondary', function () { practice.ends += 5 * 60000; draw(); }));
      }
      acts.appendChild(button('End practice', 'btn-secondary', function () { practice = null; clearInterval(practiceTimer); draw(true); }));
      box.appendChild(acts);
      if (!over) {
        var f = el('form', 'cohort-form breakouts-note');
        var lab = el('label', null, 'Message every room'), inp = el('input'); inp.type = 'text'; inp.maxLength = 200;
        lab.appendChild(inp); f.appendChild(lab);
        var go = el('button', 'btn-secondary small', 'Send to every room'); go.type = 'submit';
        f.appendChild(el('div', 'actions')).appendChild(go);
        if (practice.note) f.appendChild(el('p', 'small', 'Every room would see: \u201c' + practice.note + '\u201d'));
        f.addEventListener('submit', function (ev) { ev.preventDefault(); var t = inp.value.replace(/\s+/g, ' ').trim(); if (t) { practice.note = t.slice(0, 200); draw(); } });
        box.appendChild(f);
      }
    }

    function draw(keep) {
      var st = o.signals.state() || {}, presence = o.presence() || {};
      var open = keep === true;
      box.replaceChildren();
      if (practice && !st.rooms && !st.together) { drawPractice(); return; }
      var over = st.rooms && st.rooms.ends_at && Date.parse(st.rooms.ends_at) <= Date.now();
      if (over) clearTimeout(overTimer);
      else if (st.rooms && st.rooms.ends_at) { clearTimeout(overTimer); overTimer = setTimeout(function () { draw(); }, Math.max(1000, Date.parse(st.rooms.ends_at) - Date.now() + 500)); }
      if (st.rooms && !over) {
        box.appendChild(el('h3', null, 'In breakouts'));
        box.appendChild(list(presence));
        var acts = el('div', 'actions');
        var leftMs = (Date.parse(st.rooms.ends_at) || Infinity) - Date.now();
        if (leftMs <= 31000 && leftMs > 0) box.appendChild(el('p', 'small', 'Everyone comes back when the rooms’ clock reaches zero.'));
        acts.appendChild(button(leftMs <= 31000 ? 'Call everyone back now' : 'Call everyone back', 'btn-primary', callBack));
        acts.appendChild(button('Add 5 minutes', 'btn-secondary', more));
        box.appendChild(acts);
        box.appendChild(noteForm(st.note));
        readWork();
        // Nothing tells this panel when a room saves, so it reads again while
        // the rooms run (found in the breakout test: the count never moved).
        if (!workTimer) workTimer = setInterval(function () { if (o.signals.state().rooms) readWork(); else { clearInterval(workTimer); workTimer = null; } }, 15000);
      } else if (over || st.together || o.groups().some(function (g) { return g.breakout; })) {
        box.appendChild(el('h3', null, over || st.together ? 'Coming back' : 'Breakouts are over'));
        if (over || st.together) box.appendChild(list(presence));
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
