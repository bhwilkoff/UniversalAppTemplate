// Seeds a cohort's weeks with the course's plan (curriculum milestone
// C6): each session that has no run of show yet gets its week's scenes,
// the teacher's note on what to watch for, and the week's prepared
// questions in the cohort's question bank. The plan comes from the
// template's published docs/teaching/runs-of-show.json when it can be
// read and fits, and otherwise from CurriculumLib's own defaults. It
// never touches a session that already has scenes, and never adds a
// question the bank already has, so making the sessions again is safe.
// Uses ShowLib, CurriculumLib, CohortLib, and LiveLib when the page has
// them. Words by Claude, awaiting Ben's review.
(function () {
  var published = null;

  function loadPublished() {
    if (published) return published;
    var C = window.CurriculumLib;
    published = fetch(C.SOURCE, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return published;
  }

  function context(cohort) {
    return {
      agenda: window.CohortLib ? window.CohortLib.agenda(cohort.session_minutes) : [],
      turn: window.LiveLib ? window.LiveLib.TURN : []
    };
  }

  // One session. Resolves to { from, scenes, questions } when it seeded,
  // { skipped: true } when the session already has a run of show or its
  // week has no plan, or { error } with the database's words.
  function seedSession(db, cohort, session) {
    var C = window.CurriculumLib, SL = window.ShowLib;
    if (!C || !SL) return Promise.resolve({ skipped: true });
    var week = C.weekOf(session.number);
    if (week == null) return Promise.resolve({ skipped: true });
    return db.from('scenes').select('id').eq('session_id', session.id).limit(1).then(function (have) {
      if (have.error) return { error: have.error.message };
      if ((have.data || []).length) return { skipped: true };
      return loadPublished().then(function (data) {
        var ctx = context(cohort);
        var plan = C.plan(week, ctx.agenda, ctx.turn, SL, data);
        if (!plan) return { skipped: true };
        var rows = plan.scenes.map(function (s, i) {
          return { cohort_id: cohort.id, session_id: session.id, position: i, kind: s.kind, title: s.title, minutes: s.minutes, body: s.body || null, config: s.config };
        });
        return db.from('scenes').insert(rows).select('id, position').then(function (r) {
          if (r.error) return { error: r.error.message };
          var byPos = {};
          (r.data || []).forEach(function (x) { byPos[x.position] = x.id; });
          var notes = plan.scenes.map(function (s, i) {
            return s.note && byPos[i] ? { scene_id: byPos[i], cohort_id: cohort.id, body: s.note } : null;
          }).filter(Boolean);
          var noted = notes.length ? db.from('scene_notes').upsert(notes, { onConflict: 'scene_id' }) : Promise.resolve({});
          return noted.then(function () { return seedQuestions(db, cohort, plan.questions); })
            .then(function (added) { return { from: plan.from, scenes: rows.length, questions: added }; });
        });
      });
    });
  }

  // The week's prepared questions, in the cohort's own bank. A bank the
  // database does not have yet, or a refusal, adds nothing and says
  // nothing: the run of show still has its question scene.
  function seedQuestions(db, cohort, wanted) {
    var C = window.CurriculumLib;
    if (!wanted || !wanted.length) return Promise.resolve(0);
    return db.from('questions').select('kind, prompt').eq('cohort_id', cohort.id).then(function (r) {
      if (r.error) return 0;
      var add = C.newQuestions(wanted, r.data).map(function (q) {
        return { cohort_id: cohort.id, kind: q.kind, prompt: q.prompt, choices: q.choices, points: q.points };
      });
      if (!add.length) return 0;
      return db.from('questions').insert(add).then(function (ins) { return ins.error ? 0 : add.length; });
    });
  }

  // Every session of a cohort, one after another, so their questions
  // are compared against a bank that already has the last week's.
  function seedAll(db, cohort, sessions) {
    var done = { scenes: 0, weeks: 0, questions: 0, errors: [] };
    return (sessions || []).slice().sort(function (a, b) { return a.number - b.number; }).reduce(function (p, s) {
      return p.then(function () {
        return seedSession(db, cohort, s).then(function (r) {
          if (r.error) done.errors.push('week ' + s.number + ': ' + r.error);
          else if (!r.skipped) { done.weeks++; done.scenes += r.scenes; done.questions += r.questions; }
        });
      });
    }, Promise.resolve()).then(function () { return done; });
  }

  window.CurriculumSeed = { loadPublished: loadPublished, seedSession: seedSession, seedAll: seedAll };
})();
