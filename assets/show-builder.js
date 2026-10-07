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
    var b = el('button', cls || 'btn-quiet', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }
  function clock(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  // opts: { db, cohort, session, sessions, agenda, turn }
  // `agenda` is CohortLib.agenda(cohort.session_minutes), `turn` LiveLib.TURN.
  function mount(box, opts) {
    var db = opts.db, cohort = opts.cohort, session = opts.session;
    var scenes = [], notes = {}, withScenes = [], editing = null, previewing = null, busy = false, dragId = null, bank = [], kinds = false;
    var status = el('p', 'small'); status.setAttribute('role', 'status');
    var fit = el('p', 'small show-fit');
    var list = el('ol', 'show-list');
    list.setAttribute('aria-label', 'Run of show for week ' + session.number);
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
        ? S.fitText(scenes, cohort.session_minutes) + ' Students see the scenes’ titles and minutes on their cohort page; your notes stay with the teachers.'
        : 'Week ' + session.number + ' has no run of show yet.';
      if (!scenes.length) {
        var C = window.CurriculumLib, week = C ? C.weekOf(session.number) : null;
        if (week != null && window.CurriculumSeed) start.appendChild(button(C.startLabel(week), 'btn-github', startPlan));
        start.appendChild(button('Start from the six parts', 'btn-quiet', startDefault));
        var from = S.copySource(opts.sessions, session, withScenes);
        if (from) start.appendChild(button('Copy week ' + from.number + '’s run of show', 'btn-quiet', function () { copyFrom(from); }));
      }
      var at = S.startTimes(scenes);
      scenes.forEach(function (s, i) { list.appendChild(item(s, i, at[i])); });
      if (editing === 'new') { var li = el('li', 'scene-item is-editing'); li.appendChild(form(null)); list.appendChild(li); }
      else add.appendChild(button('Add a scene', 'btn-quiet', function () { editing = 'new'; previewing = null; draw(); focusFirst(); }));
    }

    function focusFirst() {
      var f = list.querySelector('.is-editing select, .is-editing input');
      if (f) f.focus();
    }

    function item(s, i, at) {
      var li = el('li', 'scene-item');
      li.dataset.id = s.id;
      if (editing === s.id) { li.classList.add('is-editing'); li.appendChild(form(s)); return li; }
      var k = S.kind(s.kind) || { name: s.kind };
      var head = el('div', 'scene-head');
      head.appendChild(el('span', 'scene-at', clock(at)));
      var words = el('div', 'scene-words');
      words.appendChild(el('span', 'scene-kind', k.name));
      words.appendChild(el('strong', 'scene-title', s.title));
      words.appendChild(el('span', 'scene-minutes small', s.minutes + ' min'));
      head.appendChild(words);
      li.appendChild(head);
      if (notes[s.id]) li.appendChild(el('p', 'small scene-note', 'Your note: ' + notes[s.id]));
      var acts = el('div', 'actions scene-actions');
      var up = button('Up', 'btn-quiet', function () { move(i, -1); });
      up.setAttribute('aria-label', 'Move ' + s.title + ' up'); up.disabled = i === 0;
      var down = button('Down', 'btn-quiet', function () { move(i, 1); });
      down.setAttribute('aria-label', 'Move ' + s.title + ' down'); down.disabled = i === scenes.length - 1;
      acts.appendChild(up); acts.appendChild(down);
      acts.appendChild(button('Edit', 'btn-quiet', function () { editing = s.id; previewing = null; draw(); focusFirst(); }));
      var prev = button(previewing === s.id ? 'Hide the preview' : 'Preview the main stage', 'btn-quiet', function () {
        previewing = previewing === s.id ? null : s.id; draw();
        var again = list.querySelector('[data-id="' + s.id + '"] .scene-actions button:nth-child(4)');
        if (again) again.focus();
      });
      prev.setAttribute('aria-expanded', previewing === s.id ? 'true' : 'false');
      acts.appendChild(prev);
      var rm = button('Remove', 'btn-quiet danger', function () {
        if (!rm.hasAttribute('data-armed')) { rm.setAttribute('data-armed', ''); rm.textContent = 'Remove ' + s.title + '?'; return; }
        remove(s);
      });
      acts.appendChild(rm);
      li.appendChild(acts);
      if (previewing === s.id) li.appendChild(preview(s));
      // Keyboard: Alt with the up or down arrow moves the scene you are on.
      li.addEventListener('keydown', function (ev) {
        if (!ev.altKey || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
        ev.preventDefault();
        move(i, ev.key === 'ArrowUp' ? -1 : 1, true);
      });
      // Dragging, for those who like it; the buttons do the same.
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
    function form(s) {
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
      S.KINDS.forEach(function (k) { var o = el('option', null, k.name); o.value = k.key; kindSel.appendChild(o); });
      kindSel.value = s ? s.kind : 'talk';
      var kindHint = el('span', 'hint');
      var kl = field('Kind of scene', kindSel); kl.insertBefore(kindHint, kindSel);
      var title = el('input'); title.name = 'title'; title.maxLength = 120; title.required = true; title.value = s ? s.title : '';
      field('Title', title);
      var minutes = el('input'); minutes.name = 'minutes'; minutes.type = 'number'; minutes.min = 1; minutes.max = 240; minutes.required = true; minutes.value = s ? s.minutes : 5;
      field('Minutes', minutes);
      var body = el('textarea'); body.name = 'body'; body.rows = 3; body.maxLength = 2000; body.value = (s && s.body) || '';
      var bodyL = field('What the main stage shows', body, 'A few lines. A blank line starts a new one.');
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
      field('Your note for this scene', note, 'Only the cohort’s teachers see it.');
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
        promptLabel.textContent = { presenter: 'What the audience does', question: 'The question', rooms: 'What the rooms are for', reflection: 'The closing question' }[kindSel.value] || 'Prompt';
        bodyL.hidden = kindSel.value === 'question';
      }
      kindSel.addEventListener('change', fitKind);
      fitKind();

      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var save = el('button', 'btn-quiet', s ? 'Save the scene' : 'Add it to the run of show'); save.type = 'submit';
      acts.appendChild(save);
      acts.appendChild(button('Cancel', 'btn-quiet', function () { editing = null; draw(); }));
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
        say('Week ' + session.number + ' starts from the six parts. Change anything.');
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
