// The Meet add-on's main stage (/addon/stage/). It reads nothing from the
// database and needs no sign-in: the teacher's own side panel tells it
// what to show (AddonLib.stageView, through Meet's notifyMainStage), and
// it shows only that, large and calm, ready to be presented. Meet
// delivers a panel's messages only to the same person's stage, so what
// this page shows is always the presenting teacher's choice.
(function () {
  var root = document.querySelector('[data-stage]');
  if (!root) return;
  var A = window.AddonLib, L = window.LiveLib;
  var cfg = window.MEET_ADDON || {};
  var view = null, last = '', heard = false;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(state) { root.querySelectorAll('.stage-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  // An open room (ADDON-DESIGN.md): this stage takes what it shows from the
  // room itself, inside Meet or on the room's own page.
  var RL = window.RoomLib, roomCode = RL ? RL.codeOfSearch(location.search) : null;
  var roomPage = !!roomCode && !framed;
  if (!A || !L || (!roomPage && (!framed || !window.meet || !window.meet.addon))) { show('outside'); return; }

  function clockText(part) {
    var left = part ? A.timeLeft(part.endsAt, Date.now()) : null;
    if (left == null) return '';
    return left ? L.clock(left) : 'Time is up';
  }

  function draw() {
    root.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view.mode; });
    $('[data-stage-rec]').hidden = !view.recording;
    var part = view.part;
    // The part sits small at the top when something else has the stage.
    $('[data-part]').hidden = view.mode === 'part' || view.mode === 'welcome' || view.mode === 'scene' || view.mode === 'app' || view.mode === 'studio' || view.mode === 'slides' || view.mode === 'blank' || view.mode === 'roomwelcome' || view.mode === 'roomboard' || view.mode === 'roomend' || !part;
    if (view.mode === 'slides') drawSlide(view.slides);
    drawLinks(view.mode === 'slides' ? view.slides.links : null);
    drawAsk();
    if (view.mode === 'scene') {
      var sc = view.scene;
      drawBoard(sc.board || null);
      $('[data-s-eyebrow]').textContent = sc.eyebrow;
      $('[data-s-title]').textContent = sc.title;
      var lines = $('[data-s-lines]'); lines.replaceChildren();
      // Long words get a smaller size rather than a cut (found in the live
      // Meet test: a Writing part's instructions ended mid-word).
      sc.lines.forEach(function (t) { lines.appendChild(el('p', 'stage-what' + (t.length > 240 ? ' is-long' : ''), t)); });
      var items = $('[data-s-items]'); items.replaceChildren();
      items.hidden = !sc.items.length;
      items.classList.toggle('many', sc.items.length > 4);
      sc.items.forEach(function (t) { var li = el('li'); li.appendChild(el('span', 'label', t)); items.appendChild(li); });
      $('[data-s-note]').hidden = !sc.note;
      $('[data-s-note]').textContent = sc.note || '';
    }
    $('[data-part-name]').textContent = part ? part.name : '';
    $('[data-part-kicker]').textContent = view.roomClock ? '' : part ? 'Now' : 'Welcome';
    $('[data-part-kicker]').hidden = !!view.roomClock;
    $('[data-part-big]').textContent = view.roomClock ? (part.name || 'Time left') : part ? part.name : 'The session begins soon.';
    if (view.mode === 'card') $('[data-card-body]').textContent = view.card.body;
    if (view.mode === 'check') {
      $('[data-prompt]').textContent = view.prompt;
      $('[data-check-kicker]').textContent = view.rerun ? 'Asked again: how have the answers moved?' : 'A question for everyone';
      // With the results shown, the bars come from them (an order is
      // sorted, first place at the top); before, the choices alone.
      var count = view.count;
      var rows = count && count.rows.length ? count.rows : (view.choices || []).map(function (c) { return { label: c }; });
      var ul = $('[data-choices]'); ul.replaceChildren();
      ul.hidden = !rows.length;
      ul.classList.toggle('many', rows.length > 4);
      // Long choices take two wide columns, and the question a smaller
      // size, so all of them stay in the frame (found in the loop's live
      // Meet test: eight long choices ran off the stage).
      var long = rows.some(function (r) { return String(r.label || '').length > 40; });
      ul.classList.toggle('long', long);
      root.querySelector('[data-view="check"]').classList.toggle('has-long', long || String(view.prompt || '').length > 90);
      // A scale reads as one row of points, not a tall list.
      ul.classList.toggle('scale', view.kind === 'scale' && !(count && count.rows.length));
      var mine = view.mine || {}, picks = mine.picks || (mine.choice ? [mine.choice] : []);
      var pickable = view.answerable && !(count && count.rows.length) && ['choice', 'scale', 'multi'].indexOf(view.kind) >= 0;
      ul.classList.toggle('is-pickable', !!pickable);
      rows.forEach(function (row, n) {
        var li = el('li');
        if (pickable) {
          var pick = el('button', 'stage-pick'); pick.type = 'button';
          pick.setAttribute('aria-pressed', String(picks.indexOf(n + 1) >= 0));
          pick.appendChild(el('span', 'label', row.label));
          pick.addEventListener('click', function () {
            var on = picks.indexOf(n + 1) >= 0, next = view.kind === 'multi' ? (on ? picks.filter(function (x) { return x !== n + 1; }) : picks.concat([n + 1])) : null;
            act(view.kind === 'multi' ? { a: 'answer', id: view.id, picks: next } : { a: 'answer', id: view.id, choice: n + 1 });
          });
          li.appendChild(pick);
          ul.appendChild(li);
          return;
        }
        li.appendChild(el('span', 'label', row.label));
        if (count && row.text != null) {
          var bar = el('span', 'bar'); bar.style.setProperty('--share', row.share + '%');
          // The first time this was asked (R17), as a faint bar beneath.
          if (row.before != null) { bar.classList.add('has-before'); bar.style.setProperty('--before', row.before + '%'); }
          li.appendChild(bar);
          li.appendChild(el('span', 'count', row.text));
        }
        ul.appendChild(li);
      });
      ul.classList.toggle('counted', !!(count && count.rows.length));
      drawWriting();
      $('[data-answer-panel]').hidden = !!view.answerable && view.kind !== 'rank';
      var words = $('[data-words]'); words.replaceChildren();
      words.hidden = !(count && count.words.length);
      if (count) count.words.forEach(function (w) { words.appendChild(el('li', 'size-' + w.size, w.word)); });
      $('[data-count-note]').hidden = !(count && count.note);
      $('[data-count-note]').textContent = count && count.note ? count.note : '';
      $('[data-count-total]').hidden = !count;
      $('[data-rerun-key]').hidden = !(count && count.rows.some(function (r) { return r.before != null; }));
      $('[data-count-total]').textContent = count ? L.counted(count.total, 'answer', 'answers') + ' so far, with no names.' : '';
    }
    if (view.mode === 'rooms') {
      var grid = $('[data-rooms-grid]'); grid.replaceChildren();
      if (!view.rooms.length) grid.appendChild(el('li', 'stage-quiet', 'No room has started its turns yet.'));
      view.rooms.forEach(function (r) {
        var li = el('li', 'stage-room' + (r.asking ? ' is-asking' : '') + (r.done ? ' is-done' : ''));
        li.appendChild(el('h2', null, r.name));
        li.appendChild(el('p', 'stage-room-place', r.text));
        var c = el('p', 'stage-room-clock'); c.setAttribute('data-ends', r.endsAt == null ? '' : String(r.endsAt)); li.appendChild(c);
        if (r.asking) li.appendChild(el('p', 'stage-room-asking', 'Would like the leader'));
        grid.appendChild(li);
      });
    }
    if (view.mode === 'path') {
      var pr = $('[data-path-rows]'); pr.replaceChildren();
      view.path.rows.forEach(function (row) {
        var li = el('li');
        li.appendChild(el('span', 'count', String(row.count)));
        var col = el('span', 'col'); var bar = el('span', 'bar'); bar.style.setProperty('--share', row.share + '%'); col.appendChild(bar); li.appendChild(col);
        li.appendChild(el('span', 'label', row.label));
        pr.appendChild(li);
      });
      $('[data-path-note]').textContent = view.path.sharing
        ? L.counted(view.path.sharing, 'person', 'people') + ' shared their stage on the path. Anyone can, from the panel.'
        : 'Nobody has said where they are yet. Anyone can, from the panel.';
    }
    if (view.mode === 'welcome') {
      var w = view.welcome;
      $('[data-w-cohort]').textContent = w.cohort;
      $('[data-w-week]').textContent = (w.week ? 'Week ' + w.week : w.week === 0 ? 'Prep' : '') + (w.title ? (w.week != null ? ': ' : '') + w.title : '');
      $('[data-w-challenge]').hidden = !w.challenge;
      $('[data-w-challenge]').textContent = w.challenge || '';
      $('[data-w-first]').hidden = !w.first;
      $('[data-w-first]').textContent = w.first ? 'First: ' + w.first.name + '. ' + (w.first.what || '') : '';
    }
    drawApp(view.mode === 'app' ? view : null);
    drawPage(view.mode === 'page' ? view : null);
    if (view.mode === 'roomboard') drawRoomBoard();
    if (view.mode === 'roomwelcome') drawRoomWelcome();
    drawStudio(view.mode === 'studio' ? view.studio : null);
    if (view.mode === 'item') {
      $('[data-who]').textContent = view.who;
      $('[data-what]').textContent = view.what;
      $('[data-note]').hidden = !view.note;
      $('[data-note]').textContent = view.note || '';
      $('[data-audience]').hidden = !view.audience;
      $('[data-audience]').textContent = view.audience ? 'What to show: ' + view.audience : '';
    }
    tick();
  }

  // A slide, drawn from the deck's text by the deck kit (tools/deck-kit). The
  // deck is drawn once and each slide kept, so moving through it is instant,
  // and the words are read out for anyone who cannot see the picture.
  var deckText = null, deckSlides = [], deckWords = [], shownKey = null, shownAt = null;
  function drawSlide(d) {
    var box = $('[data-slide]');
    if (d.text !== deckText) {
      deckText = d.text; shownKey = null;
      try { deckSlides = window.DeckKit.render(d.text); deckWords = window.DeckKit.words(d.text); }
      catch (e) { console.log('[stage] the slides did not draw: ' + (e && e.message)); deckSlides = []; deckWords = []; }
    }
    var at = Math.min(d.at, Math.max(0, deckSlides.length - 1));
    var key = at + ':' + d.shown;
    if (key === shownKey) return;
    shownKey = key;
    var svg = deckSlides[at] || '';
    if (d.shown) { try { svg = window.DeckKit.frame(d.text, at, d.shown); } catch (e) {} }
    box.innerHTML = svg;
    box.setAttribute('aria-label', (deckWords[at] || []).join('. '));
    // A new slide fades in; a point arriving on the same slide does not.
    box.classList.toggle('is-new', at !== shownAt);
    shownAt = at;
  }

  // The board in its own frame, made once per board so a new message (a
  // clock tick, a title edit) never reloads it while people draw.
  var boardSrc = null;
  // Everyone's own working copy of a person's app. The frame stays put through
  // every later message, or a person's place in the app would be lost.
  var appUrl = null;
  function drawApp(v) {
    var box = $('[data-app-frame]');
    if (!v) { if (appUrl) { appUrl = null; box.replaceChildren(); } return; }
    $('[data-app-who]').textContent = v.who;
    $('[data-app-open]').href = v.url;
    $('[data-app-note]').textContent = v.audience || v.note || '';
    if (v.url === appUrl) return;
    appUrl = v.url;
    var f = document.createElement('iframe');
    f.src = v.url;
    f.title = v.who + '’s app';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads');
    f.setAttribute('allow', 'clipboard-read; clipboard-write');
    box.replaceChildren(f);
  }

  // The slide editor, on the leader's own stage: the same slide, the same
  // editor, and the panel saves, because the stage has no sign-in.
  var studioKey = null;
  function drawStudio(d) {
    var box = $('[data-studio]');
    if (!d) { if (studioKey) { studioKey = null; box.replaceChildren(); } return; }
    if (d.key === studioKey || !window.SlideStudio) return;
    studioKey = d.key;
    Object.keys(d.gh || {}).forEach(function (k) { window.SlidesLib.ghHold(k, d.gh[k]); });
    window.SlideStudio.mount(box, { text: d.text, onChange: function (t) { act({ a: 'deck', key: d.key, text: t }); } });
    if (room) { var done = el('button', 'btn-primary studio-done', 'Done'); done.type = 'button'; done.addEventListener('click', function () { act({ a: 'studioDone' }); }); box.prepend(done); }
  }

  // A question in their own words, typed on the stage.
  function drawWriting() {
    var box = $('[data-stage-write]');
    var on = view.answerable && (view.kind === 'short' || view.kind === 'words') && !(view.count && view.count.rows.length);
    box.hidden = !on;
    if (!on) { box.replaceChildren(); box.dataset.id = ''; return; }
    if (box.dataset.id === view.id && box.contains(document.activeElement)) return;
    box.dataset.id = view.id;
    box.replaceChildren();
    var input = el(view.kind === 'words' ? 'input' : 'textarea');
    input.setAttribute('aria-label', 'Your answer');
    if (view.kind === 'words') input.maxLength = 60; else { input.rows = 2; input.maxLength = 1000; }
    input.value = (view.mine && view.mine.body) || '';
    var send = el('button', 'stage-send', view.mine && view.mine.body ? 'Change my answer' : 'Send my answer');
    box.appendChild(input); box.appendChild(send);
    box.onsubmit = function (ev) { ev.preventDefault(); if (input.value.trim()) { act({ a: 'answer', id: view.id, body: input.value }); send.textContent = 'Sent'; } };
  }

  var stageClient = null;
  function act(a) { if (room) return roomAct(a); if (stageClient) try { Promise.resolve(stageClient.notifySidePanel(A.actMessage(a))).catch(function () {}); } catch (e) {} }

  // What a slide shows from GitHub, ready to open.
  function drawLinks(links) {
    var box = $('[data-slide-links]');
    box.replaceChildren();
    box.hidden = !links || !links.length;
    if (box.hidden) return;
    var d = el('details', 'stage-links');
    d.appendChild(el('summary', null, 'Open on GitHub'));
    (links || []).forEach(function (l) {
      var a = el('a', 'stage-chip', l.label); a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      d.appendChild(a);
    });
    box.appendChild(d);
  }
  // A learner asks from the stage itself, and their panel sends it.
  function drawAsk() {
    var open = $('[data-stage-ask-open]');
    if (open) open.hidden = !view.learner;
  }
  function wireAsk() {
    var bar = $('[data-stage-reacts]'), box = $('[data-stage-ask]');
    var b = el('button', 'stage-ask-open', 'Ask'); b.type = 'button'; b.setAttribute('data-stage-ask-open', ''); b.hidden = true;
    b.addEventListener('click', function () { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); });
    bar.appendChild(b);
    box.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var kind = box.querySelector('select').value, input = box.querySelector('input');
      if (!input.value.trim() && ['board', 'breakouts'].indexOf(kind) < 0) return;
      act({ a: 'request', kind: kind, body: input.value.trim() });
      input.value = ''; box.hidden = true;
    });
  }

  // Reactions, within reach on the stage itself.
  function drawReactBar() {
    var bar = $('[data-stage-reacts]');
    if (!bar || !window.ReactLib || bar.childElementCount) return;
    window.ReactLib.REACTIONS.forEach(function (r) {
      var b = el('button', 'stage-react'); b.type = 'button';
      b.textContent = r.emoji; b.title = r.label; b.setAttribute('aria-label', r.label);
      b.addEventListener('click', function () { act({ a: 'react', key: r.key }); });
      bar.appendChild(b);
    });
  }

  function drawBoard(src) {
    var box = $('[data-s-board]');
    root.querySelector('[data-view="scene"]').classList.toggle('has-board', !!src);
    box.hidden = !src;
    if (src === boardSrc) return;
    boardSrc = src;
    box.replaceChildren();
    if (!src) return;
    var f = document.createElement('iframe');
    f.src = src;
    f.title = 'The design stage';
    f.setAttribute('allow', 'clipboard-read; clipboard-write');
    box.appendChild(f);
  }

  // Reactions rise from the foot of the stage and fade; each starts at a
  // different place so a burst reads as many people, not one.
  var R = window.ReactLib, lane = 0;
  function drawReactions(m) {
    var layer = $('[data-react-layer]');
    m.floats.forEach(function (f, i) {
      var r = R.reaction(f.r);
      if (!r || layer.childElementCount > 40) return;
      var d = el('span', 'react-float');
      d.appendChild(el('span', 'react-emoji', r.emoji));
      if (f.n) d.appendChild(el('span', 'react-name', f.n));
      lane = (lane + 37) % 90;
      d.style.left = (5 + lane) + '%';
      d.style.animationDelay = (i * 120) + 'ms';
      d.addEventListener('animationend', function () { d.remove(); });
      layer.appendChild(d);
    });
    var bar = $('[data-stance]'), sh = R.shares(m.stance);
    bar.hidden = !sh;
    // The stage keeps room at its foot for the bar, so nothing runs under it.
    root.classList.toggle('has-stance', !!sh);
    if (sh) {
      ['agree', 'unsure', 'disagree'].forEach(function (k) {
        bar.querySelector('[data-st="' + k + '"]').style.flexGrow = String(sh[k]);
        bar.querySelector('[data-stk="' + k + '"]').textContent = R.stance(k).label + ' ' + m.stance[k];
      });
    }
  }

  function tick() {
    if (!view) return;
    root.querySelectorAll('[data-ends]').forEach(function (p) {
      var ends = Number(p.getAttribute('data-ends'));
      var left = p.getAttribute('data-ends') ? A.timeLeft(ends, Date.now()) : null;
      p.textContent = left == null ? '' : left ? L.clock(left) + ' left in this step' : 'Time to move on';
      p.classList.toggle('is-over', left === 0);
    });
    if (view.mode === 'card') {
      var cl = view.card.endsAt ? A.timeLeft(view.card.endsAt, Date.now()) : null;
      $('[data-card-clock]').textContent = cl == null ? '' : cl ? L.clock(cl) : 'Time is up';
    }
    var t = clockText(view.part);
    // A scene's words can fill the stage, so its clock sits small at the
    // top (found in the live Meet test: a long part pushed it out of the
    // frame); a break, which is only its clock, keeps it large.
    var scene = view.mode === 'scene' || view.mode === 'slides' || view.mode === 'roomboard' || view.mode === 'roomwelcome' || view.mode === 'page' || view.mode === 'check', big = view.mode === 'scene' && view.scene && view.scene.eyebrow === 'Break';
    $('[data-part-name]').hidden = scene;
    $('[data-clock]').textContent = t ? (scene ? t : ', ' + t) : '';
    if (scene) $('[data-part]').hidden = big || !t;
    $('[data-clock-big]').textContent = t;
    $('[data-s-clock]').hidden = !(big && t);
    $('[data-s-clock]').textContent = t;
    // "Back in 3 minutes" and "Time is up" never show together.
    if (big) $('[data-s-note]').hidden = !view.scene.note || t === 'Time is up';
  }
  setInterval(tick, 1000);

  // ------------------------------------------------------------------
  // An open room
  // ------------------------------------------------------------------

  var room = null, roomState = null, roomEnded = false, roomTalk = '', roomHtml = '', roomMine = null, pageKey = null;
  // The host edits their slides on their own stage, which shares the panel's
  // storage: the panel says when, and the slides are saved there as they change.
  var TALK = 'hs-room-talk', EDIT = 'hs-room-edit';
  function store(k, v) { try { if (v == null) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function roomEditing() { return !!roomState && roomState.on && roomState.host === room.you() && store(EDIT) === roomCode; }

  function roomDraw() {
    if (!roomState) return;
    var mine = roomMine && roomState.question && roomMine.id === roomState.question.id ? roomMine.answer : null;
    view = roomEnded ? { mode: 'roomend', part: null } : roomEditing() ? { mode: 'studio', part: null, studio: { key: 'room', text: store(TALK) || RL.STARTER } } : RL.toView(roomState, { addon: A, you: room.you(), talk: roomTalk, html: roomHtml, mine: mine });
    show('ready'); draw();
    // A room's answers carry no names, so the cohort's line about leaders does not apply.
    $('[data-answer-panel]').hidden = true;
    var st = roomState.stance;
    drawReactions({ floats: [], stance: st && st.total ? st : null });
  }
  function roomAct(a) {
    if (a.a === 'answer') room.send({ t: 'answer', id: a.id, choice: a.choice, picks: a.picks, body: a.body });
    else if (a.a === 'deck') store(TALK, String(a.text || ''));
    else if (a.a === 'studioDone') { store(EDIT, ''); roomDraw(); }
    else if (a.a === 'react') { var r = R.REACTIONS.filter(function (x) { return x.key === a.key; })[0]; if (r) room.send({ t: 'react', r: r.id }); }
  }
  function useRoom() {
    root.classList.add('is-room');
    window.addEventListener('storage', function (e) { if (e.key === EDIT) roomDraw(); });
    drawReactBar();
    var bar = $('[data-stage-reacts]');
    R.STANCES.forEach(function (s) {
      var b = el('button', 'stage-stance', s.label); b.type = 'button';
      b.addEventListener('click', function () { room.send({ t: 'stance', stance: s.id }); });
      bar.appendChild(b);
    });
    room = window.RoomClient.connect({ code: roomCode, role: 'stage', on: {
      room: function (r) { if (r.on) roomEnded = false; roomState = r; roomDraw(); },
      talk: function (t) { roomTalk = t; roomDraw(); },
      html: function (h) { roomHtml = h; roomDraw(); },
      welcome: function (m) { roomMine = m.mine; },
      mine: function (m) { roomMine = m; roomDraw(); },
      floats: function (f) { var st = roomState && roomState.stance; drawReactions({ floats: f, stance: st && st.total ? st : null }); },
      ended: function () { roomEnded = true; roomMine = null; roomTalk = ''; roomHtml = ''; roomDraw(); },
      status: function (s) { $('[data-room-off]').hidden = s !== 'off'; }
    } });
    document.addEventListener('keydown', function (e) {
      var k = R.keyFor(e);
      if (!k) return;
      if (k.reaction) room.send({ t: 'react', r: k.reaction });
      if (k.stance) room.send({ t: 'stance', stance: k.stance });
    });
    var name = $('[data-rw-name]');
    name.hidden = !roomPage || !!window.RoomClient.savedName();
    name.addEventListener('submit', function (e) { e.preventDefault(); room.setName(name.querySelector('input').value); name.hidden = true; });
    $('[data-rb-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = e.target.querySelector('input');
      if (input.value.trim()) room.send({ t: 'note', text: input.value });
      input.value = '';
    });
  }
  function drawRoomWelcome() {
    $('[data-rw-kicker]').textContent = 'Welcome';
    $('[data-rw-title]').textContent = view.waiting ? 'This session has not started yet.' : (view.title || 'The session is about to begin.');
    $('[data-rw-host]').textContent = view.host ? 'With ' + view.host : '';
  }
  function drawRoomBoard() {
    $('[data-rb-prompt]').textContent = view.prompt;
    var list = $('[data-rb-notes]'); list.replaceChildren();
    list.classList.toggle('is-empty', !view.notes.length);
    if (!view.notes.length) list.appendChild(el('li', 'stage-quiet', 'Nothing here yet. Add the first idea.'));
    view.notes.forEach(function (n) {
      var li = el('li', 'room-note');
      li.appendChild(el('p', 'room-note-text', n.text));
      var foot = el('p', 'room-note-foot');
      foot.appendChild(el('span', 'room-note-who', n.name || ''));
      var v = el('button', 'room-vote', n.votes.length ? String(n.votes.length) : 'Vote'); v.type = 'button';
      v.setAttribute('aria-label', 'Vote for this. ' + n.votes.length + ' so far.');
      v.setAttribute('aria-pressed', String(n.votes.indexOf(view.you) >= 0));
      v.addEventListener('click', function () { room.send({ t: 'vote', id: n.id }); });
      foot.appendChild(v);
      if (n.by === view.you || view.host) {
        var x = el('button', 'room-unnote', 'Remove'); x.type = 'button';
        x.addEventListener('click', function () { room.send({ t: 'unnote', id: n.id }); });
        foot.appendChild(x);
      }
      li.appendChild(foot);
      list.appendChild(li);
    });
  }
  // A page runs sealed off: scripts and forms, nothing else. Everyone gets
  // their own working copy, and it stays put until the page itself changes.
  function drawPage(v) {
    var box = $('[data-page-frame]');
    if (!v) { if (pageKey) { pageKey = null; box.replaceChildren(); } return; }
    var p = v.page, key = p.url ? 'url:' + p.url : p.owner ? p.owner + '/' + p.repo + '@' + p.sha : 'pasted:' + p.htmlV;
    if (key === pageKey) return;
    pageKey = key;
    var f = document.createElement('iframe');
    f.title = p.name || 'A page from the host';
    box.replaceChildren(f);
    // A website at its own address keeps its own origin, so it can keep what a
    // person does in it; it is never this site (RoomLib and the room refuse it).
    if (p.url) {
      f.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');
      f.setAttribute('allow', 'clipboard-write');
      f.src = p.url;
      return;
    }
    f.setAttribute('sandbox', 'allow-scripts allow-forms');
    if (!p.owner) { f.srcdoc = v.html || ''; return; }
    fetch(RL.rawUrl(p, p.sha, 'index.html')).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    }).then(function (h) { f.srcdoc = RL.withBase(h, RL.assetBase(p, p.sha)); }, function () {
      box.replaceChildren(el('p', 'stage-quiet', 'This page could not be loaded. It needs an index.html in a public repository.'));
    });
  }

  function open() {
    if (roomPage) { useRoom(); return; }
    if (!cfg.cloudProjectNumber) { $('[data-error-text]').textContent = 'This add-on is not set up yet.'; return show('error'); }
    Promise.race([
      window.meet.addon.createAddonSession({ cloudProjectNumber: String(cfg.cloudProjectNumber) }),
      new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, 10000); })
    ]).then(function (session) {
      return session.createMainStageClient();
    }).then(function (stage) {
      stageClient = stage;
      if (roomCode) { useRoom(); return; }
      drawReactBar();
      wireAsk();
      stage.on('frameToFrameMessage', function (m) {
        var react = m && window.ReactLib ? window.ReactLib.readStage(m.payload) : null;
        if (react) return drawReactions(react);
        var code = m && window.CodeLib ? window.CodeLib.readStage(m.payload) : null;
        if (code) {
          $('[data-code-view]').hidden = !code.code;
          if (code.code) { $('[data-code-lang]').textContent = window.CodeLib.LANGS[code.code.lang]; $('[data-code-text]').textContent = code.code.text; }
          return;
        }
        if (!m || m.payload === last) return;
        var v = A.readStageMessage(m.payload);
        if (!v) return;
        last = m.payload; view = v; heard = true;
        $('[data-stage-waiting]').hidden = true;
        show('ready'); draw();
      });
      view = { mode: 'part', part: null };
      show('ready'); draw();
      document.addEventListener('keydown', function (e) {
        var msg = A.keyMessage(e);
        if (!msg) return;
        e.preventDefault();
        try { Promise.resolve(stage.notifySidePanel(msg)).catch(function () {}); } catch (x) {}
      });
      // Ask the panel for what to show, since a message only reaches a
      // frame that is already listening. A learner's panel can open or
      // sign in long after the stage, or close and come back, so the stage
      // keeps asking: often until it hears, then now and then.
      var asked = 0;
      function ask() {
        asked += 1;
        try { Promise.resolve(stage.notifySidePanel(A.HELLO)).catch(function () {}); } catch (e) {}
        if (!heard && asked === 3) { console.log('[stage] no word from the side panel yet'); $('[data-stage-waiting]').hidden = false; }
        setTimeout(ask, heard ? 15000 : 3000);
      }
      ask();
    }, function () { show('outside'); });
  }
  open();
})();
