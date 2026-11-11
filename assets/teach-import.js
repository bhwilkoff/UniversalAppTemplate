// Bringing in a course from Minerva's Course Builder (PAGES.md, /teach/import/;
// DECISIONS.md, "Courses come in from Course Builder"). The course-import
// function opens the export link once with itself as the destination; this
// page waits for course_imports to say how it went, then opens the cohort.
(function () {
  var root = document.querySelector('[data-teach-import]');
  if (!root || !window.TeachPage) return;
  var el = window.TeachPage.el;
  var form = root.querySelector('[data-import-form]'), out = root.querySelector('[data-import-result]');
  var S = {};
  var LABELS = { sessions: 'sessions', parts: 'parts', slides: 'slides', questions: 'questions', breakouts: 'breakouts', featured: 'people featured', documents: 'documents to show', readings: 'readings and materials', workbooks: 'Minerva workbooks' };

  function say(text, cls) {
    out.hidden = false;
    out.replaceChildren(el('p', cls || 'small', text));
  }
  function done(row) {
    out.hidden = false;
    out.replaceChildren();
    out.appendChild(el('h2', null, 'It arrived as a draft'));
    var c = row.counts || {};
    var bits = Object.keys(LABELS).filter(function (k) { return c[k]; }).map(function (k) { return c[k] + ' ' + LABELS[k]; });
    if (bits.length) out.appendChild(el('p', null, bits.join(', ') + '.'));
    var skipped = Object.keys(c.skipped || {});
    if (skipped.length) out.appendChild(el('p', 'small', 'Left out on purpose: ' + skipped.map(function (k) { return c.skipped[k] + ' ' + k + (c.skipped[k] === 1 ? '' : 's'); }).join(', ') + '.'));
    var warn = row.warnings || [];
    if (warn.length) {
      var d = el('details', 'import-warnings');
      d.appendChild(el('summary', null, warn.length + ' to look at'));
      var ul = el('ul');
      warn.forEach(function (w) { ul.appendChild(el('li', null, w)); });
      d.appendChild(ul);
      out.appendChild(d);
    }
    var a = el('a', 'btn-primary', 'Open the cohort');
    a.href = '/cohort/?c=' + encodeURIComponent(row.cohort_id) + '&t=sessions';
    var p = el('p', 'actions'); p.appendChild(a); out.appendChild(p);
    form.hidden = true;
    if (S.refreshWorkbooks) S.refreshWorkbooks();
  }

  // Workbooks waiting for what is in them (workbooks.source.uuid, blocks
  // empty), filled from the workbooks file: the plain export ([{ id, title,
  // blocks }]) or Minerva's own data ({ uuid: { title, blocks } }).
  function workbooksIn(db) {
    var sec = root.querySelector('[data-workbooks-in]'), said = root.querySelector('[data-workbooks-status]');
    var input = root.querySelector('[data-workbooks-file]');
    function waiting() {
      return db.from('workbooks').select('id, title, source, blocks, cohort_id').then(function (r) {
        return (r.data || []).filter(function (w) { return w.source && w.source.uuid && !(w.blocks || []).length; });
      });
    }
    function show() {
      return waiting().then(function (list) {
        sec.hidden = !list.length;
        root.querySelector('[data-workbooks-waiting]').textContent = list.length + (list.length === 1 ? ' workbook is' : ' workbooks are') + ' waiting.';
        return list;
      });
    }
    if (input.getAttribute('data-wired')) return show();
    input.setAttribute('data-wired', '1');
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      said.textContent = 'Reading the file…';
      f.text().then(function (text) {
        var data = JSON.parse(text), byUuid = {};
        if (Array.isArray(data)) data.forEach(function (w) { if (w && w.id) byUuid[w.id] = w; });
        else Object.keys(data || {}).forEach(function (k) { byUuid[k] = data[k]; });
        return waiting().then(function (list) {
          var filled = 0, missing = 0;
          return list.reduce(function (p, w) {
            return p.then(function () {
              var src = byUuid[w.source.uuid], n = src ? window.WorkbookLib.normalize(src) : null;
              if (!n || !n.blocks.length) { missing += 1; return null; }
              return db.from('workbooks').update({ blocks: n.blocks }).eq('id', w.id).then(function (u) { if (!u.error) filled += 1; else missing += 1; });
            });
          }, Promise.resolve()).then(function () {
            said.textContent = filled + (filled === 1 ? ' workbook' : ' workbooks') + ' filled in.' + (missing ? ' ' + missing + ' were not in the file.' : '');
            return show();
          });
        });
      }).catch(function (e) { said.textContent = 'That file could not be read: ' + (e && e.message ? e.message : 'not a workbooks file') + '.'; });
    });
    return show();
  }

  window.TeachPage.start(root, function (db) {
    S.refreshWorkbooks = function () { workbooksIn(db); };
    workbooksIn(db);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var link = form.elements.export_url.value.trim();
      if (!/^https:\/\/coursebuilder\.minerva\.edu\/api\/v2\/export\/courseexport\/\d+\/[0-9a-f]{32}\/?(\?.*)?$/.test(link)) {
        say('That is not a Course Builder export link.', 'error');
        form.elements.export_url.focus();
        return;
      }
      var b = form.querySelector('button'); b.disabled = true;
      say('Asking Course Builder for the course…');
      db.functions.invoke('course-import', { body: { export_url: link } }).then(function (r) {
        var id = r.data && r.data.import_id;
        if (r.error || !id) {
          b.disabled = false;
          var ctx = r.error && r.error.context;
          var p = ctx && ctx.json ? ctx.json() : Promise.resolve(null);
          return p.then(function (j) { say((j && j.message) || (r.data && r.data.message) || 'It could not start.', 'error'); }, function () { say('It could not start.', 'error'); });
        }
        say('Waiting for Course Builder to send it. This takes about a minute.');
        var started = Date.now();
        (function look() {
          db.from('course_imports').select('*').eq('id', id).maybeSingle().then(function (q) {
            var row = q.data;
            if (row && row.state === 'done') return done(row);
            if (row && row.state === 'failed') { b.disabled = false; return say(row.problem || 'It did not come through.', 'error'); }
            if (row && row.state === 'received') say('It arrived. Making the sessions…');
            if (Date.now() - started > 6 * 60000) { b.disabled = false; return say('Course Builder has not sent it after six minutes. Make a new export and try again.', 'error'); }
            setTimeout(look, 3000);
          });
        })();
      });
    });
  });
})();
