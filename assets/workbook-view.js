// A workbook on a page (DECISIONS.md, "Workbooks"): its blocks with places to
// answer, saved as a person goes, and for a leader each block's answers across
// everyone. Shared by the session page and the add-on.
// WorkbookView.form(box, { workbook, answers: { key: value }, onSave(key, value) -> Promise, readOnly })
// WorkbookView.summary(box, { workbook, answers: [rows], nameOf(row) })
(function () {
  var W = window.WorkbookLib;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // Words with bold, italic, lists, and https links, built from text nodes.
  function words(text) {
    var box = el('div', 'wb-words');
    var C = window.CohortLib;
    if (!C || !C.blocks) { box.textContent = text || ''; return box; }
    C.blocks(text || '').forEach(function (b) {
      function fill(node, runs) {
        runs.forEach(function (r) {
          var n;
          if (r.href) { n = el('a', null, r.text); n.href = r.href; n.target = '_blank'; n.rel = 'noopener'; }
          else if (r.bold) n = el('strong', null, r.text);
          else if (r.italic) n = el('em', null, r.text);
          else n = document.createTextNode(r.text);
          node.appendChild(n);
        });
        return node;
      }
      if (b.type === 'p') return box.appendChild(fill(el('p'), b.items[0]));
      var list = el(b.type);
      b.items.forEach(function (it) { list.appendChild(fill(el('li'), it)); });
      box.appendChild(list);
    });
    return box;
  }

  function form(box, o) {
    box.replaceChildren();
    var wb = o.workbook, saved = o.answers || {}, n = 0;
    (wb.blocks || []).forEach(function (b) {
      var sec = el('section', 'wb-block wb-' + b.type);
      if (b.type !== 'text') { n += 1; sec.appendChild(el('p', 'wb-n', String(n))); }
      sec.appendChild(words(b.text));
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var timer = null;
      function save(value) {
        if (o.readOnly || !o.onSave) return;
        var clean = W.answerOf(b, value);
        clearTimeout(timer);
        timer = setTimeout(function () {
          said.textContent = 'Saving';
          Promise.resolve(o.onSave(b.key, clean || {})).then(function (err) { said.textContent = err ? 'Not saved: ' + err : 'Saved'; });
        }, 500);
      }
      var mine = saved[b.key] || {};
      if (b.type === 'free' || b.type === 'file') {
        var t = el(b.type === 'file' ? 'input' : 'textarea');
        if (b.type === 'file') { t.type = 'url'; t.placeholder = 'A link to what you made'; }
        else t.rows = b.height === 'long' ? 8 : b.height === 'medium' ? 5 : 3;
        t.value = mine.text || ''; t.disabled = !!o.readOnly;
        t.setAttribute('aria-label', 'Your answer to ' + n);
        t.addEventListener('input', function () { save({ text: t.value }); });
        sec.appendChild(t);
      } else if (b.type === 'choice') {
        var name = 'wb-' + wb.id + '-' + b.key, picks = mine.picks || [];
        var list = el('div', 'wb-choices');
        list.setAttribute('role', b.multiple ? 'group' : 'radiogroup');
        (b.choices || []).forEach(function (c, i) {
          var lab = el('label', 'check'), inp = el('input');
          inp.type = b.multiple ? 'checkbox' : 'radio'; inp.name = name; inp.checked = picks.indexOf(i) >= 0; inp.disabled = !!o.readOnly;
          inp.addEventListener('change', function () {
            var now = [].slice.call(list.querySelectorAll('input')).map(function (x, k) { return x.checked ? k : -1; }).filter(function (k) { return k >= 0; });
            save({ picks: now });
          });
          lab.appendChild(inp); lab.appendChild(document.createTextNode(' ' + c)); list.appendChild(lab);
        });
        sec.appendChild(list);
      } else if (b.type === 'table') {
        var table = el('table', 'wb-table'), cells = (mine.cells || []);
        (b.rows || []).forEach(function (r, y) {
          var tr = el('tr');
          r.forEach(function (c, x) {
            var td = el(y === 0 && !c.fill ? 'th' : 'td');
            if (!c.fill) td.textContent = c.text;
            else {
              var inp = el('input'); inp.value = (cells[y] && cells[y][x]) || ''; inp.disabled = !!o.readOnly;
              inp.setAttribute('aria-label', 'Row ' + (y + 1) + ', column ' + (x + 1));
              inp.addEventListener('input', function () {
                var all = (b.rows || []).map(function (rr, yy) { return rr.map(function (cc, xx) { var f = table.querySelector('[data-cell="' + yy + '-' + xx + '"]'); return f ? f.value : ''; }); });
                save({ cells: all });
              });
              inp.setAttribute('data-cell', y + '-' + x);
              td.appendChild(inp);
            }
            tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        sec.appendChild(table);
      }
      if (b.type !== 'text') sec.appendChild(said);
      box.appendChild(sec);
    });
  }

  function summary(box, o) {
    box.replaceChildren();
    W.summary(o.workbook, o.answers, o.nameOf).forEach(function (s, i) {
      var sec = el('section', 'wb-block');
      sec.appendChild(el('p', 'wb-n', String(i + 1)));
      sec.appendChild(words(s.text));
      if (s.counts) {
        var ul = el('ul', 'wb-counts');
        s.counts.forEach(function (c) { ul.appendChild(el('li', null, c.label + ': ' + c.count)); });
        sec.appendChild(ul);
      } else if (!s.answers.length) {
        sec.appendChild(el('p', 'small', 'No answers yet'));
      } else {
        var list = el('ul', 'wb-answers');
        s.answers.forEach(function (a) {
          var v = a.value || {}, text = v.text || (v.cells ? v.cells.map(function (r) { return r.filter(Boolean).join(' / '); }).filter(Boolean).join('; ') : '');
          var li = el('li');
          li.appendChild(el('strong', null, a.who || 'Someone'));
          li.appendChild(document.createTextNode(': ' + text));
          list.appendChild(li);
        });
        sec.appendChild(list);
      }
      box.appendChild(sec);
    });
  }

  window.WorkbookView = { form: form, summary: summary, words: words };
})();
