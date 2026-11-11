// Open rooms' tools in a cohort's call (ADDON-DESIGN.md, "Open rooms' tools in
// cohort sessions"): Show a website, a clock, Propose and vote, and stances.
// They ride the call's own room (RoomClient, keyed to the Meet code), as in an
// open room, while everything else in the session stays with the cohort. Each
// person's panel sends its own stage what the room shows.
// CohortRoom.start({ code, teaching, name, onChange }) -> { state, send, siteTool, clockTool, voteTool, learnerNow, stanceRow, close }
(function () {
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, fn) { var b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function field(tag, label, value) { var i = el(tag); i.setAttribute('aria-label', label); i.placeholder = label; if (value) i.value = value; return i; }

  function start(o) {
    var R = window.RoomLib, room = null, you = null, started = false;
    var client = window.RoomClient.connect({ code: o.code, role: o.teaching ? 'host' : 'guest', name: o.name || '', on: {
      welcome: function (m) { you = m.you; },
      room: function (r) {
        room = r;
        // A leader's panel opens the call's room as it arrives, so stances
        // count from the start, and takes it back if no host is here.
        if (o.teaching && !r.on && !started) { started = true; client.send({ t: 'start', title: o.title || '' }); }
        if (o.teaching && r.canTakeOver) client.send({ t: 'claim' });
        if (typeof pressStances === 'function') pressStances();
        if (o.onChange) o.onChange();
      }
    } });
    function isHost() { return !!(room && room.on && room.host === you); }
    function send(m) {
      if (o.teaching && (!room || !room.on)) { started = true; client.send({ t: 'start', title: o.title || '' }); }
      client.send(m);
    }
    function showing() { return room && room.on && (room.show === 'page' || room.show === 'board') ? room.show : null; }
    function takeDown() { client.send({ t: 'show', show: 'welcome' }); }

    // Show a website: any link pasted whole, worked out as open rooms do.
    function siteTool(box, done) {
      var line = el('p', 'small'); line.setAttribute('role', 'status');
      var f = el('form', 'open-add'), u = field('input', 'Paste a link'); u.inputMode = 'url'; u.autocomplete = 'off';
      var go = el('button', 'btn-secondary', 'Show'); go.type = 'submit';
      f.appendChild(u); f.appendChild(go);
      function showUrl(href, name) {
        line.textContent = 'Checking that it can be shown…';
        return fetch(window.MEET_ADDON.rooms + '/frame?url=' + encodeURIComponent(href)).then(function (r) { return r.json(); }).then(function (c) {
          if (c.ok) { send({ t: 'site', url: c.url || href, name: name || '' }); line.textContent = 'On everyone’s stage.'; u.value = ''; if (done) done(); return; }
          line.textContent = c.why === 'address' ? 'That address cannot be shown here.'
            : c.why === 'refuses' ? 'That site does not allow itself to be shown inside another page. Share your screen to show it instead.'
            : 'That site did not answer. Check the link and try again.';
        }, function () { line.textContent = 'The check did not answer. Try again in a minute.'; });
      }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var x = R.siteOf(u.value);
        if (!x) { line.textContent = 'That link could not be read. Paste the whole address.'; return; }
        if (x.kind === 'repo' || x.kind === 'user') {
          line.textContent = 'Looking…';
          var path = x.kind === 'repo' ? 'repos/' + x.owner + '/' + x.repo : 'users/' + encodeURIComponent(x.owner) + '/repos?per_page=100&sort=pushed';
          fetch('https://api.github.com/' + path, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
            if (r.status === 404) throw new Error('GitHub cannot find that. It needs to be public.');
            if (!r.ok) throw new Error('GitHub did not answer. Try again in a minute.');
            return r.json();
          }).then(function (info) {
            var list = Array.isArray(info) ? info.filter(function (s) { return s.has_pages && !s.private; }) : [info];
            var site = list.filter(function (s) { return s.has_pages; })[0];
            if (!site) throw new Error(x.kind === 'repo' ? 'That repository has no website yet.' : 'No GitHub Pages sites yet.');
            showUrl(R.pagesUrl({ owner: site.owner.login, repo: site.name, homepage: site.homepage }, x.path), site.name);
          }).catch(function (err) { line.textContent = err.message; });
          return;
        }
        showUrl(x.url, '');
      });
      box.appendChild(f);
      box.appendChild(line);
      if (room && room.on && room.show === 'page' && room.page) {
        var row = el('div', 'actions');
        row.appendChild(el('span', 'small', 'Showing ' + (room.page.name || 'a website')));
        row.appendChild(btn('Take it down', 'btn-secondary small', takeDown));
        box.appendChild(row);
      }
    }

    // A clock: the whole stage when it is clear, a small pill over anything else.
    function clockTool(box) {
      var label = field('input', 'What it is for, optional'); label.maxLength = 80;
      box.appendChild(label);
      var row = el('div', 'open-picks is-row');
      [1, 2, 3, 5, 10].forEach(function (m) {
        row.appendChild(btn(m + ' min', 'btn-secondary', function () { send({ t: 'clock', seconds: m * 60, label: label.value }); }));
      });
      box.appendChild(row);
      if (room && room.clock) box.appendChild(btn('Stop the clock', 'btn-secondary small', function () { send({ t: 'clock', seconds: 0 }); }));
    }

    function noteList(box, host) {
      var ul = el('ul', 'open-notes');
      (room.notes || []).slice().sort(function (a, b) { return b.votes.length - a.votes.length; }).forEach(function (n) {
        var li = el('li');
        li.appendChild(el('span', null, n.text));
        var v = btn(n.votes.length ? String(n.votes.length) : 'Vote', 'open-vote', function () { send({ t: 'vote', id: n.id }); });
        v.setAttribute('aria-pressed', String(n.votes.indexOf(you) >= 0));
        v.setAttribute('aria-label', 'Vote for this. ' + n.votes.length + ' so far.');
        li.appendChild(v);
        if (host || n.by === you) li.appendChild(btn('Remove', 'link-button', function () { send({ t: 'unnote', id: n.id }); }));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    function proposeForm(box) {
      var f = el('form', 'open-add'), i = field('input', 'Propose an idea'); i.maxLength = 280;
      var s = el('button', 'btn-secondary', 'Propose'); s.type = 'submit';
      f.appendChild(i); f.appendChild(s);
      f.addEventListener('submit', function (e) { e.preventDefault(); if (i.value.trim()) send({ t: 'note', text: i.value }); i.value = ''; });
      box.appendChild(f);
    }

    // Propose and vote: the leader's prompt opens it; everyone proposes ideas
    // and votes for the ones they would choose.
    function voteTool(box) {
      var open = room && room.on && room.show === 'board';
      var f = el('form', 'open-add'), p = field('input', 'What should everyone propose?', room && room.board ? room.board : ''); p.maxLength = 500;
      var s = el('button', 'btn-secondary', open ? 'Change the prompt' : 'Open it'); s.type = 'submit';
      f.appendChild(p); f.appendChild(s);
      f.addEventListener('submit', function (e) { e.preventDefault(); if (p.value.trim()) send({ t: 'board', prompt: p.value }); });
      box.appendChild(f);
      if (room && room.board && !open) box.appendChild(btn('Show it again', 'btn-secondary small', function () { send({ t: 'show', show: 'board' }); }));
      if (open) {
        proposeForm(box);
        noteList(box, true);
        var row = el('div', 'actions');
        row.appendChild(btn('Take it off the stage', 'btn-secondary small', takeDown));
        row.appendChild(btn('Clear the ideas', 'link-button', function () { send({ t: 'clear' }); }));
        box.appendChild(row);
      }
    }

    // What a learner does while Propose and vote is open.
    function learnerNow(box) {
      if (!room || !room.on || room.show !== 'board') return false;
      box.appendChild(el('p', 'p2-label', room.board));
      proposeForm(box);
      noteList(box, false);
      return true;
    }

    function stanceRow(box) {
      var R2 = window.ReactLib;
      if (!R2 || !R2.STANCES) return;
      var row = el('div', 'p2-stances');
      R2.STANCES.forEach(function (st) {
        var b = btn(st.label, 'btn-secondary small', function () { mineStance = mineStance === st.id ? null : st.id; send({ t: 'stance', stance: st.id }); pressStances(); });
        b.setAttribute('data-stance-id', st.id);
        row.appendChild(b);
      });
      stanceRows.push(row);
      box.appendChild(row);
      pressStances();
    }
    // Stances are the leader's to open, and each opening starts at zero
    // (Week 2: "Agree 1" stayed on the stage for the whole session).
    function stancesOpen() { return !!(room && room.on && room.stancesOpen); }
    // Which stance this person chose, so their button stays pressed; a new
    // opening starts everyone at none.
    var mineStance = null, stanceRows = [], wasOpen = false;
    function pressStances() {
      var open = stancesOpen();
      if (open !== wasOpen) { mineStance = null; wasOpen = open; }
      stanceRows.forEach(function (r) { r.querySelectorAll('[data-stance-id]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-stance-id') === mineStance)); }); });
    }
    function setStances(open) { send({ t: 'stances', open: !!open }); }

    // What this person's stage shows from the room, or null to show the cohort's own view.
    function view(part) {
      if (!room || !room.on) return null;
      var clockPart = room.clock ? { key: 'clock', name: room.clock.label || '', endsAt: room.clock.endsAt } : null;
      if (room.show === 'page' && room.page && room.page.url) return { mode: 'page', part: clockPart || part, page: { url: room.page.url, v: room.page.v || 0, name: room.page.name || '' }, html: null };
      if (room.show === 'board') return { mode: 'roomboard', part: clockPart || part, prompt: room.board || '', notes: (room.notes || []).map(function (n) { return { id: n.id, text: n.text, name: n.name || '', votes: n.votes.length, mine: n.votes.indexOf(you) >= 0, by: n.by === you }; }), host: isHost() };
      return null;
    }
    function clockPart() { return room && room.on && room.clock ? { key: 'clock', name: room.clock.label || '', endsAt: room.clock.endsAt } : null; }
    function stance() { return stancesOpen() ? Object.assign({ open: true }, room.stance || {}) : null; }

    return { state: function () { return room; }, you: function () { return you; }, send: send, showing: showing, takeDown: takeDown,
      siteTool: siteTool, clockTool: clockTool, voteTool: voteTool, learnerNow: learnerNow, stanceRow: stanceRow, stancesOpen: stancesOpen, setStances: setStances, mineStance: function () { return mineStance; },
      view: view, clockPart: clockPart, stance: stance, close: function () { client.close(); } };
  }
  window.CohortRoom = { start: start };
})();
