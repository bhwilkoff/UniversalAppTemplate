// One callout at a time, pointing at a real part of the panel or the stage
// (CoachLib decides what and when). It never covers what it points at, never
// takes focus or traps the keyboard, is announced politely, and Escape closes
// it (WCAG 4.1.3 and 1.4.13). It looks unlike the controls around it, so
// nobody presses it thinking it is one. Words by Claude, awaiting Ben's review.
(function () {
  var box = null, target = null, onKey = null, place = null;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function visible(n) {
    if (!n || !n.getBoundingClientRect) return false;
    var r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !n.closest('[hidden]');
  }
  function hide() {
    if (box) box.remove();
    if (target) target.classList.remove('coach-target');
    if (onKey) document.removeEventListener('keydown', onKey, true);
    if (place) { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); }
    box = target = onKey = place = null;
  }
  // o: { target, text, n, of, label, onNext, onClose }
  function show(o) {
    hide();
    target = visible(o.target) ? o.target : null;
    box = el('div', 'coach');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    var close = el('button', 'coach-x', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () { if (o.onClose) o.onClose(); });
    box.appendChild(close);
    box.appendChild(el('p', 'coach-text', o.text));
    var row = el('div', 'coach-row');
    if (o.of > 1) row.appendChild(el('span', 'coach-count', o.n + ' of ' + o.of));
    var go = el('button', 'coach-go', o.label || 'Got it');
    go.type = 'button';
    go.addEventListener('click', function () { if (o.onNext) o.onNext(); });
    row.appendChild(go);
    box.appendChild(row);
    document.body.appendChild(box);
    if (target) target.classList.add('coach-target');
    place = function () {
      if (!box) return;
      var W = window.innerWidth, H = window.innerHeight, gap = 10;
      var w = Math.min(300, W - 16);
      box.style.width = w + 'px';
      var h = box.offsetHeight;
      var r = target && visible(target) ? target.getBoundingClientRect() : null;
      var top, side = 'none';
      if (!r) top = 8;
      else if (r.bottom + gap + h <= H - 8) { top = r.bottom + gap; side = 'below'; }
      else if (r.top - gap - h >= 8) { top = r.top - gap - h; side = 'above'; }
      // A target bigger than the space around it (the whole stage): the
      // callout sits just inside its top edge, clear of the bar along the
      // stage's foot, and the ring is drawn inside the target.
      else { top = Math.max(8, r.top + 12); side = 'inside'; }
      var cx = r ? r.left + r.width / 2 : W / 2;
      var left = Math.max(8, Math.min(W - w - 8, cx - w / 2));
      // A wide target (a list of answers, a bar): the callout keeps to its
      // right end, away from words that start at the left, arrow and all.
      if (r && side !== 'inside' && r.width > w * 1.5) { left = Math.max(8, Math.min(W - w - 8, r.right - w - 12)); cx = left + w - 28; }
      if (side === 'inside') { left = Math.max(8, Math.min(W - w - 8, r.right - w - 12)); }
      box.style.top = Math.round(top) + 'px';
      box.style.left = Math.round(left) + 'px';
      box.setAttribute('data-side', side);
      box.style.setProperty('--coach-arrow', Math.round(Math.max(16, Math.min(w - 16, cx - left))) + 'px');
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    onKey = function (e) { if (e.key === 'Escape' && box) { e.stopPropagation(); if (o.onClose) o.onClose(); } };
    document.addEventListener('keydown', onKey, true);
  }
  function showing() { return !!box; }
  window.Coach = { show: show, hide: hide, showing: showing, visible: visible };
})();
