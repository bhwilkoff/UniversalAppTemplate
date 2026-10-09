// The weekly grid on /times/ and /teach/times/: a table of days and start
// times on the viewer's own clock, one button per time the poll offers.
// What a cell says and does is the page's; this only lays it out. A mouse
// can drag across times to mark several at once; touch keeps taps, so the
// page still scrolls.
(function () {
  var T = window.TimesLib;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // opts: poll, zone, cell(slot) -> { cls, text, label, pressed }, onCell(slot, event),
  // onDrag(slot) (optional), caption.
  function render(box, opts) {
    var grid = T.gridFor(opts.poll, opts.zone);
    var table = el('table', 'times-grid');
    if (opts.caption) table.appendChild(el('caption', 'visually-hidden', opts.caption));
    var head = el('thead'), hr = el('tr');
    hr.appendChild(el('th', 'times-corner', ''));
    grid.days.forEach(function (d) {
      var th = el('th');
      th.scope = 'col';
      th.appendChild(el('abbr', null, T.SHORT[d])).title = T.DAYS[d];
      hr.appendChild(th);
    });
    head.appendChild(hr);
    table.appendChild(head);
    var body = el('tbody');
    grid.minutes.forEach(function (m) {
      var tr = el('tr');
      var th = el('th', null, T.timeText(m));
      th.scope = 'row';
      tr.appendChild(th);
      grid.days.forEach(function (d) {
        var td = el('td');
        var slot = grid.slotAt(d, m);
        if (slot != null) {
          var b = el('button', 'times-cell');
          b.type = 'button';
          b.setAttribute('data-slot', slot);
          b.setAttribute('data-when', T.DAYS[d] + ' at ' + T.timeText(m));
          paint(b, opts.cell(slot));
          td.appendChild(b);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);

    var dragging = false, moved = false;
    table.addEventListener('click', function (e) {
      var b = e.target.closest('.times-cell');
      if (!b || b.disabled) return;
      if (moved) { moved = false; return; }
      opts.onCell(+b.getAttribute('data-slot'), e);
    });
    if (opts.onDrag) {
      var started = null;
      table.addEventListener('pointerdown', function (e) {
        var b = e.target.closest('.times-cell');
        if (e.pointerType !== 'mouse' || !b || b.disabled) return;
        dragging = true; moved = false; started = b;
      });
      table.addEventListener('pointerover', function (e) {
        if (!dragging) return;
        var b = e.target.closest('.times-cell');
        if (!b || b.disabled) return;
        if (!moved) { moved = true; opts.onDrag(+started.getAttribute('data-slot'), true); }
        if (b !== started) opts.onDrag(+b.getAttribute('data-slot'), false);
        started = b;
      });
      window.addEventListener('pointerup', function () { dragging = false; });
    }
    var wrap = el('div', 'times-scroll');
    wrap.appendChild(table);
    box.replaceChildren(wrap);
    return table;
  }

  function paint(b, c) {
    b.className = 'times-cell' + (c.cls ? ' ' + c.cls : '');
    b.textContent = c.text || '';
    b.setAttribute('aria-label', b.getAttribute('data-when') + (c.label ? ', ' + c.label : ''));
    if (c.pressed != null) b.setAttribute('aria-pressed', c.pressed); else b.removeAttribute('aria-pressed');
    b.disabled = !!c.disabled;
  }

  // Redraws each cell in place, so a drag in progress is not lost.
  function refresh(table, cell) {
    table.querySelectorAll('.times-cell').forEach(function (b) { paint(b, cell(+b.getAttribute('data-slot'))); });
  }

  // Every zone the browser knows, with the viewer's own first.
  function fillZones(select, chosen) {
    var zones = [];
    try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = []; }
    if (zones.indexOf(chosen) < 0) zones.unshift(chosen);
    select.replaceChildren();
    zones.forEach(function (z) {
      var o = el('option', null, T.zoneName(z));
      o.value = z;
      if (z === chosen) o.selected = true;
      select.appendChild(o);
    });
  }

  function myZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  }

  window.TimesGrid = { render: render, refresh: refresh, fillZones: fillZones, myZone: myZone };
})();
