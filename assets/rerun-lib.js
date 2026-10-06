// The rerun (R17, migration 20261006010000;
// research/notes/active-learning-notes.md): ask a question, let the class
// talk, ask it again, and see how the answers moved. The main stage shows
// the first answers as a faint bar under the second (counts, no names);
// the teacher alone sees who changed, to ask them why. Tested in
// tools/test/rerun-lib.test.mjs.
(function (root) {
  var KINDS = ['choice', 'multi', 'scale', 'rank'];
  function canRerun(kind) { return KINDS.indexOf(kind) >= 0; }

  // The same question again, unanswered and with its count hidden.
  function againRow(check, ids) {
    return {
      cohort_id: ids.cohortId, session_id: ids.sessionId, created_by: ids.me,
      prompt: check.prompt, choices: check.choices || null, kind: check.kind || null, points: check.points || null,
      show_tally: false, rerun_of: check.id
    };
  }

  // Who answered both times, and who changed. answerText(check, answer)
  // is LiveLib.answerText, so "changed" means the answer reads differently.
  function changes(first, second, firstAnswers, secondAnswers, answerText) {
    var before = {};
    (firstAnswers || []).forEach(function (a) { if (a.check_id === first.id) before[a.user_id] = answerText(first, a); });
    var out = { changed: [], same: 0, both: 0 };
    (secondAnswers || []).forEach(function (a) {
      if (a.check_id !== second.id || !(a.user_id in before)) return;
      var from = before[a.user_id], to = answerText(second, a);
      if (from == null || to == null) return;
      out.both++;
      if (from === to) out.same++;
      else out.changed.push({ user_id: a.user_id, from: from, to: to });
    });
    return out;
  }
  function changesLine(c) {
    if (!c.both) return 'No one has answered both times yet.';
    return c.changed.length + ' of ' + c.both + ' who answered both times changed their answer.';
  }

  // Each bar of the second results with the first results' share beside
  // it, matched by label (a ranking's rows are sorted, so never by place).
  function withBefore(rows, firstRows) {
    var share = {};
    (firstRows || []).forEach(function (r) { share[r.label] = r.share; });
    return (rows || []).map(function (r) { return Object.assign({}, r, { before: r.label in share ? share[r.label] : null }); });
  }

  var lib = { KINDS: KINDS, canRerun: canRerun, againRow: againRow, changes: changes, changesLine: changesLine, withBefore: withBefore };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RerunLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
