// The Meet add-on's main stage (/addon/stage/). It reads nothing from the
// database and needs no sign-in: the teacher's own side panel tells it
// what to show (AddonLib.stageView, through Meet's notifyMainStage), and
// it shows only that, large and calm, ready to be presented. Meet
// delivers a panel's messages only to the same person's stage, so what
// this page shows is always the presenting teacher's choice.
(function () {
  var root = document.querySelector('[data-stage]');
  // Every stage keeps its reactions in a strip at the foot, centered, and
  // ends above it, so nothing they do covers what is shown (Ben, November 11, 2026).
  if (root) root.classList.add('has-strip');
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

  // Every view fits the stage it is shown on, whatever its size (Ben,
  // November 12, 2026: "The content should be responsive to screen size").
  // Type is sized to the stage, with a floor so it stays readable; when a
  // view still runs past the space above the strip (a question with four
  // choices on a laptop-sized stage), the whole view scales down to fit.
  var fitFrame = 0;
  function fitSoon() { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fit); }
  function extent(box) {
    var top = Infinity, bottom = -Infinity;
    Array.prototype.forEach.call(box.children, function (k) {
      var r = k.getBoundingClientRect();
      if (!r.height) return;
      top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
    });
    return bottom > top ? bottom - top : 0;
  }
  function fit() {
    var ready = root.querySelector('.stage-ready:not([hidden])');
    if (!ready) return;
    ready.querySelectorAll('.stage-body').forEach(function (b) { b.style.zoom = ''; });
    var body = ready.querySelector('.stage-body:not([hidden])');
    // A view that fills the stage on purpose (the board) is never scaled
    // (found in a learner's real call: the board drew at a third of its size).
    if (!body || body.classList.contains('has-board') || body.querySelector('iframe')) return;
    var cs = getComputedStyle(ready), box = ready.getBoundingClientRect(), head = ready.querySelector('.stage-head');
    var top = head && head.getBoundingClientRect().height ? head.getBoundingClientRect().bottom + (parseFloat(cs.rowGap) || 0) : box.top + (parseFloat(cs.paddingTop) || 0);
    // The stage's own box grows with what is in it, so the window is the limit.
    var room = Math.min(box.bottom, window.innerHeight) - (parseFloat(cs.paddingBottom) || 0) - top;
    var need = extent(body);
    if (room <= 0 || need <= room) return;
    var z = Math.max(0.4, room / need);
    for (var i = 0; i < 8; i++) {
      body.style.zoom = String(z);
      if (extent(body) <= room + 1 || z <= 0.4) break;
      z = Math.max(0.4, z * 0.94);
    }
  }
  window.addEventListener('resize', fitSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);

  function draw() {
    fitSoon();
    root.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view.mode; });
    $('[data-stage-rec]').hidden = !view.recording;
    var part = view.part;
    // The part sits small at the top when something else has the stage.
    // A clock the leader started shows over whatever the stage shows (found
    // after Week 2: a started clock never appeared on a cohort's stage).
    // A clock the leader started has its own place over every view, since a
    // live app or website covers the part line (found after Week 2).
    var leaderClock = !!(part && part.key === 'clock' && part.endsAt) && view.mode !== 'studio' && view.mode !== 'part';
    $('[data-leader-clock]').hidden = !leaderClock;
    $('[data-part]').hidden = leaderClock || (view.mode === 'part' || view.mode === 'welcome' || view.mode === 'scene' || view.mode === 'app' || view.mode === 'apps' || view.mode === 'doc' || view.mode === 'studio' || view.mode === 'slides' || view.mode === 'blank' || view.mode === 'roomwelcome' || view.mode === 'roomboard' || view.mode === 'roomend' || !part);
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
    // Until its own panel speaks, this stage cannot know where the session is
    // (each person's stage shows only what their panel sends), so it never
    // claims the session has not begun (Ben, November 12, 2026: it "continues
    // to show even though the leader has started the class").
    $('[data-part-kicker]').textContent = view.roomClock ? '' : part ? 'Now' : heard ? 'Welcome' : '';
    $('[data-part-kicker]').hidden = !!view.roomClock || (!part && !heard);
    $('[data-part-big]').textContent = view.roomClock ? (part.name || 'Time left') : part ? part.name : heard ? 'The session begins soon.' : 'Joining the session…';
    if (view.mode === 'card') $('[data-card-body]').textContent = view.card.body;
    if (view.mode === 'check') {
      $('[data-prompt]').textContent = view.prompt;
      $('[data-shown]').hidden = !view.shown;
      $('[data-shown-text]').textContent = view.shown ? view.shown.text : '';
      $('[data-shown-who]').hidden = !(view.shown && view.shown.who);
      $('[data-shown-who]').textContent = view.shown && view.shown.who ? '\u2014 ' + view.shown.who : '';
      // A learner who can answer reads what to do; everyone else, what it is.
      var canPick = view.answerable && ['choice', 'scale', 'multi'].indexOf(view.kind) >= 0, canWrite = view.answerable && (view.kind === 'short' || view.kind === 'words');
      $('[data-check-kicker]').textContent = view.rerun ? 'Asked again: how have the answers moved?'
        : canPick ? (view.kind === 'multi' ? 'Choose any that fit' : 'Choose your answer') : canWrite ? 'Write your answer' : 'A question for everyone';
      // With the results shown, the bars come from them (an order is
      // sorted, first place at the top); before, the choices alone.
      var count = view.count;
      var mine = view.mine || {}, picks = mine.picks || (mine.choice ? [mine.choice] : []);
      // Anyone who can still answer gets the choices as buttons, in their own
      // order, with the counts beside them once shown (Week 2: a question
      // planned with its results showing drew only bars, and nobody could answer).
      var pickable = view.answerable && ['choice', 'scale', 'multi'].indexOf(view.kind) >= 0 && (view.choices || []).length;
      var byLabel = {};
      if (count) count.rows.forEach(function (r) { byLabel[r.label] = r; });
      var rows = pickable ? view.choices.map(function (c) { return Object.assign({}, byLabel[c] || {}, { label: c }); })
        : count && count.rows.length ? count.rows : (view.choices || []).map(function (c) { return { label: c }; });
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
          if (count && row.text != null) {
            var pbar = el('span', 'bar'); pbar.style.setProperty('--share', row.share + '%');
            li.appendChild(pbar); li.appendChild(el('span', 'count', row.text));
          }
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
      // Once a learner's answer is saved, their stage says so (Week 2: nobody
      // could tell whether pressing had answered).
      var ap = $('[data-answer-panel]'), saved = view.mine && (view.mine.choice || (view.mine.picks || []).length || view.mine.body);
      if (!ap.dataset.base) ap.dataset.base = ap.textContent;
      // Only a learner who can answer reads a line here: that their answer is
      // in, or, for an order (answered in the panel), where to answer.
      var inPanel = view.answerable && view.kind === 'rank' && !saved;
      ap.textContent = view.answerable && saved ? 'Your answer is in. You can change it until the question closes.' : ap.dataset.base;
      ap.classList.toggle('is-in', !!(view.answerable && saved));
      ap.hidden = !((view.answerable && saved) || inPanel);
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
      var wname = w.name || (w.week ? 'Week ' + w.week : w.week === 0 ? 'Prep' : '');
      $('[data-w-week]').textContent = wname + (w.title ? (wname ? ': ' : '') + w.title : '');
      $('[data-w-challenge]').hidden = !w.challenge;
      $('[data-w-challenge]').textContent = w.challenge || '';
      $('[data-w-first]').hidden = !w.first;
      $('[data-w-first]').textContent = w.first ? 'First: ' + w.first.name + '. ' + (w.first.what || '') : '';
    }
    drawApp(view.mode === 'app' ? view : null);
    drawDoc(view.mode === 'doc' ? view : null);
    drawApps(view.mode === 'apps' ? view : null);
    drawBeside(view.mode === 'check' && view.doc ? view.doc : null, view.mode === 'check' && !view.doc && view.slide ? view.slide : null);
    if (view.mode === 'people') {
      var pl = $('[data-people-list]'); pl.replaceChildren();
      pl.classList.toggle('many', view.who.length > 3);
      view.who.forEach(function (n) { pl.appendChild(el('li', null, n)); });
      $('[data-people-audience]').hidden = !view.audience;
      $('[data-people-audience]').textContent = view.audience || '';
    }
    if (view.mode === 'room') {
      $('[data-room-name]').textContent = view.room.name;
      $('[data-room-people]').textContent = view.room.people.join(', ');
      var dl = $('[data-room-answers]'); dl.replaceChildren();
      view.room.items.forEach(function (x) { if (x.q) dl.appendChild(el('dt', null, x.q)); dl.appendChild(el('dd', null, x.a)); });
    }
    if (view.mode === 'answer') {
      $('[data-answer-prompt]').textContent = view.answer.prompt;
      $('[data-answer-text]').textContent = view.answer.text;
      $('[data-answer-who]').hidden = !view.answer.who;
      $('[data-answer-who]').textContent = view.answer.who ? '— ' + view.answer.who : '';
    }
    if (view.mode === 'person') {
      $('[data-person-who]').textContent = view.who;
      $('[data-person-say]').hidden = !view.say;
      $('[data-person-say]').textContent = view.say ? 'say it like ' + view.say : '';
      $('[data-person-audience]').hidden = !view.audience;
      $('[data-person-audience]').textContent = view.audience || '';
    }
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
      try { deckSlides = window.SlidesLib.render(window.DeckKit, d.text); deckWords = window.DeckKit.words(d.text); window.SlidesLib.pictures(d.text).forEach(function (pic, i) { if (pic) deckWords[i] = [pic.alt || 'A picture']; }); }
      catch (e) { console.log('[stage] the slides did not draw: ' + (e && e.message)); deckSlides = []; deckWords = []; }
    }
    var at = Math.min(d.at, Math.max(0, deckSlides.length - 1));
    var key = at + ':' + d.shown + ':' + (Array.isArray(d.who) ? d.who.join('|') : '');
    if (key === shownKey) return;
    shownKey = key;
    var svg = deckSlides[at] || '';
    if (d.shown) { try { svg = window.DeckKit.frame(d.text, at, d.shown); } catch (e) {} }
    box.innerHTML = svg;
    box.setAttribute('aria-label', (deckWords[at] || []).join('. '));
    var who = $('[data-slide-who]'), names = Array.isArray(d.who) ? d.who : [];
    who.hidden = !names.length;
    who.textContent = names.join(', ');
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

  // Two or three apps side by side; each frame stays while its app does.
  var appsKey = null;
  function drawApps(v) {
    var grid = $('[data-apps-grid]');
    var key = v ? v.apps.map(function (a) { return a.url; }).join(' ') : null;
    if (key === appsKey) return;
    appsKey = key;
    grid.replaceChildren();
    if (!v) return;
    grid.style.setProperty('--apps', String(v.apps.length));
    v.apps.forEach(function (a) {
      var cell = el('div', 'stage-apps-cell');
      var bar = el('div', 'stage-app-bar');
      bar.appendChild(el('strong', null, a.who + '’s app'));
      var open = el('a', 'stage-app-open', 'Open'); open.href = a.url; open.target = '_blank'; open.rel = 'noopener';
      bar.appendChild(open);
      var box = el('div', 'stage-app-frame');
      var f = document.createElement('iframe');
      f.src = a.url; f.title = a.who + '’s app';
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads');
      box.appendChild(f);
      cell.appendChild(bar); cell.appendChild(box);
      grid.appendChild(cell);
    });
  }

  // A part's material beside its open question, so people answer with it in view.
  var besideSrc = null;
  function drawBeside(doc, slide) {
    var side = $('[data-beside]'), box = $('[data-beside-frame]');
    side.hidden = !doc && !slide;
    root.classList.toggle('has-beside', !!(doc || slide));
    if (!doc && !slide) root.classList.remove('beside-big');
    // The bar keeps Enlarge for a slide too; the name and the link are a document's.
    $('[data-beside-name]').hidden = !doc;
    $('[data-beside-open]').hidden = !doc;
    side.classList.toggle('is-slide', !doc && !!slide);
    if (!doc && slide) {
      var key = 'slide:' + slide.at + ':' + slide.shown + ':' + slide.text.length;
      if (key === besideSrc) return;
      besideSrc = key;
      var svg = '';
      try { svg = slide.shown ? window.DeckKit.frame(slide.text, slide.at, slide.shown) : (window.SlidesLib.render(window.DeckKit, slide.text)[slide.at] || ''); } catch (e) {}
      box.innerHTML = svg;
      return;
    }
    if (!doc) { if (besideSrc) { besideSrc = null; box.replaceChildren(); } return; }
    $('[data-beside-name]').textContent = doc.name;
    $('[data-beside-open]').href = doc.url;
    if (doc.url === besideSrc) return;
    besideSrc = doc.url;
    root.classList.remove('beside-big');
    box.replaceChildren(docElement(doc));
  }
  // Each person can enlarge what sits beside a question on their own stage,
  // to read it, and put it back.
  var bigButton = $('[data-beside-big]');
  if (bigButton) bigButton.addEventListener('click', function () {
    var big = root.classList.toggle('beside-big');
    bigButton.textContent = big ? 'Back to the question' : 'Enlarge';
    bigButton.setAttribute('aria-pressed', big ? 'true' : 'false');
  });

  // What a document is decides how it is shown: a picture or a video fits the
  // space it has, and anything else is framed (found running an imported
  // course: a picture in a frame drew at full size and spilled off the stage).
  var PICTURE_FILE = /\.(png|jpe?g|gif|webp|svg|avif)($|[?#])/i, VIDEO_FILE = /\.(mp4|webm|mov|m4v)($|[?#])/i, PDF_FILE = /\.pdf($|[?#])/i;
  function docElement(doc) {
    var url = doc.url;
    if (PICTURE_FILE.test(url)) {
      var img = document.createElement('img');
      img.src = url; img.alt = doc.name; img.className = 'stage-doc-fit';
      img.setAttribute('referrerpolicy', 'no-referrer');
      return img;
    }
    if (VIDEO_FILE.test(url)) {
      // Each person presses play: Meet gives the stage no autoplay.
      var v = document.createElement('video');
      v.src = url; v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.className = 'stage-doc-fit';
      v.setAttribute('aria-label', doc.name);
      return v;
    }
    // Chrome will not draw a PDF inside Meet's frames (measured in a real
    // call: a broken page, sandboxed or not), so a PDF opens in its own tab.
    if (PDF_FILE.test(url)) {
      var card = el('div', 'stage-doc-card');
      var open = el('a', 'btn-primary', 'Open the PDF');
      open.href = url; open.target = '_blank'; open.rel = 'noopener';
      card.appendChild(open);
      return card;
    }
    var f = document.createElement('iframe');
    f.src = url;
    f.title = doc.name;
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
    f.setAttribute('referrerpolicy', 'no-referrer');
    return f;
  }

  // A part's document, framed for everyone; the frame stays through later
  // messages so a person's place in it is kept.
  var docSrc = null;
  function drawDoc(v) {
    var box = $('[data-doc-frame]');
    if (!v) { if (docSrc) { docSrc = null; box.replaceChildren(); } return; }
    $('[data-doc-name]').textContent = v.doc.name;
    $('[data-doc-open]').href = v.doc.url;
    if (v.doc.url === docSrc) return;
    docSrc = v.doc.url;
    box.replaceChildren(docElement(v.doc));
  }

  // The slide editor, on the leader's own stage: the same slide, the same
  // editor, and the panel saves, because the stage has no sign-in.
  var studioKey = null, studioApi = null;
  function drawStudio(d) {
    var box = $('[data-studio]');
    if (!d) { if (studioKey) { studioKey = null; box.replaceChildren(); } return; }
    if (d.key === studioKey || !window.SlideStudio) return;
    studioKey = d.key;
    Object.keys(d.gh || {}).forEach(function (k) { window.SlidesLib.ghHold(k, d.gh[k]); });
    // In a room, Done sits with the studio's own buttons, and the notes never
    // leave this browser.
    var done = null;
    if (room) { done = el('button', 'btn-secondary small', 'Done'); done.type = 'button'; done.addEventListener('click', function () { act({ a: 'studioDone' }); }); }
    studioApi = window.SlideStudio.mount(box, { text: d.text, done: done, onChange: function (t) { act({ a: 'deck', key: d.key, text: t }); } });
    var head = room && box.querySelector('.studio-notes-head');
    if (head && window.UI) head.replaceChildren(window.UI.visibility('device', 'Your notes'));
  }

  // A question in their own words, typed on the stage.
  function drawWriting() {
    var box = $('[data-stage-write]');
    var on = view.answerable && (view.kind === 'short' || view.kind === 'words');
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
    f.title = 'The board';
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
    var lc = $('[data-leader-clock]');
    if (lc && !lc.hidden) lc.textContent = (view.part.name ? view.part.name + ' ' : '') + t;
    // A scene's words can fill the stage, so its clock sits small at the
    // top (found in the live Meet test: a long part pushed it out of the
    // frame); a break, which is only its clock, keeps it large.
    var scene = view.mode === 'scene' || view.mode === 'slides' || view.mode === 'roomboard' || view.mode === 'roomwelcome' || view.mode === 'page' || view.mode === 'check', big = view.mode === 'scene' && view.scene && view.scene.eyebrow === 'Break';
    $('[data-part-name]').hidden = scene;
    $('[data-clock]').textContent = t ? (scene ? t : ', ' + t) : '';
    if (scene) $('[data-part]').hidden = big || !t || !!(lc && !lc.hidden);
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
  // The host edits their slides on their own stage. Inside Meet the stage and
  // the panel do not share storage, so the panel says when through Meet's
  // frame messages and the stage sends each change back. Outside Meet (a test
  // with two tabs) they share storage, and that path still works.
  var TALK = 'hs-room-talk', EDIT = 'hs-room-edit';
  var editOn = false, editText = null, heardPanel = false, deckTimer = null;
  function store(k, v) { try { if (v == null) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function toPanel(k, data) { if (stageClient) try { Promise.resolve(stageClient.notifySidePanel(RL.frameMessage(k, data))).catch(function () {}); } catch (e) {} }
  function roomEditing() { return !!roomState && roomState.on && roomState.host === room.you() && (editOn || store(EDIT) === roomCode); }
  function heardFrame(m) {
    if (m.k === 'you') {
      heardPanel = true;
      room.adopt(m.secret);
      setEdit(!!m.edit, m.text);
    } else if (m.k === 'edit') setEdit(!!m.on, m.text);
  }
  function setEdit(on, text) {
    if (on === editOn) return;
    if (on && text != null) editText = text;
    if (!on && studioApi) studioApi.flush();
    editOn = on;
    roomDraw();
  }

  function roomDraw() {
    if (!roomState) return;
    var mine = roomMine && roomState.question && roomMine.id === roomState.question.id ? roomMine.answer : null;
    view = roomEnded ? { mode: 'roomend', part: null } : roomEditing() ? { mode: 'studio', part: null, studio: { key: 'room', text: (editOn && editText) || store(TALK) || RL.STARTER } } : RL.toView(roomState, { addon: A, you: room.you(), talk: roomTalk, html: roomHtml, mine: mine });
    show('ready'); draw();
    // A room's answers carry no names, so the cohort's line about leaders does not apply.
    $('[data-answer-panel]').hidden = true;
    var st = roomState.stance;
    drawReactions({ floats: [], stance: st && st.total ? st : null });
  }
  function roomAct(a) {
    if (a.a === 'answer') room.send({ t: 'answer', id: a.id, choice: a.choice, picks: a.picks, body: a.body });
    else if (a.a === 'deck') {
      editText = String(a.text || ''); store(TALK, editText);
      clearTimeout(deckTimer);
      deckTimer = setTimeout(function () { toPanel('deck', { text: editText }); }, 300);
    }
    else if (a.a === 'studioDone') {
      if (studioApi) studioApi.flush();
      clearTimeout(deckTimer);
      toPanel('done', { text: editText != null ? editText : store(TALK) || '' });
      editOn = false; store(EDIT, ''); roomDraw();
    }
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
    if (!view.notes.length) list.appendChild(el('li', 'stage-quiet', 'No ideas yet. Propose the first one.'));
    // A cohort's call sends its votes through each person's own panel
    // (CohortRoom), which already counts each person once.
    var viaPanel = !!view.cohort;
    function say(m) { if (viaPanel) act({ a: 'room', m: m }); else room.send(m); }
    view.notes.forEach(function (n) {
      var count = viaPanel ? n.votes : n.votes.length, mine = viaPanel ? n.mine : n.votes.indexOf(view.you) >= 0;
      var li = el('li', 'room-note');
      li.appendChild(el('p', 'room-note-text', n.text));
      var foot = el('p', 'room-note-foot');
      foot.appendChild(el('span', 'room-note-who', n.name || ''));
      var v = el('button', 'room-vote', count ? String(count) : 'Vote'); v.type = 'button';
      v.setAttribute('aria-label', 'Vote for this. ' + count + ' so far.');
      v.setAttribute('aria-pressed', String(mine));
      v.addEventListener('click', function () { say({ t: 'vote', id: n.id }); });
      foot.appendChild(v);
      if ((viaPanel ? n.by : n.by === view.you) || view.host) {
        var x = el('button', 'room-unnote', 'Remove'); x.type = 'button';
        x.addEventListener('click', function () { say({ t: 'unnote', id: n.id }); });
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
    var p = v.page, key = p.url ? 'url:' + p.url + '#' + (p.v || 0) : p.owner ? p.owner + '/' + p.repo + '@' + p.sha + '/' + (p.path || '') : 'pasted:' + p.htmlV;
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
    var file = p.path || 'index.html';
    fetch(RL.rawUrl(p, p.sha, file)).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    }).then(function (h) { f.srcdoc = RL.withBase(h, RL.assetBase(p, p.sha, file)); }, function () {
      box.replaceChildren(el('p', 'stage-quiet', 'This page could not be loaded from its repository.'));
    });
  }

  var lastStance = null; var stageStance = null;
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
      if (roomCode) {
        stage.on('frameToFrameMessage', function (m) { var f = m && RL.readFrame(m.payload); if (f && room) heardFrame(f); });
        useRoom();
        // A message reaches only a frame that is listening, so the stage asks
        // its panel who it is until it hears, then now and then.
        (function hello() { toPanel('hello'); setTimeout(hello, heardPanel ? 15000 : 2000); })();
        return;
      }
      drawReactBar();
      wireAsk();
      // Open rooms' stances and Propose and vote, in a cohort's call: the
      // stage asks its own panel, which speaks for this person in the room.
      if (window.ReactLib && window.ReactLib.STANCES) {
        var sbar = $('[data-stage-reacts]');
        window.ReactLib.STANCES.forEach(function (st) {
          var sb = el('button', 'stage-stance', st.label); sb.type = 'button'; sb.hidden = true;
          sb.setAttribute('data-stance-id', st.id);
          sb.addEventListener('click', function () {
            stageStance = stageStance === st.id ? null : st.id;
            root.querySelectorAll('.stage-stance').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-stance-id') === stageStance)); });
            act({ a: 'room', m: { t: 'stance', stance: st.id } });
          });
          sbar.appendChild(sb);
        });
      }
      $('[data-rb-form]').addEventListener('submit', function (e) {
        e.preventDefault();
        var input = e.target.querySelector('input');
        if (input.value.trim()) act({ a: 'room', m: { t: 'note', text: input.value } });
        input.value = '';
      });
      stage.on('frameToFrameMessage', function (m) {
        var react = m && window.ReactLib ? window.ReactLib.readStage(m.payload) : null;
        if (react) return drawReactions({ floats: react.floats || [], stance: react.stance || lastStance });
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
        lastStance = v.stance || null;
        // Stances only while the leader has them open, and never while a
        // question waits for this person's answer (Week 2: a learner pressed
        // Agree believing it answered).
        var mineIn = v.mine && (v.mine.choice || (v.mine.picks || []).length || v.mine.body);
        var stanceOn = !!v.stances && !(v.mode === 'check' && v.answerable && !mineIn);
        if (!v.stances) stageStance = null;
        root.querySelectorAll('.stage-stance').forEach(function (b) { b.hidden = !stanceOn; b.setAttribute('aria-pressed', String(!!stageStance && b.getAttribute('data-stance-id') === stageStance)); });
        drawReactions({ floats: [], stance: lastStance });
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
