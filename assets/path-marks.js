// Working through the path (LOOP-PLAN.md, G3). On a stage, once
// render.js has drawn the template's words: each step of "Working with
// your agent" can be marked done, each quoted prompt can be copied, the
// stage's bar gets a "ready, or not yet" answer, and "Be ready to..."
// gets a way to bring it back. On /path/, each stage marked ready says
// so. The words of the stage stay the template's; this only adds
// controls beside them. Rules in assets/path-lib.js.
//
// Words by Claude, awaiting Ben's review.
(function () {
  'use strict';
  var P = window.PathLib;
  if (!P) return;

  var TOKEN_KEY = 'sb-bifrieqzkihuxfzttgvd-auth-token';
  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js';

  var store = null;
  try { store = window.localStorage; } catch (e) { store = null; }

  var marks = P.loadLocal(store);
  var mode = 'browser';        // 'browser' or 'account'
  var db = null, me = null, enrollments = [];
  var redraws = [];            // what to redraw once marks change hands

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function now() { return new Date().toISOString(); }
  function redraw() { redraws.forEach(function (f) { f(); }); }

  // The header already reads the saved session this way (site.js); a
  // person with none is treated as signed out without fetching anything.
  function maybeSignedIn() {
    try {
      var s = JSON.parse(store.getItem(TOKEN_KEY));
      return !!(s && s.user && s.expires_at * 1000 > Date.now() - 7 * 864e5);
    } catch (e) { return false; }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Signed in: the account's marks, joined by anything this browser kept
  // while signed out, which then moves into the account and leaves here.
  function connect() {
    if (!maybeSignedIn()) return Promise.resolve();
    var ready = window.supabase ? Promise.resolve() : loadScript(SUPABASE_JS);
    return ready.then(function () {
      return window.HUB ? null : loadScript('/assets/hub-config.js?v=20261009a');
    }).then(function () {
      db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
      return db.auth.getSession();
    }).then(function (s) {
      var session = s && s.data && s.data.session;
      if (!session) return;
      me = session.user.id;
      return Promise.all([
        db.from('stage_marks').select('stage, item, state, note, updated_at').eq('user_id', me),
        db.from('enrollments').select('status, cohorts(slug, title, status)').eq('user_id', me).neq('status', 'left')
      ]).then(function (res) {
        // Before the database has the table, marks stay in this browser.
        if (res[0].error) return;
        enrollments = res[1].error ? [] : res[1].data;
        var joined = P.merge(marks, P.fromRows(res[0].data));
        marks = joined.marks;
        mode = 'account';
        if (!joined.send.length) return;
        return db.from('stage_marks').upsert(joined.send.map(function (m) { return P.toRow(m, me); })).then(function (r) {
          if (!r.error) P.clearLocal(store);
        });
      });
    }).catch(function (e) {
      console.log('[path-marks] staying with this browser', e);
    }).then(redraw);
  }

  // One mark changed: kept where the person's marks live, and put back
  // if the database refuses it.
  function change(stage, item, state, note, msg) {
    var before = marks;
    marks = P.setMark(marks, stage, item, state, note, now());
    if (marks === before && state != null) { say(msg, 'That could not be kept.'); return Promise.resolve(false); }
    redraw();
    if (mode !== 'account') {
      if (!P.saveLocal(store, marks)) say(msg, 'This browser is not keeping marks just now (a private window does this), so they will be gone when you leave.');
      return Promise.resolve(true);
    }
    var q = state == null
      ? db.from('stage_marks').delete().eq('user_id', me).eq('stage', stage).eq('item', item)
      : db.from('stage_marks').upsert(P.toRow(P.get(marks, stage, item), me));
    return q.then(function (r) {
      if (!r.error) return true;
      marks = before; redraw();
      say(msg, 'Not kept: ' + r.error.message + '.');
      return false;
    });
  }

  function say(msg, text) { if (msg) msg.textContent = text; }

  function whereLine() {
    return mode === 'account'
      ? 'Only you can see your marks, and they are kept with your account.'
      : 'Only you can see your marks, and they are kept in this browser. Sign in to keep them with your account.';
  }

  // ------------------------------------------------------------------
  // A stage
  // ------------------------------------------------------------------

  function nextUntilHeading(start, test) {
    for (var n = start.nextElementSibling; n && !/^H[12]$/.test(n.tagName); n = n.nextElementSibling) {
      if (test(n)) return n;
    }
    return null;
  }

  function copyButton(quote) {
    var b = el('button', 'btn-quiet copy-prompt', 'Copy these words');
    b.type = 'button';
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    b.addEventListener('click', function () {
      var text = P.promptText(quote.innerText || quote.textContent);
      navigator.clipboard.writeText(text).then(function () {
        status.textContent = 'Copied. Make it yours before you send it.';
      }, function () {
        status.textContent = 'It could not be copied here, so select the words above.';
      });
    });
    var row = el('div', 'actions prompt-actions');
    row.appendChild(b); row.appendChild(status);
    return row;
  }

  function drawSteps(stage, body) {
    var heading = [].filter.call(body.querySelectorAll('h2'), function (h) { return P.isStepsHeading(h.textContent); })[0];
    if (!heading) return;
    var list = nextUntilHeading(heading, function (n) { return n.tagName === 'OL'; });
    if (!list) return;
    var intro = el('p', 'small path-where');
    heading.parentNode.insertBefore(intro, heading.nextSibling);
    redraws.push(function () { intro.textContent = 'Mark each step as you do it. ' + whereLine(); });

    [].filter.call(list.children, function (li) { return li.tagName === 'LI'; }).forEach(function (li, i) {
      var n = i + 1, item = 'step-' + n;
      li.classList.add('path-step');
      li.querySelectorAll('blockquote').forEach(function (q) { q.parentNode.insertBefore(copyButton(q), q.nextSibling); });
      var strong = li.querySelector('strong');
      var name = strong ? P.stepTitle(strong.textContent) : 'Step ' + n;
      var label = el('label', 'check step-done');
      var box = el('input'); box.type = 'checkbox';
      box.setAttribute('aria-label', 'Step ' + n + ', ' + name + ': done');
      label.appendChild(box);
      label.appendChild(document.createTextNode(' Done'));
      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      var row = el('div', 'actions step-actions');
      row.appendChild(label); row.appendChild(msg);
      li.appendChild(row);
      box.addEventListener('change', function () {
        msg.textContent = '';
        change(stage, item, box.checked ? 'done' : null, null, msg);
      });
      redraws.push(function () {
        var done = !!P.get(marks, stage, item);
        box.checked = done;
        li.classList.toggle('is-done', done);
      });
    });
  }

  function findBar(body) {
    var lead = [].filter.call(body.querySelectorAll('p > strong:first-child'), function (s) { return P.isReadyLead(s.textContent); })[0];
    if (lead) return lead.parentNode;
    var h = [].filter.call(body.querySelectorAll('h2'), function (x) { return P.isReadyLead(x.textContent); })[0];
    return h ? nextUntilHeading(h, function (n) { return n.tagName === 'P'; }) : null;
  }

  function drawReady(stage, body) {
    var bar = findBar(body);
    if (!bar) return;
    var box = el('fieldset', 'path-ready');
    box.appendChild(el('legend', null, 'Does your work meet this bar yet?'));
    var name = 'ready-' + stage;
    [['ready', 'Ready to move on'], ['not-yet', 'Not yet']].forEach(function (o) {
      var label = el('label', 'check');
      var r = el('input'); r.type = 'radio'; r.name = name; r.value = o[0];
      label.appendChild(r); label.appendChild(document.createTextNode(' ' + o[1]));
      box.appendChild(label);
      r.addEventListener('change', function () { msg.textContent = ''; change(stage, 'ready', o[0], null, msg); });
    });
    var clear = el('button', 'btn-link', 'Clear my answer');
    clear.type = 'button';
    clear.addEventListener('click', function () { msg.textContent = ''; change(stage, 'ready', null, null, msg); });
    var hint = el('p', 'hint');
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var row = el('div', 'actions'); row.appendChild(clear); row.appendChild(msg);
    box.appendChild(row);
    box.appendChild(hint);
    bar.parentNode.insertBefore(box, bar.nextSibling);
    redraws.push(function () {
      var m = P.get(marks, stage, 'ready');
      box.querySelectorAll('input[type=radio]').forEach(function (r) { r.checked = !!m && r.value === m.state; });
      clear.hidden = !m;
      hint.textContent = 'Your own judgment, which you can change at any time. It is never a score. ' + whereLine();
    });
  }

  function drawBringBack(stage, body) {
    var line = body.querySelector('p.bring-back');
    if (!line || !/^Be ready to/.test(line.textContent.trim())) return;
    var box = el('div', 'path-bring');
    line.parentNode.insertBefore(box, line.nextSibling);
    var draft = '';
    redraws.push(function () {
      var focused = box.querySelector('textarea') === document.activeElement;
      if (focused) return; // never redraw under someone typing
      var t = box.querySelector('textarea');
      if (t) draft = t.value;
      box.replaceChildren();
      var choice = mode === 'account' ? P.bringChoices(enrollments, stage) : { kind: 'note' };
      if (choice.kind === 'cohorts') {
        box.appendChild(el('p', 'small', choice.cohorts.length === 1
          ? 'When you have it, bring it to your cohort, with a link and a sentence in your own words.'
          : 'When you have it, bring it to one of your cohorts, with a link and a sentence in your own words.'));
        var row = el('div', 'actions');
        choice.cohorts.forEach(function (c) {
          var a = el('a', 'btn-github', choice.cohorts.length === 1 ? 'Bring it back' : 'Bring it back to ' + c.title);
          a.href = c.href;
          row.appendChild(a);
        });
        box.appendChild(row);
        return;
      }
      noteForm(stage, box, draft);
    });
  }

  // Without a cohort, what someone would bring back is kept for them
  // alone, so it is there when they find a cohort or a partner.
  function noteForm(stage, box, draft) {
    var kept = P.get(marks, stage, 'note');
    var form = el('form', 'cohort-form path-note');
    var label = el('label', null, mode === 'account'
      ? 'Not in a cohort just now? Keep a note of what you would bring back'
      : 'Keep a note of what you would bring back');
    var t = el('textarea'); t.rows = 3; t.maxLength = 4000;
    t.value = draft || (kept ? kept.note : '');
    label.appendChild(t);
    form.appendChild(label);
    var save = el('button', 'btn-quiet', kept ? 'Keep the change' : 'Keep it'); save.type = 'submit';
    var msg = el('span', 'small'); msg.setAttribute('role', 'status');
    var row = el('div', 'actions'); row.appendChild(save);
    if (kept) {
      var rm = el('button', 'btn-quiet', 'Remove the note'); rm.type = 'button';
      rm.addEventListener('click', function () {
        change(stage, 'note', null, null, msg).then(function (ok) { if (ok) say(msg, 'Removed.'); });
      });
      row.appendChild(rm);
    }
    row.appendChild(msg);
    form.appendChild(row);
    var where = el('p', 'hint');
    if (mode === 'account') {
      where.appendChild(document.createTextNode('Only you can read it. '));
      var a = el('a', null, 'Showing your work'); a.href = '/path/showing-your-work/';
      where.appendChild(a);
      where.appendChild(document.createTextNode(' says how to find feedback without a cohort.'));
    } else {
      where.appendChild(document.createTextNode('Only you can read it, in this browser. '));
      var s = el('a', null, 'Sign in'); s.href = '/account/';
      where.appendChild(s);
      where.appendChild(document.createTextNode(', and join a cohort, to bring it back to people.'));
    }
    form.appendChild(where);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var words = t.value.trim();
      if (!words) { say(msg, 'Write the note first.'); return; }
      t.blur();
      change(stage, 'note', 'kept', words, msg).then(function (ok) { if (ok) say(box.querySelector('[role=status]') || msg, 'Kept.'); });
    });
    box.appendChild(form);
  }

  function drawStage(src, body) {
    var stage = P.stageFromSrc(src);
    if (!stage || body.hasAttribute('data-path-marks')) return;
    body.setAttribute('data-path-marks', '');
    drawSteps(stage, body);
    drawReady(stage, body);
    drawBringBack(stage, body);
    redraw();
    connect();
  }

  // ------------------------------------------------------------------
  // The path's index: each stage marked ready says so, quietly.
  // ------------------------------------------------------------------

  function drawIndex(list) {
    var where = document.querySelector('[data-path-progress]');
    redraws.push(function () {
      var ready = P.readyStages(marks).map(function (s) { return s.href; });
      list.querySelectorAll('a[href]').forEach(function (a) {
        var mark = a.querySelector('.path-mark');
        var on = ready.indexOf(a.getAttribute('href')) >= 0;
        if (on && !mark) {
          mark = el('span', 'path-mark', 'Marked ready');
          a.appendChild(mark);
        } else if (!on && mark) mark.remove();
      });
      if (where) {
        where.hidden = !ready.length;
        where.textContent = 'The stages you marked ready say so. ' + whereLine();
      }
    });
    redraw();
    connect();
  }

  var article = document.querySelector('[data-doc]');
  if (article) {
    var body = article.querySelector('[data-doc-body]');
    document.addEventListener('hs:doc-rendered', function (e) { drawStage(e.detail.src, e.detail.body); });
    // If the words arrived before this script did.
    if (article.hasAttribute('data-doc-ready')) drawStage(article.getAttribute('data-doc'), body);
    return;
  }
  var stages = document.querySelector('ol.stages');
  if (stages) drawIndex(stages);
})();
