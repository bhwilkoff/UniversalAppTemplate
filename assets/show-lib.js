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

  // The scenes, from the session's parts ({ key, name, start, minutes, what }).
  function scenes(parts) {
    return (parts || []).map(function (p) {
      var kind = PART_KIND[p.key] || 'talk';
      return { key: p.key, name: p.name, start: p.start, minutes: p.minutes, what: p.what || '', kind: kind, kindName: KINDS[kind].name, kindLine: KINDS[kind].line };
    });
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

  var lib = { WORDS: WORDS, KINDS: KINDS, PART_KIND: PART_KIND, SLOTS: SLOTS, scenes: scenes, timeline: timeline, layout: layout, slotText: slotText, nextScene: nextScene, minutesText: minutesText };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ShowLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
