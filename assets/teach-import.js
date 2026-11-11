// Bringing in a course from Minerva's Course Builder (PAGES.md, /teach/import/;
// DECISIONS.md, "Courses come in from Course Builder"). The course-import
// function opens the export link once with itself as the destination; this
// page waits for course_imports to say how it went, then opens the cohort.
(function () {
  var root = document.querySelector('[data-teach-import]');
  if (!root || !window.TeachPage) return;
  var el = window.TeachPage.el;
  var form = root.querySelector('[data-import-form]'), out = root.querySelector('[data-import-result]');
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
  }

  window.TeachPage.start(root, function (db) {
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
