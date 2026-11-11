// The room at a glance (R11, research/notes/active-learning-notes.md):
// who has the class open now, who has not yet, who has answered the
// question being asked, and the path stage each person chose to share.
// Built only from what the class channel's presence holds while the call
// runs and the answers the teacher can already read; nothing here is
// stored. Tested in tools/test/roster-lib.test.mjs.
(function (root) {
  var STAGE_IDS = ['setup', '00', '01', '02', '03', '04', '05', '06', '07', '08'];
  var STAGE_SHORT = { setup: 'Set up', '00': '00 Why', '01': '01 Prototype', '02': '02 Shape', '03': '03 Native', '04': '04 Seeing', '05': '05 Shipping', '06': '06 Running', '07': '07 Ceiling', '08': '08 AI' };
  // The full names, as each stage's own page has them, where there is room.
  var STAGE_NAMES = { setup: 'Getting set up', '00': '00 Why we build', '01': '01 The first prototype', '02': '02 The shape of an app', '03': '03 Going native', '04': '04 Seeing it work', '05': '05 Shipping', '06': '06 Keeping it running', '07': '07 Raising the ceiling', '08': '08 Working with AI' };
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
    // It knows open panels, not who is in the call (Week 2: people in the
    // call read as not here), so it says what it knows.
    var line = c.here + ' of ' + c.total + ' have Human Shaped open';
    if (asking) line += ', ' + c.answered + ' answered';
    if (c.sharing) line += ', ' + c.sharing + ' sharing their stage on the path';
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

  // Whom to feature next (a presenter part's config.feature, from courses
  // brought in from Course Builder). Random: anyone not featured yet this
  // session. Quiet: whoever has done least this session, by what the site
  // records (Ben, November 10, 2026: "someone who hasn't done any reactions
  // is an indicator, someone who hasn't shared anything yet is another"):
  // reactions and stances, answers, posts, the queue, and requests. Someone
  // already featured goes to the back. Ties go to chance. `pick` is a number
  // in [0, 1) for the chance, so tests can fix it.
  var SIGNALS = [['reactions', 'no reactions'], ['answers', 'no answers'], ['shares', 'nothing shared'], ['queue', 'not in the queue'], ['requests', 'no requests']];
  function toFeature(people, signals, mode, pick) {
    signals = signals || {};
    var r = pick == null ? Math.random() : pick;
    var list = (people || []).filter(function (p) { return p && p.id; });
    if (!list.length) return null;
    function n(kind, id) { return Number((signals[kind] || {})[id]) || 0; }
    var fresh = list.filter(function (p) { return !n('featured', p.id); });
    var pool = fresh.length ? fresh : list;
    if (mode !== 'quiet') { var who = pool[Math.floor(r * pool.length)]; return { id: who.id, name: who.name, why: [] }; }
    var scored = pool.map(function (p) {
      var total = SIGNALS.reduce(function (t, s) { return t + n(s[0], p.id); }, 0);
      return { p: p, total: total };
    });
    var least = Math.min.apply(null, scored.map(function (x) { return x.total; }));
    var quiet = scored.filter(function (x) { return x.total === least; });
    var chosen = quiet[Math.floor(r * quiet.length)].p;
    return { id: chosen.id, name: chosen.name, why: SIGNALS.filter(function (s) { return !n(s[0], chosen.id); }).map(function (s) { return s[1]; }) };
  }

  // Several at once (a step that features four people beside its poll): each
  // pick leaves the rest of the pool for the next. `picks` gives the chance for
  // each pick in turn, so tests can fix them.
  function toFeatureMany(people, signals, mode, count, picks) {
    var pool = (people || []).slice(), out = [];
    var n = Math.max(1, Math.min(8, Number(count) || 1));
    for (var i = 0; i < n && pool.length; i++) {
      var r = picks && picks[i] != null ? picks[i] : null;
      var one = toFeature(pool, signals, mode, r);
      if (!one) break;
      out.push(one);
      pool = pool.filter(function (p) { return p.id !== one.id; });
    }
    return out;
  }

  var lib = { STAGE_IDS: STAGE_IDS, STAGE_SHORT: STAGE_SHORT, STAGE_NAMES: STAGE_NAMES, isStage: isStage, roster: roster, askingNow: askingNow, summary: summary, pathView: pathView, toFeature: toFeature, toFeatureMany: toFeatureMany };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RosterLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
