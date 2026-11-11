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
  var LABELS = { sessions: 'sessions', parts: 'parts', slides: 'slides', questions: 'questions', breakouts: 'breakouts', featured: 'people featured', documents: 'documents to show', readings: 'readings and materials', workbooks: 'Minerva workbooks', outcomes: 'learning outcomes' };

  function say(text, cls) {
    out.hidden = false;
    out.replaceChildren(el('p', cls || 'small', text));
  }
  function done(row) {
    out.hidden = false;
    out.replaceChildren();
    var c = row.counts || {};
    if (row.refresh_of) {
      out.appendChild(el('h2', null, 'It came in again'));
      out.appendChild(el('p', null, 'The whole export is kept with the cohort, with the course’s outcomes and each session’s, for ' + (c.refreshed || 0) + ' of ' + (c.sessions || 0) + ' sessions. Its parts are as they were.'));
      var o = el('a', 'btn-primary', 'Open the cohort');
      o.href = '/cohort/?c=' + encodeURIComponent(row.cohort_id) + '&t=sessions';
      var q = el('p', 'actions'); q.appendChild(o); out.appendChild(q);
      form.hidden = true;
      return;
    }
    out.appendChild(el('h2', null, 'It arrived as a draft'));
    var bits = Object.keys(LABELS).filter(function (k) { return c[k]; }).map(function (k) { return c[k] + ' ' + LABELS[k]; });
    if (bits.length) out.appendChild(el('p', null, bits.join(', ') + '.'));
    if (c.gradingKept) out.appendChild(el('p', 'small', 'Kept with the course, never used to score: ' + c.gradingKept + ' grading weight' + (c.gradingKept === 1 ? '' : 's') + '.'));
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

  // Workbooks waiting for what is in them (workbooks.source.uuid, with no
  // blocks yet or images that never came in), filled from the workbooks file:
  // the plain export ([{ id, title, blocks, images }]) or Minerva's own data
  // ({ uuid: { title, blocks } }). Images go to the private bucket
  // workbook-files first; blocks that would move anyone's answers are refused.
  function workbooksIn(db) {
    var sec = root.querySelector('[data-workbooks-in]'), said = root.querySelector('[data-workbooks-status]');
    var input = root.querySelector('[data-workbooks-file]');
    var W = window.WorkbookLib;
    function waiting() {
      return db.from('workbooks').select('id, title, source, blocks, cohort_id').then(function (r) {
        return (r.data || []).filter(function (w) { return w.source && w.source.uuid && W.waiting(w); });
      });
    }
    function show() {
      return waiting().then(function (list) {
        sec.hidden = !list.length && !said.textContent;
        root.querySelector('[data-workbooks-waiting]').textContent = list.length + (list.length === 1 ? ' workbook is' : ' workbooks are') + ' waiting.';
        return list;
      });
    }
    function blob(dataUrl) {
      var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl), bin = atob(m[2]), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: m[1] });
    }
    function upload(w, images) {
      var store = db.storage.from('workbook-files');
      return (images || []).reduce(function (p, im) {
        return p.then(function () {
          return store.upload(w.cohort_id + '/' + w.id + '/' + im.name, blob(im.data), { upsert: true, contentType: blob(im.data).type }).then(function (u) {
            if (u.error) throw new Error(u.error.message);
          });
        });
      }, Promise.resolve());
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
          var filled = 0, missing = 0, changed = 0, failed = [];
          return list.reduce(function (p, w) {
            return p.then(function () {
              var src = byUuid[w.source.uuid], n = src ? W.normalize(src) : null;
              if (!n || !n.blocks.length) { missing += 1; return null; }
              if ((w.blocks || []).length && !W.sameShape(w.blocks, n.blocks)) { changed += 1; return null; }
              said.textContent = 'Filling in ' + w.title + '…';
              return upload(w, n.images).then(function () {
                return db.from('workbooks').update({ blocks: n.blocks }).eq('id', w.id).then(function (u) { if (u.error) throw new Error(u.error.message); filled += 1; });
              }).catch(function (e) { failed.push(w.title + ': ' + e.message); });
            });
          }, Promise.resolve()).then(function () {
            var out = [filled + (filled === 1 ? ' workbook' : ' workbooks') + ' filled in.'];
            if (missing) out.push(missing + ' were not in the file.');
            if (changed) out.push(changed + ' changed shape in Course Builder, so they were left as they are.');
            if (failed.length) out.push('Not filled: ' + failed.join('; ') + '.');
            said.textContent = out.join(' ');
            return show();
          });
        });
      }).catch(function (e) { said.textContent = 'That file could not be read: ' + (e && e.message ? e.message : 'not a workbooks file') + '.'; });
    });
    return show();
  }

  // Outcomes that came in by number only (cohorts.outcomes, name null), named
  // from Course Builder's catalog file: its /api/v2/core/general_learning_outcomes/
  // list, read from a page signed in to Course Builder. Names given stay.
  function outcomesIn(db) {
    var sec = root.querySelector('[data-outcomes-in]'), said = root.querySelector('[data-outcomes-status]');
    var input = root.querySelector('[data-outcomes-file]'), C = window.CohortLib;
    function waiting() {
      return db.from('cohorts').select('id, title, outcomes').then(function (r) {
        return (r.data || []).filter(function (c) { return (c.outcomes || []).some(function (o) { return !o.name; }); });
      });
    }
    function show() {
      return waiting().then(function (list) {
        var n = list.reduce(function (t, c) { return t + c.outcomes.filter(function (o) { return !o.name; }).length; }, 0);
        sec.hidden = !n && !said.textContent;
        root.querySelector('[data-outcomes-waiting]').textContent = n + (n === 1 ? ' outcome is' : ' outcomes are') + ' waiting for a name.';
      });
    }
    if (!C || input.getAttribute('data-wired')) return show();
    input.setAttribute('data-wired', '1');
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      said.textContent = 'Reading the file…';
      f.text().then(function (text) {
        var data = JSON.parse(text), list = Array.isArray(data) ? data : (data && (data.results || data.data)) || [];
        return waiting().then(function (cohorts) {
          var named = 0;
          return cohorts.reduce(function (p, c) {
            return p.then(function () {
              var r = C.nameOutcomes(c.outcomes, list);
              if (!r.named) return null;
              return db.from('cohorts').update({ outcomes: r.outcomes }).eq('id', c.id).then(function (u) { if (u.error) throw new Error(u.error.message); named += r.named; });
            });
          }, Promise.resolve()).then(function () {
            said.textContent = named + (named === 1 ? ' outcome' : ' outcomes') + ' named.';
            return show();
          });
        });
      }).catch(function (e) { said.textContent = 'That file could not be read: ' + (e && e.message ? e.message : 'not an outcomes file') + '.'; });
    });
    return show();
  }

  window.TeachPage.start(root, function (db) {
    outcomesIn(db);
    S.refreshWorkbooks = function () { workbooksIn(db); };
    workbooksIn(db);
    // Courses already brought in that this leader leads, to bring in again.
    db.from('cohorts').select('id, title, details').order('created_at', { ascending: false }).then(function (r) {
      var mine = (r.data || []).filter(function (c) { return c.details && c.details.source && c.details.source.system === 'coursebuilder'; });
      var sel = form.elements.refresh_of;
      mine.forEach(function (c) { var o = document.createElement('option'); o.value = c.id; o.textContent = c.title + ', again'; sel.appendChild(o); });
      root.querySelector('[data-import-into]').hidden = !mine.length;
    });
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
      var into = form.elements.refresh_of ? form.elements.refresh_of.value : '';
      db.functions.invoke('course-import', { body: into ? { export_url: link, refresh_of: into } : { export_url: link } }).then(function (r) {
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
