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

  var MUDDY = { kind: 'short', prompt: 'What is still muddy for you?' };

  // Each week, from the design's table. The questions' first is the one
  // the closing question scene asks; every one goes into the cohort's
  // question bank, ready to ask instead. Week 2's choices are real
  // commit messages: Archive Watch 2436f65, a805664, and b3249db, and
  // Bsky Dreams 25385f0.
  var WEEKS = {
    // Prep and week 1 follow the template's docs/research/curriculum/
    // 06-instructional-design.md, section 3 (Ben approved it on October
    // 7, 2026): a noticing log before week 1, then a problem from the
    // student's own life held to Ben's tests, conversations with real
    // people, and critique in the trio.
    prep: {
      template: 'questions',
      room: 'Show your app’s address on your phone, then read one line from your noticing log: a time you did something the long way because nothing helped.',
      watch: 'Anyone whose setup is still stuck, anyone who has not met their trio, and anyone who has not started a noticing log.',
      questions: [
        { kind: 'short', prompt: 'What is one thing you did the long way this week because nothing helped?' },
        { kind: 'scale', prompt: 'How ready do you feel to build?', points: 5, choices: ['Not yet', 'Ready'] }
      ]
    },
    1: {
      template: 'problem-tests',
      room: 'Read your problem statement aloud, then say what one conversation showed. Partners: be kind, specific, and helpful, and offer ideas as “Have you considered...?”',
      watch: 'A problem statement that names an app or a technology instead of a part of someone’s life, a problem no one else was asked about, and a why with no people in it.',
      questions: [
        { kind: 'short', prompt: 'What problem in your own life is worth building something for, and who else has it?' },
        { kind: 'choice', prompt: 'How do you know other people have your problem?', choices: ['Someone told me about a time it happened to them', 'I think so, but I have not asked yet', 'I am not sure anyone else has it'] },
        MUDDY
      ]
    },
    2: {
      template: 'prompt',
      room: 'Show one verb on both platforms, and one cell your eyes proved wrong.',
      watch: 'Play that is not being written down, and the same complaint sent three times.',
      questions: [
        { kind: 'multi', prompt: 'Which of these real commit messages is a round?', choices: [
          'UX round 7: sidebar selection, hero cleanup, detail focus lock, resume text',
          'UI round 6: remove title-height cap, remove BackChip, up-arrow dismisses Detail',
          'Last MVP updates',
          'Four real fixes: collection titles, sidebar flash, sidebar ghost text, up-from-related'
        ] },
        MUDDY
      ]
    },
    3: {
      template: 'prompt',
      room: 'Show the screenshot that proved a fix, and the look beside the template’s.',
      watch: '“It works” with no evidence, and a look borrowed from somewhere else.',
      questions: [
        { kind: 'short', prompt: 'How do you know your last fix is real?' },
        MUDDY
      ]
    },
    4: {
      template: 'moves',
      room: 'Show the app on someone else’s device, or tell us what they said.',
      watch: 'Anyone who has not published to another person yet.',
      questions: [
        { kind: 'rank', prompt: 'Put these in the order the other person noticed them.', choices: ['What it is for', 'How it looks', 'What it does', 'Something that broke'] },
        { kind: 'words', prompt: 'In a word, how did it feel to hand it over?' }
      ]
    },
    5: {
      template: 'questions',
      room: 'Explain every part of your app, even the parts the agent wrote.',
      watch: 'Whether each student can name what is enough, for now.',
      questions: [
        { kind: 'short', prompt: 'What waits for the next version?' },
        MUDDY
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
