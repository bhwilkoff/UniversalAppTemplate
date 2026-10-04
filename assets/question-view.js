// The question bank's pieces, drawn (research/notes/run-of-show-design.md,
// R4). One component for the Meet add-on's side panel, /live/, and the
// class page on /teach/: the fields a teacher writes a question in, the
// answer a person gives in their own view, and the results with no names.
// The rules are in LiveLib (live-lib.js) and in the database (migration
// 20261004080000); this file only draws them.
//
// QuestionView.fields({ bank, onPick }) returns { el, read(), fill(f), reset() }
//   bank: questions to start from (the teacher's own and the cohort's),
//   each { id, kind, prompt, choices, points, cohort_id }.
// QuestionView.answer(check, answer, { draft, onDraft(input), onSend(row) })
//   returns a form; onSend resolves to an error sentence or null.
// QuestionView.results(check, summary, { teaching }) returns the results.
// Words by Claude, awaiting Ben's review.
(function () {
  var L = window.LiveLib;
  if (!L) return;
  var uid = 0;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, onClick) { var b = el('button', cls || 'btn-quiet', text); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function labelled(text, input, hint) {
    var l = el('label', null, text);
    if (hint) l.appendChild(el('span', 'hint', hint));
    l.appendChild(input);
    return l;
  }

  // ------------------------------------------------------------------
  // Writing a question
  // ------------------------------------------------------------------

  function fields(opts) {
    opts = opts || {};
    var box = el('div', 'question-fields');
    var n = ++uid;
    var pick = null;
    if (opts.bank && opts.bank.length) {
      pick = el('select');
      var none = el('option', null, 'Write a new one'); none.value = ''; pick.appendChild(none);
      opts.bank.forEach(function (q) {
        var o = el('option', null, q.prompt.length > 70 ? q.prompt.slice(0, 69) + '…' : q.prompt);
        o.value = q.id; pick.appendChild(o);
      });
      box.appendChild(labelled('From your question bank', pick));
      pick.addEventListener('change', function () {
        var q = opts.bank.filter(function (x) { return x.id === pick.value; })[0];
        fill(q ? Object.assign(L.questionFields(q), { question_id: q.id }) : L.questionFields(null));
        if (opts.onPick) opts.onPick(q || null);
      });
    }
    var kind = el('select'); kind.name = 'kind';
    L.QUESTION_KINDS.forEach(function (k) { var o = el('option', null, k.name); o.value = k.key; kind.appendChild(o); });
    var kindLine = el('span', 'hint');
    var kindL = labelled('Kind of question', kind); kindL.insertBefore(kindLine, kind);
    var prompt = el('textarea'); prompt.name = 'prompt'; prompt.rows = 2; prompt.maxLength = 500; prompt.required = true;
    var choices = el('textarea'); choices.name = 'choices'; choices.rows = 4;
    var choicesL = labelled('Choices', choices, 'One on each line, two to eight.');
    var points = el('input'); points.name = 'points'; points.type = 'number'; points.min = '3'; points.max = '10'; points.inputMode = 'numeric';
    var low = el('input'); low.name = 'low'; low.maxLength = 60;
    var high = el('input'); high.name = 'high'; high.maxLength = 60;
    var scale = el('div', 'question-scale');
    scale.appendChild(labelled('Points on the scale', points, 'From three to ten.'));
    scale.appendChild(labelled('Words for the low end', low, 'Optional, such as “Not at all”.'));
    scale.appendChild(labelled('Words for the high end', high, 'Optional, such as “Completely”.'));
    box.appendChild(kindL);
    box.appendChild(labelled('The question', prompt));
    box.appendChild(choicesL);
    box.appendChild(scale);
    [kind, prompt, choices, points, low, high].forEach(function (x) { x.id = 'q' + n + '-' + x.name; });

    function fit() {
      var k = L.questionKind(kind.value) || L.QUESTION_KINDS[0];
      kindLine.textContent = k.line;
      choicesL.hidden = !k.choices;
      scale.hidden = !k.points;
    }
    function fill(f) {
      kind.value = f.kind; prompt.value = f.prompt; choices.value = f.choices;
      points.value = f.points; low.value = f.low; high.value = f.high;
      if (pick) pick.value = f.question_id && opts.bank.some(function (q) { return q.id === f.question_id; }) ? f.question_id : '';
      fit();
    }
    function read() {
      return { kind: kind.value, prompt: prompt.value, choices: choices.value, points: points.value, low: low.value, high: high.value, question_id: pick && pick.value ? pick.value : null };
    }
    function reset() { fill(L.questionFields(null)); }
    kind.addEventListener('change', fit);
    reset();
    return { el: box, read: read, fill: fill, reset: reset, focus: function () { prompt.focus(); } };
  }

  // ------------------------------------------------------------------
  // Answering, in a person's own view
  // ------------------------------------------------------------------

  // The order a person is putting the choices in, as a list they move
  // with buttons (a keyboard and a screen reader can follow it; dragging
  // is not needed). order: choice numbers, first to last.
  function rankList(check, order, onMove) {
    var ol = el('ol', 'question-rank');
    function draw(focusAt, focusDir) {
      ol.replaceChildren();
      order.forEach(function (c, i) {
        var li = el('li');
        li.appendChild(el('span', 'label', check.choices[c - 1]));
        var up = btn('Move up', 'btn-quiet', function () { swap(i, -1); });
        var down = btn('Move down', 'btn-quiet', function () { swap(i, 1); });
        up.setAttribute('aria-label', 'Move ' + check.choices[c - 1] + ' up');
        down.setAttribute('aria-label', 'Move ' + check.choices[c - 1] + ' down');
        up.disabled = i === 0; down.disabled = i === order.length - 1;
        var acts = el('span', 'question-rank-moves'); acts.appendChild(up); acts.appendChild(down);
        li.appendChild(acts);
        ol.appendChild(li);
        if (focusAt === i) (focusDir < 0 && !up.disabled ? up : !down.disabled ? down : up).focus();
      });
    }
    function swap(i, d) {
      var j = i + d;
      if (j < 0 || j >= order.length) return;
      var x = order[i]; order[i] = order[j]; order[j] = x;
      onMove(order.slice());
      draw(j, d);
    }
    draw();
    return ol;
  }

  function answer(check, given, opts) {
    opts = opts || {};
    var kind = L.kindOf(check);
    var form = el('form', 'inline-form question-answer');
    var name = 'answer-' + check.id;
    var draft = opts.draft || null;
    function keep(input) { draft = input; if (opts.onDraft) opts.onDraft(input); }
    var read;
    if (kind === 'choice' || kind === 'scale' || kind === 'multi') {
      var fs = el('fieldset', 'live-mode' + (kind === 'scale' ? ' question-scale-points' : ''));
      fs.appendChild(el('legend', 'visually-hidden', kind === 'multi' ? 'Choose any that fit' : kind === 'scale' ? 'Choose a point on the scale' : 'Choose one'));
      var labels = kind === 'scale' ? L.scaleLabels(check) : check.choices;
      var picked = draft ? (draft.picks || (draft.choice ? [draft.choice] : [])) : given ? (given.value || (given.choice ? [given.choice] : [])) : [];
      labels.forEach(function (text, i) {
        var lab = el('label', 'check');
        var r = el('input'); r.type = kind === 'multi' ? 'checkbox' : 'radio'; r.name = name; r.value = String(i + 1);
        r.checked = picked.indexOf(i + 1) >= 0;
        lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + text));
        fs.appendChild(lab);
      });
      fs.addEventListener('change', function () { keep(read()); });
      form.appendChild(fs);
      read = function () {
        var on = Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (x) { return Number(x.value); });
        return kind === 'multi' ? { picks: on } : { choice: on[0] };
      };
      if (kind === 'multi') form.appendChild(el('p', 'small', 'Choose as many as fit.'));
    } else if (kind === 'rank') {
      var n = check.choices.length, order = null;
      var start = draft && draft.order ? draft.order : given && Array.isArray(given.value) ? given.value : null;
      if (start && start.length === n) order = start.slice();
      else { order = []; for (var i = 1; i <= n; i++) order.push(i); }
      form.appendChild(el('p', 'small', 'Put them in your order, first at the top.'));
      form.appendChild(rankList(check, order, function (o) { order = o; keep({ order: o }); }));
      read = function () { return { order: order.slice() }; };
    } else {
      var words = kind === 'words';
      var input = words ? el('input') : el('textarea');
      if (words) input.maxLength = 60; else { input.rows = 3; input.maxLength = 1000; }
      input.required = true;
      input.value = draft && draft.body != null ? draft.body : given ? given.body || '' : '';
      input.addEventListener('input', function () { keep({ body: input.value }); });
      form.appendChild(labelled(words ? 'A word or a few' : (opts.label || 'Your answer, which only you and your teacher see'), input,
        words ? 'Shown with everyone’s, with no names, if your teacher shows them.' : null));
      read = function () { return { body: input.value }; };
    }
    var acts = el('div', 'actions');
    var send = el('button', 'btn-quiet', given ? 'Change my answer' : 'Send my answer'); send.type = 'submit';
    var status = el('span', 'small'); status.setAttribute('role', 'status');
    acts.appendChild(send); acts.appendChild(status);
    form.appendChild(acts);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var row = L.answerRow(check, read());
      if (row.error) { status.textContent = row.error; return; }
      status.textContent = 'Sending…'; send.disabled = true;
      Promise.resolve(opts.onSend(row)).then(function (err) {
        send.disabled = false;
        status.textContent = err ? 'Not sent: ' + err : 'Sent.';
      });
    });
    return form;
  }

  // ------------------------------------------------------------------
  // The results, with no names
  // ------------------------------------------------------------------

  function results(check, summary, opts) {
    opts = opts || {};
    var r = L.results(check, summary);
    var wrap = el('div', 'live-tally question-results');
    var who = opts.teaching ? '' : ', with no names';
    wrap.appendChild(el('p', 'small', L.counted(r.total, 'answer', 'answers') + who));
    if (r.rows.length) {
      var ul = el('ul');
      r.rows.forEach(function (row) {
        var li = el('li');
        li.appendChild(el('span', 'label', row.label));
        var bar = el('span', 'bar'); bar.style.setProperty('--share', row.share + '%'); li.appendChild(bar);
        li.appendChild(el('span', 'count', row.text));
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }
    if (r.words.length) {
      var cloud = el('ul', 'question-words');
      cloud.setAttribute('aria-label', 'The words given, larger where more people gave them');
      r.words.forEach(function (w) {
        var li = el('li', 'size-' + w.size, w.word);
        li.setAttribute('title', L.counted(w.count, 'person', 'people'));
        cloud.appendChild(li);
      });
      wrap.appendChild(cloud);
    }
    if (r.note) wrap.appendChild(el('p', 'small', r.note));
    return wrap;
  }

  window.QuestionView = { fields: fields, answer: answer, results: results };
})();
