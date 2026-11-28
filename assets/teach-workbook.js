// One workbook, made and changed by a leader (/teach/workbook/?w=<id>;
// PAGES.md): its title, who answers it, and its blocks (words, a question,
// choices, a table to fill in, a link to hand in), with pictures in the
// private bucket workbook-files. The preview is what people see.
(function () {
  var root = document.querySelector('[data-teach-workbook]');
  if (!root || !window.TeachPage || !window.WorkbookLib || !window.UI) return;
  var W = window.WorkbookLib, U = window.UI, el = U.el;
  var id = new URLSearchParams(location.search).get('w');
  var db = null, wb = null, blocks = [], dirty = false;
  var LABEL = { text: 'Words', free: 'Question', choice: 'Choice', table: 'Table', file: 'Link to hand in' };

  function $(s) { return root.querySelector(s); }
  function touch() { dirty = true; U.say($('[data-save-status]'), ''); }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function area(value, label, rows, max, on) {
    var lab = el('label', 'wb-edit-field'), t = el('textarea');
    lab.appendChild(el('span', 'ui-edit-label', label));
    t.rows = rows; t.maxLength = max; t.value = value || '';
    t.addEventListener('input', function () { on(t.value); touch(); });
    lab.appendChild(t);
    return lab;
  }

  function addPicture(b, after) {
    var pick = el('input'); pick.type = 'file'; pick.accept = 'image/png,image/jpeg,image/webp,image/gif'; pick.hidden = true;
    var btn = U.button('Add a picture', 'btn-secondary small', function () { pick.click(); });
    var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      pick.value = '';
      if (!f) return;
      var type = (/^image\/(png|jpeg|webp|gif)$/.exec(f.type) || [])[1];
      if (!type) return U.say(said, 'A picture is a PNG, JPEG, WebP, or GIF.', 'problem');
      if (f.size > 5242880) return U.say(said, 'A picture can be up to 5 MB.', 'problem');
      var name = W.nextImage(blocks, type);
      if (!name) return U.say(said, 'This workbook has as many pictures as it can hold.', 'problem');
      U.say(said, 'Adding');
      db.storage.from('workbook-files').upload(wb.cohort_id + '/' + wb.id + '/' + name, f, { contentType: f.type, upsert: true }).then(function (r) {
        if (r.error) return U.say(said, 'Not added: ' + r.error.message, 'problem');
        b.text = (b.text ? b.text.replace(/\s+$/, '') + '\n' : '') + '![](' + name + ')';
        touch(); draw(); after && after();
      });
    });
    var box = el('span', 'wb-edit-picture');
    box.appendChild(btn); box.appendChild(pick); box.appendChild(said);
    return box;
  }

  function tableEditor(b) {
    var box = el('div', 'wb-edit-table');
    var grid = (b.rows || []).map(function (r) { return r.map(function (c) { return c.text; }); });
    function commit() { b.rows = W.tableFrom(grid); touch(); }
    function drawGrid() {
      box.replaceChildren();
      var t = el('table'), body = el('tbody');
      grid.forEach(function (r, y) {
        var tr = el('tr');
        r.forEach(function (v, x) {
          var td = el('td'), inp = el('input');
          inp.value = v; inp.maxLength = 500; inp.placeholder = 'Filled in';
          inp.setAttribute('aria-label', 'Row ' + (y + 1) + ', column ' + (x + 1));
          inp.addEventListener('input', function () { grid[y][x] = inp.value; commit(); });
          td.appendChild(inp); tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      t.appendChild(body);
      var scroll = el('div', 'wb-edit-table-scroll'); scroll.appendChild(t);
      box.appendChild(scroll);
      var bar = el('div', 'ui-toolbar');
      var w = grid[0] ? grid[0].length : 0;
      bar.appendChild(U.button('Add a row', 'btn-secondary small', function () { if (grid.length < 40) { grid.push(new Array(w || 1).fill('')); commit(); drawGrid(); } }));
      bar.appendChild(U.button('Add a column', 'btn-secondary small', function () { if (w < 12) { grid.forEach(function (r) { r.push(''); }); commit(); drawGrid(); } }));
      var lessRow = U.button('Remove the last row', 'btn-secondary small', function () { grid.pop(); commit(); drawGrid(); });
      lessRow.disabled = grid.length < 2;
      var lessCol = U.button('Remove the last column', 'btn-secondary small', function () { grid.forEach(function (r) { r.pop(); }); commit(); drawGrid(); });
      lessCol.disabled = w < 2;
      bar.appendChild(lessRow); bar.appendChild(lessCol);
      box.appendChild(bar);
    }
    drawGrid();
    return box;
  }

  function blockEditor(b, i) {
    var li = el('li', 'wb-edit-block');
    var head = el('div', 'wb-edit-head');
    head.appendChild(el('h3', null, (i + 1) + '. ' + LABEL[b.type]));
    var side = el('div', 'ui-edit-side wb-edit-moves');
    var up = U.button('', 'ui-edit-button', function () { blocks.splice(i - 1, 0, blocks.splice(i, 1)[0]); touch(); draw(); });
    up.appendChild(U.icon('arrow-up')); up.setAttribute('aria-label', 'Move block ' + (i + 1) + ' up'); up.title = 'Move up'; up.disabled = i === 0;
    var rm = U.button('', 'ui-edit-button', function () { blocks.splice(i, 1); touch(); draw(); });
    rm.appendChild(U.icon('trash')); rm.setAttribute('aria-label', 'Remove block ' + (i + 1)); rm.title = 'Remove';
    side.appendChild(up); side.appendChild(rm);
    head.appendChild(side);
    li.appendChild(head);
    var words = b.type === 'text' ? 'Words' : 'Question';
    li.appendChild(area(b.text, words, b.type === 'text' ? 4 : 2, 6000, function (v) { b.text = v; }));
    li.appendChild(addPicture(b));
    if (b.type === 'free') {
      var lab = el('label', 'check'), box = el('input');
      box.type = 'checkbox'; box.checked = b.height === 'long';
      box.addEventListener('change', function () { b.height = box.checked ? 'long' : 'short'; touch(); });
      lab.appendChild(box); lab.appendChild(document.createTextNode(' A long answer'));
      li.appendChild(lab);
    }
    if (b.type === 'choice') {
      var ml = el('label', 'check'), mb = el('input');
      mb.type = 'checkbox'; mb.checked = !!b.multiple;
      mb.addEventListener('change', function () { b.multiple = mb.checked; touch(); });
      ml.appendChild(mb); ml.appendChild(document.createTextNode(' People can pick more than one'));
      li.appendChild(ml);
      var mount = el('div');
      li.appendChild(mount);
      var rows = U.editRows(mount, { fields: [{ key: 'c', label: 'Choice', max: 300 }], rows: (b.choices || []).map(function (c) { return { c: c }; }), add: 'Add a choice', most: 30 });
      mount.addEventListener('input', function () { b.choices = rows.get().map(function (r) { return r.c || ''; }); });
      mount.addEventListener('click', function () { setTimeout(function () { b.choices = rows.get().map(function (r) { return r.c || ''; }); touch(); }); });
    }
    if (b.type === 'table') {
      li.appendChild(el('p', 'hint', 'An empty cell is where people write.'));
      li.appendChild(tableEditor(b));
    }
    return li;
  }

  function draw() {
    var list = $('[data-blocks]');
    list.replaceChildren();
    blocks.forEach(function (b, i) { list.appendChild(blockEditor(b, i)); });
    if (!blocks.length) list.appendChild(U.empty('No blocks yet'));
  }

  function preview() {
    var box = $('[data-preview]');
    if (!window.WorkbookView) return;
    var shown = Object.assign({}, wb, { blocks: W.cleanBlocks(blocks).blocks });
    window.WorkbookView.form(box, { workbook: shown, answers: {}, readOnly: true, image: window.WorkbookView.images(db, wb) });
  }

  // Pictures no block names any more leave the bucket when the workbook saves.
  function tidyPictures(kept) {
    var folder = wb.cohort_id + '/' + wb.id, store = db.storage.from('workbook-files');
    var used = {};
    kept.forEach(function (b) { W.parts(b.text).forEach(function (p) { if (p.image) used[p.image] = true; }); });
    return store.list(folder, { limit: 1000 }).then(function (l) {
      var gone = ((l && l.data) || []).map(function (f) { return f.name; }).filter(function (n) { return !used[n]; });
      return gone.length ? store.remove(gone.map(function (n) { return folder + '/' + n; })) : null;
    }).catch(function () {});
  }

  function save(ev) {
    ev.preventDefault();
    var said = $('[data-save-status]'), f = $('[data-wb-form]').elements;
    var title = f.title.value.trim();
    if (!title) { f.title.focus(); return U.say(said, 'Give the workbook a title.', 'problem'); }
    var clean = W.cleanBlocks(blocks);
    if (clean.problem) return U.say(said, clean.problem, 'problem');
    var row = { title: title.slice(0, 200), kind: f.kind.value === 'group' ? 'group' : 'individual', blocks: clean.blocks };
    U.say(said, 'Saving');
    db.from('workbooks').update(row).eq('id', wb.id).select().single().then(function (r) {
      if (r.error) return U.say(said, 'Not saved: ' + r.error.message, 'problem');
      wb = r.data; blocks = JSON.parse(JSON.stringify(wb.blocks || [])); dirty = false;
      document.querySelector('[data-wb-name]').textContent = wb.title;
      draw(); preview();
      U.say(said, 'Saved');
      tidyPictures(wb.blocks);
    });
  }

  function remove() {
    U.confirm({ title: 'Delete this workbook?', body: 'Everyone’s answers to it go too.', action: 'Delete workbook' }).then(function (yes) {
      if (!yes) return;
      var said = $('[data-save-status]');
      U.say(said, 'Deleting');
      blocks = [];
      tidyPictures([]).then(function () { return db.from('workbooks').delete().eq('id', wb.id); }).then(function (r) {
        if (r && r.error) return U.say(said, 'Not deleted: ' + r.error.message, 'problem');
        dirty = false;
        location.assign($('[data-back-session]').href);
      });
    });
  }

  var page = window.TeachPage.start(root, function (client) {
    db = client;
    if (!/^[0-9a-f-]{36}$/.test(id || '')) return page.show('missing');
    return db.from('workbooks').select('*, sessions(number, title, cohort_id), cohorts(slug, title)').eq('id', id).maybeSingle().then(function (r) {
      if (r.error) return page.fail('This workbook could not be loaded: ' + r.error.message);
      if (!r.data) return page.show('missing');
      wb = r.data;
      blocks = JSON.parse(JSON.stringify(wb.blocks || []));
      var c = wb.cohorts || {}, s = wb.sessions || {};
      document.title = wb.title + ' | Human Shaped';
      document.querySelector('[data-wb-name]').textContent = wb.title;
      var cl = document.querySelector('[data-back-cohort]'); cl.textContent = c.title || 'The cohort'; cl.href = '/cohort/?c=' + encodeURIComponent(c.slug || '');
      var sl = document.querySelector('[data-back-session]'); sl.textContent = 'Session ' + s.number; sl.href = '/session/?c=' + encodeURIComponent(c.slug || '') + '&s=' + s.number + '&t=before';
      var f = $('[data-wb-form]');
      f.elements.title.value = wb.title;
      f.elements.kind.value = wb.kind;
      f.elements.title.addEventListener('input', touch);
      f.querySelectorAll('[name=kind]').forEach(function (n) { n.addEventListener('change', touch); });
      f.addEventListener('submit', save);
      $('[data-preview-button]').addEventListener('click', preview);
      $('[data-delete]').addEventListener('click', remove);
      var adds = $('[data-add-blocks]');
      ['text', 'free', 'choice', 'table', 'file'].forEach(function (t) {
        adds.appendChild(U.button(LABEL[t], 'btn-secondary small', function () {
          blocks.push(W.newBlock(t, blocks.concat(wb.blocks || []))); touch(); draw();
          var last = $('[data-blocks] > li:last-child textarea'); if (last) last.focus();
        }));
      });
      draw(); preview();
      page.show('teacher');
      return db.from('workbook_answers').select('block', { count: 'exact', head: true }).eq('workbook_id', wb.id).then(function (a) {
        var n = a && a.count;
        var note = $('[data-answered]');
        note.hidden = !n;
        if (n) note.textContent = n + (n === 1 ? ' answer is' : ' answers are') + ' saved. Changing or removing a question changes what people answered.';
      });
    });
  });
})();
