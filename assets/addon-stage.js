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
  var view = null, last = '';

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(state) { root.querySelectorAll('.stage-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!A || !L || !framed || !window.meet || !window.meet.addon) { show('outside'); return; }

  function clockText(part) {
    var left = part ? A.timeLeft(part.endsAt, Date.now()) : null;
    if (left == null) return '';
    return left ? L.clock(left) : 'Time is up';
  }

  function draw() {
    root.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view.mode; });
    var part = view.part;
    // The part sits small at the top when something else has the stage.
    $('[data-part]').hidden = view.mode === 'part' || view.mode === 'welcome' || view.mode === 'scene' || view.mode === 'blank' || !part;
    if (view.mode === 'scene') {
      var sc = view.scene;
      drawBoard(sc.board || null);
      $('[data-s-eyebrow]').textContent = sc.eyebrow;
      $('[data-s-title]').textContent = sc.title;
      var lines = $('[data-s-lines]'); lines.replaceChildren();
      sc.lines.forEach(function (t) { lines.appendChild(el('p', 'stage-what', t)); });
      var items = $('[data-s-items]'); items.replaceChildren();
      items.hidden = !sc.items.length;
      sc.items.forEach(function (t) { var li = el('li'); li.appendChild(el('span', 'label', t)); items.appendChild(li); });
      $('[data-s-note]').hidden = !sc.note;
      $('[data-s-note]').textContent = sc.note || '';
    }
    $('[data-part-name]').textContent = part ? part.name : '';
    $('[data-part-kicker]').textContent = part ? 'Now' : 'Welcome';
    $('[data-part-big]').textContent = part ? part.name : 'The session begins soon.';
    if (view.mode === 'check') {
      $('[data-prompt]').textContent = view.prompt;
      // With the results shown, the bars come from them (an order is
      // sorted, first place at the top); before, the choices alone.
      var count = view.count;
      var rows = count && count.rows.length ? count.rows : (view.choices || []).map(function (c) { return { label: c }; });
      var ul = $('[data-choices]'); ul.replaceChildren();
      ul.hidden = !rows.length;
      rows.forEach(function (row) {
        var li = el('li');
        li.appendChild(el('span', 'label', row.label));
        if (count && row.text != null) {
          var bar = el('span', 'bar'); bar.style.setProperty('--share', row.share + '%'); li.appendChild(bar);
          li.appendChild(el('span', 'count', row.text));
        }
        ul.appendChild(li);
      });
      ul.classList.toggle('counted', !!(count && count.rows.length));
      var words = $('[data-words]'); words.replaceChildren();
      words.hidden = !(count && count.words.length);
      if (count) count.words.forEach(function (w) { words.appendChild(el('li', 'size-' + w.size, w.word)); });
      $('[data-count-note]').hidden = !(count && count.note);
      $('[data-count-note]').textContent = count && count.note ? count.note : '';
      $('[data-count-total]').hidden = !count;
      $('[data-count-total]').textContent = count ? L.counted(count.total, 'answer', 'answers') + ' so far, with no names.' : '';
    }
    if (view.mode === 'welcome') {
      var w = view.welcome;
      $('[data-w-cohort]').textContent = w.cohort;
      $('[data-w-week]').textContent = (w.week ? 'Week ' + w.week : '') + (w.title ? (w.week ? ': ' : '') + w.title : '');
      $('[data-w-challenge]').hidden = !w.challenge;
      $('[data-w-challenge]').textContent = w.challenge || '';
      $('[data-w-first]').hidden = !w.first;
      $('[data-w-first]').textContent = w.first ? 'First: ' + w.first.name + '. ' + (w.first.what || '') : '';
    }
    if (view.mode === 'item') {
      $('[data-who]').textContent = view.who;
      $('[data-what]').textContent = view.what;
      $('[data-note]').hidden = !view.note;
      $('[data-note]').textContent = view.note || '';
      $('[data-audience]').hidden = !view.audience;
      $('[data-audience]').textContent = view.audience ? 'Everyone else: ' + view.audience : '';
    }
    tick();
  }

  // The board in its own frame, made once per board so a new message (a
  // clock tick, a title edit) never reloads it while people draw.
  var boardSrc = null;
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
    if (sh) {
      ['agree', 'unsure', 'disagree'].forEach(function (k) {
        bar.querySelector('[data-st="' + k + '"]').style.flexGrow = String(sh[k]);
        bar.querySelector('[data-stk="' + k + '"]').textContent = R.stance(k).label + ' ' + m.stance[k];
      });
    }
  }

  function tick() {
    if (!view) return;
    var t = clockText(view.part);
    $('[data-clock]').textContent = t ? ', ' + t : '';
    $('[data-clock-big]').textContent = t;
    $('[data-s-clock]').hidden = !(view.mode === 'scene' && t);
    $('[data-s-clock]').textContent = t;
  }
  setInterval(tick, 1000);

  function open() {
    if (!cfg.cloudProjectNumber) { $('[data-error-text]').textContent = 'This add-on is not set up yet.'; return show('error'); }
    Promise.race([
      window.meet.addon.createAddonSession({ cloudProjectNumber: String(cfg.cloudProjectNumber) }),
      new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, 10000); })
    ]).then(function (session) {
      return session.createMainStageClient();
    }).then(function (stage) {
      stage.on('frameToFrameMessage', function (m) {
        var react = m && window.ReactLib ? window.ReactLib.readStage(m.payload) : null;
        if (react) return drawReactions(react);
        if (!m || m.payload === last) return;
        var v = A.readStageMessage(m.payload);
        if (!v) return;
        last = m.payload; view = v;
        show('ready'); draw();
      });
      view = { mode: 'part', part: null };
      show('ready'); draw();
      // Ask the panel for what to show, since a message only reaches a
      // stage that is already listening.
      try { Promise.resolve(stage.notifySidePanel(A.HELLO)).catch(function () {}); } catch (e) {}
    }, function () { show('outside'); });
  }
  open();
})();
