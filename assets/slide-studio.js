// The slide studio (SESSION-DESIGN.md): a part's slides, edited on the slide.
// The deck kit always draws the slide; words are typed in a box laid exactly
// over the line being changed, and every change is a change to the deck's text
// (SlideModel). SlideStudio.mount(box, { text, readOnly, onChange, done }); done is a button
// kept at the end of the studio's own bar.
(function () {
  var L = window.SlidesLib, M = window.SlideModel, E = window.SlideEditor;
  if (!L || !M || !E) return;
  var W = 960, H = 600, EDGE = 64;
  var PAPER = '#131916';
  var ICONS = ['lightbulb', 'target', 'users', 'user', 'zap', 'trophy', 'wrench', 'workflow', 'trending-up', 'triangle-alert'];
  var CHARTS = [['bar', 'Bars'], ['line', 'Line'], ['pie', 'Pie']];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(text, cls, fn) { var b = el('button', cls || 'btn-secondary small', text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function layoutPicture(key) {
    var bars = {
      slide: '<rect x="6" y="6" width="26" height="4"/><rect x="6" y="14" width="36" height="2"/><rect x="6" y="19" width="30" height="2"/>',
      title: '<rect x="12" y="10" width="24" height="5"/><rect x="16" y="18" width="16" height="2"/>',
      two: '<rect x="6" y="6" width="26" height="4"/><rect x="6" y="14" width="16" height="2"/><rect x="6" y="19" width="14" height="2"/><rect x="26" y="14" width="16" height="2"/><rect x="26" y="19" width="14" height="2"/>',
      icon: '<circle cx="13" cy="15" r="7"/><rect x="24" y="10" width="18" height="3"/><rect x="24" y="16" width="14" height="2"/>'
    };
    return '<svg viewBox="0 0 48 30" aria-hidden="true" focusable="false">' + bars[key] + '</svg>';
  }

  function mount(box, o) {
    var readOnly = !!o.readOnly;
    var list = M.slides(o.text || ''), at = 0, K = null;
    var past = [], ahead = [], typing = null, svgs = [], timer = null, asText = false;

    var root = el('div', 'studio' + (readOnly ? ' is-reading' : ''));
    var film = el('ol', 'studio-film'); film.setAttribute('aria-label', 'Slides');
    var main = el('div', 'studio-main');
    var bar = el('div', 'studio-bar');
    var adder = el('div', 'studio-adder'); adder.hidden = true;
    var canvas = el('div', 'studio-canvas');
    var art = el('div', 'studio-art');
    var hits = el('div', 'studio-hits');
    canvas.appendChild(art); canvas.appendChild(hits);
    var said = el('ul', 'slide-said'); said.setAttribute('role', 'status');
    var noteBox = el('label', 'studio-notes');
    var noteHead = el('span', 'studio-notes-head');
    if (window.UI && window.UI.visibility) noteHead.appendChild(window.UI.visibility('staff', 'Your notes'));
    else noteHead.textContent = 'Your notes';
    var note = el('textarea'); note.rows = 3; note.maxLength = 4000; note.placeholder = 'What you want to say on this slide';
    noteBox.appendChild(noteHead); noteBox.appendChild(note);
    var source = el('textarea', 'slide-source studio-source'); source.hidden = true; source.rows = 18; source.setAttribute('aria-label', 'The slides as text');
    var side = el('div', 'studio-side');
    main.appendChild(bar); main.appendChild(adder); main.appendChild(canvas); main.appendChild(source); main.appendChild(said);
    if (!readOnly) main.appendChild(noteBox);
    root.appendChild(film); root.appendChild(main);
    if (!readOnly) root.appendChild(side);
    box.replaceChildren(root);

    function text() { return list.length ? M.join(list) : ''; }
    function drawnText() { return L.deck(L.withoutNotes(text())); }
    function changed() { needGitHub(); clearTimeout(timer); timer = setTimeout(function () { if (o.onChange) o.onChange(text()); }, 500); }
    function remember() { past.push(JSON.stringify([list, at])); if (past.length > 200) past.shift(); ahead = []; }
    function restore(from, to) {
      if (!from.length) return;
      to.push(JSON.stringify([list, at]));
      var s = JSON.parse(from.pop());
      list = s[0]; at = Math.min(s[1], Math.max(0, list.length - 1));
      changed(); redraw();
    }

    // What a slide shows from GitHub, fetched once, then drawn like anything else.
    function needGitHub() {
      if (!o.github || !window.GitHubBlock) return;
      window.GitHubBlock.preload(o.github.db, o.github.cohortId, text()).then(function (got) { if (got && K) paint(); });
    }
    function paint() {
      svgs = list.length ? K.render(drawnText()) : [];
      Array.prototype.forEach.call(film.querySelectorAll('.studio-thumb'), function (t, i) { t.innerHTML = svgs[i] || ''; });
      art.innerHTML = svgs[at] || '';
      said.replaceChildren();
      if (!readOnly && list.length) K.lint(drawnText()).slice(0, 3).forEach(function (f) { said.appendChild(el('li', null, f.words)); });
    }

    function drawFilm() {
      film.replaceChildren();
      list.forEach(function (s, i) {
        var li = el('li', i === at ? 'is-here' : null);
        var pick = el('button', 'studio-pick'); pick.type = 'button';
        pick.setAttribute('aria-label', 'Slide ' + (i + 1));
        if (i === at) pick.setAttribute('aria-current', 'true');
        pick.appendChild(el('span', 'studio-num', String(i + 1)));
        pick.appendChild(el('span', 'studio-thumb'));
        pick.addEventListener('click', function () { finish(); at = i; redraw(); });
        li.appendChild(pick);
        if (!readOnly) {
          li.draggable = true;
          li.addEventListener('dragstart', function (ev) { finish(); li.classList.add('is-dragging'); ev.dataTransfer.setData('text/plain', String(i)); ev.dataTransfer.effectAllowed = 'move'; });
          li.addEventListener('dragend', function () { li.classList.remove('is-dragging'); });
          li.addEventListener('dragover', function (ev) { ev.preventDefault(); });
          li.addEventListener('drop', function (ev) {
            ev.preventDefault();
            var from = Number(ev.dataTransfer.getData('text/plain'));
            if (from === i || isNaN(from)) return;
            remember();
            list = M.move(list, from, i); at = i;
            changed(); redraw();
          });
        }
        film.appendChild(li);
      });
    }

    function drawBar() {
      bar.replaceChildren();
      if (readOnly) {
        var back = button('Previous', 'btn-secondary small', function () { at -= 1; redraw(); }); back.disabled = at === 0;
        var next = button('Next', 'btn-secondary small', function () { at += 1; redraw(); }); next.disabled = at >= list.length - 1;
        bar.appendChild(back); bar.appendChild(el('span', 'studio-place', (at + 1) + ' of ' + list.length)); bar.appendChild(next);
        return;
      }
      var add = button('Add a slide', 'btn-primary small', function () { adder.hidden = !adder.hidden; add.setAttribute('aria-expanded', String(!adder.hidden)); });
      add.setAttribute('aria-expanded', String(!adder.hidden));
      bar.appendChild(add);
      if (list.length) {
        bar.appendChild(button('Duplicate', null, function () { finish(); remember(); list.splice(at + 1, 0, list[at].slice()); at += 1; changed(); redraw(); }));
        bar.appendChild(button('Delete', null, function () {
          finish(); remember();
          list.splice(at, 1); at = Math.max(0, Math.min(at, list.length - 1));
          changed(); redraw();
        }));
      }
      var undo = button('Undo', null, function () { finish(); restore(past, ahead); }); undo.disabled = !past.length;
      var redo = button('Redo', null, function () { finish(); restore(ahead, past); }); redo.disabled = !ahead.length;
      bar.appendChild(undo); bar.appendChild(redo);
      var end = el('span', 'studio-bar-end');
      if (list.length) end.appendChild(button('Play', null, play));
      var raw = button(asText ? 'Back to the slide' : 'Edit as text', null, toggleText);
      end.appendChild(raw);
      if (o.done) end.appendChild(o.done);
      bar.appendChild(end);
    }

    function drawAdder() {
      adder.replaceChildren();
      L.ADD.forEach(function (a) {
        var b = el('button', 'studio-tile'); b.type = 'button';
        var pic = el('span', 'studio-thumb'); pic.innerHTML = K.render(L.deck(a.text))[0] || '';
        b.appendChild(pic); b.appendChild(el('span', null, a.label));
        b.addEventListener('click', function () {
          finish(); remember();
          list.splice(list.length ? at + 1 : 0, 0, a.text.replace(/\s+$/, '').split('\n'));
          at = list.length === 1 ? 0 : at + 1;
          adder.hidden = true;
          changed(); redraw();
        });
        adder.appendChild(b);
      });
    }

    // Where a drawn line is, as a share of the slide, so it holds at any size.
    function place(nodes) {
      var c = canvas.getBoundingClientRect(), l = 1e9, t = 1e9, r = -1e9, b = -1e9;
      nodes.forEach(function (n) {
        var x = n.getBoundingClientRect();
        l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
      });
      return { left: l - c.left, top: t - c.top, width: r - l, height: b - t, scale: c.width / W };
    }
    function pin(node, p) {
      node.style.left = (p.left / (p.scale * W) * 100) + '%';
      node.style.top = (p.top / (p.scale * H) * 100) + '%';
      node.style.width = (p.width / (p.scale * W) * 100) + '%';
      node.style.height = (p.height / (p.scale * H) * 100) + '%';
    }

    function drawHits() {
      hits.replaceChildren();
      if (readOnly || !list.length) return;
      var svg = art.querySelector('svg');
      if (!svg) return;
      var nodes = Array.prototype.slice.call(svg.querySelectorAll('text'));
      var lines = list[at], items = M.editable(lines);
      var groups = M.match(items, nodes.map(function (n) { return n.textContent; }));
      var lost = [];
      items.forEach(function (it, i) {
        if (!groups[i].length) { lost.push(it); return; }
        var drawn = groups[i].map(function (k) { return nodes[k]; });
        var hit = el('button', 'studio-hit'); hit.type = 'button';
        hit.setAttribute('aria-label', 'Change: ' + M.plain(it.words));
        pin(hit, place(drawn));
        hit.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(); open(it.line); });
        hit.addEventListener('click', function (ev) { if (ev.detail === 0) { finish(); open(it.line); } });
        hits.appendChild(hit);
      });
      var b = M.block(lines), inner = svg.querySelector('svg');
      if (b && inner) {
        var spots = spotsOf(b, inner);
        spots.forEach(function (c, n) {
          var hit = el('button', 'studio-hit'); hit.type = 'button';
          hit.setAttribute('aria-label', 'Change: ' + (c.text || 'an empty cell'));
          pin(hit, { left: c.left, top: c.top, width: c.width, height: c.height, scale: c.scale });
          hit.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(); openSpot(n); });
          hit.addEventListener('click', function (ev) { if (ev.detail === 0) { finish(); openSpot(n); } });
          hits.appendChild(hit);
        });
        if (!spots.length) {
          var area = el('button', 'studio-hit is-block'); area.type = 'button';
          area.setAttribute('aria-label', 'Change the numbers');
          pin(area, place([inner]));
          area.addEventListener('click', function () { var f = side.querySelector('[data-block] input, [data-block] textarea'); if (f) f.focus(); });
          hits.appendChild(area);
        }
      }
      if (M.layoutOf(lines) !== 'title' && !b) [0, 1].forEach(function (col) {
        var mine = items.filter(function (x, i) { return x.column === col && groups[i].length; });
        if (!mine.length) return;
        var last = mine[mine.length - 1], g = groups[items.indexOf(last)];
        var p = place(g.map(function (k) { return nodes[k]; }));
        var plus = el('button', 'studio-ghost', 'Add a point'); plus.type = 'button';
        plus.style.left = (p.left / (p.scale * W) * 100) + '%';
        plus.style.top = ((p.top + p.height + 8 * p.scale) / (p.scale * H) * 100) + '%';
        plus.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(); addPoint(last.line); });
        plus.addEventListener('click', function (ev) { if (ev.detail === 0) { finish(); addPoint(last.line); } });
        hits.appendChild(plus);
      });
      drawLost(lost);
    }
    // Words the renderer drew some other way still have a field.
    var lostBox = el('div', 'studio-group');
    function drawLost(lost) {
      lostBox.replaceChildren();
      lostBox.hidden = !lost.length;
      if (!lost.length) return;
      lostBox.appendChild(el('p', 'ui-label', 'More words'));
      lost.forEach(function (it) {
        var f = el('input'); f.value = it.words; f.setAttribute('aria-label', 'Words');
        f.addEventListener('focus', remember);
        f.addEventListener('input', function () { list[at] = M.setWords(list[at], it.line, f.value); changed(); paint(); });
        lostBox.appendChild(f);
      });
    }

    // The places on a table or diagram a person can type, where they are drawn.
    // Each cell is drawn even when empty, so a table's text is its grid, in order.
    function spotsOf(b, inner) {
      var c = canvas.getBoundingClientRect(), scale = c.width / W;
      var nodes = Array.prototype.slice.call(inner.querySelectorAll('text'));
      function at(n, width) {
        var m = n.getScreenCTM(), size = Number(n.getAttribute('font-size')) || 20, px = size * m.a;
        var left = m.e + m.a * Number(n.getAttribute('x')) - c.left, base = m.f + m.d * Number(n.getAttribute('y')) - c.top;
        return { node: n, left: left, top: base - px * 0.95, width: width * m.a, height: px * 1.3, px: px, scale: scale };
      }
      if (b.app === 'github') return [];
      if (b.app === 'sheet') {
        var g = M.grid(b.body);
        if (g.chart) return [];
        var rows = M.even(g.rows), cols = rows[0] ? rows[0].length : 0;
        if (!cols || nodes.length !== rows.length * cols) return [];
        var pitch = cols > 1 ? Number(nodes[1].getAttribute('x')) - Number(nodes[0].getAttribute('x')) : 800;
        return nodes.map(function (n, i) {
          var y = Math.floor(i / cols), x = i % cols;
          return Object.assign(at(n, pitch - 12), { text: rows[y][x].replace(TYPE, ''), y: y, x: x, rows: rows.length, cols: cols });
        });
      }
      var items = M.outline(b.body), found = M.match(items, nodes.map(function (n) { return n.textContent; })), out = [];
      items.forEach(function (it, i) {
        if (!found[i].length) return;
        var n = nodes[found[i][0]], r = n.getBoundingClientRect();
        var spot = at(n, r.width / n.getScreenCTM().a + 8);
        out.push(Object.assign(spot, { left: r.left - c.left, text: it.words, line: it.line, center: true }));
      });
      return out;
    }
    var TYPE = /:(number|money|text|name|date|percent)$/;
    var cell = null;
    function openSpot(n) {
      var lines = list[at], b = M.block(lines), inner = art.querySelector('svg svg');
      if (!b || !inner) return;
      var spots = spotsOf(b, inner), c = spots[n];
      if (!c) return;
      if (c.y != null) { cell = { y: c.y, x: c.x }; drawSide(); }
      remember();
      var box2 = el('div', 'studio-type');
      box2.contentEditable = 'plaintext-only';
      if (box2.contentEditable !== 'plaintext-only') box2.contentEditable = 'true';
      box2.setAttribute('role', 'textbox');
      box2.setAttribute('aria-label', c.y != null ? 'Row ' + (c.y + 1) + ', column ' + (c.x + 1) : 'A label');
      box2.textContent = c.text;
      var st = box2.style;
      st.fontSize = c.px + 'px'; st.lineHeight = c.height + 'px';
      st.fontWeight = c.node.getAttribute('font-weight') || '400';
      st.color = c.node.getAttribute('fill') || '#E8EDEA';
      st.background = '#1B2320';
      st.left = c.left + 'px'; st.top = c.top + 'px'; st.minWidth = Math.max(c.width, 40) + 'px'; st.minHeight = c.height + 'px';
      if (c.y != null) st.width = c.width + 'px';
      canvas.appendChild(box2);
      function write(words) {
        var fresh = M.block(list[at]);
        if (c.y == null) { list[at] = M.setBlock(list[at], M.setOutline(fresh.body, c.line, words)); return; }
        var g = M.grid(fresh.body); g.rows = M.even(g.rows);
        var type = TYPE.exec(g.rows[c.y][c.x]);
        g.rows[c.y][c.x] = String(words).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim() + (type ? type[0] : '');
        list[at] = M.setBlock(list[at], M.ungrid(g));
      }
      typing = { node: box2, spot: true, write: write, before: c.text, cancelled: false };
      box2.focus();
      var range = document.createRange(); range.selectNodeContents(box2);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      var live = null;
      box2.addEventListener('input', function () {
        write(box2.textContent);
        clearTimeout(live);
        live = setTimeout(function () { if (typing && typing.node === box2) { paint(); changed(); } }, 250);
      });
      box2.addEventListener('blur', function () { if (typing && typing.node === box2) finish(); });
      box2.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault(); typing.cancelled = true; finish();
          // Leaving a row Enter just added takes the empty row away again.
          if (c.y != null) {
            var left = M.grid(M.block(list[at]).body); left.rows = M.even(left.rows);
            var last = left.rows[left.rows.length - 1];
            if (left.rows.length > 1 && last.every(function (x) { return !String(x).trim(); })) {
              left.rows.pop(); list[at] = M.setBlock(list[at], M.ungrid(left)); changed(); paint(); drawHits();
            }
          }
          return;
        }
        if (ev.key !== 'Tab' && ev.key !== 'Enter') return;
        ev.preventDefault();
        var step = ev.key === 'Enter' ? (c.y != null ? c.cols : 1) : (ev.shiftKey ? -1 : 1);
        finish();
        var next = n + step;
        if (c.y != null && next >= c.rows * c.cols) {
          remember();
          var g = M.grid(M.block(list[at]).body); g.rows = M.even(g.rows);
          g.rows.push(new Array(c.cols).fill(''));
          list[at] = M.setBlock(list[at], M.ungrid(g));
          changed(); paint(); drawHits();
          next = g.rows.length * c.cols - c.cols + (ev.key === 'Enter' ? c.x : 0);
        }
        if (next >= 0) openSpot(next);
      });
    }

    function addPoint(line) {
      remember();
      var r = M.addAfter(list[at], line);
      list[at] = M.setWords(r.lines, r.line, 'A new point');
      paint(); drawHits();
      open(r.line, true);
    }

    // The box laid over a line, in that line's own type.
    function open(line, fresh) {
      var svg = art.querySelector('svg');
      if (!svg) return;
      var nodes = Array.prototype.slice.call(svg.querySelectorAll('text'));
      var items = M.editable(list[at]);
      var groups = M.match(items, nodes.map(function (n) { return n.textContent; }));
      var i = items.findIndex(function (x) { return x.line === line; });
      if (i < 0 || !groups[i].length) return;
      var drawn = groups[i].map(function (k) { return nodes[k]; }), first = drawn[0];
      var p = place(drawn), s = p.scale, item = items[i];
      var size = Number(first.getAttribute('font-size')) || 34;
      var middle = first.getAttribute('text-anchor') === 'middle';
      var gap = drawn[1] ? Number(drawn[1].getAttribute('y')) - Number(first.getAttribute('y')) : size * 1.3;
      var two = M.layoutOf(list[at]) === 'two' && item.kind !== 'head';
      var right = (two && item.column === 0 ? W / 2 - 16 : W - EDGE) * s;
      var box2 = el('div', 'studio-type');
      box2.contentEditable = 'plaintext-only';
      if (box2.contentEditable !== 'plaintext-only') box2.contentEditable = 'true';
      box2.setAttribute('role', 'textbox');
      box2.setAttribute('aria-label', 'Words on this slide');
      box2.spellcheck = true;
      box2.textContent = item.words;
      var st = box2.style;
      st.fontSize = (size * s) + 'px';
      st.fontWeight = first.getAttribute('font-weight') || '400';
      st.color = first.getAttribute('fill') || '#E8EDEA';
      st.lineHeight = (gap * s) + 'px';
      st.background = PAPER;
      st.top = (p.top - (gap - size) * s / 2) + 'px';
      st.minHeight = (p.height + (gap - size) * s) + 'px';
      if (middle) { st.left = (EDGE * s) + 'px'; st.width = ((W - 2 * EDGE) * s) + 'px'; st.textAlign = 'center'; }
      else { st.left = p.left + 'px'; st.width = (right - p.left) + 'px'; }
      canvas.appendChild(box2);
      if (!fresh) remember();
      typing = { node: box2, line: line, before: item.words, fresh: !!fresh, cancelled: false };
      box2.focus();
      var range = document.createRange();
      range.selectNodeContents(box2);
      if (!fresh) range.collapse(false);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);

      var live = null;
      box2.addEventListener('input', function () {
        if (!typing) return;
        typing.fresh = false;
        list[at] = M.setWords(list[at], line, box2.textContent);
        clearTimeout(live);
        live = setTimeout(function () { if (typing && typing.node === box2) { paint(); drawHits(); changed(); } }, 250);
      });
      box2.addEventListener('blur', function () { if (typing && typing.node === box2) finish(); });
      box2.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); typing.cancelled = true; finish(); return; }
        if (ev.key === 'Enter') {
          ev.preventDefault();
          var l = line; finish();
          var still = M.editable(list[at]).some(function (x) { return x.line === l; });
          if (still) addPoint(l);
          return;
        }
        if (ev.key === 'Backspace' && !box2.textContent && item.kind !== 'head') {
          ev.preventDefault();
          var before = items[i - 1];
          typing.node = null; box2.remove(); typing = null;
          list[at] = M.remove(list[at], line);
          changed(); paint(); drawHits();
          if (before) open(before.line);
        }
      });
    }
    function finish() {
      if (!typing) return;
      var t = typing; typing = null;
      if (t.spot) {
        var said2 = t.node.textContent;
        t.node.remove();
        t.write(t.cancelled ? t.before : said2);
        if (t.cancelled || said2.trim() === t.before) past.pop();
        changed(); drawBar(); paint(); drawHits(); drawSide();
        return;
      }
      if (t.node) {
        var words = t.node.textContent.trim();
        t.node.remove();
        if (t.cancelled) { if (t.fresh) list[at] = M.remove(list[at], t.line); else list[at] = M.setWords(list[at], t.line, t.before); past.pop(); }
        else if (t.fresh || (!words && M.pieces(list[at][t.line]).kind !== 'head')) list[at] = M.remove(list[at], t.line);
        else if (words) list[at] = M.setWords(list[at], t.line, words);
        else list[at] = M.setWords(list[at], t.line, t.before);
      }
      changed(); drawBar(); paint(); drawHits(); drawSide();
    }

    function drawSide() {
      if (readOnly) return;
      side.replaceChildren();
      side.hidden = !list.length || asText;
      if (side.hidden) return;
      var lines = list[at], now = M.layoutOf(lines);
      var lay = el('div', 'studio-group');
      lay.appendChild(el('p', 'ui-label', 'Layout'));
      var tiles = el('div', 'studio-layouts');
      M.LAYOUTS.forEach(function (x) {
        var b = el('button', 'studio-layout'); b.type = 'button';
        b.setAttribute('aria-pressed', String(x.key === now));
        b.innerHTML = layoutPicture(x.key);
        b.appendChild(el('span', null, x.label));
        b.addEventListener('click', function () { edit(function (a) { return M.setLayout(a, x.key); }); });
        tiles.appendChild(b);
      });
      lay.appendChild(tiles);
      side.appendChild(lay);

      if (M.editable(lines).length > 2 && now !== 'title') {
        var rev = el('label', 'studio-switch');
        var on = el('input'); on.type = 'checkbox'; on.checked = M.revealed(lines);
        on.addEventListener('change', function () { edit(function (a) { return M.setRevealed(a, on.checked); }); });
        rev.appendChild(on); rev.appendChild(document.createTextNode('Point by point'));
        side.appendChild(rev);
      }

      var ic = el('label', 'studio-group');
      ic.appendChild(el('span', 'ui-label', 'Icon'));
      var pick = el('select');
      pick.appendChild(new Option('None', ''));
      var has = M.iconOf(lines);
      ICONS.concat(has && ICONS.indexOf(has) < 0 ? [has] : []).forEach(function (n) { var words = n.replace(/-/g, ' '); pick.appendChild(new Option(words.charAt(0).toUpperCase() + words.slice(1), n)); });
      pick.value = has;
      pick.addEventListener('change', function () { edit(function (a) { return M.setIcon(a, pick.value); }); });
      ic.appendChild(pick);
      side.appendChild(ic);

      var b = M.block(lines);
      if (b) side.appendChild(blockEditor(b));
      else {
        var more = el('div', 'studio-group');
        more.appendChild(el('p', 'ui-label', 'Add to this slide'));
        var row = el('div', 'studio-adds');
        ['table', 'chart', 'diagram', 'github'].forEach(function (k) {
          var a = L.ADD.filter(function (x) { return x.key === k; })[0];
          row.appendChild(button(a.label, null, function () {
            var fence = /```[\s\S]*```/.exec(a.text)[0].replace('repo: ', 'repo: ' + ((o.github && o.github.repo) || '')).split('\n');
            edit(function (x) { return x.concat([''], fence); });
          }));
        });
        more.appendChild(row);
        side.appendChild(more);
      }
      side.appendChild(lostBox);
    }
    function edit(fn) {
      finish(); remember();
      list[at] = fn(list[at]);
      changed(); redraw();
    }

    function blockEditor(b) {
      var wrap = el('div', 'studio-group');
      wrap.setAttribute('data-block', '');
      function write(body, quiet) {
        list[at] = M.setBlock(list[at], body);
        changed(); paint();
        if (!quiet) drawHits();
      }
      if (b.app === 'github') {
        wrap.appendChild(el('p', 'ui-label', 'From GitHub'));
        var spec = L.ghSpecs('```github\n' + b.body + '\n```')[0] || { repo: '', show: 'issues' };
        var repo = el('input'); repo.value = spec.repo; repo.placeholder = 'owner/name'; repo.setAttribute('aria-label', 'Repository');
        repo.setAttribute('list', 'studio-repos');
        var known = el('datalist'); known.id = 'studio-repos';
        ((o.github && o.github.repos) || []).forEach(function (r) { known.appendChild(new Option(r, r)); });
        var what = el('select'); what.setAttribute('aria-label', 'What to show');
        [['issues', 'Open issues'], ['pulls', 'Open pull requests'], ['commits', 'Latest commits'], ['readme', 'The README'], ['repo', 'About the repository']].forEach(function (x) { what.appendChild(new Option(x[1], x[0])); });
        what.value = spec.show;
        var put = function () { write('repo: ' + repo.value.trim() + '\nshow: ' + what.value); };
        repo.addEventListener('focus', remember); repo.addEventListener('change', put);
        what.addEventListener('change', function () { remember(); put(); });
        wrap.appendChild(repo); wrap.appendChild(known); wrap.appendChild(what);
      } else if (b.app === 'diagram') {
        wrap.appendChild(el('p', 'ui-label', 'Branches'));
        var d = el('textarea'); d.rows = 8; d.value = b.body; d.setAttribute('aria-label', 'The diagram as an outline');
        d.addEventListener('focus', remember);
        d.addEventListener('input', function () { write(d.value); });
        wrap.appendChild(d);
      } else {
        var g = M.grid(b.body);
        wrap.appendChild(el('p', 'ui-label', g.chart ? 'Chart' : 'Table'));
        if (g.chart) {
          var kind = el('select'); kind.setAttribute('aria-label', 'Kind of chart');
          CHARTS.forEach(function (c) { kind.appendChild(new Option(c[1], c[0])); });
          kind.value = g.chart;
          kind.addEventListener('change', function () { remember(); g.head = g.head.replace(/chart:\s*\S+/, 'chart: ' + kind.value); write(M.ungrid(g)); });
          wrap.appendChild(kind);
        }
        function structure(fn) {
          remember();
          g.rows = M.even(g.rows);
          fn();
          write(M.ungrid(g));
          drawSide();
        }
        var row = el('div', 'studio-adds');
        row.appendChild(button('Add a row', null, function () { structure(function () { g.rows.push(new Array(g.rows[0].length).fill('')); }); if (g.chart) drawSide(); }));
        if (!g.chart) {
          var here = { y: Math.min(cell ? cell.y : 1e9, g.rows.length - 1), x: Math.min(cell ? cell.x : 1e9, (g.rows[0] || []).length - 1) };
          row.appendChild(button('Add a column', null, function () { structure(function () { g.rows.forEach(function (r) { r.push(''); }); }); }));
          var dropRow = button('Delete row', null, function () { structure(function () { g.rows.splice(here.y, 1); }); cell = null; drawSide(); });
          dropRow.disabled = g.rows.length < 2;
          var dropCol = button('Delete column', null, function () { structure(function () { g.rows.forEach(function (r) { r.splice(here.x, 1); }); }); cell = null; drawSide(); });
          dropCol.disabled = (g.rows[0] || []).length < 2;
          row.appendChild(dropRow); row.appendChild(dropCol);
        }
        if (g.chart) {
          var table = el('div', 'studio-grid');
          var cells = function () {
            table.replaceChildren();
            table.style.setProperty('--cols', g.rows[0] ? g.rows[0].length : 1);
            g.rows.forEach(function (r, y) {
              r.forEach(function (c, x) {
                var type = TYPE.exec(c);
                var f = el('input'); f.value = c.replace(TYPE, '');
                f.setAttribute('aria-label', 'Row ' + (y + 1) + ', column ' + (x + 1));
                f.addEventListener('focus', remember);
                f.addEventListener('input', function () { g.rows[y][x] = f.value + (type ? type[0] : ''); write(M.ungrid(g), true); });
                table.appendChild(f);
              });
            });
          };
          cells();
          wrap.appendChild(table);
        }
        wrap.appendChild(row);
      }
      wrap.appendChild(button('Remove it', 'btn-secondary small', function () {
        edit(function (a) { var x = M.block(a), c = a.slice(); c.splice(x.from, x.to - x.from + 1); return c; });
      }));
      return wrap;
    }

    function toggleText() {
      finish();
      asText = !asText;
      if (asText) source.value = text();
      else { remember(); list = M.slides(source.value); at = Math.min(at, Math.max(0, list.length - 1)); changed(); }
      redraw();
    }
    source.addEventListener('input', function () {
      list = M.slides(source.value);
      at = Math.min(at, Math.max(0, list.length - 1));
      changed();
      drawFilm(); paint();
    });

    // The deck as the room will see it, a step at a time.
    function play() {
      finish();
      var words = L.withoutNotes(text()), steps = L.frames(words), deck = L.deck(words);
      var i = Math.max(0, steps.findIndex(function (f) { return f.slide === at; }));
      var d = el('dialog', 'studio-play');
      var art2 = el('div', 'studio-play-art');
      var close = button('Close', 'btn-secondary small', function () { d.close(); });
      d.appendChild(art2); d.appendChild(close);
      function show() {
        var f = steps[i];
        art2.innerHTML = f.shown === Infinity ? K.render(deck)[f.slide] : K.frame(deck, f.slide, f.shown);
      }
      d.addEventListener('keydown', function (ev) {
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].indexOf(ev.key) >= 0) { ev.preventDefault(); i = Math.min(steps.length - 1, i + 1); show(); }
        if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(ev.key) >= 0) { ev.preventDefault(); i = Math.max(0, i - 1); show(); }
      });
      art2.addEventListener('click', function () { i = Math.min(steps.length - 1, i + 1); show(); });
      d.addEventListener('close', function () { d.remove(); });
      document.body.appendChild(d);
      show();
      d.showModal();
    }

    function redraw() {
      if (!K) return;
      canvas.hidden = asText || !list.length;
      source.hidden = !asText;
      noteBox.hidden = asText || !list.length;
      if (!readOnly && !list.length) adder.hidden = false;
      drawBar(); drawFilm(); paint(); drawHits(); drawSide();
      if (document.activeElement !== note) note.value = list[at] ? M.noteOf(list[at]) : '';
    }
    note.addEventListener('focus', remember);
    note.addEventListener('input', function () { list[at] = M.setNote(list[at], note.value); changed(); });

    root.addEventListener('keydown', function (ev) {
      var mine = ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable]');
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z' && !mine) {
        ev.preventDefault();
        if (ev.shiftKey) restore(ahead, past); else restore(past, ahead);
        return;
      }
      if (mine) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { if (at < list.length - 1) { ev.preventDefault(); at += 1; redraw(); } }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { if (at > 0) { ev.preventDefault(); at -= 1; redraw(); } }
    });

    // Pressing a button while typing would blur the box, and closing it redraws
    // the bar and the side, so the press would land on a button that is gone.
    // The button keeps the focus where it is, and the box closes first.
    root.addEventListener('mousedown', function (ev) {
      var b = ev.target.closest && ev.target.closest('button');
      if (typing && b && !b.classList.contains('studio-hit')) ev.preventDefault();
    });
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('button');
      if (typing && b && !b.classList.contains('studio-hit')) finish();
    }, true);
    if (window.ResizeObserver) new ResizeObserver(function () { if (K && !typing) drawHits(); }).observe(canvas);

    E.load().then(function (kit) { K = kit; drawAdder(); redraw(); needGitHub(); }, function () { box.replaceChildren(el('p', 'small', 'The slides cannot be drawn here.')); });

    return { text: text, flush: function () { finish(); clearTimeout(timer); return o.onChange ? o.onChange(text()) : null; } };
  }

  window.SlideStudio = { mount: mount };
})();
