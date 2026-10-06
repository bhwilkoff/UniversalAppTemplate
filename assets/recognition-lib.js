// Recognition for a skill shown in class (R16, migration 20261005050000;
// research/notes/active-learning-notes.md). A short list of skills a
// teacher can name in the moment, each tied to the principle it shows,
// or the teacher's own words, and the moment it happened. Never a score:
// nothing here counts, ranks, or compares people. Tested in
// tools/test/recognition-lib.test.mjs.
(function (root) {
  var SKILLS = [
    { key: 'own-values', label: 'Wrote down what they value', principle: 3 },
    { key: 'iterated', label: 'Took another round instead of shipping a first draft', principle: 4 },
    { key: 'found-sources', label: 'Found whose work they are building on', principle: 5 },
    { key: 'used-feedback', label: 'Asked for feedback and used it', principle: 6 },
    { key: 'tested-like-people', label: 'Tested it the way people will actually use it', principle: 7 },
    { key: 'shared-lessons', label: 'Shared what they learned', principle: 9 },
    { key: 'own-voice', label: 'Wrote it in their own voice', principle: 13 },
    { key: 'credited', label: 'Credited the people and tools behind it', principle: 14 },
    { key: 'explained-decision', label: 'Explained a decision their values made', principle: null },
    { key: 'helped-peer', label: 'Helped a classmate see their work more clearly', principle: null },
    { key: 'shipped', label: 'Got it onto someone else’s device', principle: null }
  ];
  function skill(key) { return SKILLS.filter(function (s) { return s.key === key; })[0] || null; }

  function clean(t, n) { t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) : t; }

  // The row to insert, or a reason it cannot be given yet.
  function row(o) {
    if (!o || !o.cohortId || !o.userId) return { why: 'Choose who showed it.' };
    var s = skill(o.key);
    var label = s ? s.label : clean(o.ownWords, 120);
    if (!label) return { why: 'Choose a skill, or write it in your own words.' };
    var moment = clean(o.moment, 300) || null;
    return { row: { cohort_id: o.cohortId, session_id: o.sessionId || null, user_id: o.userId, skill: label, skill_key: s ? s.key : null, moment: moment } };
  }

  // The moment, said for the student: "During <scene>, week N".
  function momentFor(sceneTitle, week) {
    var t = clean(sceneTitle, 120);
    return (t ? 'During “' + t + '”' : 'In class') + (week ? ', week ' + Number(week) : '');
  }

  // What the student reads, newest first.
  function lines(rows, nameOf) {
    return (rows || []).slice().sort(function (a, b) { return String(b.given_at).localeCompare(String(a.given_at)); }).map(function (r) {
      var s = r.skill_key ? skill(r.skill_key) : null;
      return {
        id: r.id, skill: r.skill, moment: r.moment || null, at: r.given_at,
        by: nameOf ? nameOf(r.given_by) : null,
        principle: s && s.principle ? s.principle : null
      };
    });
  }

  var lib = { SKILLS: SKILLS, skill: skill, row: row, momentFor: momentFor, lines: lines };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RecognitionLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
