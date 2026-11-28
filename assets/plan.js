// Plan a session (/plan/; PAGES.md): anyone with a Google account makes a
// whole session as a file in their own Drive, and runs it in any Meet call
// with Human Shaped, with no cohort and no account here (Ben, November 28,
// 2026: "use the add-on without a GitHub account or any other dependencies";
// Drive storage approved the same day). One session is slides, questions,
// Ideas at Play models, websites, cards, and clocks (SessionPlan), saved
// through MyDrive. Until it is saved, the draft stays in this browser.
(function () {
  var root = document.querySelector('[data-plan]');
  if (!root || !window.SessionPlan || !window.MyDrive || !window.UI) return;
  var P = window.SessionPlan, D = window.MyDrive, U = window.UI, el = U.el;
  var DRAFT = 'hs-plan-draft';
  var KINDS = [['talk', 'Slides'], ['question', 'Question'], ['model', 'Model'], ['site', 'Website'], ['card', 'Card'], ['clock', 'Clock'], ['workbook', 'Workbook']];
  var NAME = {}; KINDS.forEach(function (k) { NAME[k[0]] = k[1]; });
  var ASKS = [['choice', 'One choice'], ['multi', 'Several choices'], ['scale', 'A scale'], ['words', 'A few words'], ['short', 'In their own words'], ['rank', 'Put in order']];
  var plan = null, open = null, studio = null, fileId = null, files = null;

  function $(s) { return root.querySelector(s); }
  function keep() { try { localStorage.setItem(DRAFT, JSON.stringify({ plan: plan, fileId: fileId })); } catch (e) {} }
  function said(t, tone) { U.say($('[data-plan-status]'), t, tone); }

  function field(label, input) { var l = el('label', 'plan-field'); l.appendChild(el('span', 'ui-edit-label', label)); l.appendChild(input); return l; }
  function text(value, max, on, long) {
    var t = el(long ? 'textarea' : 'input'); if (long) t.rows = 3; t.maxLength = max; t.value = value || '';
    t.addEventListener('input', function () { on(t.value); keep(); });
    return t;
  }

  // ---- one part's fields, by kind ------------------------------------------
  function partFields(p, box) {
    if (p.kind === 'talk') {
      // A picture goes to the host's Drive, and Google's window opens only
      // from a click, never from choosing a file (found November 28).
      if (!D.connected()) {
        var row = el('p', 'plan-connect');
        var cb = U.button('Connect your Drive to add pictures', 'btn-secondary small', function () {
          D.connect().then(function () { row.remove(); }, function (e) { said(e.message, 'problem'); });
        });
        row.appendChild(cb); box.appendChild(row);
      }
      var deck = el('div', 'plan-deck'); box.appendChild(deck);
      if (window.SlideStudio) {
        studio = window.SlideStudio.mount(deck, {
          text: p.slides || '# A title\n\n- What you will say',
          onChange: function (t) { p.slides = t; keep(); },
          upload: function (file) {
            if (!D.connected()) return Promise.reject(new Error('Press Connect your Drive to add pictures first.'));
            return D.connect().then(function (token) { return D.picture(token, file, file.name); });
          }
        });
        if (!p.slides) p.slides = '# A title\n\n- What you will say';
      }
      return;
    }
    if (p.kind === 'question') {
      box.appendChild(field('The question', text(p.prompt, 500, function (v) { p.prompt = v; }, true)));
      var how = el('select'); ASKS.forEach(function (a) { var o = el('option', null, a[1]); o.value = a[0]; how.appendChild(o); });
      how.value = p.ask || 'short';
      box.appendChild(field('How people answer', how));
      var mount = el('div'); box.appendChild(mount);
      var rows = U.editRows(mount, { fields: [{ key: 'c', label: 'Choice', max: 120 }], rows: (p.choices || []).map(function (c) { return { c: c }; }), add: 'Add a choice', most: 8 });
      function sync() { p.choices = rows.get().map(function (r) { return r.c || ''; }); keep(); }
      mount.addEventListener('input', sync);
      mount.addEventListener('click', function () { setTimeout(sync); });
      function fit() { mount.hidden = ['choice', 'multi', 'rank'].indexOf(how.value) < 0; }
      how.addEventListener('change', function () { p.ask = how.value; fit(); keep(); });
      fit();
      return;
    }
    if (p.kind === 'model') {
      var chosen = el('p', 'small plan-chosen');
      function show() { chosen.textContent = p.url ? 'Chosen: ' + (p.title || 'a model') + (p.together ? ', one everyone shares' : ', a copy for each person') : 'Choose a model below.'; }
      show(); box.appendChild(chosen);
      var pick = el('div'); box.appendChild(pick);
      if (window.ModelPicker) window.ModelPicker.mount(pick, { send: function (m) { p.url = m.url; p.title = m.name; p.together = m.together === true; show(); keep(); draw(); } });
      return;
    }
    if (p.kind === 'site') { var u = text(p.url, 2000, function (v) { p.url = v.trim(); }); u.type = 'url'; u.placeholder = 'https://'; box.appendChild(field('Its address', u)); return; }
    if (p.kind === 'card') { box.appendChild(field('Words on every stage', text(p.body, 400, function (v) { p.body = v; }, true))); return; }
    if (p.kind === 'workbook') return workbookFields(p, box);
    if (p.kind === 'clock') {
      var m = el('input'); m.type = 'number'; m.min = 1; m.max = 120; m.value = p.minutes || 5;
      m.addEventListener('input', function () { p.minutes = Number(m.value); keep(); });
      box.appendChild(field('Minutes', m));
    }
  }

  // ---- a workbook: blocks in the cohort workbook's shape (SessionPlan.blocks)
  var BLOCKS = [['text', 'Words to read'], ['free', 'An answer in words'], ['choice', 'A choice'], ['table', 'A table']];
  function tableSource(rows) { return (rows || []).map(function (r) { return r.map(function (c) { return c.fill ? '' : c.text; }).join(' | '); }).join('\n'); }
  function tableRows(src) { return String(src || '').split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return l.split('|').map(function (c) { return { text: c.trim() }; }); }); }
  function workbookFields(p, box) {
    p.blocks = Array.isArray(p.blocks) ? p.blocks : [];
    var list = el('ol', 'plan-blocks'); box.appendChild(list);
    function redraw() {
      list.replaceChildren();
      p.blocks.forEach(function (b, i) {
        var li = el('li', 'plan-block');
        var type = el('select'); BLOCKS.forEach(function (x) { var o = el('option', null, x[1]); o.value = x[0]; type.appendChild(o); });
        type.value = b.type || 'free';
        type.addEventListener('change', function () { b.type = type.value; keep(); redraw(); });
        var head = el('div', 'plan-block-head'); head.appendChild(type);
        var side = el('div', 'ui-edit-side plan-moves');
        var up = U.button('', 'ui-edit-button', function () { p.blocks.splice(i - 1, 0, p.blocks.splice(i, 1)[0]); keep(); redraw(); });
        up.appendChild(U.icon('arrow-up')); up.setAttribute('aria-label', 'Move block ' + (i + 1) + ' up'); up.disabled = i === 0;
        var rm = U.button('', 'ui-edit-button', function () { p.blocks.splice(i, 1); keep(); redraw(); });
        rm.appendChild(U.icon('trash')); rm.setAttribute('aria-label', 'Remove block ' + (i + 1));
        side.appendChild(up); side.appendChild(rm); head.appendChild(side);
        li.appendChild(head);
        li.appendChild(field(b.type === 'text' ? 'The words' : 'The question', text(b.text, 3000, function (v) { b.text = v; }, true)));
        if (b.type === 'choice') {
          li.appendChild(field('The choices, one per line', text((b.choices || []).join('\n'), 2400, function (v) { b.choices = v.split('\n').map(function (c) { return c.trim(); }).filter(Boolean); }, true)));
          var lab = el('label', 'check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = b.multiple === true;
          cb.addEventListener('change', function () { b.multiple = cb.checked; keep(); });
          lab.appendChild(cb); lab.appendChild(document.createTextNode(' People may pick several'));
          li.appendChild(lab);
        }
        if (b.type === 'table') {
          var src = b.src != null ? b.src : tableSource(b.rows);
          li.appendChild(field('One row per line, cells between |; an empty cell is filled in', text(src, 4000, function (v) { b.src = v; b.rows = tableRows(v); }, true)));
        }
        list.appendChild(li);
      });
    }
    redraw();
    box.appendChild(U.button('Add a block', 'btn-secondary small', function () { p.blocks.push({ type: 'free', text: '' }); keep(); redraw(); }));
  }

  // ---- the plan ------------------------------------------------------------
  function draw() {
    if (studio && studio.flush) studio.flush();
    studio = null;
    $('[data-plan-start]').hidden = !!plan;
    $('[data-plan-edit]').hidden = !plan;
    if (!plan) return drawStart();
    var t = $('[data-plan-title]'); if (document.activeElement !== t) t.value = plan.title || '';
    var list = $('[data-plan-parts]'); list.replaceChildren();
    if (!plan.parts.length) list.appendChild(U.empty('No parts yet'));
    plan.parts.forEach(function (p, i) {
      var li = el('li', 'plan-part' + (open === i ? ' is-open' : ''));
      var head = el('div', 'plan-part-head');
      var b = el('button', 'plan-part-name'); b.type = 'button'; b.setAttribute('aria-expanded', String(open === i));
      b.appendChild(el('span', 'plan-part-kind', NAME[p.kind]));
      b.appendChild(el('span', 'plan-part-title', p.title || NAME[p.kind]));
      b.addEventListener('click', function () { open = open === i ? null : i; draw(); });
      head.appendChild(b);
      var side = el('div', 'ui-edit-side plan-moves');
      var up = U.button('', 'ui-edit-button', function () { plan.parts.splice(i - 1, 0, plan.parts.splice(i, 1)[0]); open = open === i ? i - 1 : open; keep(); draw(); });
      up.appendChild(U.icon('arrow-up')); up.setAttribute('aria-label', 'Move ' + (p.title || NAME[p.kind]) + ' up'); up.disabled = i === 0;
      var rm = U.button('', 'ui-edit-button', function () { plan.parts.splice(i, 1); open = null; keep(); draw(); });
      rm.appendChild(U.icon('trash')); rm.setAttribute('aria-label', 'Remove ' + (p.title || NAME[p.kind]));
      side.appendChild(up); side.appendChild(rm); head.appendChild(side);
      li.appendChild(head);
      if (open === i) {
        var box = el('div', 'plan-part-body');
        if (p.kind !== 'model') box.appendChild(field('Its name in the plan', text(p.title, 120, function (v) { p.title = v; li.querySelector('.plan-part-title').textContent = v || NAME[p.kind]; })));
        partFields(p, box);
        li.appendChild(box);
      }
      list.appendChild(li);
    });
  }

  function drawStart() {
    var list = $('[data-plan-files]'); list.replaceChildren();
    list.hidden = !files;
    (files || []).forEach(function (f) {
      var li = el('li'), b = el('button', 'plan-file'); b.type = 'button';
      b.appendChild(el('span', 'plan-file-name', f.name.replace(/\.json$/, '')));
      b.appendChild(el('span', 'plan-file-when', new Date(f.modifiedTime).toLocaleDateString()));
      b.addEventListener('click', function () {
        said('Opening…');
        D.connect().then(function (token) { return D.open(token, f.id); }).then(function (s) {
          plan = { title: s.title || '', parts: P.clean(s.parts) }; fileId = f.id; open = null; keep(); said(''); draw();
        }, function (e) { said(e.message, 'problem'); });
      });
      li.appendChild(b); list.appendChild(li);
    });
    if (files && !files.length) list.appendChild(el('li', 'small', 'No sessions in your Drive yet.'));
  }

  // ---- buttons ---------------------------------------------------------------
  $('[data-plan-new]').addEventListener('click', function () { plan = { title: '', parts: [] }; fileId = null; open = null; keep(); draw(); $('[data-plan-title]').focus(); });
  $('[data-plan-open]').addEventListener('click', function () {
    said('Reading your Drive…');
    D.connect().then(function (token) { return D.list(token); }).then(function (l) { files = l; said(''); draw(); }, function (e) { said(e.message, 'problem'); });
  });
  $('[data-plan-title]').addEventListener('input', function (ev) { plan.title = ev.target.value; keep(); });
  var adds = $('[data-plan-add]');
  KINDS.forEach(function (k) {
    adds.appendChild(U.button(k[1], 'btn-secondary small', function () {
      plan.parts.push({ kind: k[0], title: '' }); open = plan.parts.length - 1; keep(); draw();
    }));
  });
  $('[data-plan-save]').addEventListener('click', function () {
    if (studio && studio.flush) studio.flush();
    var parts = plan.parts.map(function (p) { return Object.assign({}, p, { title: p.title || NAME[p.kind] }); });
    var ready = P.clean(parts);
    if (!(plan.title || '').trim()) { $('[data-plan-title]').focus(); return said('Give the session a name first.', 'problem'); }
    var short = parts.filter(function (p) { return p.kind === 'workbook' && P.blocks(p.blocks).length < (p.blocks || []).length; });
    if (short.length) return said('Finish every block in ' + short.map(function (p) { return p.title || NAME[p.kind]; }).join(', ') + ': each needs its words, a choice needs two choices, and a table needs a row.', 'problem');
    if (ready.length < parts.length) {
      var gaps = parts.filter(function (p) { return !P.clean([p]).length; }).map(function (p) { return p.title || NAME[p.kind]; });
      return said('Finish these first: ' + gaps.join(', ') + '.', 'problem');
    }
    said('Saving to your Drive…');
    var file = P.session(plan.title, ready);
    D.connect().then(function (token) {
      return D.save(token, file, fileId).catch(function (e) { if (fileId) return D.save(token, file); throw e; });
    }).then(function (id) { fileId = id; keep(); said('Saved in your Drive. Open it from Slides in Human Shaped in any Meet call.'); }, function (e) { said(e.message, 'problem'); });
  });
  $('[data-plan-close]').addEventListener('click', function () {
    if (studio && studio.flush) studio.flush();
    plan = null; fileId = null; open = null; files = null;
    try { localStorage.removeItem(DRAFT); } catch (e) {}
    said(''); draw();
  });

  try { var d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (d && d.plan && Array.isArray(d.plan.parts)) { plan = d.plan; fileId = d.fileId || null; } } catch (e) {}
  draw();
})();
