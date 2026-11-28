// An open room's side panel (ADDON-DESIGN.md, "Open rooms"): any Meet call that
// is not a cohort's. OpenRoom.mount({ root, code, side, name, member, signIn })
// draws into [data-state="open"]. The room itself lives in tools/rooms; what
// stays here is the host's own talk, notes, and repository, in this browser.
(function () {
  var R = window.RoomLib, SL = window.SlidesLib, L = window.LiveLib, RX = window.ReactLib, A = window.AddonLib;
  var TALK = 'hs-room-talk', REPO = 'hs-room-repo', EDIT = 'hs-room-edit', GH = 'hs-room-github', DRIVE = 'hs-room-drive', PLAN = 'hs-room-plan';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(label, cls, fn) { var b = el('button', cls || 'btn-secondary', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function out(label, href, cls) { var a = el('a', cls || '', label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function field(tag, label, value) { var n = el(tag); n.setAttribute('aria-label', label); n.placeholder = label; if (value != null) n.value = value; return n; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function icon(name) { return '<svg aria-hidden="true" focusable="false"><use href="/assets/icons.svg?v=20261022j#' + name + '"/></svg>'; }

  function mount(o) {
    var box = o.root.querySelector('[data-state="open"]');
    var room = null, you = null, F = null, frameRole = null, online = true, ended = false, stageOn = false;
    var words = null, works = null, myWork = null, wbMine = null, wbSaved = null, rankDraft = null, lastWb = null, mine = null, tool = null, newSha = null, confirmEnd = false, watching = false;
    var plan = (function () { try { var x = JSON.parse(get(PLAN) || 'null'); return x && Array.isArray(x.parts) && x.parts.length ? x : null; } catch (e) { return null; } })();
    var talk = get(TALK) || R.STARTER, repo = R.repoOf(get(REPO) || ''), lobby = null, person = { name: o.name, member: o.member, github: o.github || '' };
    var status = el('p', 'small'); status.setAttribute('role', 'status');
    var name = o.name || window.RoomClient.savedName();

    var wait = el('p', 'small open-wait', 'Opening the room…');
    box.replaceChildren(wait);
    var client = window.RoomClient.connect({ code: o.code, role: 'panel', name: name, on: {
      welcome: function (m) { you = m.you; mine = m.mine; },
      room: function (r) { room = r; if (r.on) ended = false; draw(); },
      words: function (w) { words = w; drawNow(); },
      works: function (w) { works = w; drawNow(); },
      myWork: function (u) { myWork = u; drawNow(); },
      wbMine: function (m) { wbMine = m; if (room && room.workbook && room.workbook.id === m.id) lastWb = { w: room.workbook, a: m.a }; drawNow(); },
      wbAll: function (all) { keepAnswers(all); },
      talk: function (t) { roomDeck = t; drawNow(); drawTop(); drawSlides(); },
      mine: function (m) { mine = m; drawNow(); },
      ended: function () { ended = true; roomDeck = null; mine = null; words = null; works = null; myWork = null; wbMine = null; tool = null; },
      error: function (t) { say(t); },
      status: function (s) {
        online = s === 'on'; drawTop();
        if (!room) wait.textContent = online ? 'Opening the room…' : 'The room cannot be reached right now. Still trying.';
      }
    } });
    function send(m) { client.send(m); }
    function say(t) { status.textContent = t || ''; }
    function isHost() { return !!room && room.on && room.host === you; }

    // The room's own slides decide where Next goes, so a host who took over
    // moves through the slides everyone sees; notes show only for one's own.
    var roomDeck = null;
    function shown() { return roomDeck != null ? R.deckBody(roomDeck) : talk; }
    function stops() { return R.stops(SL.frames(shown())); }
    function mineOnStage() { return roomDeck == null || roomDeck === deck(); }
    // This person's own stage is open, or Meet has just said it is opening.
    function stageUp() { return stageOn || (!!room && (room.stages || []).indexOf(you) >= 0); }
    function deck() { return SL.deck(SL.withoutNotes(talk)); }
    function sendTalk(show) { send({ t: 'talk', text: deck(), title: R.titleOf(talk), show: !!show, at: 0, shown: 0 }); }

    function openStage() {
      if (!o.side) return say('Open this in Google Meet to use the main stage.');
      say('');
      Promise.resolve(o.side.startActivity({ mainStageUrl: location.origin + '/addon/stage/?room=' + o.code, sidePanelUrl: location.origin + '/addon/' })).then(function () {
        stageOn = true; drawTop();
        setTimeout(function () { stageOn = false; drawTop(); }, 15000);
      }, function (err) { say(A.stageError(err)); });
    }
    function startRoom() {
      if (lobby && lobby.input.value.trim() !== client.name()) client.setName(lobby.input.value);
      send({ t: 'start', title: R.titleOf(talk) });
      sendTalk(false);
      if (!stageUp()) openStage();
    }

    // --------------------------------------------------------------
    // The frame
    // --------------------------------------------------------------

    function draw() {
      if (!room) return;
      var role = !room.on ? 'lobby' : isHost() ? 'host' : 'guest';
      if (role !== frameRole) build(role);
      if (role === 'lobby') return;
      drawTop(); drawNow();
      if (role === 'host') drawSlides();
      if (F.current() === 'people') drawPeople();
      watch();
    }
    function build(role) {
      frameRole = role;
      if (F) { F.el.remove(); F = null; }
      box.replaceChildren();
      tool = null;
      if (role === 'lobby') return buildLobby();
      F = window.PanelFrame.mount({ root: o.root, into: box, teaching: role === 'host', tabs: role === 'host' ? [['now', 'Now'], ['slides', 'Slides'], ['kit', 'Tools'], ['people', 'People']] : [['now', 'Now'], ['yours', 'Yours']] });
      F.on(next, back);
      if (role === 'host') { drawSlides(); drawTools(); peopleTab(); }
      else { buildYours(); buildReactions(); }
    }
    function peopleTab() {
      var t = F.el.querySelectorAll('.p2-tab')[3];
      t.addEventListener('click', drawPeople);
    }
    function drawTop() {
      if (!F || !room || !room.on) return;
      var host = isHost(), left = room.clock ? A.timeLeft(room.clock.endsAt, Date.now()) : null;
      var on = stageUp(), step = host ? R.nextStep(room, { stageOn: on, stops: stops() }) : null;
      var chips = [];
      if (host) chips.push({ text: on ? 'Stage on' : 'Stage off', on: on });
      chips.push({ text: R.here(room.here), on: false });
      if (!online) chips.push({ text: 'Reconnecting', on: false });
      F.draw({
        title: room.title || 'Your session', time: left == null ? '' : left ? L.clock(left) : 'Time is up', over: left === 0, chips: chips,
        next: step ? { label: step.label, disabled: !!step.disabled } : null,
        canBack: host && room.show === 'slides' && R.stopAt(stops(), room.at, room.shown) > 0
      });
    }
    setInterval(function () { if (room && room.clock) drawTop(); }, 1000);

    function next() {
      var step = R.nextStep(room, { stageOn: stageUp(), stops: stops() });
      if (step.act === 'stage') return openStage();
      if (step.act === 'close') return send({ t: 'close' });
      if (step.act === 'talk') return F.show('slides');
      if (step.act === 'slides') {
        // Starting fresh lands on the first stop, so a slide that builds starts
        // with its first point rather than whole (found with a kinetic slide).
        var first = stops()[0], fresh = !(room.at > 0 || room.shown);
        if (fresh && first && first.shown) return send({ t: 'go', at: first.slide, shown: first.shown });
        return send({ t: 'show', show: 'slides' });
      }
      if (step.act === 'next') send({ t: 'go', at: step.to.slide, shown: step.to.shown });
    }
    function back() {
      var list = stops(), i = R.stopAt(list, room.at, room.shown);
      if (i > 0) send({ t: 'go', at: list[i - 1].slide, shown: list[i - 1].shown });
    }

    // --------------------------------------------------------------
    // Before anyone has started
    // --------------------------------------------------------------

    function buildLobby() {
      var s = el('div', 'open-lobby');
      s.innerHTML = '<p class="addon-mark"><span class="visually-hidden">Human Shaped</span><span class="w" aria-hidden="true">human</span><svg class="arch" aria-hidden="true" focusable="false"><use href="/assets/logo.svg#arch"/></svg><span class="w" aria-hidden="true">shaped</span></p>';
      s.appendChild(el('h1', null, ended ? 'That session has ended.' : 'Teach this call together.'));
      if (ended && lastWb) closedWorkbook(s, lastWb.w, lastWb.a);
      s.appendChild(el('p', 'small', 'Slides, questions, a vote on ideas, and websites you build, for everyone here.'));
      var input = field('input', 'Your name', client.name());
      input.maxLength = 60; input.autocomplete = 'name';
      s.appendChild(input);
      s.appendChild(btn('Start a session', 'btn-primary', startRoom));
      s.appendChild(el('p', 'small', 'Free, with no account. The room is erased when the call ends.'));
      s.appendChild(status);
      if (leads.length && o.runSession) s.appendChild(runPick());
      s.appendChild(links());
      box.appendChild(s);
      lobby = { input: input };
    }
    // A leader of a cohort makes this call that cohort's, running any of its
    // sessions again for someone who missed it (call_runs).
    var leads = [];
    function runPick() {
      var wrap = el('div', 'open-runs');
      var list = el('div', 'open-run-list'); list.hidden = true;
      var said = el('p', 'small'); said.setAttribute('role', 'status');
      var open = btn('Run a cohort session', 'btn-secondary', function () { list.hidden = !list.hidden; open.setAttribute('aria-expanded', String(!list.hidden)); });
      open.setAttribute('aria-expanded', 'false');
      leads.forEach(function (c) {
        var g = el('div', 'open-run-cohort');
        if (leads.length > 1) g.appendChild(el('p', 'open-label', c.title));
        var ul = el('ul', 'open-run-sessions');
        c.sessions.forEach(function (x) {
          var li = el('li');
          li.appendChild(btn(x.label, 'p2-run-row', function () {
            said.textContent = 'Opening ' + x.label + '…';
            o.runSession(x.id, function (m) { said.textContent = m; });
          }));
          ul.appendChild(li);
        });
        g.appendChild(ul);
        list.appendChild(g);
      });
      wrap.appendChild(open); wrap.appendChild(list); wrap.appendChild(said);
      return wrap;
    }
    function links() {
      var p = el('p', 'open-links small');
      p.appendChild(out('Learn to build this way', '/cohorts/'));
      if (person.member) p.appendChild(out('Your cohorts', '/'));
      else if (o.signIn) { var b = btn('Sign in', 'link-button', o.signIn); p.appendChild(b); }
      return p;
    }

    // --------------------------------------------------------------
    // Now
    // --------------------------------------------------------------

    var nowKey = null;
    function drawNow() {
      if (!F || !room || !room.on) return;
      var host = isHost();
      var key = JSON.stringify([plan && plan.at, plan && plan.parts.length, host, room.show, room.at, room.shown, room.question, room.summary, room.notes, room.board, editing(), room.page, room.card, room.clock && room.clock.endsAt, room.canTakeOver, room.worksOpen, room.groups, room.people, room.workbook && room.workbook.id, room.workbook && room.workbook.open, room.wbCount, wbMine, wbSaved, works, myWork, mine, words, newSha, talk.length, roomDeck && roomDeck.length, stageUp()]);
      if (key === nowKey) return;
      var pane = F.pane('now');
      // A half-written note or answer stays while the room changes around it.
      var active = document.activeElement;
      if (active && pane.contains(active) && /^(INPUT|TEXTAREA)$/.test(active.tagName) && active.value) return;
      nowKey = key;
      pane.replaceChildren();
      if (host) hostNow(pane); else guestNow(pane);
      pane.appendChild(status);
    }
    function bars(pane) {
      var q = room.question, r = L.results({ kind: q.kind, choices: q.choices, points: q.points }, room.summary || {});
      var list = el('ul', 'open-bars');
      r.rows.forEach(function (x) {
        var li = el('li');
        li.appendChild(el('span', 'open-bar-label', x.label));
        li.appendChild(el('span', 'open-bar-n', x.text));
        var b = el('span', 'open-bar'); b.style.setProperty('--share', x.share + '%');
        li.appendChild(b); list.appendChild(li);
      });
      if (r.rows.length) pane.appendChild(list);
      pane.appendChild(el('p', 'small', L.counted(r.total, 'answer', 'answers') + ', with no names.'));
    }
    // A session from the host's Drive, run part by part (SessionPlan).
    var KIND_WORD = { talk: 'Slides', question: 'Question', model: 'Model', site: 'Website', card: 'Card', clock: 'Clock', workbook: 'Workbook' };
    function runPart(i) {
      var P = window.SessionPlan, part = plan && plan.parts[i];
      if (!P || !part) return;
      plan.at = i; put(PLAN, JSON.stringify(plan));
      if (part.kind === 'talk') { talk = part.slides; put(TALK, talk); slidesKey = null; sendTalk(true); }
      else P.messages(part).forEach(send);
      nowKey = null; drawNow();
    }
    function planNow(pane) {
      var box = el('section', 'p2-group open-plan');
      box.appendChild(el('h2', null, plan.title || 'Your session'));
      var ol = el('ol', 'open-plan-parts');
      plan.parts.forEach(function (p, i) {
        var li = el('li'), b = el('button', 'open-plan-part'); b.type = 'button';
        if (i === plan.at) b.setAttribute('aria-current', 'step');
        b.appendChild(el('span', 'open-plan-kind', KIND_WORD[p.kind] || p.kind));
        b.appendChild(el('span', 'open-plan-title', p.title));
        b.addEventListener('click', function () { runPart(i); });
        li.appendChild(b); ol.appendChild(li);
      });
      box.appendChild(ol);
      var next = plan.at == null ? 0 : plan.at + 1;
      if (next < plan.parts.length) box.appendChild(btn('Next: ' + plan.parts[next].title, 'btn-primary', function () { runPart(next); }));
      box.appendChild(btn('Put the session away', 'link-button', function () { plan = null; put(PLAN, ''); nowKey = null; drawNow(); }));
      pane.appendChild(box);
    }
    // Show your work: the offers, by name, each one a button that puts it on
    // the stage (room-logic.js 'works', 'work', 'feature').
    function worksNow(pane) {
      var box = el('section', 'p2-group open-works');
      box.appendChild(el('h2', null, 'Work to show'));
      var list = Array.isArray(works) ? works : [];
      if (!list.length) box.appendChild(el('p', 'small', 'No one has offered yet.'));
      var ul = el('ul', 'open-notes');
      list.forEach(function (w) {
        var li = el('li'), on = room.show === 'page' && room.page && room.page.url === w.url && room.page.name === (w.name ? w.name + '’s work' : 'Someone’s work');
        var who = el('span'); who.appendChild(el('strong', null, w.name || 'Someone'));
        who.appendChild(el('span', 'small open-work-url', ' ' + w.url.replace(/^https:\/\//, '')));
        li.appendChild(who);
        var b = btn(on ? 'On the stage' : 'Show', 'btn-secondary small', function () {
          canFrame(w.url).then(function (c) { if (c.ok) send({ t: 'feature', id: w.id }); else say(c.text); });
        });
        b.setAttribute('aria-pressed', String(!!on));
        li.appendChild(b); ul.appendChild(li);
      });
      if (list.length) box.appendChild(ul);
      box.appendChild(btn('Stop asking', 'link-button', function () { send({ t: 'works', open: false }); }));
      pane.appendChild(box);
    }
    function offerWork(pane) {
      var box = el('section', 'p2-group open-works');
      box.appendChild(el('h2', null, 'Show your work'));
      var f = el('form', 'open-add'), i = field('input', 'Its address', myWork || '');
      i.type = 'url'; i.placeholder = 'https://'; i.maxLength = 2000;
      f.appendChild(i);
      var s = el('button', 'btn-secondary', myWork ? 'Change it' : 'Offer it'); s.type = 'submit'; f.appendChild(s);
      var said = el('p', 'small'); said.setAttribute('role', 'status');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var href = i.value.trim();
        if (!href) return;
        said.textContent = 'Checking that it can be shown…';
        canFrame(href).then(function (c) {
          if (!c.ok) return (said.textContent = c.text);
          said.textContent = ''; send({ t: 'work', url: c.url || href }); i.blur();
        });
      });
      box.appendChild(f);
      box.appendChild(said);
      if (myWork) {
        box.appendChild(el('p', 'small', 'Offered. The host chooses what goes on the stage.'));
        box.appendChild(btn('Take it back', 'link-button', function () { send({ t: 'work', url: '' }); }));
      }
      pane.appendChild(box);
    }
    // Breakout rooms (room-logic.js 'groups'): who is in which Meet call.
    function personName(id) { var p = (room.people || []).filter(function (x) { return x.id === id; })[0]; return (p && p.name) || 'Someone'; }
    function groupsNow(pane, host) {
      var box = el('section', 'p2-group open-groups');
      var mineAt = -1;
      room.groups.forEach(function (g, i) { if (g.members.indexOf(you) >= 0) mineAt = i; });
      box.appendChild(el('h2', null, host ? 'Breakout rooms' : mineAt >= 0 ? 'Your room' : 'Choose a room'));
      if (!host) box.appendChild(el('p', 'small', 'Leave this call, then join your room.'));
      var ol = el('ol', 'open-group-list');
      room.groups.forEach(function (g, i) {
        if (!host && mineAt >= 0 && i !== mineAt) return;
        var li = el('li');
        li.appendChild(el('strong', null, 'Room ' + (i + 1)));
        var names = g.members.filter(function (id) { return id !== you; }).map(personName);
        li.appendChild(el('span', 'small', names.length ? (host ? '' : 'With ') + names.join(', ') : !host && i === mineAt ? 'Just you' : 'No one yet'));
        li.appendChild(out(host ? 'Visit' : 'Join room ' + (i + 1), g.link, host ? 'btn-secondary small' : 'btn-primary'));
        ol.appendChild(li);
      });
      box.appendChild(ol);
      if (host) box.appendChild(btn('Bring everyone back', 'btn-secondary', function () { send({ t: 'groups', open: false }); }));
      pane.appendChild(box);
    }
    // A workbook (room-logic.js 'workbook'): each person answers in their own
    // panel; the host sees how many have, and keeps everyone's answers in
    // their own Drive as a CSV.
    function workbookHost(pane) {
      var w = room.workbook, box = el('section', 'p2-group open-workbook');
      box.appendChild(el('h2', null, w.title));
      box.appendChild(el('p', 'small', L.counted(room.wbCount || 0, 'person has answered', 'people have answered') + (w.open ? '' : '. Closed.')));
      box.appendChild(btn('Save everyone’s answers to my Drive', 'btn-secondary', function () { say('Collecting the answers…'); send({ t: 'wbCollect' }); }));
      if (wbSaved && wbSaved.id === w.id) box.appendChild(out('Open the answers in Drive', 'https://drive.google.com/file/d/' + wbSaved.file + '/view', 'link-button'));
      box.appendChild(btn(w.open ? 'Close it' : 'Open it again', 'link-button', function () { send(w.open ? { t: 'workbook', close: true } : { t: 'workbook', open: true }); }));
      pane.appendChild(box);
    }
    function keepAnswers(all) {
      var P = window.SessionPlan, D = window.MyDrive;
      if (!P || !D) return say('Drive is not available here.');
      var csv = P.answersCsv(all), name = all.title + ' answers ' + new Date().toISOString().slice(0, 10) + '.csv';
      D.connect().then(function (token) { return D.file(token, name, csv, 'text/csv'); }).then(function (file) {
        wbSaved = { id: all.id, file: file }; say('Saved in your Drive: ' + L.counted(all.people.length, 'person', 'people') + '.'); nowKey = null; drawNow(); if (F && F.current() === 'people') drawPeople();
      }, function (e) { say(e.message); });
    }
    function workbookGuest(pane) {
      var w = room.workbook, a = (wbMine && wbMine.id === w.id && wbMine.a) || {};
      var box = el('section', 'p2-group open-workbook');
      box.appendChild(el('h2', null, w.title));
      function save(key, value) { send({ t: 'wbAnswer', id: w.id, key: key, value: value }); }
      w.blocks.forEach(function (b) {
        var part = el('div', 'open-wb-block');
        if (b.type === 'text') { part.appendChild(el('p', 'open-wb-words', b.text)); box.appendChild(part); return; }
        part.appendChild(el('p', 'open-wb-q', b.text));
        if (b.type === 'free') {
          var t = field('textarea', 'Your answer', a[b.key] || ''); t.rows = 3; t.maxLength = 4000;
          var timer = null;
          t.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { save(b.key, t.value); }, 800); });
          t.addEventListener('change', function () { clearTimeout(timer); save(b.key, t.value); });
          part.appendChild(t);
        }
        if (b.type === 'choice') {
          var picks = a[b.key] || [], row = el('div', 'open-picks');
          b.choices.forEach(function (c, i) {
            var on = picks.indexOf(i) >= 0;
            var x = btn(c, 'btn-secondary', function () { save(b.key, b.multiple ? (on ? picks.filter(function (n) { return n !== i; }) : picks.concat([i])) : [i]); });
            x.setAttribute('aria-pressed', String(on)); row.appendChild(x);
          });
          part.appendChild(row);
        }
        if (b.type === 'table') {
          var mine = Object.assign({}, a[b.key] || {}), table = el('table', 'open-wb-table');
          b.rows.forEach(function (r, i) {
            var tr = el('tr');
            r.forEach(function (c, j) {
              var td = el('td');
              if (!c.fill) td.textContent = c.text;
              else {
                var head = [r[0] && !r[0].fill ? r[0].text : '', b.rows[0] && b.rows[0][j] && !b.rows[0][j].fill ? b.rows[0][j].text : ''].filter(Boolean).join(', ');
                var k = i + ',' + j, inp = field('input', head || 'Row ' + (i + 1) + ', column ' + (j + 1), mine[k] || ''); inp.maxLength = 500;
                inp.addEventListener('change', function () { mine[k] = inp.value; save(b.key, mine); });
                td.appendChild(inp);
              }
              tr.appendChild(td);
            });
            table.appendChild(tr);
          });
          part.appendChild(table);
        }
        box.appendChild(part);
      });
      box.appendChild(btn('Keep a copy', 'btn-secondary', function () { keepCopy(w, a); }));
      pane.appendChild(box);
    }
    // Meet's panel frame cannot download, so the copy opens in its own
    // window, where it can be saved or copied (found in a real call).
    function keepCopy(w, a) {
      (function () {
        var md = window.SessionPlan ? window.SessionPlan.myCopy(w, a) : '';
        var name = w.title.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 80) + '.md';
        var win = window.open('', '_blank');
        if (!win) return say('The copy could not open. Allow pop-ups for this call and try again.');
        var d = win.document;
        d.title = w.title;
        var css = d.createElement('style');
        css.textContent = 'body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1b1b1b}pre{white-space:pre-wrap;background:#f4f4f2;padding:1rem;border-radius:8px}a{display:inline-block;margin:0 0 1rem;padding:.5rem 1rem;border:1px solid #1b1b1b;border-radius:999px;color:inherit;text-decoration:none}';
        d.head.appendChild(css);
        var h = d.createElement('h1'); h.textContent = w.title; d.body.appendChild(h);
        var link = d.createElement('a'); link.textContent = 'Download ' + name; link.download = name;
        link.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
        d.body.appendChild(link);
        var pre = d.createElement('pre'); pre.textContent = md; d.body.appendChild(pre);
      })();
    }
    // A closed workbook, or one from a session that ended, can still be kept
    // by the person who answered it: answers live only in the room.
    function closedWorkbook(pane, w, a) {
      var box = el('section', 'p2-group open-workbook');
      box.appendChild(el('h2', null, w.title));
      box.appendChild(el('p', 'small', 'Closed. Your answers leave with the room when the call ends.'));
      box.appendChild(btn('Keep a copy', 'btn-secondary', function () { keepCopy(w, a); }));
      pane.appendChild(box);
    }
    function hostNow(pane) {
      if (plan) planNow(pane);
      if (room.workbook) workbookHost(pane);
      if (room.groups) groupsNow(pane, true);
      if (room.worksOpen) worksNow(pane);
      var list = stops();
      if (editing()) pane.appendChild(editRow());
      if (room.show === 'slides') {
        var notes = mineOnStage() ? SL.notes(talk) : [];
        pane.appendChild(el('p', 'small', 'Slide ' + (room.at + 1) + ' of ' + SL.count(shown())));
        if (notes[room.at]) pane.appendChild(el('div', 'p2-notes', notes[room.at]));
      } else if (room.show === 'question' && room.question) {
        var q = room.question;
        pane.appendChild(el('h2', null, q.prompt));
        bars(pane);
        if (words && words.id === q.id && words.words.length) {
          var ul = el('ul', 'open-words');
          words.words.slice(-50).reverse().forEach(function (w) { ul.appendChild(el('li', null, w)); });
          pane.appendChild(ul);
        }
        if (q.kind !== 'short') pane.appendChild(btn(q.reveal ? 'Hide results from the stage' : 'Show results on the stage', 'btn-secondary', function () { send({ t: 'reveal', on: !q.reveal }); }));
      } else if (room.show === 'board') {
        pane.appendChild(el('h2', null, room.board));
        pane.appendChild(el('p', 'small', L.counted(room.notes.length, 'idea', 'ideas')));
        noteList(pane, true);
        if (room.notes.length) pane.appendChild(btn('Remove every idea', 'btn-secondary', function () { send({ t: 'clear' }); }));
      } else if (room.show === 'page' && room.page) {
        pane.appendChild(el('h2', null, room.page.name || 'A page you pasted'));
        if (room.page.url) {
          pane.appendChild(btn('Reload it for everyone', 'btn-secondary', function () { send({ t: 'site', url: room.page.url, name: room.page.name }); }));
          pane.appendChild(out('Open it in a new tab', room.page.url));
        }
        if (newSha) pane.appendChild(btn('Show the new version', 'btn-secondary', function () { var r = room.page; send({ t: 'page', owner: r.owner, repo: r.repo, sha: newSha, path: r.path }); newSha = null; }));
      } else if (room.show === 'workbook' && room.workbook) {
        pane.appendChild(el('p', 'small', 'The workbook is in everyone’s panel.'));
      } else if (room.show === 'draw') {
        pane.appendChild(el('h2', null, 'Drawing together'));
        pane.appendChild(btn('Start a new drawing', 'btn-secondary', function () { send({ t: 'draw', clear: true }); }));
      } else if (room.show === 'card') {
        pane.appendChild(el('div', 'p2-notes', room.card));
        pane.appendChild(btn('Take it down', 'btn-secondary', function () { send({ t: 'card', body: '' }); }));
      } else if (room.show === 'blank') {
        pane.appendChild(el('p', 'small', 'The stage is clear.'));
      } else {
        pane.appendChild(el('p', 'small', !stageUp() ? 'The main stage is closed.' : list.length ? 'The welcome is on the stage.' : 'The welcome is on the stage. Your slides are in Slides.'));
      }
      if (room.clock) pane.appendChild(btn('Stop the clock', 'btn-secondary', function () { send({ t: 'clock', seconds: 0 }); }));
    }
    function editRow() {
      var row = el('div', 'p2-ask');
      row.appendChild(el('span', null, 'Editing slides on your stage'));
      row.appendChild(btn('Done', 'btn-secondary small', stopEditing));
      return row;
    }
    function guestNow(pane) {
      if (room.canTakeOver) pane.appendChild(btn('Take over as host', 'btn-secondary', function () { send({ t: 'claim' }); }));
      if (room.groups) groupsNow(pane, false);
      if (room.workbook && room.workbook.open) workbookGuest(pane);
      else if (room.workbook && wbMine && wbMine.id === room.workbook.id) closedWorkbook(pane, room.workbook, wbMine.a);
      if (room.worksOpen) offerWork(pane);
      if (room.show === 'question' && room.question && room.question.open) return answer(pane);
      if (room.show === 'board') {
        pane.appendChild(el('h2', null, room.board));
        var f = el('form', 'open-add'), i = field('input', 'Propose an idea'); i.maxLength = 280;
        f.appendChild(i); f.appendChild(btn('Propose', 'btn-secondary', function () { f.requestSubmit(); }));
        f.lastChild.type = 'submit';
        f.addEventListener('submit', function (e) { e.preventDefault(); if (i.value.trim()) send({ t: 'note', text: i.value }); i.value = ''; });
        pane.appendChild(f);
        return noteList(pane, false);
      }
      pane.appendChild(el('p', 'small', room.hostName ? 'With ' + room.hostName + ', on the main stage.' : 'Follow along on the main stage.'));
    }
    function answer(pane) {
      var q = room.question, a = mine && mine.id === q.id ? mine.answer : null;
      pane.appendChild(el('h2', null, q.prompt));
      var kind = q.kind;
      if (kind === 'rank' && window.QuestionView && window.QuestionView.rankList) {
        // The order being made survives the room redrawing as others answer.
        var n = q.choices.length;
        if (!rankDraft || rankDraft.id !== q.id) rankDraft = { id: q.id, order: a && a.order && a.order.length === n ? a.order.slice() : q.choices.map(function (c, i) { return i + 1; }) };
        var order = rankDraft.order;
        pane.appendChild(window.QuestionView.rankList(q, order.slice(), function (o) { order = o; rankDraft.order = o; }));
        pane.appendChild(btn(a ? 'Change my order' : 'Send my order', 'btn-secondary', function () { send({ t: 'answer', id: q.id, order: order }); }));
      } else if (kind === 'short' || kind === 'words') {
        var f = el('form', 'open-add'), i = field(kind === 'words' ? 'input' : 'textarea', 'Your answer', a ? a.body : '');
        i.maxLength = kind === 'words' ? 60 : 1000;
        f.appendChild(i);
        var s = el('button', 'btn-secondary', a ? 'Change my answer' : 'Send my answer'); s.type = 'submit'; f.appendChild(s);
        f.addEventListener('submit', function (e) { e.preventDefault(); if (i.value.trim()) { send({ t: 'answer', id: q.id, body: i.value }); i.blur(); } });
        pane.appendChild(f);
      } else {
        var labels = kind === 'scale' ? L.scaleLabels(q) : q.choices, picks = a ? (a.picks || [a.choice]) : [];
        var wrap = el('div', 'open-picks');
        labels.forEach(function (label, n) {
          var b = btn(label, 'btn-secondary', function () {
            if (kind !== 'multi') return send({ t: 'answer', id: q.id, choice: n + 1 });
            var on = picks.indexOf(n + 1) >= 0;
            send({ t: 'answer', id: q.id, picks: on ? picks.filter(function (x) { return x !== n + 1; }) : picks.concat([n + 1]) });
          });
          b.setAttribute('aria-pressed', String(picks.indexOf(n + 1) >= 0));
          wrap.appendChild(b);
        });
        pane.appendChild(wrap);
      }
      if (a && q.reveal) bars(pane);
    }
    function noteList(pane, host) {
      var ul = el('ul', 'open-notes');
      room.notes.slice().sort(function (a, b) { return b.votes.length - a.votes.length; }).forEach(function (n) {
        var li = el('li');
        li.appendChild(el('span', null, n.text));
        var v = btn(n.votes.length ? String(n.votes.length) : 'Vote', 'open-vote', function () { send({ t: 'vote', id: n.id }); });
        v.setAttribute('aria-pressed', String(n.votes.indexOf(you) >= 0));
        v.setAttribute('aria-label', 'Vote for this. ' + n.votes.length + ' so far.');
        li.appendChild(v);
        if (host || n.by === you) li.appendChild(btn('Remove', 'link-button', function () { send({ t: 'unnote', id: n.id }); }));
        ul.appendChild(li);
      });
      pane.appendChild(ul);
    }

    // --------------------------------------------------------------
    // Slides: the host's own deck, edited on their own stage, and kept
    // --------------------------------------------------------------

    function latest(r) {
      return fetch(R.commitUrl(r), { cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' } }).then(function (res) {
        if (res.status === 404) throw new Error('GitHub cannot find that repository. It needs to be public.');
        if (!res.ok) throw new Error('GitHub did not answer. Try again in a minute.');
        return res.json();
      }).then(function (c) { return c.sha; });
    }
    // The slides are edited where they are seen: on the host's own stage.
    // Inside Meet the two frames do not share storage, so they talk through
    // Meet's frame messages (RoomLib.frameMessage); two plain tabs share
    // storage, and the storage events below cover them.
    function editing() { return get(EDIT) === o.code; }
    function toStage(k, data) { if (o.side) try { Promise.resolve(o.side.notifyMainStage(R.frameMessage(k, data))).catch(function () {}); } catch (e) {} }
    function fromStage(payload) {
      var f = R.readFrame(payload);
      if (!f) return false;
      if (f.k === 'hello') toStage('you', { secret: client.secret(), edit: editing() && isHost(), text: talk });
      if ((f.k === 'deck' || f.k === 'done') && f.text != null) {
        talk = f.text; put(TALK, talk);
        if (f.k === 'done' && editing()) return stopEditing(), true;
        // A last change can arrive after Done.
        if (!editing() && SL.count(SL.withoutNotes(talk)) && deck() !== roomDeck) sendTalk(room && room.show === 'slides');
        drawSlides();
      }
      return true;
    }
    function startEditing() {
      if (!stageUp()) return openStage();
      put(EDIT, o.code); toStage('edit', { on: true, text: talk }); drawSlides(); drawNow();
    }
    function stopEditing() {
      put(EDIT, ''); toStage('edit', { on: false }); talk = get(TALK) || talk;
      if (SL.count(SL.withoutNotes(talk))) sendTalk(room && room.show === 'slides');
      drawSlides(); drawNow();
    }
    window.addEventListener('storage', function (e) {
      if (e.key === TALK && e.newValue != null) { talk = e.newValue; drawSlides(); }
      if (e.key === EDIT && e.oldValue === o.code && e.newValue !== o.code) return stopEditing();
      if (e.key === EDIT) { drawSlides(); drawNow(); }
    });

    var slidesKey = null, slideLine = el('p', 'small');
    slideLine.setAttribute('role', 'status');
    function drawSlides() {
      var pane = F && F.pane('slides');
      if (!pane || !isHost()) return;
      var text = roomDeck != null ? roomDeck : deck();
      var key = JSON.stringify([text.length, text.slice(0, 200), room.show, room.at, editing(), stageUp(), repo && repo.name]);
      if (key === slidesKey) return;
      var active = document.activeElement;
      if (active && pane.contains(active) && active.tagName === 'INPUT') return;
      slidesKey = key;
      pane.replaceChildren();
      if (editing()) pane.appendChild(editRow());
      else pane.appendChild(btn(stageUp() ? 'Edit on your stage' : 'Open the stage to edit', 'btn-secondary', startEditing));
      var pics = [];
      try { pics = window.DeckKit ? window.SlidesLib.render(window.SlidesLib.kit(window.DeckKit), text) : []; } catch (e) { pics = []; }
      var grid = el('ol', 'open-film');
      grid.setAttribute('aria-label', 'Your slides');
      pics.forEach(function (svg, n) {
        var li = el('li');
        var b = el('button', 'open-thumb'); b.type = 'button';
        b.innerHTML = svg;
        b.setAttribute('aria-label', 'Show slide ' + (n + 1));
        if (room.show === 'slides' && room.at === n) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', function () { send({ t: 'go', at: n, shown: 0 }); });
        li.appendChild(b);
        li.appendChild(el('span', 'open-thumb-n', String(n + 1)));
        grid.appendChild(li);
      });
      if (pics.length) pane.appendChild(grid);
      pane.appendChild(slideLine);
      if (window.MyDrive) { var mine2 = el('div', 'p2-group'); pane.appendChild(mine2); drawDrive(mine2); }
      var keep = el('div', 'p2-group');
      pane.appendChild(keep);
      drawKeep(keep);
    }
    // Keep them in your Drive (MyDrive): a file you own in a "Human Shaped
    // sessions" folder, through the Google account you already use in Meet.
    // No GitHub and no account here.
    var driveFiles = null;
    function firstTalk() { var i = -1; (plan ? plan.parts : []).some(function (p, n) { if (p.kind === 'talk') { i = n; return true; } return false; }); return i; }
    function drawDrive(box) {
      var D = window.MyDrive, line = slideLine, held = (function () { try { return JSON.parse(get(DRIVE) || 'null'); } catch (e) { return null; } })();
      box.appendChild(el('h2', null, 'Keep them in your Drive'));
      if (held && held.name) box.appendChild(el('p', 'small', 'In your Drive as ' + held.name));
      var acts = el('div', 'open-acts');
      acts.appendChild(btn('Save to my Drive', 'btn-secondary', function () {
        line.textContent = 'Saving to your Drive…';
        var title = (room && room.title) || R.titleOf(talk) || 'A session';
        var P = window.SessionPlan, body = plan && P ? P.session(plan.title || title, plan.parts.map(function (p, i) { return p.kind === 'talk' && i === firstTalk() ? Object.assign({}, p, { slides: talk }) : p; })) : D.session(title, talk);
        if (plan) title = body.title;
        D.connect().then(function (token) { return D.save(token, body, held && held.id).catch(function (e) { if (held && held.id) return D.save(token, body); throw e; }); })
          .then(function (id) { put(DRIVE, JSON.stringify({ id: id, name: title })); line.textContent = 'Saved in your Drive.'; slidesKey = null; drawSlides(); }, function (e) { line.textContent = e.message; });
      }));
      acts.appendChild(btn('Open from my Drive', 'btn-secondary', function () {
        line.textContent = 'Reading your Drive…';
        D.connect().then(function (token) { return D.list(token).then(function (l) { driveFiles = { token: token, list: l }; line.textContent = l.length ? '' : 'No sessions in your Drive yet.'; slidesKey = null; drawSlides(); }); }, function (e) { line.textContent = e.message; });
      }));
      box.appendChild(acts);
      box.appendChild(out('Plan a whole session', '/plan/'));
      if (driveFiles && driveFiles.list.length) {
        var ul = el('ul', 'open-sites');
        driveFiles.list.forEach(function (f) {
          var li = el('li'), b = el('button', 'open-site'); b.type = 'button';
          b.appendChild(el('span', 'open-site-name', f.name.replace(/\.json$/, '')));
          b.addEventListener('click', function () {
            line.textContent = 'Opening…';
            D.open(driveFiles.token, f.id).then(function (sess) {
              talk = D.talkOf(sess) || talk; put(TALK, talk); put(DRIVE, JSON.stringify({ id: f.id, name: sess.title || f.name }));
              var parts = window.SessionPlan ? window.SessionPlan.clean(sess.parts) : [];
              plan = parts.length > 1 || (parts[0] && parts[0].kind !== 'talk') ? { title: sess.title || '', parts: parts, at: null } : null;
              put(PLAN, plan ? JSON.stringify(plan) : ''); nowKey = null; drawNow();
              driveFiles = null; sendTalk(room && room.show === 'slides'); line.textContent = 'Opened.'; slidesKey = null; drawSlides();
            }, function (e) { line.textContent = e.message; });
          });
          li.appendChild(b); ul.appendChild(li);
        });
        box.appendChild(ul);
      }
    }
    function drawKeep(keep) {
      var line = slideLine;
      keep.appendChild(el('h2', null, 'Or keep them in GitHub'));
      if (repo) {
        keep.appendChild(el('p', 'small', repo.name));
        var acts = el('div', 'open-acts');
        acts.appendChild(btn('Load talk.md', 'btn-secondary', function () {
          line.textContent = 'Loading…';
          latest(repo).then(function (sha) { return fetch(R.rawUrl(repo, sha, 'talk.md')); }).then(function (r) {
            if (!r.ok) throw new Error('That repository has no talk.md.');
            return r.text();
          }).then(function (t) { talk = t; put(TALK, t); sendTalk(room.show === 'slides'); line.textContent = 'Loaded.'; slidesKey = null; drawSlides(); }, function (e) { line.textContent = e.message; });
        }));
        acts.appendChild(btn('Copy as text', 'btn-secondary', function () {
          Promise.resolve(navigator.clipboard ? navigator.clipboard.writeText(talk) : Promise.reject()).then(function () { line.textContent = 'Copied. Paste them into talk.md on GitHub.'; }, function () { line.textContent = 'This browser would not copy. Use Edit as text on your stage.'; });
        }));
        keep.appendChild(acts);
        keep.appendChild(out('Edit talk.md on GitHub', R.editUrl(repo, 'talk.md')));
        keep.appendChild(btn('Use a different repository', 'link-button', function () { repo = null; put(REPO, ''); slidesKey = null; drawSlides(); }));
        return;
      }
      if (!get(DRIVE)) keep.appendChild(el('p', 'small', 'Until then, they stay in this browser.'));
      keep.appendChild(out('Make my repository', R.TEMPLATE, 'btn-secondary'));
      var f = el('form', 'open-add'), i = field('input', 'yourname/repository');
      f.appendChild(i);
      var s = el('button', 'btn-secondary', 'Connect'); s.type = 'submit'; f.appendChild(s);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var r = R.repoOf(i.value);
        if (!r) return (line.textContent = 'Write it as yourname/repository.');
        latest(r).then(function () { repo = r; put(REPO, r.name); line.textContent = ''; slidesKey = null; drawSlides(); }, function (x) { line.textContent = x.message; });
      });
      keep.appendChild(f);
    }

    // --------------------------------------------------------------
    // Tools
    // --------------------------------------------------------------

    var TOOLS = [['question', 'Question', 'chats-circle'], ['board', 'Propose and vote', 'check-circle'], ['site', 'Show a website', 'globe-simple'], ['model', 'Give everyone a model', 'book-open-text'], ['work', 'Show your work', 'app-window'], ['groups', 'Breakout rooms', 'door-open'], ['draw', 'Draw together', 'pencil-simple-line'], ['workbook', 'Workbook', 'book-open-text'], ['clock', 'Clock', 'clock'], ['message', 'Message', 'megaphone-simple'], ['clear', 'Clear stage', 'eye-slash']];
    function drawTools() {
      var pane = F && F.pane('kit');
      if (!pane) return;
      pane.replaceChildren();
      if (!tool) {
        var grid = el('div', 'p2-tiles');
        TOOLS.forEach(function (t) {
          var b = el('button', 'p2-tile'); b.type = 'button';
          b.innerHTML = icon(t[2]);
          b.appendChild(el('span', null, t[1]));
          b.addEventListener('click', function () {
            if (t[0] === 'clear') { send({ t: 'show', show: 'blank' }); return F.show('now'); }
            tool = t[0]; drawTools();
          });
          grid.appendChild(b);
        });
        pane.appendChild(grid);
        return;
      }
      var head = el('div', 'open-toolback');
      head.appendChild(btn('All tools', 'btn-secondary small', function () { tool = null; drawTools(); }));
      head.appendChild(el('h2', null, TOOLS.filter(function (t) { return t[0] === tool; })[0][1]));
      pane.appendChild(head);
      var line = el('p', 'small'); line.setAttribute('role', 'status');
      ({ workbook: workbookTool, draw: drawTool, groups: groupsTool, work: workTool, question: questionTool, board: boardTool, site: siteTool, model: modelTool, clock: clockTool, message: messageTool })[tool](pane, line);
      pane.appendChild(line);
    }
    function done() { tool = null; drawTools(); F.show('now'); }
    // Everyone gets a box for the address of something they made; the offers
    // come to the host's Now, by name, and the host puts one on the stage.
    // The host makes a Meet call for each room (meet.new) and pastes the
    // links; everyone here but the host is dealt into them.
    // A workbook from the session in hand, or a quick one written here: a
    // question per line, each answered in words.
    function workbookTool(pane, line) {
      var mine = plan ? plan.parts.filter(function (p) { return p.kind === 'workbook'; }) : [];
      if (room && room.workbook && !room.workbook.open) pane.appendChild(btn('Open ' + room.workbook.title + ' again', 'btn-secondary', function () { send({ t: 'workbook', open: true }); done(); }));
      if (mine.length) {
        var g = el('div', 'p2-group'); g.appendChild(el('h3', 'open-label', 'From this session'));
        mine.forEach(function (p) { g.appendChild(btn(p.title, 'btn-secondary', function () { send({ t: 'workbook', title: p.title, blocks: p.blocks }); done(); })); });
        pane.appendChild(g);
      }
      var f = el('form', 'open-add is-stack');
      var t = field('input', 'Its name'); t.maxLength = 120;
      var qs = field('textarea', 'Questions, one per line'); qs.rows = 4;
      f.appendChild(t); f.appendChild(qs);
      var s = el('button', 'btn-primary', 'Give everyone this workbook'); s.type = 'submit'; f.appendChild(s);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var blocks = qs.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 30).map(function (x) { return { type: 'free', text: x }; });
        if (!blocks.length) return (line.textContent = 'Write at least one question.');
        send({ t: 'workbook', title: t.value.trim() || 'A workbook', blocks: blocks }); done();
      });
      pane.appendChild(f);
    }
    // One drawing on every stage that anyone in the call adds to.
    function drawTool(pane) {
      pane.appendChild(btn(room && room.show === 'draw' ? 'The drawing is up' : 'Put the drawing up', 'btn-primary', function () { send({ t: 'draw' }); done(); }));
      pane.appendChild(btn('Start a new drawing', 'btn-secondary', function () { send({ t: 'draw', clear: true }); done(); }));
    }
    function groupsTool(pane, line) {
      if (room && room.groups) return pane.appendChild(btn('Bring everyone back', 'btn-secondary', function () { send({ t: 'groups', open: false }); done(); }));
      var f = el('form', 'open-add is-stack'), t = field('textarea', 'A Meet link for each room, one per line');
      t.rows = 4;
      f.appendChild(t);
      f.appendChild(out('Make a Meet link', 'https://meet.new', 'link-button'));
      var s = el('button', 'btn-primary', 'Send everyone to a room'); s.type = 'submit'; f.appendChild(s);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var links = t.value.split(/\s+/).filter(Boolean);
        if (links.length < 2) return (line.textContent = 'Add at least two Meet links.');
        send({ t: 'groups', links: links }); done();
      });
      pane.appendChild(f);
    }
    function workTool(pane) {
      if (room && room.worksOpen) return pane.appendChild(btn('Stop asking', 'btn-secondary', function () { send({ t: 'works', open: false }); done(); }));
      pane.appendChild(btn('Ask everyone for their work', 'btn-primary', function () { send({ t: 'works', open: true }); done(); }));
    }
    // A model from Ideas at Play on every stage, a copy for each person (ModelPicker).
    function modelTool(pane) { if (window.ModelPicker) window.ModelPicker.mount(pane, { send: send, done: done }); }
    // One choice from a few, as a row of buttons, so every choice is in sight.
    function choose(list, at, fn) {
      var row = el('div', 'open-picks is-row');
      list.forEach(function (x) {
        var b = btn(x[1], 'btn-secondary', function () {
          row.querySelectorAll('button').forEach(function (n) { n.setAttribute('aria-pressed', String(n === b)); });
          fn(x[0]);
        });
        b.setAttribute('aria-pressed', String(x[0] === at));
        row.appendChild(b);
      });
      return row;
    }

    function questionTool(pane, line) {
      var kinds = [['choice', 'One choice'], ['multi', 'Any choices'], ['scale', 'A scale'], ['words', 'A few words'], ['short', 'Sentences'], ['rank', 'Put in order']], kind = 'choice';
      var prompt = field('textarea', 'Your question'); prompt.rows = 2; prompt.maxLength = 500;
      var choices = field('textarea', 'Choices, one on each line'); choices.rows = 3;
      var low = field('input', 'Low end, optional'), high = field('input', 'High end, optional');
      var ends = el('div', 'open-ends'); ends.appendChild(low); ends.appendChild(high);
      var reveal = el('input'); reveal.type = 'checkbox';
      var lab = el('label', 'check open-check'); lab.appendChild(reveal); lab.appendChild(document.createTextNode(' Show results as answers come in'));
      function fit(k) {
        kind = k;
        choices.hidden = !(k === 'choice' || k === 'multi' || k === 'rank'); ends.hidden = k !== 'scale'; lab.hidden = k === 'short';
      }
      var g = el('div', 'p2-group');
      g.appendChild(el('h3', 'open-label', 'People answer with'));
      g.appendChild(choose(kinds, kind, fit));
      fit(kind);
      [prompt, g, choices, ends, lab].forEach(function (n) { pane.appendChild(n); });
      pane.appendChild(btn('Ask everyone', 'btn-secondary', function () {
        var q = L.parseQuestion({ kind: kind, prompt: prompt.value, choices: choices.value, points: 5, low: low.value, high: high.value });
        if (q.error) return (line.textContent = q.error);
        send({ t: 'ask', kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points, reveal: reveal.checked });
        done();
      }));
    }
    // Propose and vote: the host asks for ideas, everyone proposes them, and
    // everyone votes for the ones they would choose. (Not a board: nothing on
    // it is placed or moved.)
    function boardTool(pane, line) {
      var p = field('input', 'What should everyone propose?', room.board || ''); p.maxLength = 500;
      pane.appendChild(p);
      pane.appendChild(btn(room.board && p.value === room.board ? 'Put it back on the stage' : 'Ask for ideas', 'btn-secondary', function () {
        if (!p.value.trim()) return (line.textContent = 'Say what everyone should propose first.');
        send({ t: 'board', prompt: p.value }); done();
      }));
    }
    // Show a website: the host's own sites to choose from, or any link pasted
    // whole. A link is read the way it was meant (RoomLib.siteOf): a GitHub
    // account lists its sites, a repository shows its GitHub Pages site or
    // else its page, and any other address is checked and shown.
    var sites = { owner: null, list: null, error: '' };
    function api(path) {
      return fetch('https://api.github.com/' + path, { headers: { Accept: 'application/vnd.github+json' } }).then(function (res) {
        if (res.status === 404) throw new Error('GitHub cannot find that. It needs to be public.');
        if (!res.ok) throw new Error('GitHub did not answer. Try again in a minute.');
        return res.json();
      });
    }
    function githubName() { return get(GH) || person.github || (repo && repo.owner) || ''; }
    function loadSites(owner, then) {
      sites = { owner: owner, list: null, error: '' };
      api('users/' + encodeURIComponent(owner) + '/repos?per_page=100&sort=pushed').then(function (list) {
        sites.list = list.filter(function (x) { return x.has_pages && !x.private; }).map(function (x) {
          return { name: x.name, url: R.pagesUrl({ owner: x.owner.login, repo: x.name, homepage: x.homepage }) };
        });
        put(GH, owner); then();
      }, function (e) { sites.error = e.message; then(); });
    }
    // Whether a page lets itself be shown inside another (the room's /frame
    // check), in words a person can act on.
    function canFrame(href) {
      return fetch(window.MEET_ADDON.rooms + '/frame?url=' + encodeURIComponent(href)).then(function (r) { return r.json(); }).then(function (c) {
        if (c.ok) return { ok: true, url: c.url || href };
        return { ok: false, text: c.why === 'address' ? 'That address cannot be shown here. Use a page that starts with https://.'
          : c.why === 'refuses' ? 'That page does not allow itself to be shown inside another page. Share your screen to show it instead.'
          : 'That page did not answer. Check the link and try again.' };
      }, function () { return { ok: false, text: 'The check did not answer. Try again in a minute.' }; });
    }
    function showUrl(href, name, line) {
      line.textContent = 'Checking that it can be shown…';
      return fetch(window.MEET_ADDON.rooms + '/frame?url=' + encodeURIComponent(href)).then(function (r) { return r.json(); }).then(function (c) {
        if (c.ok) { send({ t: 'site', url: c.url || href, name: name }); return done(); }
        line.textContent = c.why === 'address' ? 'That address cannot be shown here.'
          : c.why === 'refuses' ? 'That site does not allow itself to be shown inside another page. Share your screen to show it instead.'
          : 'That site did not answer. Check the link and try again.';
      }, function () { line.textContent = 'The check did not answer. Try again in a minute.'; });
    }
    function showRepo(x, line) {
      line.textContent = 'Looking…';
      api('repos/' + x.owner + '/' + x.repo).then(function (info) {
        if (info.has_pages) return showUrl(R.pagesUrl({ owner: info.owner.login, repo: info.name, homepage: info.homepage }, x.path), info.name, line);
        var file = R.pageFile(x.path);
        return latest(x).then(function (sha) {
          return fetch(R.rawUrl(x, sha, file), { method: 'HEAD' }).then(function (h) {
            if (!h.ok) throw new Error(x.path ? 'That repository has no ' + file + '.' : 'That repository has no website yet: no GitHub Pages site and no index.html.');
            newSha = null; send({ t: 'page', owner: x.owner, repo: x.repo, sha: sha, path: file }); done();
          });
        });
      }).catch(function (e) { line.textContent = e.message; });
    }
    function siteTool(pane, line) {
      var f = el('form', 'open-add'), u = field('input', 'Paste a link'); u.inputMode = 'url'; u.autocomplete = 'off';
      var go = el('button', 'btn-secondary', 'Show'); go.type = 'submit';
      f.appendChild(u); f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var x = R.siteOf(u.value);
        if (!x) return (line.textContent = 'That link could not be read. Paste the whole address.');
        if (x.kind === 'user') return loadSites(x.owner, function () { drawTools(); });
        if (x.kind === 'repo') return showRepo(x, line);
        showUrl(x.url, '', line);
      });
      pane.appendChild(f);
      var g = el('div', 'p2-group');
      var owner = githubName();
      if (owner && sites.owner !== owner && !sites.error) { loadSites(owner, function () { if (tool === 'site') drawTools(); }); }
      g.appendChild(el('h2', null, owner ? 'Sites by ' + owner : 'Your sites'));
      if (owner && sites.owner === owner && sites.list) {
        if (!sites.list.length) g.appendChild(el('p', 'small', 'No GitHub Pages sites yet.'));
        var ul = el('ul', 'open-sites');
        sites.list.forEach(function (x) {
          var li = el('li'), b = el('button', 'open-site'); b.type = 'button';
          b.appendChild(el('span', 'open-site-name', x.name));
          b.appendChild(el('span', 'open-site-url', x.url.replace(/^https:\/\//, '').replace(/\/$/, '')));
          b.addEventListener('click', function () { showUrl(x.url, x.name, line); });
          li.appendChild(b); ul.appendChild(li);
        });
        g.appendChild(ul);
      } else if (owner && !sites.error) {
        g.appendChild(el('p', 'small', 'Looking on GitHub…'));
      }
      if (sites.error) g.appendChild(el('p', 'small', sites.error));
      var who = el('form', 'open-add'), n = field('input', 'Your GitHub username'); n.autocomplete = 'off';
      var find = el('button', 'btn-secondary', owner ? 'Change' : 'Find'); find.type = 'submit';
      who.appendChild(n); who.appendChild(find);
      who.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = n.value.trim().replace(/^@/, '');
        if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(v)) return (line.textContent = 'Write just the username.');
        loadSites(v, function () { drawTools(); });
      });
      if (!owner || sites.error) g.appendChild(who);
      else {
        var change = btn('Someone else’s sites', 'link-button', function () { g.replaceChildren(el('h2', null, 'Your sites')); g.appendChild(who); n.focus(); });
        g.appendChild(change);
      }
      pane.appendChild(g);
    }
    function clockTool(pane) {
      var label = field('input', 'What it is for, optional'); label.maxLength = 80;
      pane.appendChild(label);
      var row = el('div', 'open-picks is-row');
      [1, 2, 3, 5, 10].forEach(function (m) {
        row.appendChild(btn(m + ' min', 'btn-secondary', function () { send({ t: 'clock', seconds: m * 60, label: label.value }); done(); }));
      });
      pane.appendChild(row);
      if (room && room.clock) {
        var run = el('div', 'open-picks is-row');
        run.appendChild(btn('−30 sec', 'btn-secondary small', function () { send({ t: 'clockAdd', seconds: -30 }); }));
        run.appendChild(btn('+30 sec', 'btn-secondary small', function () { send({ t: 'clockAdd', seconds: 30 }); }));
        pane.appendChild(run);
      }
    }
    function messageTool(pane, line) {
      var m = field('textarea', 'What everyone should see'); m.rows = 3; m.maxLength = 400;
      pane.appendChild(m);
      pane.appendChild(btn('Put it on the stage', 'btn-secondary', function () {
        if (!m.value.trim()) return (line.textContent = 'Write it first.');
        send({ t: 'card', body: m.value }); done();
      }));
    }

    // --------------------------------------------------------------
    // People, Yours, and reactions
    // --------------------------------------------------------------

    function nameField(pane) {
      var f = el('form', 'open-add'), i = field('input', 'Your name', client.name()); i.maxLength = 60; i.autocomplete = 'name';
      var s = el('button', 'btn-secondary', 'Save'); s.type = 'submit';
      f.appendChild(i); f.appendChild(s);
      f.addEventListener('submit', function (e) { e.preventDefault(); client.setName(i.value); s.textContent = 'Saved'; });
      pane.appendChild(f);
    }
    function drawPeople() {
      var pane = F && F.pane('people');
      if (!pane || !room) return;
      var active = document.activeElement;
      if (active && pane.contains(active) && active.tagName === 'INPUT') return;
      pane.replaceChildren();
      var me = el('div', 'p2-group');
      me.appendChild(el('h2', null, 'Your name'));
      nameField(me);
      pane.appendChild(me);
      var inRoom = el('div', 'p2-group');
      inRoom.appendChild(el('h2', null, 'In the room'));
      var ul = el('ul', 'open-people');
      room.people.forEach(function (p) {
        var li = el('li');
        li.appendChild(el('span', null, (p.name || 'Guest') + (p.id === you ? ' (you)' : '')));
        if (p.id !== you) li.appendChild(btn('Make host', 'link-button', function () { send({ t: 'hand', to: p.id, name: p.name }); }));
        ul.appendChild(li);
      });
      inRoom.appendChild(ul);
      pane.appendChild(inRoom);
      var g = el('div', 'p2-group');
      g.appendChild(el('h2', null, 'Join without the add-on'));
      var url = R.link(location.origin, o.code);
      g.appendChild(el('p', 'small open-link', url));
      var copy = btn('Copy the link', 'btn-secondary', function () {
        Promise.resolve(navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { copy.textContent = 'Copied'; }, function () { copy.textContent = 'Select the link above to copy it'; });
      });
      g.appendChild(copy);
      pane.appendChild(g);
      var end = el('div', 'p2-group open-end');
      pane.appendChild(end);
      var wb = room && room.workbook;
      if (wb && room.wbCount && !(wbSaved && wbSaved.id === wb.id)) {
        end.appendChild(el('p', 'small', L.counted(room.wbCount, 'person’s', 'people’s') + ' answers to ' + wb.title + ' are not saved. Ending erases them.'));
        end.appendChild(btn('Save everyone’s answers to my Drive', 'btn-secondary', function () { say('Collecting the answers…'); send({ t: 'wbCollect' }); }));
      }
      end.appendChild(btn(confirmEnd ? 'Yes, end it and erase the room' : 'End the session', 'btn-secondary', function () {
        if (!confirmEnd) { confirmEnd = true; return drawPeople(); }
        confirmEnd = false; send({ t: 'end' });
      }));
      pane.appendChild(links());
    }
    function buildYours() {
      var pane = F.pane('yours');
      nameField(pane);
      var g = el('div', 'p2-group');
      g.appendChild(el('h2', null, 'Run your own'));
      g.appendChild(el('p', 'small', 'Free in any Google Meet call, from Activities.'));
      pane.appendChild(g);
      var c = el('div', 'p2-group');
      c.appendChild(el('h2', null, 'Learn to build'));
      c.appendChild(el('p', 'small', 'Our free cohorts teach people to build their own app.'));
      pane.appendChild(c);
      pane.appendChild(links());
    }
    function buildReactions() {
      var bar = el('div', 'open-reacts');
      RX.REACTIONS.forEach(function (r) {
        var b = btn(r.emoji, 'react-btn', function () { send({ t: 'react', r: r.id }); });
        b.setAttribute('aria-label', r.label); b.title = r.label;
        bar.appendChild(b);
      });
      var st = el('div', 'open-stances');
      RX.STANCES.forEach(function (s) { st.appendChild(btn(s.label, 'btn-secondary', function () { send({ t: 'stance', stance: s.id }); })); });
      F.low.appendChild(bar); F.low.appendChild(st);
    }
    document.addEventListener('keydown', function (e) {
      if (frameRole !== 'guest') return;
      var k = RX.keyFor(e);
      if (k && k.reaction) send({ t: 'react', r: k.reaction });
      if (k && k.stance) send({ t: 'stance', stance: k.stance });
    });

    // A repository's new commit is noticed, and the host decides when it shows.
    // A question GitHub can answer "nothing new" to costs none of its allowance.
    function watch() {
      var on = isHost() && room.show === 'page' && room.page && room.page.owner;
      if (!on || watching) return;
      watching = true;
      (function look() {
        setTimeout(function () {
          if (!(isHost() && room.show === 'page' && room.page && room.page.owner)) { watching = false; return; }
          latest(room.page).then(function (sha) { newSha = sha !== room.page.sha ? sha : null; drawNow(); }, function () {}).then(look);
        }, 20000);
      })();
    }

    return {
      frame: fromStage,
      cohorts: function (l) {
        leads = l || [];
        if (frameRole === 'lobby') { var typed = lobby && lobby.input.value; build('lobby'); if (typed != null) lobby.input.value = typed; }
      },
      person: function (p) {
        person = p;
        if (p.name && !client.name()) client.setName(p.name);
        frameRole = null; draw();
      }
    };
  }
  window.OpenRoom = { mount: mount };
})();
