// The run of show (research/notes/run-of-show-design.md, R1): one way
// to lay out a live session, shared by the Meet add-on's side panel and
// /live/, for the teacher's view and the student's. This file is the
// part with no page in it: the words, the scenes made from the session's
// parts, and which part of the view sits in which scene. assets/show-view.js
// draws it, and tools/test/show-lib.test.mjs tests it.
//
// Each word means one thing everywhere. Until the class builder (R2)
// keeps scenes of their own, a session's scenes are COURSE.md's six
// parts (CohortLib.agenda), each given the kind of scene it is.
// Words by Claude, awaiting Ben's review.
(function (root) {
  var WORDS = [
    { key: 'show', name: 'Run of show', line: 'The session’s scenes in order. The open one is happening now.' },
    { key: 'scene', name: 'Scene', line: 'One step of the run of show, with its minutes. There is one current scene at a time.' },
    { key: 'cue', name: 'Cue', line: 'Something the teacher does in the moment that everyone sees at once, like sending people to their rooms.' },
    { key: 'stage', name: 'Main stage', line: 'The middle of the call, where the current scene or a presenter’s work is shown to everyone.' },
    { key: 'presenter', name: 'Presenter', line: 'The person whose work everyone is looking at.' },
    { key: 'audience', name: 'Audience', line: 'Everyone else in that moment, with one thing to do.' },
    { key: 'wings', name: 'The wings', line: 'Who is ready to present, waiting their turn in the order they asked.' },
    { key: 'rooms', name: 'Rehearsal rooms', line: 'Each trio’s own call, where people present to two partners before anything is shown to the whole class.' },
    { key: 'design', name: 'Design stage', line: 'The scene where everyone draws and writes together in one shared space, shown on the main stage.' }
  ];

  // The kinds of scene, each with the one line that says what happens in it.
  var KINDS = {
    talk: { name: 'Talk', line: 'Someone explains, and everyone listens and reads along.' },
    rooms: { name: 'Rehearsal rooms', line: 'Everyone goes to their trio’s room, takes a turn presenting, and comes back when the clock runs out.' },
    'break': { name: 'Break', line: 'A few minutes away, and then back to the main room.' },
    presenter: { name: 'Presenter', line: 'One person shows their work on the main stage, and the audience responds.' },
    design: { name: 'Design stage', line: 'Everyone works on the same prompt together, drawing and writing in one shared space.' },
    reflection: { name: 'Reflection', line: 'Everyone starts this week’s work before leaving, with help close by.' },
    question: { name: 'Question', line: 'Everyone answers privately, and the teacher may show the count.' }
  };

  // COURSE.md's six parts (and the break), as scenes.
  var PART_KIND = { arrive: 'talk', show: 'rooms', 'break': 'break', value: 'presenter', prompt: 'design', start: 'reflection', check: 'question' };

  // The parts of a view. Each has its name and one plain line for each
  // side, who may see it (teacher: true means the teacher's view alone),
  // and the kinds of scene it belongs in. One that belongs in no scene,
  // or in a scene that is not happening, waits under "Any time in the
  // show", so nothing is ever out of reach.
  var SLOTS = [
    { key: 'clock', name: 'This scene', teacher: false, kinds: '*',
      line: { teacher: 'Its clock, and the cues to start it or move to the next scene.', student: 'Where the session is, and how long this scene runs.' } },
    { key: 'lead', name: 'For this scene', teacher: false, kinds: ['talk', 'rooms'],
      line: { teacher: 'What this scene needs from you: last week’s notes while people arrive, and each trio’s order in the rooms.', student: 'What this scene asks of you, like your trio’s order and each person’s question.' } },
    { key: 'cue-rooms', name: 'Send everyone to their rooms', teacher: true, kinds: ['rooms'],
      line: { teacher: 'One cue sends every trio to its room with a clock, and one calls them back.' } },
    { key: 'rooms', name: 'The rehearsal rooms', teacher: false, kinds: ['rooms'],
      line: { teacher: 'Each room’s turn and step, and which room would like you to visit.', student: 'Whose turn it is in your room, the step you are on, and how to ask for your teacher.' } },
    { key: 'brought', name: 'What people brought back', teacher: false, kinds: ['rooms'],
      line: { teacher: 'Everyone’s bring-back since last session, with what each person wants to know.', student: 'Everyone’s bring-back since last session, so you know what your partners will show.' } },
    { key: 'cue-stage', name: 'Presenter and audience', teacher: true, kinds: ['presenter'],
      line: { teacher: 'Name who presents and who responds, so everyone knows whom to watch.' } },
    { key: 'wings', name: 'The wings', teacher: false, kinds: ['presenter'],
      line: { teacher: 'Who is ready to present, in the order they asked. Put one on the main stage when it is their turn.', student: 'Ask to present here, and see whose turn is next.' } },
    { key: 'design', name: 'The design stage', teacher: false, kinds: ['design'],
      line: { teacher: 'The shared space for this scene, where everyone draws and writes at once.', student: 'The shared space where everyone draws and writes on the same prompt.' } },
    { key: 'cue-card', name: 'A card for everyone', teacher: true, kinds: ['talk', 'design'],
      line: { teacher: 'A few words, and a clock if you want one, on everyone’s view at once.' } },
    { key: 'questions', name: 'Questions', teacher: false, kinds: ['question', 'reflection'],
      line: { teacher: 'Ask everyone a question, see the answers come in, and choose whether to show the count.', student: 'Your teacher’s questions. Only you and your teacher see your answer.' } },
    { key: 'cue-recording', name: 'Recording', teacher: true, kinds: [],
      line: { teacher: 'Tell everyone the session is being recorded, and when it stops.' } },
    { key: 'cue-talk', name: 'Your own talk', teacher: true, kinds: [],
      line: { teacher: 'Show everyone that the recorder is counting your talk, and keep the share afterwards if you like.' } },
    { key: 'pushed', name: 'Pushed during class', teacher: true, kinds: [],
      line: { teacher: 'What people have pushed to their repositories since the session began.' } },
    { key: 'thread', name: 'The thread', teacher: false, kinds: [],
      line: { teacher: 'This session’s thread on GitHub, for links and questions that should outlast the call.', student: 'This session’s thread on GitHub, for links and questions that should outlast the call.' } },
    { key: 'conversation', name: 'From the conversation', teacher: false, kinds: [],
      line: { teacher: 'The cohort’s newest discussions, so any of them can be opened and shown.', student: 'The cohort’s newest discussions, so any of them can be opened and shown.' } },
    { key: 'path', name: 'This week on the path', teacher: false, kinds: [],
      line: { teacher: 'The stages this week’s work comes from.', student: 'The stages this week’s work comes from.' } }
  ];

  function slot(key) { return SLOTS.filter(function (s) { return s.key === key; })[0] || null; }

  // The scenes, from the session's parts ({ key, name, start, minutes,
  // what }), or from its own run of show (fromRows), which already says
  // what kind each scene is.
  function scenes(parts) {
    return (parts || []).map(function (p) {
      var kind = p.kind && KINDS[p.kind] ? p.kind : (PART_KIND[p.key] || 'talk');
      return Object.assign({}, p, { key: p.key, name: p.name, start: p.start, minutes: p.minutes, what: p.what || '', kind: kind, kindName: KINDS[kind].name, kindLine: KINDS[kind].line });
    });
  }

  // ------------------------------------------------------------------
  // Running the show (R3)
  // ------------------------------------------------------------------

  // A session's own run of show (the scenes table, R2) as the view's
  // scenes: each keyed by its id, starting where the one before ends.
  // Rows from the database come in position order; this sorts anyway.
  function fromRows(rows) {
    var at = 0;
    return (rows || []).slice().sort(function (a, b) { return a.position - b.position; }).map(function (r) {
      var m = Number(r.minutes) || 0;
      var s = { key: r.id, id: r.id, name: r.title, kind: r.kind, minutes: m, start: at, what: r.body || '', config: r.config || {}, own: true };
      at += m;
      return s;
    });
  }

  // The part each scene stands in for, so the code that knows COURSE.md's
  // six parts (last week's notes while people arrive, the trios' order,
  // the closing questions) knows a scene of the teacher's own too: a
  // part's own key; the first scene, if it is a talk, as arriving; and
  // otherwise by its kind.
  function partKeyOf(scene, index) {
    if (!scene) return null;
    if (!scene.own) return scene.key;
    if (index === 0 && scene.kind === 'talk') return 'arrive';
    return { rooms: 'show', question: 'check', presenter: 'value', reflection: 'start', 'break': 'break', design: 'prompt', talk: 'prompt' }[scene.kind] || null;
  }

  // The scene happening now, from the show everyone follows: its key, or
  // null before the show begins, or when the scene it names is gone.
  function currentKey(state, list) {
    var key = state && state.current_scene;
    if (!key) return null;
    return (list || []).some(function (s) { return s.key === key; }) ? key : null;
  }

  // The scene before or after this one (delta -1 or 1), staying within
  // the show. With no current scene, forward is the first.
  function step(list, key, delta) {
    list = list || [];
    if (!list.length) return null;
    var i = -1;
    list.forEach(function (s, n) { if (s.key === key) i = n; });
    if (i < 0) return delta > 0 ? list[0].key : null;
    var j = Math.max(0, Math.min(list.length - 1, i + delta));
    return j === i ? null : list[j].key;
  }

  // Seconds left in the current scene, counted from when its clock
  // started (the database's own time), or null when its clock is stopped.
  function secondsLeft(state, scene, nowMs) {
    if (!state || !state.scene_started_at || !scene || !scene.minutes) return null;
    var started = Date.parse(state.scene_started_at);
    if (!isFinite(started)) return null;
    return Math.max(0, Math.round((started + scene.minutes * 60000 - nowMs) / 1000));
  }

  // When the current scene's clock runs out, in milliseconds, or null.
  function endsAt(state, scene) {
    if (!state || !state.scene_started_at || !scene || !scene.minutes) return null;
    var started = Date.parse(state.scene_started_at);
    return isFinite(started) ? started + scene.minutes * 60000 : null;
  }

  // What the main stage is told to show, from the show everyone follows,
  // in the panel's own terms (AddonLib.stageView's onStage): null when it
  // follows the current scene.
  function pinOf(state) {
    var stage = state && state.stage;
    if (!stage || stage === 'scene') return null;
    if (stage === 'answers') return { kind: 'check', id: state.stage_ref };
    if (stage === 'presenter') return { kind: 'item', id: state.stage_ref };
    if (stage === 'welcome' || stage === 'blank') return { kind: stage };
    return null;
  }

  // And back: the change to the show for pinning something on the main
  // stage (onStage), or for following the scene again (null).
  function stageChange(onStage) {
    if (!onStage) return { stage: 'scene', stage_ref: null };
    if (onStage.kind === 'check') return { stage: 'answers', stage_ref: onStage.id };
    if (onStage.kind === 'item') return { stage: 'presenter', stage_ref: onStage.id };
    if (onStage.kind === 'welcome' || onStage.kind === 'blank') return { stage: onStage.kind, stage_ref: null };
    return { stage: 'scene', stage_ref: null };
  }

  // A scene in the shape the class builder keeps it in (ShowLib's
  // stagePreview and problem read this), for a scene of either kind.
  function asRow(scene) {
    if (!scene) return null;
    return { kind: scene.kind, title: scene.name, minutes: scene.minutes, body: scene.what || null, config: scene.config || {} };
  }

  // The words a teacher edits for a scene in the moment, as the form
  // starts: title, minutes, what the main stage says, the prompt, and a
  // question's choices one to a line.
  function editFields(scene) {
    var c = (scene && scene.config) || {};
    return {
      title: scene ? scene.name || '' : '', minutes: scene ? String(scene.minutes || '') : '',
      body: scene ? scene.what || '' : '', prompt: c.prompt || '', options: (c.options || []).join('\n')
    };
  }

  // Which of those words a kind of scene has: every scene has a title,
  // minutes, and words for the stage; some have a prompt; a question has
  // choices.
  function editable(kind) {
    return {
      prompt: ['presenter', 'question', 'rooms', 'reflection'].indexOf(kind) >= 0,
      options: kind === 'question'
    };
  }

  // The change to save for a scene from the form's words, and the first
  // problem with it as a sentence (ShowLib.problem, passed in so this
  // stays testable), or null. A prompt or choices the kind does not use
  // are left out; the rest of the scene's configuration (a room's own
  // scenes, a template) is kept as it was.
  function edited(scene, fields, show) {
    var have = editable(scene.kind);
    var config = Object.assign({}, scene.config || {});
    if (have.prompt) { var p = String(fields.prompt || '').trim(); if (p) config.prompt = p; else delete config.prompt; }
    if (have.options) {
      var opts = String(fields.options || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (opts.length) config.options = opts; else delete config.options;
    }
    var change = {
      title: String(fields.title || '').trim(),
      minutes: Number(String(fields.minutes || '').trim()),
      body: String(fields.body || '').trim() || null,
      config: config
    };
    var problem = show && show.problem ? show.problem(Object.assign({ kind: scene.kind }, change)) : null;
    return { change: change, problem: problem };
  }

  // A scene with the form's words in place, for the teacher's own main
  // stage while they type, before anyone else sees it.
  function draft(scene, fields) {
    var e = edited(scene, fields, null).change;
    return Object.assign({}, scene, { name: e.title || scene.name, minutes: e.minutes > 0 ? e.minutes : scene.minutes, what: e.body || '', config: e.config });
  }

  // The scenes with where each stands: done, now, next, or later. With no
  // current scene (before the session), the first is next.
  function timeline(parts, currentKey) {
    var list = scenes(parts);
    var at = -1;
    list.forEach(function (s, i) { if (s.key === currentKey) at = i; });
    return list.map(function (s, i) {
      var state = at < 0 ? (i === 0 ? 'next' : 'later') : i < at ? 'done' : i === at ? 'now' : i === at + 1 ? 'next' : 'later';
      return Object.assign({}, s, { state: state });
    });
  }

  // Which parts of the view sit in the current scene, in order, and which
  // wait under "Any time in the show". available: the slot keys this page
  // has; teaching: the teacher's view.
  function layout(parts, currentKey, opts) {
    opts = opts || {};
    var have = opts.available || SLOTS.map(function (s) { return s.key; });
    var current = scenes(parts).filter(function (s) { return s.key === currentKey; })[0] || null;
    var now = [], anytime = [];
    SLOTS.forEach(function (s) {
      if (have.indexOf(s.key) < 0) return;
      if (s.teacher && !opts.teaching) return;
      var here = s.kinds === '*' || (current && s.kinds.indexOf(current.kind) >= 0);
      (here ? now : anytime).push(s.key);
    });
    return { now: now, anytime: anytime, kind: current ? current.kind : null };
  }

  // A part of the view's name and its one line, for this side.
  function slotText(key, teaching) {
    var s = slot(key);
    if (!s) return { name: key, line: '' };
    return { name: s.name, line: (teaching ? s.line.teacher : s.line.student) || s.line.teacher || '' };
  }

  // The scene after this one, or null at the end.
  function nextScene(parts, currentKey) {
    var list = scenes(parts);
    for (var i = 0; i < list.length; i++) if (list[i].key === currentKey) return list[i + 1] || null;
    return list[0] || null;
  }

  // "25 min", "1 min", or "" for none.
  function minutesText(n) { return typeof n === 'number' && n > 0 ? n + ' min' : ''; }

  // "12:30 left" or "Time is up" for a clock, or "" with none.
  function leftText(seconds) {
    if (seconds == null) return '';
    if (seconds <= 0) return 'Time is up';
    var m = Math.floor(seconds / 60), s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s + ' left';
  }

  var lib = {
    WORDS: WORDS, KINDS: KINDS, PART_KIND: PART_KIND, SLOTS: SLOTS, scenes: scenes, timeline: timeline, layout: layout, slotText: slotText, nextScene: nextScene, minutesText: minutesText,
    fromRows: fromRows, partKeyOf: partKeyOf, currentKey: currentKey, step: step, secondsLeft: secondsLeft, endsAt: endsAt,
    pinOf: pinOf, stageChange: stageChange, asRow: asRow, editFields: editFields, editable: editable, edited: edited, draft: draft, leftText: leftText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ShowViewLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
