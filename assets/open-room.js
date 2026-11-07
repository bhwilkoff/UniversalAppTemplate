// An open room's side panel (ADDON-DESIGN.md, "Open rooms"): any Meet call that
// is not a cohort's. OpenRoom.mount({ root, code, side, name, member, signIn })
// draws into [data-state="open"]. The room itself lives in tools/rooms; what
// stays here is the host's own talk, notes, and repository, in this browser.
(function () {
  var R = window.RoomLib, SL = window.SlidesLib, L = window.LiveLib, RX = window.ReactLib, A = window.AddonLib;
  var TALK = 'hs-room-talk', REPO = 'hs-room-repo';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(label, cls, fn) { var b = el('button', cls || 'btn-secondary', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function out(label, href, cls) { var a = el('a', cls || '', label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function field(tag, label, value) { var n = el(tag); n.setAttribute('aria-label', label); n.placeholder = label; if (value != null) n.value = value; return n; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function mount(o) {
    var box = o.root.querySelector('[data-state="open"]');
    var room = null, you = null, F = null, frameRole = null, online = true, ended = false, stageOn = false;
    var words = null, mine = null, tool = null, newSha = null, confirmEnd = false, watching = false;
    var talk = get(TALK) || R.STARTER, repo = R.repoOf(get(REPO) || ''), lobby = null, person = { name: o.name, member: o.member };
    var status = el('p', 'small'); status.setAttribute('role', 'status');
    var name = o.name || window.RoomClient.savedName();

    var wait = el('p', 'small open-wait', 'Opening the room…');
    box.replaceChildren(wait);
    var client = window.RoomClient.connect({ code: o.code, role: 'panel', name: name, on: {
      welcome: function (m) { you = m.you; mine = m.mine; },
      room: function (r) { room = r; if (r.on) ended = false; draw(); },
      words: function (w) { words = w; drawNow(); },
      talk: function (t) { roomDeck = t; drawNow(); drawTop(); },
      mine: function (m) { mine = m; drawNow(); },
      ended: function () { ended = true; roomDeck = null; mine = null; words = null; tool = null; },
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
      if (F.current() === 'people') drawPeople();
      watch();
    }
    function build(role) {
      frameRole = role;
      if (F) { F.el.remove(); F = null; }
      box.replaceChildren();
      tool = null;
      if (role === 'lobby') return buildLobby();
      F = window.PanelFrame.mount({ root: o.root, into: box, teaching: role === 'host', tabs: role === 'host' ? [['now', 'Now'], ['talk', 'Talk'], ['kit', 'Tools'], ['people', 'People']] : [['now', 'Now'], ['yours', 'Yours']] });
      F.on(next, back);
      if (role === 'host') { buildTalk(); drawTools(); peopleTab(); }
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
      if (step.act === 'talk') return F.show('talk');
      if (step.act === 'slides') return send({ t: 'show', show: 'slides' });
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
      s.appendChild(el('p', 'small', 'Slides, questions, a board, and pages you build, for everyone here.'));
      var input = field('input', 'Your name', client.name());
      input.maxLength = 60; input.autocomplete = 'name';
      s.appendChild(input);
      s.appendChild(btn('Start a session', 'btn-primary', startRoom));
      s.appendChild(el('p', 'small', 'Free, with no account. Nothing is kept after the call.'));
      s.appendChild(status);
      s.appendChild(links());
      box.appendChild(s);
      lobby = { input: input };
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
      var key = JSON.stringify([host, room.show, room.at, room.shown, room.question, room.summary, room.notes, room.page, room.card, room.clock && room.clock.endsAt, room.canTakeOver, mine, words, newSha, talk.length, roomDeck && roomDeck.length, stageUp()]);
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
    function hostNow(pane) {
      var list = stops();
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
        pane.appendChild(el('h2', null, 'The board is on the stage'));
        pane.appendChild(el('p', 'small', L.counted(room.notes.length, 'note', 'notes')));
        noteList(pane, true);
        if (room.notes.length) pane.appendChild(btn('Clear the board', 'btn-secondary', function () { send({ t: 'clear' }); }));
      } else if (room.show === 'page' && room.page) {
        pane.appendChild(el('h2', null, room.page.name || 'Your page is on the stage'));
        if (newSha) pane.appendChild(btn('Show the new version', 'btn-secondary', function () { var r = room.page; send({ t: 'page', owner: r.owner, repo: r.repo, sha: newSha }); newSha = null; }));
      } else if (room.show === 'card') {
        pane.appendChild(el('div', 'p2-notes', room.card));
        pane.appendChild(btn('Take it down', 'btn-secondary', function () { send({ t: 'card', body: '' }); }));
      } else if (room.show === 'blank') {
        pane.appendChild(el('p', 'small', 'The stage is clear.'));
      } else {
        pane.appendChild(el('p', 'small', !stageUp() ? 'The main stage is closed.' : list.length ? 'The welcome is on the stage.' : 'The welcome is on the stage. Your slides go in Talk.'));
      }
      if (room.clock) pane.appendChild(btn('Stop the clock', 'btn-secondary', function () { send({ t: 'clock', seconds: 0 }); }));
    }
    function guestNow(pane) {
      if (room.canTakeOver) pane.appendChild(btn('Take over as host', 'btn-secondary', function () { send({ t: 'claim' }); }));
      if (room.show === 'question' && room.question && room.question.open) return answer(pane);
      if (room.show === 'board') {
        var f = el('form', 'open-add'), i = field('input', 'Add a note'); i.maxLength = 280;
        f.appendChild(i); f.appendChild(btn('Add', 'btn-secondary', function () { f.requestSubmit(); }));
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
      if (kind === 'short' || kind === 'words') {
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
    // Talk: the host's slides, and keeping them
    // --------------------------------------------------------------

    function latest(r) {
      return fetch(R.commitUrl(r), { cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' } }).then(function (res) {
        if (res.status === 404) throw new Error('GitHub cannot find that repository. It needs to be public.');
        if (!res.ok) throw new Error('GitHub did not answer. Try again in a minute.');
        return res.json();
      }).then(function (c) { return c.sha; });
    }
    function buildTalk() {
      var pane = F.pane('talk');
      var area = field('textarea', 'Your slides', talk); area.rows = 12; area.className = 'open-talk';
      area.addEventListener('input', function () { talk = area.value; put(TALK, talk); });
      var line = el('p', 'small'); line.setAttribute('role', 'status');
      pane.appendChild(area);
      pane.appendChild(el('p', 'small', 'A line of three dashes starts a new slide. A line starting with > is your own note.'));
      pane.appendChild(btn('Use these slides', 'btn-secondary', function () {
        if (!SL.count(SL.withoutNotes(talk))) return (line.textContent = 'Write a slide first.');
        sendTalk(true); line.textContent = 'On the stage.'; F.show('now');
      }));
      pane.appendChild(line);
      var keep = el('div', 'p2-group');
      pane.appendChild(keep);
      function drawKeep() {
        keep.replaceChildren();
        keep.appendChild(el('h2', null, 'Keep it'));
        if (repo) {
          keep.appendChild(el('p', 'small', repo.name));
          keep.appendChild(btn('Load talk.md', 'btn-secondary', function () {
            line.textContent = 'Loading…';
            latest(repo).then(function (sha) { return fetch(R.rawUrl(repo, sha, 'talk.md')); }).then(function (r) {
              if (!r.ok) throw new Error('That repository has no talk.md.');
              return r.text();
            }).then(function (t) { talk = t; area.value = t; put(TALK, t); sendTalk(room.show === 'slides'); line.textContent = 'Loaded.'; }, function (e) { line.textContent = e.message; });
          }));
          keep.appendChild(btn('Copy these slides', 'btn-secondary', function () {
            var done = function () { line.textContent = 'Copied. Paste them into talk.md on GitHub.'; };
            Promise.resolve(navigator.clipboard ? navigator.clipboard.writeText(talk) : Promise.reject()).then(done, function () { area.focus(); area.select(); line.textContent = 'Press Command or Control C to copy.'; });
          }));
          keep.appendChild(out('Edit talk.md on GitHub', R.editUrl(repo, 'talk.md')));
          keep.appendChild(btn('Use a different repository', 'link-button', function () { repo = null; put(REPO, ''); drawKeep(); }));
          return;
        }
        keep.appendChild(el('p', 'small', 'These slides stay in this browser until you keep them.'));
        keep.appendChild(out('Make my repository', R.TEMPLATE, 'btn-secondary'));
        var f = el('form', 'open-add'), i = field('input', 'yourname/repository');
        f.appendChild(i);
        var s = el('button', 'btn-secondary', 'Connect'); s.type = 'submit'; f.appendChild(s);
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var r = R.repoOf(i.value);
          if (!r) return (line.textContent = 'Write it as yourname/repository.');
          latest(r).then(function () { repo = r; put(REPO, r.name); drawKeep(); drawTools(); line.textContent = ''; }, function (x) { line.textContent = x.message; });
        });
        keep.appendChild(f);
      }
      drawKeep();
    }

    // --------------------------------------------------------------
    // Tools
    // --------------------------------------------------------------

    var TOOLS = [['question', 'Question'], ['board', 'Board'], ['page', 'Page'], ['clock', 'Clock'], ['message', 'Message'], ['clear', 'Clear stage']];
    function drawTools() {
      var pane = F && F.pane('kit');
      if (!pane) return;
      pane.replaceChildren();
      if (!tool) {
        var grid = el('div', 'p2-tiles');
        TOOLS.forEach(function (t) {
          var b = el('button', 'p2-tile'); b.type = 'button';
          b.appendChild(el('span', 'p2-tile-name', t[1]));
          b.addEventListener('click', function () {
            if (t[0] === 'board') { send({ t: 'show', show: 'board' }); return F.show('now'); }
            if (t[0] === 'clear') { send({ t: 'show', show: 'blank' }); return F.show('now'); }
            tool = t[0]; drawTools();
          });
          grid.appendChild(b);
        });
        pane.appendChild(grid);
        return;
      }
      pane.appendChild(btn('All tools', 'link-button', function () { tool = null; drawTools(); }));
      var line = el('p', 'small'); line.setAttribute('role', 'status');
      ({ question: questionTool, page: pageTool, clock: clockTool, message: messageTool })[tool](pane, line);
      pane.appendChild(line);
    }
    function done() { tool = null; drawTools(); F.show('now'); }

    function questionTool(pane, line) {
      var kinds = L.QUESTION_KINDS.filter(function (k) { return k.key !== 'rank'; });
      var sel = el('select'); sel.setAttribute('aria-label', 'Kind of question');
      kinds.forEach(function (k) { var op = el('option', null, k.name); op.value = k.key; sel.appendChild(op); });
      var prompt = field('textarea', 'Your question'); prompt.rows = 2; prompt.maxLength = 500;
      var choices = field('textarea', 'Choices, one on each line'); choices.rows = 3;
      var low = field('input', 'Low end, optional'), high = field('input', 'High end, optional');
      var ends = el('div', 'open-ends'); ends.appendChild(low); ends.appendChild(high);
      var reveal = el('input'); reveal.type = 'checkbox';
      var lab = el('label', 'check'); lab.appendChild(reveal); lab.appendChild(document.createTextNode(' Show results as answers come in'));
      function fit() {
        var k = sel.value;
        choices.hidden = !(k === 'choice' || k === 'multi'); ends.hidden = k !== 'scale'; lab.hidden = k === 'short';
      }
      sel.addEventListener('change', fit); fit();
      [sel, prompt, choices, ends, lab].forEach(function (n) { pane.appendChild(n); });
      pane.appendChild(btn('Ask everyone', 'btn-secondary', function () {
        var q = L.parseQuestion({ kind: sel.value, prompt: prompt.value, choices: choices.value, points: 5, low: low.value, high: high.value });
        if (q.error) return (line.textContent = q.error);
        send({ t: 'ask', kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points, reveal: reveal.checked });
        done();
      }));
    }
    function pageTool(pane, line) {
      var r = field('input', 'yourname/repository', repo ? repo.name : '');
      pane.appendChild(el('h2', null, 'From a repository'));
      pane.appendChild(r);
      pane.appendChild(btn('Show its index.html', 'btn-secondary', function () {
        var x = R.repoOf(r.value);
        if (!x) return (line.textContent = 'Write it as yourname/repository.');
        line.textContent = 'Looking…';
        latest(x).then(function (sha) { newSha = null; send({ t: 'page', owner: x.owner, repo: x.repo, sha: sha }); done(); }, function (e) { line.textContent = e.message; });
      }));
      pane.appendChild(el('h2', null, 'Or paste one'));
      var h = field('textarea', 'A whole HTML page'); h.rows = 6;
      pane.appendChild(h);
      pane.appendChild(btn('Show this page', 'btn-secondary', function () {
        if (!h.value.trim()) return (line.textContent = 'Paste a page first.');
        send({ t: 'pasted', html: h.value }); done();
      }));
      pane.appendChild(el('p', 'small', 'Everyone in the call gets their own working copy.'));
    }
    function clockTool(pane) {
      var label = field('input', 'What it is for, optional'); label.maxLength = 80;
      pane.appendChild(label);
      var row = el('div', 'open-picks is-row');
      [1, 2, 3, 5, 10].forEach(function (m) {
        row.appendChild(btn(m + ' min', 'btn-secondary', function () { send({ t: 'clock', seconds: m * 60, label: label.value }); done(); }));
      });
      pane.appendChild(row);
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
      nameField(pane);
      var ul = el('ul', 'open-people');
      room.people.forEach(function (p) {
        var li = el('li');
        li.appendChild(el('span', null, (p.name || 'Guest') + (p.id === you ? ' (you)' : '')));
        if (p.id !== you) li.appendChild(btn('Make host', 'link-button', function () { send({ t: 'hand', to: p.id, name: p.name }); }));
        ul.appendChild(li);
      });
      pane.appendChild(ul);
      var g = el('div', 'p2-group');
      g.appendChild(el('h2', null, 'Without the add-on'));
      var url = R.link(location.origin, o.code);
      g.appendChild(el('p', 'small open-link', url));
      var copy = btn('Copy the link', 'btn-secondary', function () {
        Promise.resolve(navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { copy.textContent = 'Copied'; }, function () { copy.textContent = 'Select the link above to copy it'; });
      });
      g.appendChild(copy);
      pane.appendChild(g);
      pane.appendChild(btn(confirmEnd ? 'Yes, end it and erase the room' : 'End the session', 'btn-secondary', function () {
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
      person: function (p) {
        person = p;
        if (p.name && !client.name()) client.setName(p.name);
        frameRole = null; draw();
      }
    };
  }
  window.OpenRoom = { mount: mount };
})();
