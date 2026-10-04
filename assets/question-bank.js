// The question bank on the class page (research/notes/run-of-show-design.md,
// R4): the questions a teacher prepares before class, kept either for
// themselves (in every cohort they teach) or for one cohort's teachers,
// to ask in the moment from the Meet add-on's panel or /live/, or to plan
// into a question scene of the run of show. Students never read the bank;
// they see a question when it is asked. The rules are in LiveLib and the
// database (migration 20261004080000).
//
// QuestionBank.mount(section, { db, cohort }) draws the bank into the
// section's [data-bank] box and shows the section once the database has
// the bank. Words by Claude, awaiting Ben's review.
(function () {
  var L = window.LiveLib, Q = window.QuestionView;
  if (!L || !Q) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, onClick) { var b = el('button', cls || 'btn-quiet', text); b.type = 'button'; b.addEventListener('click', onClick); return b; }

  function mount(section, opts) {
    var db = opts.db, cohort = opts.cohort;
    var box = section.querySelector('[data-bank]');
    var questions = [], editing = null;
    var status = el('p', 'small'); status.setAttribute('role', 'status');

    function say(t) { status.textContent = t || ''; }

    function load() {
      return db.from('questions').select('id, owner_id, cohort_id, kind, prompt, choices, points, updated_at')
        .order('updated_at', { ascending: false }).then(function (r) {
          // Before the database has the bank, the section stays hidden.
          if (r.error) { section.hidden = true; return; }
          section.hidden = false;
          questions = (r.data || []).filter(function (q) { return !q.cohort_id || q.cohort_id === cohort.id; });
          draw();
        });
    }

    function whose(q) { return q.cohort_id ? 'For this cohort’s teachers' : 'Yours, in every cohort you teach'; }

    function draw() {
      box.replaceChildren();
      var ul = el('ul', 'bank-list');
      if (!questions.length && editing !== 'new') box.appendChild(el('p', 'small', 'No questions in the bank yet.'));
      questions.forEach(function (q) {
        var li = el('li', 'bank-item');
        if (editing === q.id) { li.appendChild(form(q)); ul.appendChild(li); return; }
        var head = el('p', 'bank-head');
        head.appendChild(el('span', 'scene-kind', L.questionKind(L.kindOf(q)).name));
        head.appendChild(el('span', 'small', whose(q)));
        li.appendChild(head);
        li.appendChild(el('p', 'bank-prompt', q.prompt));
        var parts = L.kindOf(q) === 'scale' ? L.scaleLabels(q) : (q.choices || []);
        if (parts.length) li.appendChild(el('p', 'small', parts.join('; ')));
        var acts = el('div', 'actions scene-actions');
        acts.appendChild(btn('Edit', 'btn-quiet', function () { editing = q.id; draw(); }));
        var del = btn('Delete', 'btn-quiet danger', function () { del.hidden = true; sure.hidden = false; });
        acts.appendChild(del);
        var sure = el('span', 'bank-sure'); sure.hidden = true;
        sure.appendChild(document.createTextNode('Delete it from the bank? Anything already asked from it stays. '));
        sure.appendChild(btn('Delete', 'btn-quiet danger', function () { remove(q); }));
        sure.appendChild(btn('Keep it', 'btn-quiet', function () { sure.hidden = true; del.hidden = false; }));
        acts.appendChild(sure);
        li.appendChild(acts);
        ul.appendChild(li);
      });
      if (editing === 'new') { var li = el('li', 'bank-item'); li.appendChild(form(null)); ul.appendChild(li); }
      box.appendChild(ul);
      if (editing !== 'new') {
        var add = el('div', 'actions');
        add.appendChild(btn('Write a question', 'btn-quiet', function () { editing = 'new'; draw(); var t = box.querySelector('.bank-item textarea'); if (t) t.focus(); }));
        box.appendChild(add);
      }
      box.appendChild(status);
    }

    // One form for a new question and for editing one: the fields every
    // question has, and whom it is for.
    function form(q) {
      var f = el('form', 'inline-form scene-form');
      var fl = Q.fields();
      if (q) fl.fill(L.questionFields(q));
      f.appendChild(fl.el);
      var fs = el('fieldset', 'live-mode');
      fs.appendChild(el('legend', null, 'Who keeps it'));
      var name = 'bank-for-' + (q ? q.id : 'new');
      [['mine', 'Just you, in every cohort you teach'], ['cohort', 'This cohort’s teachers, for ' + cohort.title]].forEach(function (x) {
        var lab = el('label', 'check');
        var r = el('input'); r.type = 'radio'; r.name = name; r.value = x[0];
        r.checked = q ? (x[0] === 'cohort') === !!q.cohort_id : x[0] === 'mine';
        lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + x[1]));
        fs.appendChild(lab);
      });
      f.appendChild(fs);
      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var save = el('button', 'btn-quiet', q ? 'Save the question' : 'Keep it in the bank'); save.type = 'submit';
      acts.appendChild(save);
      acts.appendChild(btn('Cancel', 'btn-quiet', function () { editing = null; draw(); }));
      acts.appendChild(msg);
      f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var p = L.parseQuestion(fl.read());
        if (p.error) { msg.textContent = p.error; return; }
        var forCohort = f.querySelector('input[name="' + name + '"]:checked').value === 'cohort';
        var row = { kind: p.kind, prompt: p.prompt, choices: p.choices, points: p.points, cohort_id: forCohort ? cohort.id : null };
        save.disabled = true; msg.textContent = 'Saving…';
        var write = q ? db.from('questions').update(row).eq('id', q.id).select('id') : db.from('questions').insert(row).select('id');
        write.then(function (r) {
          save.disabled = false;
          if (r.error || !r.data || !r.data.length) { msg.textContent = 'Not saved: ' + (r.error ? r.error.message : 'only the teacher who wrote it can keep it just for themselves') + '.'; return; }
          editing = null;
          say(q ? 'Saved.' : 'It is in the bank.');
          load();
        });
      });
      return f;
    }

    function remove(q) {
      db.from('questions').delete().eq('id', q.id).select('id').then(function (r) {
        if (r.error || !r.data.length) { say('Not deleted: ' + (r.error ? r.error.message : 'the database refused') + '.'); return; }
        say('Deleted from the bank.');
        load();
      });
    }

    load();
    return { reload: load };
  }

  window.QuestionBank = { mount: mount };
})();
