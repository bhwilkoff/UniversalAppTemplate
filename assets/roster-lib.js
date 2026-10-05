// The room at a glance (R11, research/notes/active-learning-notes.md):
// who has the class open now, who has not yet, who has answered the
// question being asked, and the path stage each person chose to share.
// Built only from what the class channel's presence holds while the call
// runs and the answers the teacher can already read; nothing here is
// stored. Tested in tools/test/roster-lib.test.mjs.
(function (root) {
  var STAGE_IDS = ['setup', '00', '01', '02', '03', '04', '05', '06', '07', '08'];
  var STAGE_SHORT = { setup: 'Set up', '00': '00 Why', '01': '01 Prototype', '02': '02 Shape', '03': '03 Native', '04': '04 Seeing', '05': '05 Shipping', '06': '06 Running', '07': '07 Ceiling', '08': '08 AI' };
  function isStage(id) { return STAGE_IDS.indexOf(id) >= 0; }

  // people: [{ user_id, name }] (the cohort's students); presence: the
  // channel's presenceState(), keyed by user id; answers: live_answers
  // rows; checkId: the question being asked, or null.
  function roster(people, presence, answers, checkId) {
    presence = presence || {};
    var answered = {};
    (answers || []).forEach(function (a) { if (checkId && a.check_id === checkId) answered[a.user_id] = true; });
    var here = [], missing = [], byStage = {};
    STAGE_IDS.forEach(function (s) { byStage[s] = 0; });
    (people || []).forEach(function (p) {
      var pr = (presence[p.user_id] || [])[0] || null;
      var stage = pr && isStage(pr.stage) ? pr.stage : null;
      var row = { id: p.user_id, name: p.name || 'Someone', stage: stage, answered: !!answered[p.user_id] };
      if (pr) { here.push(row); if (stage) byStage[stage]++; }
      else missing.push(row);
    });
    function byName(a, b) { return a.name.localeCompare(b.name); }
    here.sort(byName); missing.sort(byName);
    var answeredHere = here.filter(function (r) { return r.answered; }).length;
    var answeredAll = (people || []).filter(function (p) { return answered[p.user_id]; }).length;
    return {
      here: here, missing: missing, byStage: byStage,
      counts: { here: here.length, total: (people || []).length, answered: answeredAll, answeredHere: answeredHere, sharing: here.filter(function (r) { return r.stage; }).length }
    };
  }

  // The question to count answers for: the one on the main stage, else
  // the newest open one.
  function askingNow(checks, onStage) {
    if (onStage && onStage.kind === 'check') return onStage.id;
    var open = (checks || []).filter(function (k) { return k.state === 'open'; });
    return open.length ? open[0].id : null;
  }

  // The one-line summary at the top of the teacher's roster.
  function summary(r, asking) {
    var c = r.counts;
    var line = c.here + ' of ' + c.total + ' here';
    if (asking) line += ', ' + c.answered + ' answered';
    if (c.sharing) line += ', ' + c.sharing + ' sharing where they are';
    return line + '.';
  }

  // What the main stage shows of the path (no names): how many people
  // said they are at each stage.
  function pathView(r) {
    var rows = STAGE_IDS.map(function (s) { return { stage: s, label: STAGE_SHORT[s], count: r.byStage[s] || 0 }; });
    var max = rows.reduce(function (m, x) { return Math.max(m, x.count); }, 0);
    rows.forEach(function (x) { x.share = max ? Math.round(100 * x.count / max) : 0; });
    return { rows: rows, sharing: r.counts.sharing };
  }

  var lib = { STAGE_IDS: STAGE_IDS, STAGE_SHORT: STAGE_SHORT, isStage: isStage, roster: roster, askingNow: askingNow, summary: summary, pathView: pathView };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RosterLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
