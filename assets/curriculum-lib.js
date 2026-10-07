// The course's plan for each week, as the run of show a new cohort is
// made with (curriculum milestone C6). The plan is the template's
// docs/research/curriculum/00-curriculum-design.md, "The live session
// for each week": the six parts and a break as scenes, with each week's
// prepared questions, design stage template, room prompt, and what the
// teacher watches for. Once the template publishes
// docs/teaching/runs-of-show.json, that file wins over what is written
// here, scene by scene checked with ShowLib.problem; until then, and
// whenever the file is missing or does not fit, these defaults are used.
// Pure: no page, no network. Tested in tools/test/curriculum-lib.test.mjs.
// Words by Claude, awaiting Ben's review.
(function (root) {
  var SOURCE = 'https://raw.githubusercontent.com/bhwilkoff/UniversalAppTemplate/main/docs/teaching/runs-of-show.json';

  // Each week, as the template's docs/teaching/runs-of-show.json
  // publishes it (COURSE.md's week table and research note 06, which Ben
  // approved on October 7, 2026): the design stage's board, the rehearsal
  // rooms' prompt and the teacher's note, and the week's questions. This is
  // only the fallback for when that file cannot be read, so it is copied
  // from it by tools/sync_curriculum_fallback.py, never written by hand;
  // tools/test/curriculum-lib.test.mjs checks the two still agree. The
  // questions' first is the one the closing question scene asks; every one
  // goes into the cohort's question bank, ready to ask instead.
  var WEEKS = {
    prep: {
      template: "questions",
      room: "Show your app's address on your phone, and say one thing in your life you wish worked differently.",
      watch: "Watch for anyone whose setup is still stuck, and anyone who has not met their trio yet.",
      questions: [
        {"kind": "short", "prompt": "What do you hope this app will do for someone?"},
        {"kind": "scale", "prompt": "How ready do you feel to build?", "choices": ["Not ready yet", "Ready to build"], "points": 5},
        {"kind": "short", "prompt": "What did your agent do for you during setup that you expected to have to do yourself?"},
        {"kind": "choice", "prompt": "Where will you keep your noticing log this week?", "choices": ["A notes app on my phone", "Paper", "My app's note", "Somewhere else"]}
      ]
    },
    1: {
      template: "problem-tests",
      room: "Read your problem statement aloud. Then listen to the questions, and write down the one you want to answer.",
      watch: "Critique rules from Ron Berger. Watch for a statement that names a technology instead of a situation, and for a room where nobody asks a question.",
      questions: [
        {"kind": "short", "prompt": "Which would you rather read, and what would be lost if the app only had the first kind?"},
        {"kind": "words", "prompt": "In a few words, what do these four problem statements do well?"},
        {"kind": "scale", "prompt": "How sure are you, right now, that someone besides you has this problem?", "choices": ["Not sure at all", "I could name them"], "points": 5},
        {"kind": "short", "prompt": "What is still muddy?"},
        {"kind": "multi", "prompt": "Which of these does your problem statement do?", "choices": ["Starts from something that happens in my life", "Says what a better life would look like", "Names who else has it", "Never names a technology"]},
        {"kind": "rank", "prompt": "Which questions for your two conversations will tell you the most?", "choices": ["Tell me about the last time you...", "What did you try?", "What happened next?", "Who else deals with this?"]}
      ]
    },
    2: {
      template: "blank",
      room: "Read your problem statement, show the app on your phone, and say what the person you talked to did first.",
      watch: "Watch for a problem statement that has not changed since week 1, \"my friend liked it\" with nothing about what the person did, and a first version that grew past the smallest thing.",
      questions: [
        {"kind": "short", "prompt": "Which device will the people you talked to reach for, and why that one second?"},
        {"kind": "multi", "prompt": "Which of these belong in the data, so every platform gets them the same way? Choose every one.", "choices": ["A film's title and year", "Whether a film is saved", "A trivia question's correct answer", "Swipe to go back", "The size of the play button"]},
        {"kind": "short", "prompt": "What is still muddy?"}
      ]
    },
    3: {
      template: "prompt",
      room: "Show one verb on both platforms, the cell your eyes proved wrong, and your app's look beside the template's.",
      watch: "Watch for a second platform that only runs in a simulator, a look with no line back to the people it is for, and anyone who has not named a person outside the cohort whose device the app could reach.",
      questions: [
        {"kind": "short", "prompt": "When your agent says something is fixed, what do you ask to see, and why is its word not enough?"},
        {"kind": "short", "prompt": "How do you know your last fix is real?"},
        {"kind": "short", "prompt": "What is still muddy?"}
      ]
    },
    4: {
      template: "blank",
      room: "Show what the person did first, beside the guess you wrote before they held it.",
      watch: "Critique rules from Ron Berger: be kind, be specific, be helpful, and offer suggestions as questions. Visit every group tonight. Watch for anyone who has not handed the app to another person yet, and ask them privately what is in the way.",
      questions: [
        {"kind": "short", "prompt": "What is the difference between a fix that is verified and a fix that is shipped?"},
        {"kind": "rank", "prompt": "Rank what the other person noticed first.", "choices": ["What it is for", "How it looks", "What it does first", "Something that broke", "How fast it is"]},
        {"kind": "words", "prompt": "In one word, how did it feel to hand it over?"},
        {"kind": "short", "prompt": "What is one thing about your app you can no longer see by using it yourself, and how will you find out about it?"},
        {"kind": "short", "prompt": "What is still muddy?"}
      ]
    },
    5: {
      template: "questions",
      room: "Explain every part of your app, even the parts the agent wrote, and the number and the feature you will show.",
      watch: "Critique rules from Ron Berger: be kind, be specific, be helpful, and offer suggestions as questions. Watch for a part of the app its builder cannot explain, and for a value that never changed a decision.",
      questions: [
        {"kind": "short", "prompt": "What is enough about this version, for now, and for whom?"},
        {"kind": "short", "prompt": "What waits for the next version?"},
        {"kind": "short", "prompt": "What will your agent know at the start of your next app that it did not know in week 1, and where does that knowledge live?"},
        {"kind": "short", "prompt": "What is still muddy?"}
      ]
    }
  };

  // The week a session belongs to: sessions are numbered from 1, and the
  // plan has five weeks (and a prep week for a session numbered 0).
  function weekOf(number) {
    if (number === 0) return 'prep';
    return WEEKS[number] ? number : null;
  }

  // A question in the bank's own shape, or null when it would not fit
  // (the same rules as the database's private.question_shape_ok).
  function bankQuestion(q) {
    if (!q || typeof q.prompt !== 'string') return null;
    var prompt = q.prompt.trim();
    if (!prompt || prompt.length > 500) return null;
    var k = q.kind, choices = q.choices || null, points = q.points == null ? null : q.points;
    var lineOk = function (max) { return function (c) { return typeof c === 'string' && c.trim().length >= 1 && c.trim().length <= max; }; };
    if (['choice', 'multi', 'rank'].indexOf(k) >= 0) {
      if (points != null || !Array.isArray(choices) || choices.length < 2 || choices.length > 8 || !choices.every(lineOk(120))) return null;
    } else if (k === 'short' || k === 'words') {
      if (choices || points != null) return null;
    } else if (k === 'scale') {
      if (!Number.isInteger(points) || points < 3 || points > 10) return null;
      if (choices && (!Array.isArray(choices) || choices.length !== 2 || !choices.every(lineOk(60)))) return null;
    } else return null;
    return { kind: k, prompt: prompt, choices: choices, points: points };
  }

  // The question scene's configuration for a bank question.
  function questionConfig(q) {
    var c = { prompt: q.prompt, kind: q.kind };
    if (q.choices) c.options = q.choices.slice();
    if (q.kind === 'scale') c.points = q.points;
    return c;
  }

  // One week's run of show from the plan. agendaParts: CohortLib.agenda
  // (session minutes), so it fits the cohort's own length; turn: the trio
  // steps (LiveLib.TURN). SL is ShowLib. Each scene is
  // { kind, title, minutes, body, config }, with the week's watch note
  // on the rooms scene as `note` (the teacher's own, never a student's).
  function weekShow(week, agendaParts, turn, SL) {
    var plan = WEEKS[week];
    if (!plan || !SL) return null;
    var first = bankQuestion(plan.questions[0]);
    return SL.defaultShow(agendaParts, turn).map(function (s, i) {
      var key = (agendaParts[i] || {}).key;
      var scene = { kind: s.kind, title: s.title, minutes: s.minutes, body: s.body, config: Object.assign({}, s.config) };
      if (key === 'prompt') { scene.kind = 'design'; scene.config = { template: plan.template }; }
      if (key === 'show') { scene.config.prompt = plan.room; scene.note = plan.watch; }
      if (key === 'check' && first) scene.config = questionConfig(first);
      scene.config = SL.cleanConfig(scene.kind, scene.config);
      return scene;
    });
  }

  // The published file, read for one week: { weeks: [{ week, scenes,
  // questions }] } or { weeks: { "1": { scenes, questions } } }, or a
  // week given as a bare list of scenes. Returns { scenes, questions } only
  // when every scene fits ShowLib.problem, or null so the defaults win.
  function fromPublished(data, week, SL) {
    if (!data || !SL) return null;
    var weeks = data.weeks || data, entry = null;
    if (Array.isArray(weeks)) {
      entry = weeks.filter(function (w) { return w && (String(w.week) === String(week) || String(w.number) === String(week)); })[0] || null;
    } else if (weeks && typeof weeks === 'object') {
      entry = weeks[String(week)] || null;
    }
    if (!entry) return null;
    var scenes = Array.isArray(entry) ? entry : entry.scenes;
    if (!Array.isArray(scenes) || !scenes.length || scenes.length > 30) return null;
    var out = [];
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i] || {};
      var scene = { kind: s.kind, title: typeof s.title === 'string' ? s.title.trim() : s.title, minutes: s.minutes, body: s.body || null, config: SL.cleanConfig(s.kind, s.config) };
      if (SL.problem(scene)) return null;
      if (typeof s.note === 'string' && s.note.trim()) scene.note = s.note.trim().slice(0, 2000);
      out.push(scene);
    }
    var questions = (Array.isArray(entry.questions) ? entry.questions : []).map(bankQuestion).filter(Boolean);
    return { scenes: out, questions: questions };
  }

  // What to seed for one week: the published plan if it fits, else the
  // defaults written here, else null (the six parts are then the
  // builder's own fallback).
  function plan(week, agendaParts, turn, SL, published) {
    var got = published ? fromPublished(published, week, SL) : null;
    if (got) return { from: 'published', scenes: got.scenes, questions: got.questions.length ? got.questions : defaultQuestions(week) };
    var scenes = weekShow(week, agendaParts, turn, SL);
    if (!scenes) return null;
    return { from: 'defaults', scenes: scenes, questions: defaultQuestions(week) };
  }

  function defaultQuestions(week) {
    return ((WEEKS[week] || {}).questions || []).map(bankQuestion).filter(Boolean);
  }

  // The questions not yet in the cohort's bank, compared by kind and
  // prompt (case and spacing aside), so making the sessions again never
  // adds a second copy.
  function newQuestions(wanted, bank) {
    var have = {};
    (bank || []).forEach(function (q) { have[q.kind + '|' + String(q.prompt || '').trim().toLowerCase()] = true; });
    var out = [];
    (wanted || []).forEach(function (q) {
      var key = q.kind + '|' + q.prompt.trim().toLowerCase();
      if (have[key]) return;
      have[key] = true;
      out.push(q);
    });
    return out;
  }

  // The button's words for a week.
  function startLabel(week) {
    if (week === 'prep') return 'Start from the course’s plan for the prep week';
    return 'Start from the course’s plan for week ' + week;
  }

  // A sentence for the page about what seeding did.
  function summary(done) {
    if (!done || (!done.weeks && !done.errors.length)) return '';
    var parts = [];
    if (done.weeks) parts.push((done.weeks === 1 ? 'One week has' : done.weeks + ' weeks have') + ' the course’s run of show, ready to change');
    if (done.questions) parts.push((done.questions === 1 ? 'one prepared question is' : done.questions + ' prepared questions are') + ' in your question bank');
    var out = parts.length ? parts.join(', and ') + '.' : '';
    if (done.errors.length) out += (out ? ' ' : '') + 'Not every week could be planned: ' + done.errors.join('; ') + '.';
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  var lib = {
    SOURCE: SOURCE, WEEKS: WEEKS, weekOf: weekOf, bankQuestion: bankQuestion, questionConfig: questionConfig,
    weekShow: weekShow, fromPublished: fromPublished, plan: plan, defaultQuestions: defaultQuestions,
    newQuestions: newQuestions, startLabel: startLabel, summary: summary
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CurriculumLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
