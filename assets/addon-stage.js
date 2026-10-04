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
      var ul = $('[data-choices]'); ul.replaceChildren();
      ul.hidden = !view.choices;
      (view.choices || []).forEach(function (c, i) {
        var li = el('li');
        li.appendChild(el('span', 'label', c));
        var row = view.count && view.count.rows[i];
        if (row) {
          var bar = el('span', 'bar'); bar.style.setProperty('--share', row.share + '%'); li.appendChild(bar);
          li.appendChild(el('span', 'count', String(row.count)));
        }
        ul.appendChild(li);
      });
      ul.classList.toggle('counted', !!view.count);
      $('[data-count-total]').hidden = !view.count;
      $('[data-count-total]').textContent = view.count ? L.counted(view.count.total, 'answer', 'answers') + ' so far, with no names.' : '';
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
    }
    tick();
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
