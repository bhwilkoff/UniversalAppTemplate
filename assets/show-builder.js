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
    var scenes = [], notes = {}, decks = {}, withScenes = [], busy = false, dragId = null, bank = [], kinds = false;
    var part = opts.part || null, studio = null;
    var status = el('p', 'small'); status.setAttribute('role', 'status');
    var fit = el('p', 'plan-fit');
    var hour = el('div', 'plan-hour');
    var list = el('ol', 'plan-board');
    list.classList.toggle('is-read-only', readOnly);
    list.setAttribute('aria-label', 'Plan for ' + (window.CohortLib ? window.CohortLib.sessionName(session.number, cohort) : 'Week ' + session.number));
    var start = el('div', 'actions');
    var page = el('div', 'part-page');
    box.replaceChildren(fit, hour, list, start, page, status);

    function say(text) { status.textContent = text || ''; }

    function load() {
      return Promise.all([
        db.from('scenes').select('*').eq('session_id', session.id).order('position'),
        db.from('scene_notes').select('scene_id, body').eq('cohort_id', cohort.id),
        db.from('scene_decks').select('scene_id, body').eq('cohort_id', cohort.id),
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
        decks = {};
        (res[2].data || []).forEach(function (n) { decks[n.scene_id] = n.body; });
        withScenes = (res[3].data || []).map(function (r) { return r.session_id; });
        bank = res[4].error ? [] : (res[4].data || []).filter(function (q) { return !q.cohort_id || q.cohort_id === cohort.id; });
        kinds = res[5];
        draw();
        // The board's pictures wait for what their slides show from GitHub.
        if (window.GitHubBlock) window.GitHubBlock.preload(db, cohort.id, scenes.map(function (x) { return x.slides || ''; }).join('\n')).then(function (got) { if (got && !part) draw(); });
      });
    }

    function draw() {
      var here = part ? scenes.filter(function (x) { return x.id === part; })[0] : null;
      [fit, hour, list, start].forEach(function (n) { n.hidden = !!here; });
      page.hidden = !here;
      if (here) return drawPart(here, scenes.indexOf(here));
      page.replaceChildren();
      studio = null;
      drawBoard();
    }

    function drawBoard() {
      list.replaceChildren();
      start.replaceChildren();
      hour.replaceChildren();
      fit.textContent = scenes.length
        ? (readOnly ? scenes.reduce(function (n, x) { return n + x.minutes; }, 0) + ' minutes' : S.fitText(scenes, cohort.session_minutes))
        : (window.CohortLib ? window.CohortLib.sessionName(session.number, cohort) : 'Week ' + session.number) + ' has no plan yet.';
      if (!scenes.length && !readOnly) {
        var C = window.CurriculumLib, week = C && cohort.schedule !== 'custom' ? C.weekOf(session.number) : null;
        if (week != null && window.CurriculumSeed) start.appendChild(button(C.startLabel(week), 'btn-primary', startPlan));
        start.appendChild(button('Start from the six parts', 'btn-secondary', startDefault));
        var from = S.copySource(opts.sessions, session, withScenes);
        if (from) start.appendChild(button('Copy ' + (cohort.schedule === 'custom' ? 'session ' : 'week ') + from.number + '’s run of show', 'btn-secondary', function () { copyFrom(from); }));
      }
      var at = S.startTimes(scenes);
      scenes.forEach(function (s, i) {
        var seg = el('a', 'plan-seg fam-' + family(s.kind));
        seg.href = opts.href(s.id);
        seg.style.flexGrow = s.minutes;
        seg.title = s.title + ', ' + s.minutes + ' min';
        seg.setAttribute('aria-label', s.title + ', ' + s.minutes + ' minutes');
        seg.addEventListener('click', function (ev) { if (plainClick(ev)) { ev.preventDefault(); opts.go(s.id); } });
        hour.appendChild(seg);
        list.appendChild(card(s, i, at[i]));
      });
      if (!readOnly && scenes.length) list.appendChild(adder());
    }
    function plainClick(ev) { return !(ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button); }
    // Three families of what a part asks of people, so the hour reads at a glance.
    function family(k) {
      return { question: 'ask', presenter: 'do', design: 'do', rooms: 'do', 'break': 'rest' }[k] || 'say';
    }

    // One part, as a picture of its main stage. It opens on its own page.
    function card(s, i, at) {
      var li = el('li', 'part-card');
      li.dataset.id = s.id;
      var a = el('a', 'part-link');
      a.href = opts.href(s.id);
      a.addEventListener('click', function (ev) { if (plainClick(ev)) { ev.preventDefault(); opts.go(s.id); } });
      a.appendChild(preview(s));
      var words = el('span', 'part-words');
      var line = el('span', 'part-line fam-' + family(s.kind));
      line.appendChild(el('span', 'part-at', clock(at)));
      line.appendChild(el('span', 'part-kind', plain(s.kind)));
      line.appendChild(el('span', 'part-min', s.minutes + ' min'));
      words.appendChild(line);
      words.appendChild(el('strong', 'part-name', s.title));
      a.appendChild(words);
      li.appendChild(a);
      if (readOnly) return li;
      // Keyboard: Alt with an arrow moves the part you are on.
      li.addEventListener('keydown', function (ev) {
        if (!ev.altKey || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.key) < 0) return;
        ev.preventDefault();
        move(i, ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 1, true);
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

    function adder() {
      var li = el('li', 'part-card part-new');
      var open = button('Add a part', 'part-new-open', function () { open.hidden = true; menu.hidden = false; menu.querySelector('button').focus(); });
      var menu = el('div', 'part-new-menu');
      menu.hidden = true;
      S.KINDS.forEach(function (k) { menu.appendChild(button(plain(k.key), 'btn-secondary small', function () { addPart(k.key); })); });
      li.appendChild(open); li.appendChild(menu);
      return li;
    }
    function addPart(k) {
      var raw = k === 'question' ? { prompt: 'Your question' } : k === 'rooms' ? { prompt: 'What the rooms are for', room_scenes: [{ title: 'Talk it over', minutes: 5 }] } : k === 'presenter' ? { prompt: 'What each person shows' } : k === 'reflection' ? { prompt: 'Your question' } : {};
      var row = { cohort_id: cohort.id, session_id: session.id, position: nextPosition(), kind: k, title: plain(k), minutes: 5, body: null, config: S.cleanConfig(k, raw) };
      say('Adding…');
      db.from('scenes').insert(row).select('id').single().then(function (r) {
        if (r.error) { say('Not added: ' + r.error.message); return; }
        say('');
        return load().then(function () { opts.go(r.data.id); });
      });
    }

    // A part on its own page: its stage, big, and the few things it needs.
    function drawPart(s, i) {
      page.replaceChildren();
      var nav = el('div', 'part-nav');
      var back = el('a', 'btn-secondary small', 'The plan');
      back.href = opts.href(null);
      back.addEventListener('click', function (ev) { if (plainClick(ev)) { ev.preventDefault(); leave(null); } });
      nav.appendChild(back);
      nav.appendChild(el('span', 'part-of', 'Part ' + (i + 1) + ' of ' + scenes.length));
      var turn = el('span', 'part-turn');
      [[scenes[i - 1], 'Previous part'], [scenes[i + 1], 'Next part']].forEach(function (x) {
        var b = button(x[1], 'btn-secondary small', function () { leave(x[0].id); });
        b.disabled = !x[0];
        turn.appendChild(b);
      });
      nav.appendChild(turn);
      page.appendChild(nav);
      if (!readOnly) {
        page.appendChild(form(s, i));
        nav.insertBefore(page.querySelector('.part-saved'), turn);
        return;
      }
      var head = el('div', 'part-read');
      head.appendChild(el('p', 'part-line fam-' + family(s.kind), plain(s.kind) + ', ' + s.minutes + ' min'));
      head.appendChild(el('h2', 'part-heading', s.title));
      if (s.goal) head.appendChild(el('p', 'part-goal', s.goal));
      page.appendChild(head);
      if (s.slides && window.SlideStudio) {
        var deck = el('div');
        page.appendChild(deck);
        window.SlideStudio.mount(deck, { text: s.slides, readOnly: true, github: githubOpts() });
      } else page.appendChild(preview(s));
      var c = s.config || {}, detail = el('div', 'scene-detail');
      paragraphs(s.body).forEach(function (p) { detail.appendChild(p); });
      if (c.prompt) detail.appendChild(el('p', 'scene-prompt', c.prompt));
      if (c.options && c.options.length && s.kind === 'question') detail.appendChild(el('p', 'small', c.options.join(' · ')));
      if (detail.children.length) page.appendChild(detail);
    }
    function leave(id) { opts.go(id); }
    function githubOpts() { return { db: db, cohortId: cohort.id, repo: cohort.github_repo || '', repos: opts.repos || [] }; }
    // Everything waiting to save lands before the page changes.
    function setPart(id) {
      if (id === part) return Promise.resolve();
      var pending = studio ? studio.flush() : null;
      studio = null;
      part = id;
      return Promise.resolve(pending).then(load);
    }

    function preview(s) {
      if (s.slides && window.SlideEditor) {
        var deckBox = el('div', 'stage-preview part-pic');
        deckBox.setAttribute('role', 'img');
        deckBox.setAttribute('aria-label', 'The first slide of ' + s.title);
        window.SlideEditor.thumb(deckBox, s.slides);
        return deckBox;
      }
      var p = S.stagePreview(s);
      var stage = el('div', 'stage-preview part-pic');
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
      var f = el('form', 'part-form');
      var deckBox = el('div', 'part-deck');
      // ShowLib.problem checks a part. The browser's own check would stop on
      // the hidden question form's required box, with nothing on screen (found
      // saving slides: no part but a question could be saved here).
      f.noValidate = true;
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
      var kl = field('Activity', kindSel);
      var title = el('input'); title.name = 'title'; title.maxLength = 120; title.required = true; title.value = s ? s.title : '';
      var titleL = field('Title', title);
      var goal = el('textarea'); goal.name = 'goal'; goal.rows = 2; goal.maxLength = 600; goal.value = (s && s.goal) || '';
      field('Purpose', goal, 'What this part is for, shown with it.');
      var minutes = el('input'); minutes.name = 'minutes'; minutes.type = 'number'; minutes.min = 1; minutes.max = 240; minutes.required = true; minutes.value = s ? s.minutes : 5;
      var minutesL = field('Minutes', minutes);
      var body = el('textarea'); body.name = 'body'; body.rows = 3; body.maxLength = 2000; body.value = (s && s.body) || '';
      var bodyL = field('What happens', body);
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
      var noteL = field('Your note for the whole part', note);
      var promptLabel = promptL.firstChild;

      function fitKind() {
        var k = S.kind(kindSel.value);
        var uses = k ? k.keys : [];
        var asQuestion = !!qf && kindSel.value === 'question';
        promptL.hidden = uses.indexOf('prompt') === -1 || asQuestion;
        optionsL.hidden = uses.indexOf('options') === -1 || asQuestion;
        if (qf) qf.el.hidden = !asQuestion;
        templateL.hidden = uses.indexOf('template') === -1;
        roomsL.hidden = uses.indexOf('room_scenes') === -1;
        promptLabel.textContent = { presenter: 'What each person shows', question: 'The question', rooms: 'What the rooms are for', reflection: 'The closing question' }[kindSel.value] || 'Prompt';
        bodyL.hidden = kindSel.value === 'question';
        deckBox.hidden = ['talk', 'reflection'].indexOf(kindSel.value) < 0;
      }
      kindSel.addEventListener('change', fitKind);
      fitKind();

      var msg = el('span', 'part-saved'); msg.setAttribute('role', 'status');
      f.appendChild(msg);
      var top = el('div', 'part-top');
      top.appendChild(titleL); top.appendChild(kl); top.appendChild(minutesL);
      f.insertBefore(top, f.firstChild);
      f.insertBefore(deckBox, top.nextSibling);
      var stageBox = el('div', 'part-stage');
      f.insertBefore(stageBox, deckBox);
      function drawStage() {
        stageBox.hidden = !deckBox.hidden;
        if (!stageBox.hidden) stageBox.replaceChildren(preview(s));
      }
      if (window.SlideStudio) studio = window.SlideStudio.mount(deckBox, { text: decks[s.id] || s.slides || '', onChange: saveDeck, github: githubOpts() });
      function saved(text) { msg.textContent = text; }

      function saveDeck(text) {
        if (text === (decks[s.id] || s.slides || '')) return null;
        saved('Saving…');
        return db.rpc('save_scene_deck', { scene: s.id, source: text }).then(function (r) {
          if (r.error) { saved('Not saved: ' + r.error.message); return; }
          decks[s.id] = text;
          saved('Saved');
        });
      }

      // On a part with slides, the slide is the part: the rest stays folded.
      var more = el('details', 'ui-disclosure part-more');
      more.appendChild(el('summary', null, 'More about this part'));
      f.appendChild(more);
      function tuck() {
        var deck = !deckBox.hidden;
        more.hidden = !deck;
        [bodyL, noteL].forEach(function (x) { (deck ? more : f).appendChild(x); });
        f.appendChild(acts);
        drawStage();
      }
      var acts = el('div', 'actions');
      acts.appendChild(button('Delete this part', 'btn-danger', function () {
        window.UI.confirm({ title: 'Delete ' + s.title + '?', body: 'It comes out of this session’s plan.', action: 'Delete part' }).then(function (yes) { if (yes) remove(s); });
      }));
      tuck();
      kindSel.addEventListener('change', tuck);

      var waiting = null;
      function persist() {
        var k = kindSel.value;
        var raw = { prompt: prompt.value, options: S.optionsFromText(options.value), template: template.value, room_scenes: S.roomScenesFromText(rooms.value) };
        if (k === 'question' && qf) {
          var qr = qf.read(), parsed = LL.parseQuestion(qr);
          if (parsed.error) { saved(parsed.error); return; }
          raw = LL.sceneQuestion(parsed, qr.question_id);
        }
        var row = {
          kind: k, title: title.value.trim(), minutes: parseInt(minutes.value, 10),
          body: k === 'question' ? null : (body.value.trim() || null), config: S.cleanConfig(k, raw)
        };
        var p = S.problem(row);
        if (p) { saved(p); return; }
        // What this form does not show stays: a part's document, whom to
        // feature, its breakout groups and workbooks, and its question's
        // settings, all brought from Course Builder or set elsewhere.
        row.config = Object.assign(S.carriedConfig(k, c), row.config);
        row.goal = goal.value.trim() || null;
        saved('Saving…');
        return Promise.all([db.from('scenes').update(row).eq('id', s.id).select('id').single(), saveNote(s.id, note.value.trim())]).then(function (both) {
          var r = both[0], nr = both[1];
          if (r.error) { saved('Not saved: ' + r.error.message); return; }
          if (nr && nr.error) { saved('Your note is not saved: ' + nr.error.message); return; }
          Object.assign(s, row);
          drawStage();
          if (note.value.trim()) notes[s.id] = note.value.trim(); else delete notes[s.id];
          saved('Saved');
        });
      }
      function soon() { clearTimeout(waiting); waiting = setTimeout(persist, 700); }
      f.addEventListener('input', function (ev) { if (!deckBox.contains(ev.target)) soon(); });
      f.addEventListener('change', function (ev) { if (!deckBox.contains(ev.target)) soon(); });
      f.addEventListener('submit', function (ev) { ev.preventDefault(); persist(); });
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
        studio = null;
        opts.go(null);
      });
    }

    function startDefault() {
      var rows = S.defaultShow(opts.agenda, opts.turn).map(function (x, i) {
        return Object.assign({ cohort_id: cohort.id, session_id: session.id, position: i }, x);
      });
      say('Adding the six parts…');
      db.from('scenes').insert(rows).then(function (r) {
        if (r.error) { say('Not added: ' + r.error.message); return; }
        say((window.CohortLib ? window.CohortLib.sessionName(session.number, cohort) : 'Week ' + session.number) + ' starts from the six parts. Change anything.');
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
      say('Copying ' + (cohort.schedule === 'custom' ? 'session ' : 'week ') + from.number + '…');
      db.rpc('copy_scenes', { from_session: from.id, to_session: session.id }).then(function (r) {
        if (r.error) { say('Not copied: ' + r.error.message); return; }
        say('Copied ' + r.data + ' scenes from ' + (cohort.schedule === 'custom' ? 'session ' : 'week ') + from.number + ', with your notes.');
        load();
      });
    }

    load();
    return { reload: load, part: setPart };
  }

  window.ShowBuilder = { mount: mount };
})();
