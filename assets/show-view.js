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
// ShowView.mount({ mount, parts, teaching, onPick(key), tools(key) })
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
    K.scenes(parts).forEach(function (s) {
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
      items[s.key] = { li: li, body: body };
      ol.appendChild(li);
    });

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

    function update(key) {
      current = key || null;
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

    return { slot: slot, count: count, update: update, cues: cues };
  }

  window.ShowView = { mount: mount };
})();
