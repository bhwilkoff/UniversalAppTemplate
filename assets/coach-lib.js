// Showing people around the add-on (Ben, November 12, 2026: "almost no one
// has used a Google Meet add-on and therefore they have no idea what is
// possible, where they should look, or what they should focus upon ... we do
// need to orient folks so that they can get the most out of the tools").
//
// A short tour the first time a panel opens, pointing at the real panel and
// stage one place at a time, and a one-line hint the first time something new
// appears (pull, not push: research/notes/addon-onboarding-research.md). The
// panel decides everything here; its stage only draws what it is told.
// Words by Claude, awaiting Ben's review. Tested in tools/test/coach-lib.test.mjs.
(function (root) {
  // where: which frame draws the step. target: a name each frame resolves.
  var TOURS = {
    learner: [
      { key: 'stage', where: 'stage', target: 'stage', text: 'A live class, not only a call: your leader moves this screen for everyone, and you can click what is on it.' },
      { key: 'reacts', where: 'stage', target: 'reacts', text: 'React, or ask your leader something, here at any time, without unmuting.' },
      { key: 'asks', where: 'panel', target: 'asks', text: 'Ask your leader a question here at any time. Only your leader sees it.' },
      { key: 'app', where: 'panel', target: 'yourapp', text: 'When it is your turn, show your app to everyone here, or open a classmate’s app on your own screen.' }
    ],
    leader: [
      { key: 'now', where: 'panel', target: 'tab:now', text: 'Now is the part that is happening, with your notes for it. Learners never see your notes.' },
      { key: 'next', where: 'panel', target: 'next', text: 'Next moves everyone’s stage: the next slide, then the next part.', closed: 'Until the main stage is open, this button opens it. Then it moves everyone: the next slide, then the next part.' },
      { key: 'plan', where: 'panel', target: 'tab:plan', text: 'Plan is the whole session. Go takes everyone to any part.' },
      { key: 'tools', where: 'panel', target: 'tab:tools', text: 'Tools put things on the stage: a question, someone’s app, the board, or rooms.' }
    ]
  };

  // The first time each of these appears for this person.
  var HINTS = {
    question: { where: 'stage', target: 'choices', text: 'Click your answer right here, or in your panel. You can change it until the question closes.' },
    write: { where: 'stage', target: 'write', text: 'Type your answer right here, or in your panel.' },
    app: { where: 'stage', target: 'app', text: 'This is a working app. Click inside it to try it: only you see what you click.' },
    room: { where: 'panel', target: 'room', text: 'Your room is its own Meet call. Join it here, and Human Shaped opens there with you.' },
    show: { where: 'panel', target: 'show', text: 'This shows your app to everyone while you talk about it.' },
    openstage: { where: 'panel', target: 'openstage', text: 'Open the main stage, and everyone who joins the activity sees the class.' },
    // Meet tells nobody an activity started beyond a banner that shrinks to
    // an icon in seconds (measured, November 12, 2026), so the leader says it.
    tell: { where: 'panel', target: 'stageline', text: 'Tell everyone: the Human Shaped icon at the top right of Meet, then Join activity (or Install and join, the first time).' },
    cue: { where: 'panel', target: 'stageline', text: 'People new to Human Shaped now see a one-line hint on their own stage. Say it aloud too, the first time.' }
  };

  var STORE = 'hs-coach-3';
  function read(store) {
    try { var v = JSON.parse(store.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function seen(store, key) { return read(store).indexOf(key) >= 0; }
  function mark(store, key) {
    var v = read(store);
    if (v.indexOf(key) >= 0) return;
    v.push(key);
    try { store.setItem(STORE, JSON.stringify(v.slice(-60))); } catch (e) {}
  }
  function forget(store) { try { store.removeItem(STORE); } catch (e) {} }

  // The tour's steps for this role. Stage steps wait for an open stage: they
  // are left for later, and run on their own once the stage opens.
  function tour(role, stageOn) {
    var all = TOURS[role === 'leader' ? 'leader' : 'learner'];
    return { now: all.filter(function (s) { return stageOn || s.where !== 'stage'; }), later: stageOn ? [] : all.filter(function (s) { return s.where === 'stage'; }) };
  }

  // Which hint is due now, from what this person can see. One at a time; none
  // while a tour runs. `s`: { teaching, view, roomJoin, showMine, openStage, stageOn }.
  function due(s, store) {
    var v = s.view || {};
    var want = [];
    if (s.teaching) {
      if (s.openStage && !s.stageOn) want.push('openstage');
      if (s.stageOn) want.push('tell');
      if (s.stageOn && (v.mode === 'check' || v.mode === 'apps' || v.mode === 'app')) want.push('cue');
    } else {
      if (s.roomJoin) want.push('room');
      if (s.showMine) want.push('show');
      if (s.stageOn && v.mode === 'check' && v.answerable && !hasMine(v)) want.push(v.kind === 'short' || v.kind === 'words' ? 'write' : 'question');
      if (s.stageOn && (v.mode === 'apps' || v.mode === 'app')) want.push('app');
    }
    for (var i = 0; i < want.length; i++) if (!seen(store, 'hint:' + want[i])) return want[i];
    return null;
  }
  function hasMine(v) { var m = v.mine; return !!(m && (m.choice != null || (m.picks || []).length || m.body)); }

  // The message a panel sends its own stage, and how the stage reads it back.
  var TYPE = 'hs-stage-coach';
  function message(step) {
    if (!step) return JSON.stringify({ type: TYPE, hide: true });
    return JSON.stringify({ type: TYPE, show: { target: String(step.target), text: String(step.text).slice(0, 300), n: step.n || 0, of: step.of || 0, label: step.label === 'Next' ? 'Next' : 'Got it' } });
  }
  function readMessage(payload) {
    try {
      var m = JSON.parse(payload);
      if (!m || m.type !== TYPE) return null;
      if (m.hide) return { hide: true };
      var s = m.show || {};
      if (typeof s.target !== 'string' || typeof s.text !== 'string') return null;
      return { show: { target: s.target.slice(0, 40), text: s.text.slice(0, 300), n: Number(s.n) || 0, of: Number(s.of) || 0, label: s.label === 'Next' ? 'Next' : 'Got it' } };
    } catch (e) { return null; }
  }

  var lib = { TOURS: TOURS, HINTS: HINTS, STORE: STORE, seen: seen, mark: mark, forget: forget, tour: tour, due: due, message: message, readMessage: readMessage };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CoachLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
