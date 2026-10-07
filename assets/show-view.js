// The run of show, drawn (research/notes/run-of-show-design.md, R1).
// One component for the Meet add-on's side panel and /live/, and for the
// teacher's view and the student's: the session as a timeline of scenes,
// the current scene open with what it needs, and everything else under
// "Any time in the show". The layout comes from ShowViewLib (assets/show-view-lib.js).
//
// It draws no data of its own. Each page keeps drawing its parts (the
// wings, the questions, the rooms, the cues) with the code it already
// has, and hands each part's element here with slot(key, element); this
// moves the element to where it belongs as the scenes change, so nothing
// a person was typing is redrawn or lost.
//
// ShowView.mount({ mount, parts, teaching, onPick(key), tools(key), stuck })
// returns { slot(key, element), count(key, n), update(currentKey),
// cues(container, { cardHref }) }.
// onPick is the teacher's "make this the current scene"; tools(key), if
// given, returns extra controls for a scene (the /live/ timers).
// Words by Claude, awaiting Ben's review.
(function () {
  var K = window.ShowViewLib;
  if (!K) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function mount(opts) {
    var box = opts.mount, teaching = !!opts.teaching, parts = opts.parts || [];
    var slots = {}, wraps = {}, counts = {}, current = null;
    box.replaceChildren();
    box.classList.add('show');

    var head = el('div', 'show-head');
    var h = el('h2', null, K.WORDS[0].name);
    head.appendChild(h);
    head.appendChild(el('p', 'small', teaching
      ? 'Today’s scenes in order. The open one is happening now; choose another to move everyone there.'
      : 'Today’s scenes in order. The open one is happening now.'));
    box.appendChild(head);

    var ol = el('ol', 'show-timeline');
    box.appendChild(ol);
    var items = {};
    var run = opts.run || null, info = {};

    // The scenes, drawn again whenever the run of show changes (a scene
    // edited, added, or moved). Each part of the view is moved out first
    // and put back by place(), so nothing a person was typing is lost.
    function build(list) {
      Object.keys(wraps).forEach(function (k) { var w = wraps[k].box; if (w.parentNode) w.parentNode.removeChild(w); });
      ol.replaceChildren();
      items = {};
      K.scenes(list).forEach(function (s) {
        var li = el('li', 'show-scene');
        li.setAttribute('data-scene', s.key);
        var top = el('div', 'show-scene-head');
        var kind = el('p', 'show-kind', s.kindName);
        var mins = K.minutesText(s.minutes);
        if (mins) kind.appendChild(el('span', 'show-mins', mins));
        top.appendChild(kind);
        top.appendChild(el('h3', 'show-name', s.name));
        li.appendChild(top);
        var line = el('p', 'small show-line', s.kindLine);
        li.appendChild(line);
        if (s.what) {
          var what = el('details', 'show-what');
          what.appendChild(el('summary', null, 'What happens in this scene'));
          what.appendChild(el('p', 'small', s.what));
          li.appendChild(what);
        }
        // The current scene's clock, and the teacher's moves through the show.
        var bar = run ? runBar(s) : null;
        if (bar) li.appendChild(bar.box);
        var body = el('div', 'show-body');
        li.appendChild(body);
        var tools = el('div', 'actions show-tools');
        if (teaching && opts.onPick) {
          var pick = el('button', 'btn-quiet show-pick', 'Make this the current scene');
          pick.type = 'button';
          pick.addEventListener('click', function () { opts.onPick(s.key); });
          tools.appendChild(pick);
        }
        if (teaching && opts.tools) { var extra = opts.tools(s.key); if (extra) tools.appendChild(extra); }
        if (tools.children.length) li.appendChild(tools);
        if (teaching && run && run.canEdit) { var ed = editor(s); if (ed) li.appendChild(ed); }
        items[s.key] = { li: li, body: body, bar: bar };
        ol.appendChild(li);
      });
    }

    // ------------------------------------------------------------------
    // Running the show (R3)
    // ------------------------------------------------------------------

    function btn(label, cls, fn) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', fn); return b; }

    // Shown on the current scene: its clock for everyone; for a teacher,
    // back and next, the clock's start and stop, and, when something else
    // is pinned on the main stage, the way back to following the scene.
    function runBar(s) {
      var box = el('div', 'show-run');
      box.hidden = true;
      var clock = el('p', 'show-clock');
      clock.setAttribute('aria-live', 'off');
      box.appendChild(clock);
      var pinned = el('p', 'small show-pinned');
      pinned.hidden = true;
      box.appendChild(pinned);
      var follow = null, clockBtn = null;
      if (teaching) {
        follow = btn('Show this scene on the main stage again', 'btn-quiet show-follow', function () { if (run.onFollow) run.onFollow(); });
        follow.hidden = true;
        box.appendChild(follow);
        var acts = el('div', 'actions show-moves');
        acts.appendChild(btn('Back', 'btn-quiet show-back', function () { if (run.onStep) run.onStep(-1); }));
        acts.appendChild(btn('Next scene', 'btn-github show-next', function () { if (run.onStep) run.onStep(1); }));
        clockBtn = btn('Start the clock', 'btn-quiet show-clock-btn', function () { if (run.onClock) run.onClock(!info.clockOn); });
        acts.appendChild(clockBtn);
        box.appendChild(acts);
      }
      return { box: box, clock: clock, pinned: pinned, follow: follow, clockBtn: clockBtn, key: s.key };
    }

    function drawRun() {
      Object.keys(items).forEach(function (key) {
        var b = items[key].bar;
        if (!b) return;
        var here = key === current;
        b.box.hidden = !here;
        if (!here) return;
        b.clock.textContent = info.left || (info.clockOn ? '' : (teaching ? 'The clock is stopped.' : ''));
        b.clock.hidden = !b.clock.textContent;
        b.pinned.hidden = !info.pinned;
        b.pinned.textContent = info.pinned ? 'The main stage shows ' + info.pinned + ' instead of this scene.' : '';
        if (b.follow) b.follow.hidden = !info.pinned;
        if (b.clockBtn) b.clockBtn.textContent = info.clockOn ? 'Stop the clock' : 'Start the clock';
      });
    }

    // Editing a scene in the moment: its title, minutes, the words the main
    // stage shows, and, for the kinds that have them, the prompt and a
    // question's choices. The teacher's own main stage shows the words as
    // they type; saving shows them to everyone at once. A session running
    // on the six parts first makes a run of show of its own.
    function editor(s) {
      var mode = run.canEdit(s.key);
      if (!mode) return null;
      var d = el('details', 'show-edit');
      d.appendChild(el('summary', null, 'Edit this scene'));
      if (mode === 'parts') {
        d.appendChild(el('p', 'small', 'This week is running on the six parts. To change a scene in the moment, give this week a run of show of its own, starting from the same scenes. Everyone stays where they are.'));
        var msg0 = el('p', 'small'); msg0.setAttribute('role', 'status');
        var make = btn('Give this week its own run of show', 'btn-quiet', function () {
          make.disabled = true; msg0.textContent = 'Making it…';
          Promise.resolve(run.onStartOwn()).then(function (err) { make.disabled = false; msg0.textContent = err ? 'Not made: ' + err : ''; });
        });
        d.appendChild(el('div', 'actions')).appendChild(make);
        d.appendChild(msg0);
        return d;
      }
      var f = el('form', 'show-edit-form');
      var start = K.editFields(s), have = K.editable(s.kind, s.config);
      function field(name, label, kind, hint) {
        var l = el('label');
        l.appendChild(document.createTextNode(label));
        if (hint) l.appendChild(el('span', 'hint', hint));
        var input = kind === 'area' ? el('textarea') : el('input');
        if (kind === 'area') input.rows = name === 'body' ? 3 : 4;
        if (kind === 'number') { input.type = 'number'; input.min = '1'; input.max = '240'; input.inputMode = 'numeric'; }
        input.name = name;
        input.value = start[name];
        l.appendChild(input);
        f.appendChild(l);
      }
      field('title', 'Title', 'text');
      field('minutes', 'Minutes', 'number');
      field('body', 'What the main stage says', 'area', 'A few lines, with a blank line between them.');
      if (have.prompt) field('prompt', s.kind === 'question' ? 'The question' : 'The prompt', 'area');
      if (have.options) field('options', 'Choices', 'area', 'One to a line, two to eight. Leave empty for an answer in their own words.');
      var msg = el('p', 'small'); msg.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var save = el('button', 'btn-github', 'Show it to everyone'); save.type = 'submit';
      acts.appendChild(save);
      acts.appendChild(btn('Put it back as it was', 'btn-quiet', function () {
        Object.keys(start).forEach(function (k) { if (f.elements[k]) f.elements[k].value = start[k]; });
        if (run.onDraft) run.onDraft(s.key, null);
        msg.textContent = '';
      }));
      f.appendChild(acts);
      f.appendChild(msg);
      function values() {
        var v = {};
        Object.keys(start).forEach(function (k) { v[k] = f.elements[k] ? f.elements[k].value : start[k]; });
        return v;
      }
      f.addEventListener('input', function () { if (run.onDraft) run.onDraft(s.key, values()); msg.textContent = 'Your own main stage shows this as you type. Everyone else sees it when you choose Show it to everyone.'; });
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        save.disabled = true; msg.textContent = 'Saving…';
        Promise.resolve(run.onSave(s.key, values())).then(function (err) {
          save.disabled = false;
          msg.textContent = err ? 'Not shown yet: ' + err : 'Everyone sees it now.';
          if (!err && run.onDraft) run.onDraft(s.key, null);
        });
      });
      d.appendChild(f);
      return d;
    }

    // Before the first scene, or when the parts are not known, the
    // current scene's parts wait in a box of their own above the list.
    var before = el('div', 'show-body show-before');
    box.insertBefore(before, ol);

    var any = el('section', 'show-anytime');
    any.appendChild(el('h2', null, 'Any time in the show'));
    any.appendChild(el('p', 'small', 'Everything that is not part of the current scene, kept here so it is always in reach.'));
    var anyList = el('div', 'show-anytime-list');
    any.appendChild(anyList);
    box.appendChild(any);

    // A student's way out when stuck (curriculum C7): the stuck library's
    // page for the move this week leads with (CurriculumPagesLib.stuckFor).
    if (!teaching && opts.stuck && opts.stuck.url) {
      var stuck = el('p', 'small show-stuck');
      stuck.appendChild(document.createTextNode('Stuck? Ask yourself one question first, then try what '));
      var sa = el('a', null, opts.stuck.label);
      sa.href = opts.stuck.url;
      sa.target = '_blank';
      sa.rel = 'noopener';
      stuck.appendChild(sa);
      stuck.appendChild(document.createTextNode(' suggests, and bring it to your trio if it is still stuck after twenty minutes.'));
      box.appendChild(stuck);
    }

    var words = el('details', 'show-words');
    words.appendChild(el('summary', null, 'What the words mean'));
    var dl = el('dl');
    K.WORDS.forEach(function (w) { dl.appendChild(el('dt', null, w.name)); dl.appendChild(el('dd', null, w.line)); });
    words.appendChild(dl);
    box.appendChild(words);

    // Each part of the view is wrapped once, in a details whose summary is
    // its name (and count) and whose first line says what it is for.
    function wrapFor(key) {
      if (wraps[key]) return wraps[key];
      var t = K.slotText(key, teaching);
      var d = el('details', 'show-slot');
      d.setAttribute('data-slot', key);
      var sum = el('summary');
      sum.appendChild(el('span', 'show-slot-name', t.name));
      var badge = el('span', 'show-count'); badge.hidden = true;
      sum.appendChild(badge);
      d.appendChild(sum);
      if (t.line) d.appendChild(el('p', 'small show-slot-line', t.line));
      wraps[key] = { box: d, badge: badge, name: t.name };
      return wraps[key];
    }

    // A part hidden by its own page (no rooms yet, no thread) hides here
    // too, and comes back when its page shows it.
    var watch = window.MutationObserver ? new MutationObserver(function (list) {
      list.forEach(function (m) {
        var key = m.target.getAttribute && m.target.getAttribute('data-show-slot');
        if (key && wraps[key]) wraps[key].box.hidden = !!m.target.hidden;
      });
      sync();
    }) : null;

    function slot(key, element) {
      if (!element) return;
      slots[key] = element;
      element.setAttribute('data-show-slot', key);
      var w = wrapFor(key);
      if (element.parentNode !== w.box) w.box.appendChild(element);
      w.box.hidden = !!element.hidden;
      if (watch) watch.observe(element, { attributes: true, attributeFilter: ['hidden'] });
      place();
    }

    function count(key, n) {
      counts[key] = n || 0;
      var w = wraps[key];
      if (!w) return;
      w.badge.hidden = !counts[key];
      w.badge.textContent = counts[key] ? String(counts[key]) : '';
      w.box.querySelector('summary').setAttribute('aria-label', w.name + (counts[key] ? ', ' + counts[key] : ''));
    }

    build(parts);

    function place() {
      var l = K.layout(parts, current || null, { teaching: teaching, available: Object.keys(slots) });
      var target = current && items[current] ? items[current].body : before;
      l.now.forEach(function (key) {
        var w = wraps[key].box;
        if (w.parentNode !== target) { target.appendChild(w); w.open = true; }
        else target.appendChild(w);
      });
      l.anytime.forEach(function (key) {
        var w = wraps[key].box;
        if (w.parentNode !== anyList) { anyList.appendChild(w); w.open = false; }
        else anyList.appendChild(w);
      });
      sync();
    }

    // The empty "Any time" box and the empty before-box stay out of sight.
    function sync() {
      any.hidden = !Array.prototype.some.call(anyList.children, function (c) { return !c.hidden; });
      before.hidden = !Array.prototype.some.call(before.children, function (c) { return !c.hidden; });
    }

    // update(key) marks the current scene; with the show running (R3),
    // update(key, { left, clockOn, pinned }) also says its clock and what
    // the main stage shows instead of it, if anything.
    function update(key, more) {
      current = key || null;
      if (more) info = more;
      drawRun();
      K.timeline(parts, current).forEach(function (s) {
        var it = items[s.key];
        if (!it) return;
        it.li.classList.toggle('is-done', s.state === 'done');
        it.li.classList.toggle('is-now', s.state === 'now');
        it.li.classList.toggle('is-next', s.state === 'next');
        it.li.classList.toggle('is-later', s.state === 'later');
        if (s.state === 'now') it.li.setAttribute('aria-current', 'step'); else it.li.removeAttribute('aria-current');
        var pick = it.li.querySelector('.show-pick');
        if (pick) pick.hidden = s.state === 'now';
      });
      place();
    }

    // The teacher's cues (SignalsLib.controlsHtml), each to the scene it
    // belongs to, with the card's way onto everyone's main stage.
    function cues(container, o) {
      if (!container) return;
      container.querySelectorAll('[data-cue]').forEach(function (cue) {
        var key = cue.getAttribute('data-cue');
        if (key === 'card' && o && o.cardHref && !cue.querySelector('[data-card-page]')) {
          var p = el('p', 'small');
          p.appendChild(document.createTextNode('To put the card on the main stage of everyone’s Meet, open '));
          var a = el('a', null, 'the card page'); a.href = o.cardHref; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('data-card-page', '');
          p.appendChild(a); p.appendChild(document.createTextNode(' and present that tab.'));
          cue.appendChild(p);
        }
        slot('cue-' + key, cue);
      });
    }

    // The run of show changed (R3): draw its scenes again, keep each part
    // of the view, and mark the current scene.
    function setScenes(list, key, more) {
      parts = list || [];
      build(parts);
      update(key === undefined ? current : key, more);
    }

    // Just the clock, once a second, without moving anything.
    function tick(more) {
      if (more) info = Object.assign({}, info, more);
      drawRun();
    }

    return { slot: slot, count: count, update: update, cues: cues, setScenes: setScenes, tick: tick };
  }

  window.ShowView = { mount: mount };
})();
