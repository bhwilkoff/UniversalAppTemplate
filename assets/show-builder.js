// The class builder (research/notes/run-of-show-design.md, milestone R2):
// each session's run of show on /teach/, as scenes in order, made from
// COURSE.md's six parts or copied from last week, and edited, reordered,
// previewed, or removed here before the session runs in Meet. The rules
// are in ShowLib (show-lib.js) and in the database (migration
// 20261004050000), which also keeps students from editing and keeps the
// teacher's notes for a scene from anyone but the cohort's teachers.
// Words by Claude, awaiting Ben's review.
(function () {
  var S = window.ShowLib;
  // A question scene is written with the question bank's own fields
  // (R4, question-view.js), when the page has them.
  var QV = window.QuestionView, LL = window.LiveLib;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(text, cls, onClick) {
    var b = el('button', cls || 'btn-secondary', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }
  // Each kind of part in plain words, for the plan people read (JOURNEYS.md,
  // the walk-through audit: the builder's own names were jargon).
  var PLAIN = { talk: 'Talk', presenter: 'Showing work', question: 'Question', design: 'On the board', rooms: 'In groups', 'break': 'Break', reflection: 'Writing' };
  function plain(k) { return PLAIN[k] || ((S.kind(k) || {}).name) || k; }
  function paragraphs(text) {
    return String(text || '').split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return el('p', 'scene-body', x); });
  }

  function clock(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  // opts: { db, cohort, session, sessions, agenda, turn }
  // `agenda` is CohortLib.agenda(cohort.session_minutes), `turn` LiveLib.TURN.
  function mount(box, opts) {
    var db = opts.db, cohort = opts.cohort, session = opts.session, readOnly = !!opts.readOnly;
    var scenes = [], notes = {}, withScenes = [], editing = null, previewing = null, busy = false, dragId = null, bank = [], kinds = false;
    var status = el('p', 'small'); status.setAttribute('role', 'status');
    var fit = el('p', 'small show-fit');
    var list = el('ol', 'show-list');
 list.classList.toggle('is-read-only', readOnly);
    list.setAttribute('aria-label', 'Plan for ' + (window.CohortLib ? window.CohortLib.sessionName(session.number) : 'Week ' + session.number));
    var start = el('div', 'actions');
    var add = el('div', 'actions');
    box.replaceChildren(fit, list, start, add, status);

    function say(text) { status.textContent = text || ''; }

    function load() {
      return Promise.all([
        db.from('scenes').select('*').eq('session_id', session.id).order('position'),
        db.from('scene_notes').select('scene_id, body').eq('cohort_id', cohort.id),
        db.from('scenes').select('session_id').eq('cohort_id', cohort.id),
        // The teacher's own questions and this cohort's (R4); before the
        // database has the bank, a question is written here as before.
        db.from('questions').select('id, cohort_id, kind, prompt, choices, points, updated_at').order('updated_at', { ascending: false }),
        QV ? QV.ready(db) : Promise.resolve(false)
      ]).then(function (res) {
        // Before the database has the run of show, the builder stays away.
        if (res[0].error) { box.hidden = true; return; }
        box.hidden = false;
        scenes = res[0].data;
        notes = {};
        (res[1].data || []).forEach(function (n) { notes[n.scene_id] = n.body; });
        withScenes = (res[2].data || []).map(function (r) { return r.session_id; });
        bank = res[3].error ? [] : (res[3].data || []).filter(function (q) { return !q.cohort_id || q.cohort_id === cohort.id; });
        kinds = res[4];
        draw();
      });
    }

    function draw() {
      list.replaceChildren();
      start.replaceChildren();
      add.replaceChildren();
      fit.textContent = scenes.length
        ? (readOnly ? scenes.reduce(function (n, x) { return n + x.minutes; }, 0) + ' minutes' : S.fitText(scenes, cohort.session_minutes))
        : (window.CohortLib ? window.CohortLib.sessionName(session.number) : 'Week ' + session.number) + ' has no plan yet.';
      if (!scenes.length && !readOnly) {
        var C = window.CurriculumLib, week = C ? C.weekOf(session.number) : null;
        if (week != null && window.CurriculumSeed) start.appendChild(button(C.startLabel(week), 'btn-primary', startPlan));
        start.appendChild(button('Start from the six parts', 'btn-secondary', startDefault));
        var from = S.copySource(opts.sessions, session, withScenes);
        if (from) start.appendChild(button('Copy week ' + from.number + '’s run of show', 'btn-secondary', function () { copyFrom(from); }));
      }
      var at = S.startTimes(scenes);
      scenes.forEach(function (s, i) { list.appendChild(item(s, i, at[i])); });
      if (editing === 'new') { var li = el('li', 'scene-item is-editing'); li.appendChild(form(null)); list.appendChild(li); }
      else if (!readOnly) add.appendChild(button('Add a part', 'btn-secondary', function () { editing = 'new'; previewing = null; draw(); focusFirst(); }));
    }

    function focusFirst() {
      var f = list.querySelector('.is-editing select, .is-editing input');
      if (f) f.focus();
    }

    // One part of the plan, as people read it: when it starts, what kind
    // it is, its title and minutes, its words, and what it asks of people.
    // A leader also sees their note, and one button to change it; moving
    // and deleting are in the form, so a row never carries a row of tools.
    function item(s, i, at) {
      var li = el('li', 'scene-item');
      li.dataset.id = s.id;
      if (editing === s.id) { li.classList.add('is-editing'); li.appendChild(form(s, i)); return li; }
      var c = s.config || {};
      var head = el('div', 'scene-head');
      head.appendChild(el('span', 'scene-at', clock(at)));
      var words = el('div', 'scene-words');
      words.appendChild(el('span', 'scene-kind', plain(s.kind)));
      words.appendChild(el('strong', 'scene-title', s.title));
      words.appendChild(el('span', 'scene-minutes small', s.minutes + ' min'));
      head.appendChild(words);
      if (!readOnly) {
        var edit = button('Edit', 'btn-secondary small', function () { editing = s.id; previewing = null; draw(); focusFirst(); });
        edit.setAttribute('aria-label', 'Edit ' + s.title);
        head.appendChild(edit);
      }
      li.appendChild(head);
      var detail = el('div', 'scene-detail');
      paragraphs(s.body).forEach(function (p) { detail.appendChild(p); });
      if (c.prompt) detail.appendChild(el('p', 'scene-prompt', (s.kind === 'question' || s.kind === 'reflection' ? '' : 'The prompt: ') + c.prompt));
      if (c.options && c.options.length && s.kind === 'question') detail.appendChild(el('p', 'small', c.options.join(' · ')));
      if (c.room_scenes && c.room_scenes.length) {
        detail.appendChild(el('p', 'small', 'Each turn: ' + c.room_scenes.map(function (r) { return r.title + ' (' + r.minutes + ')'; }).join(', ') + '.'));
      }
      if (!readOnly && notes[s.id]) {
        var note = el('p', 'scene-note');
        if (window.UI && window.UI.visibility) { note.appendChild(window.UI.visibility('staff', 'Your note')); note.appendChild(document.createTextNode(' ')); }
        note.appendChild(document.createTextNode(notes[s.id]));
        detail.appendChild(note);
      }
      if (detail.children.length) li.appendChild(detail);
      if (readOnly) return li;
      // Keyboard: Alt with the up or down arrow moves the part you are on.
      li.addEventListener('keydown', function (ev) {
        if (!ev.altKey || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
        ev.preventDefault();
        move(i, ev.key === 'ArrowUp' ? -1 : 1, true);
      });
      li.draggable = true;
      li.addEventListener('dragstart', function (ev) { dragId = s.id; li.classList.add('is-dragging'); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'; });
      li.addEventListener('dragend', function () { dragId = null; li.classList.remove('is-dragging'); });
      li.addEventListener('dragover', function (ev) { if (dragId && dragId !== s.id) ev.preventDefault(); });
      li.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (!dragId || dragId === s.id) return;
        var from = scenes.map(function (x) { return x.id; }).indexOf(dragId);
        move(from, i - from);
      });
      return li;
    }

    function preview(s) {
      var p = S.stagePreview(s);
      var stage = el('div', 'stage-preview');
      stage.setAttribute('role', 'img');
      stage.setAttribute('aria-label', 'The main stage during ' + s.title);
      stage.appendChild(el('p', 'stage-eyebrow', p.eyebrow + ', ' + p.minutes + ' min'));
      stage.appendChild(el('p', 'stage-title', p.title));
      p.lines.forEach(function (line) { stage.appendChild(el('p', 'stage-line', line)); });
      if (p.items.length) {
        var ul = el('ul', 'stage-items');
        p.items.forEach(function (x) { ul.appendChild(el('li', null, x)); });
        stage.appendChild(ul);
      }
      if (p.note) stage.appendChild(el('p', 'stage-note', p.note));
      return stage;
    }

    // One form for a new scene and for editing one: the fields each kind
    // uses, and the teacher's own note.
    function form(s, index) {
      var f = el('form', 'inline-form scene-form');
      var c = (s && s.config) || {};
      function field(label, input, hint) {
        var l = el('label', null, label);
        if (hint) l.appendChild(el('span', 'hint', hint));
        l.appendChild(input);
        f.appendChild(l);
        return l;
      }
      var kindSel = el('select'); kindSel.name = 'kind';
      S.KINDS.forEach(function (k) { var o = el('option', null, plain(k.key)); o.value = k.key; kindSel.appendChild(o); });
      kindSel.value = s ? s.kind : 'talk';
      var kindHint = el('span', 'hint');
      var kl = field('Kind of part', kindSel); kl.insertBefore(kindHint, kindSel);
      var title = el('input'); title.name = 'title'; title.maxLength = 120; title.required = true; title.value = s ? s.title : '';
      field('Title', title);
      var minutes = el('input'); minutes.name = 'minutes'; minutes.type = 'number'; minutes.min = 1; minutes.max = 240; minutes.required = true; minutes.value = s ? s.minutes : 5;
      field('Minutes', minutes);
      var body = el('textarea'); body.name = 'body'; body.rows = 3; body.maxLength = 2000; body.value = (s && s.body) || '';
      var bodyL = field('What happens', body, 'What people read on this session’s page and see in Meet. A blank line starts a new paragraph.');
      var prompt = el('textarea'); prompt.name = 'prompt'; prompt.rows = 2; prompt.maxLength = 500; prompt.value = c.prompt || '';
      var promptL = field('Prompt', prompt);
      var options = el('textarea'); options.name = 'options'; options.rows = 3; options.value = (c.options || []).join('\n');
      var optionsL = field('Choices', options, 'One per line, two to eight. Leave empty for an answer in their own words.');
      var qf = QV && LL && kinds ? QV.fields({ bank: bank }) : null;
      if (qf) {
        qf.fill(LL.questionFields(s && s.kind === 'question' ? c : null));
        f.insertBefore(qf.el, optionsL.nextSibling);
      }
      // The design stage's templates (R5, BoardLib.TEMPLATES), laid on the
      // board the first time the scene opens it.
      var BL = window.BoardLib, template;
      if (BL) {
        template = el('select'); template.name = 'template';
        BL.TEMPLATES.forEach(function (t) { var o = el('option', null, t.name); o.value = t.key === 'blank' ? '' : t.key; template.appendChild(o); });
        template.value = BL.template(c.template) ? (c.template === 'blank' ? '' : c.template) : '';
      } else {
        template = el('input'); template.name = 'template'; template.maxLength = 60; template.value = c.template || '';
      }
      var templateHint = BL ? (BL.template(template.value || 'blank') || {}).line : 'Its name, or empty for a blank board.';
      var templateL = field('Design stage template', template, templateHint);
      if (BL) template.addEventListener('change', function () {
        templateL.querySelector('.hint').textContent = (BL.template(template.value || 'blank') || {}).line || '';
      });
      var rooms = el('textarea'); rooms.name = 'room_scenes'; rooms.rows = 5; rooms.value = S.roomScenesToText(c.room_scenes);
      var roomsL = field('The room’s own scenes', rooms, 'One per line, a title and its minutes, such as “Their question, 2”.');
      var note = el('textarea'); note.name = 'note'; note.rows = 2; note.maxLength = 4000; note.value = (s && notes[s.id]) || '';
      field('Your note', note, 'Only the cohort’s leaders see it.');
      var promptLabel = promptL.firstChild;

      function fitKind() {
        var k = S.kind(kindSel.value);
        kindHint.textContent = k ? k.what : '';
        var uses = k ? k.keys : [];
        var asQuestion = !!qf && kindSel.value === 'question';
        promptL.hidden = uses.indexOf('prompt') === -1 || asQuestion;
        optionsL.hidden = uses.indexOf('options') === -1 || asQuestion;
        if (qf) qf.el.hidden = !asQuestion;
        templateL.hidden = uses.indexOf('template') === -1;
        roomsL.hidden = uses.indexOf('room_scenes') === -1;
        promptLabel.textContent = { presenter: 'What each person shows', question: 'The question', rooms: 'What the rooms are for', reflection: 'The closing question' }[kindSel.value] || 'Prompt';
        bodyL.hidden = kindSel.value === 'question';
      }
      kindSel.addEventListener('change', fitKind);
      fitKind();

      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var save = el('button', 'btn-primary', s ? 'Save the part' : 'Add the part'); save.type = 'submit';
      acts.appendChild(save);
      acts.appendChild(button('Cancel', 'btn-secondary', function () { editing = null; draw(); }));
      if (s) {
        var up = button('Move up', 'btn-secondary', function () { editing = null; move(index, -1); });
        up.disabled = index === 0;
        var down = button('Move down', 'btn-secondary', function () { editing = null; move(index, 1); });
        down.disabled = index === scenes.length - 1;
        acts.appendChild(up); acts.appendChild(down);
        acts.appendChild(button('Delete', 'btn-danger', function () {
          window.UI.confirm({ title: 'Delete ' + s.title + '?', body: 'It comes out of this session’s plan.', action: 'Delete part' }).then(function (ok) { if (ok) { editing = null; remove(s); } });
        }));
      }
      acts.appendChild(msg);
      f.appendChild(acts);

      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var k = kindSel.value;
        var raw = { prompt: prompt.value, options: S.optionsFromText(options.value), template: template.value, room_scenes: S.roomScenesFromText(rooms.value) };
        if (k === 'question' && qf) {
          var qr = qf.read(), parsed = LL.parseQuestion(qr);
          if (parsed.error) { msg.textContent = parsed.error; return; }
          raw = LL.sceneQuestion(parsed, qr.question_id);
        }
        var row = {
          kind: k, title: title.value.trim(), minutes: parseInt(minutes.value, 10),
          body: k === 'question' ? null : (body.value.trim() || null), config: S.cleanConfig(k, raw)
        };
        var p = S.problem(row);
        if (p) { msg.textContent = p; return; }
        save.disabled = true; msg.textContent = 'Saving…';
        var q = s
          ? db.from('scenes').update(row).eq('id', s.id).select('id').single()
          : db.from('scenes').insert(Object.assign({ cohort_id: cohort.id, session_id: session.id, position: nextPosition() }, row)).select('id').single();
        q.then(function (r) {
          if (r.error) { save.disabled = false; msg.textContent = 'Not saved: ' + r.error.message; return; }
          return saveNote(r.data.id, note.value.trim()).then(function (nr) {
            if (nr && nr.error) say('The scene is saved, but not your note: ' + nr.error.message);
            else say(s ? 'Saved.' : 'Added.');
            editing = null;
            return load();
          });
        });
      });
      return f;
    }

    function nextPosition() {
      return scenes.reduce(function (n, s) { return Math.max(n, s.position + 1); }, 0);
    }

    function saveNote(sceneId, text) {
      var had = Object.prototype.hasOwnProperty.call(notes, sceneId);
      if (!text && !had) return Promise.resolve(null);
      if (!text) return db.from('scene_notes').delete().eq('scene_id', sceneId);
      return db.from('scene_notes').upsert({ scene_id: sceneId, cohort_id: cohort.id, body: text }, { onConflict: 'scene_id' });
    }

    function move(index, delta, keepFocus) {
      if (busy) return;
      var ids = S.moved(scenes.map(function (s) { return s.id; }), index, delta);
      if (!ids) return;
      busy = true;
      var id = scenes[index].id;
      db.rpc('reorder_scenes', { s: session.id, ids: ids }).then(function (r) {
        busy = false;
        if (r.error) { say('Not moved: ' + r.error.message); return load(); }
        say('Moved.');
        return load().then(function () {
          if (!keepFocus) return;
          var li = list.querySelector('[data-id="' + id + '"]');
          if (li) { li.tabIndex = -1; li.focus(); }
        });
      });
    }

    function remove(s) {
      db.from('scenes').delete().eq('id', s.id).select('id').then(function (r) {
        if (r.error || !r.data.length) { say('Not removed: ' + (r.error ? r.error.message : 'the database refused') + '.'); return; }
        say(s.title + ' is removed.');
        load();
      });
    }

    function startDefault() {
      var rows = S.defaultShow(opts.agenda, opts.turn).map(function (x, i) {
        return Object.assign({ cohort_id: cohort.id, session_id: session.id, position: i }, x);
      });
      say('Adding the six parts…');
      db.from('scenes').insert(rows).then(function (r) {
        if (r.error) { say('Not added: ' + r.error.message); return; }
        say((window.CohortLib ? window.CohortLib.sessionName(session.number) : 'Week ' + session.number) + ' starts from the six parts. Change anything.');
        load();
      });
    }

    // The course's plan for this week (curriculum milestone C6): its
    // scenes, the note on what to watch for, and its prepared questions.
    function startPlan() {
      say('Adding the course’s plan…');
      window.CurriculumSeed.seedSession(db, cohort, session).then(function (r) {
        if (r.error) { say('Not added: ' + r.error); return; }
        if (r.skipped) { say('This week already has a run of show.'); load(); return; }
        say(window.CurriculumLib.summary({ weeks: 1, scenes: r.scenes, questions: r.questions, errors: [] }) + ' Change anything.');
        load();
      });
    }

    function copyFrom(from) {
      say('Copying week ' + from.number + '…');
      db.rpc('copy_scenes', { from_session: from.id, to_session: session.id }).then(function (r) {
        if (r.error) { say('Not copied: ' + r.error.message); return; }
        say('Copied ' + r.data + ' scenes from week ' + from.number + ', with your notes.');
        load();
      });
    }

    load();
    return { reload: load };
  }

  window.ShowBuilder = { mount: mount };
})();
