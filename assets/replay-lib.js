// A session's moments on one timeline beside its recording, so a person can
// return to a moment and watch it again. Every row carries the second of
// the recording it opens. What the add-on kept by the clock is placed by
// the recording's start; talk and words already count from the recording.
// Facts only: rows are in time order, never ordered by person or amount.
// No page, no network. Tested in tools/test/replay-lib.test.mjs.
(function (root) {
  function ms(x) { return new Date(x).getTime(); }

  // The second of the recording a clock time falls on, or null when the
  // recording's start is not known or the moment is outside it.
  function second(at, startedAt, length) {
    if (!startedAt || !at) return null;
    var s = Math.floor((ms(at) - ms(startedAt)) / 1000);
    if (!isFinite(s) || s < 0) return null;
    if (length && s > length) return null;
    return s;
  }

  // When the recording began, from a moment whose clock time is known and
  // the second the video shows it at.
  function startFrom(at, seconds) {
    return new Date(ms(at) - Math.round(seconds * 1000)).toISOString();
  }

  // One person's talk turns joined while the gaps are short, so a stretch
  // of talking is one row rather than a row per breath.
  function stretches(talk, gap) {
    var g = gap == null ? 8 : gap;
    var list = (talk || []).slice().sort(function (a, b) { return a.started_s - b.started_s; });
    var out = [], open = {};
    list.forEach(function (t) {
      var key = t.user_id || ('name:' + (t.name || ''));
      var o = open[key];
      if (o && t.started_s - o.ended_s <= g) { o.ended_s = Math.max(o.ended_s, t.ended_s); return; }
      o = { user_id: t.user_id || null, name: t.name || null, started_s: t.started_s, ended_s: t.ended_s };
      open[key] = o; out.push(o);
    });
    return out.sort(function (a, b) { return a.started_s - b.started_s; });
  }

  // Every row the reader may see, in recording order. input:
  //   startedAt, length      the recording's start (ISO) and seconds
  //   events                 session_events (stage, reaction)
  //   sceneTitle(id)         a part's title from its scene id
  //   checks, answers        live_checks and live_answers, and
  //   answerText(check, a)   an answer as words
  //   queue                  live_queue (shown_at)
  //   talk                   session_talk
  //   marks                  session_marks (the reader's own)
  //   feedback               moment_feedback the reader can see
  //   nameOf(id)             a person's name, or null when not the reader's to see
  function rows(input) {
    var start = input.startedAt || null, len = input.length || null;
    var nameOf = input.nameOf || function () { return null; };
    var out = [];
    function put(s, kind, user, text, extra) {
      if (s == null) return;
      var r = { s: s, kind: kind, user_id: user || null, text: text };
      if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
      out.push(r);
    }
    // A part starts when the stage moves to a different scene; showing a
    // part's answers or slides inside it is not a new part.
    var last = null, sceneTitle = input.sceneTitle || function () { return null; };
    var bursts = {};
    (input.events || []).slice().sort(function (a, b) { return ms(a.at) - ms(b.at); }).forEach(function (e) {
      var s = second(e.at, start, len);
      if (e.kind === 'stage') {
        var m = /^scene:(.+)$/.exec(String(e.detail || ''));
        if (!m || m[1] === last) return;
        last = m[1];
        put(s, 'part', null, sceneTitle(m[1]) || 'A part');
      } else if (e.kind === 'reaction' && e.detail && s != null) {
        // Reactions arrive in bursts, so each half minute is one row.
        var w = Math.floor(s / 30) * 30;
        var b = bursts[w] || (bursts[w] = { s: s, counts: {}, order: [] });
        if (!b.counts[e.detail]) { b.counts[e.detail] = 0; b.order.push(e.detail); }
        b.counts[e.detail]++;
      }
    });
    Object.keys(bursts).forEach(function (w) {
      var b = bursts[w];
      put(b.s, 'reaction', null, '', { counts: b.order.map(function (id) { return [id, b.counts[id]]; }) });
    });
    var asked = {}, checkOf = {};
    var answerText = input.answerText || function (k, a) { return a.body || ''; };
    (input.checks || []).forEach(function (k) {
      asked[k.id] = k.prompt; checkOf[k.id] = k;
      put(second(k.created_at, start, len), 'question', null, k.prompt || 'A question');
    });
    (input.answers || []).forEach(function (a) {
      if (!(a.check_id in asked)) return;
      put(second(a.created_at, start, len), 'answer', a.user_id, answerText(checkOf[a.check_id], a), { question: asked[a.check_id] });
    });
    (input.queue || []).forEach(function (q) {
      if (q.shown_at) put(second(q.shown_at, start, len), 'shown', q.user_id, q.note || '');
    });
    stretches(input.talk).forEach(function (t) {
      put(t.started_s, 'talk', t.user_id, '', { until: t.ended_s, name: t.user_id ? null : t.name });
    });
    (input.marks || []).forEach(function (m) {
      put(second(m.at, start, len), 'mark', m.user_id, m.word || '', { id: m.id });
    });
    (input.feedback || []).forEach(function (f) {
      if (f.at_s != null) put(f.at_s, 'feedback', f.learner_id, f.body, { id: f.id, shared: !!f.shared_at, author_id: f.author_id });
    });
    var order = { part: 0, question: 1, mark: 2, feedback: 3, talk: 4, answer: 5, shown: 6, reaction: 7 };
    return out.filter(function (r) { return !r.user_id || nameOf(r.user_id) != null || r.kind === 'mark'; })
      .sort(function (a, b) { return a.s - b.s || order[a.kind] - order[b.kind]; });
  }

  // The rows one view shows: everything, or one kind of moment, and for a
  // leader, one person's moments with the parts and questions around them.
  var VIEWS = {
    all: null,
    parts: ['part', 'question'],
    talk: ['part', 'talk'],
    mine: ['part', 'mark', 'feedback']
  };
  function view(list, which, person) {
    var kinds = VIEWS[which] || null;
    return (list || []).filter(function (r) {
      if (kinds && kinds.indexOf(r.kind) < 0) return false;
      if (person && r.user_id && r.user_id !== person) return false;
      return true;
    });
  }

  // Each person's seconds of talk in a session's recording.
  function talkBy(talk) {
    var by = {};
    (talk || []).forEach(function (t) {
      var k = t.user_id || '';
      by[k] = (by[k] || 0) + (t.ended_s - t.started_s);
    });
    return by;
  }

  // A leader's own share of the talking in a recording, as a whole percent,
  // or null when too little was recorded to say (under two minutes).
  function share(talk, userId) {
    var by = talkBy(talk), all = 0;
    Object.keys(by).forEach(function (k) { all += by[k]; });
    if (all < 120) return null;
    return Math.round(100 * (by[userId] || 0) / all);
  }

  var api = { second: second, startFrom: startFrom, stretches: stretches, rows: rows, view: view, VIEWS: VIEWS, talkBy: talkBy, share: share };
  root.ReplayLib = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
