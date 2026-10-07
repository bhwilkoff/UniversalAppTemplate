// What the site needs to know about the course's shape (curriculum C7),
// so the pages that show it agree: each week's lead move and question
// (the template's COURSE.md and docs/research/curriculum/00-curriculum-
// design.md, "The arc"), the stuck library's pages and their addresses
// here (docs/stuck/), and the "Stuck?" link a student sees for the week
// they are in. Write, play, publish is the only loop; a week leads with
// one of the three moves and makes all three. Tested in
// tools/test/curriculum-pages-lib.test.mjs.
(function (root) {
  // Each week's move and question, in the course's own words (COURSE.md's
  // week table, October 7, 2026), with the stages it starts and the ones
  // shown at its session.
  var WEEKS = [
    { week: 0, name: 'Cohort Prep', lead: 'Publish', move: 'publishing', question: 'What do I need in order to build at all?', starts: ['setup'], shows: [] },
    { week: 1, name: 'Week 1', lead: 'Write', move: 'writing', question: 'What problem in my own life is worth building something for, and who else has it?', starts: ['00', '01'], shows: [] },
    { week: 2, name: 'Week 2', lead: 'Play', move: 'playing', question: 'What has to be the same on every device, and what should feel as if it was born there?', starts: ['02', '03'], shows: ['00', '01'] },
    { week: 3, name: 'Week 3', lead: 'Play, then publish', move: 'playing', question: 'How do I know it works, and what happens when someone I did not build it with holds it?', starts: ['04', '05'], shows: ['02', '03'] },
    { week: 4, name: 'Week 4', lead: 'Publish, then write', move: 'publishing', question: 'What is happening to it when I am not holding it, and what do I want now that I live with it?', starts: ['06', '07'], shows: ['04', '05'] },
    { week: 5, name: 'Week 5', lead: 'Publish', move: 'publishing', question: 'Is this version enough for its people, and what should the next builder not have to learn?', starts: ['08'], shows: ['06', '07'] }
  ];

  var MOVES = {
    writing: { name: 'Stuck writing', url: '/stuck/writing/' },
    playing: { name: 'Stuck playing', url: '/stuck/playing/' },
    publishing: { name: 'Stuck publishing', url: '/stuck/publishing/' }
  };

  // Every page of the library, its file in the template, and its page here.
  var STUCK = [
    { doc: 'docs/stuck/README.md', url: '/stuck/', title: 'When you are stuck', move: null },
    { doc: 'docs/stuck/writing/README.md', url: '/stuck/writing/', title: 'Stuck writing', move: 'writing' },
    { doc: 'docs/stuck/writing/find-a-problem.md', url: '/stuck/writing/find-a-problem/', title: 'I cannot find a problem worth building for', move: 'writing' },
    { doc: 'docs/stuck/writing/what-it-refuses.md', url: '/stuck/writing/what-it-refuses/', title: 'I cannot say what it refuses to do', move: 'writing' },
    { doc: 'docs/stuck/writing/what-next.md', url: '/stuck/writing/what-next/', title: 'I do not know what I want it to do next', move: 'writing' },
    { doc: 'docs/stuck/playing/README.md', url: '/stuck/playing/', title: 'Stuck playing', move: 'playing' },
    { doc: 'docs/stuck/playing/cannot-see-the-fix.md', url: '/stuck/playing/cannot-see-the-fix/', title: 'The agent fixes what I cannot see', move: 'playing' },
    { doc: 'docs/stuck/playing/same-bug.md', url: '/stuck/playing/same-bug/', title: 'The same bug keeps coming back', move: 'playing' },
    { doc: 'docs/stuck/playing/not-enough-data.md', url: '/stuck/playing/not-enough-data/', title: 'There is not enough real data', move: 'playing' },
    { doc: 'docs/stuck/playing/feels-wrong.md', url: '/stuck/playing/feels-wrong/', title: 'It works, and it still feels wrong', move: 'playing' },
    { doc: 'docs/stuck/playing/agent-stops.md', url: '/stuck/playing/agent-stops/', title: 'The agent keeps stopping', move: 'playing' },
    { doc: 'docs/stuck/playing/tools-stuck.md', url: '/stuck/playing/tools-stuck/', title: 'The tools themselves are stuck', move: 'playing' },
    { doc: 'docs/stuck/publishing/README.md', url: '/stuck/publishing/', title: 'Stuck publishing', move: 'publishing' },
    { doc: 'docs/stuck/publishing/not-ready.md', url: '/stuck/publishing/not-ready/', title: 'I am not ready to show anyone', move: 'publishing' },
    { doc: 'docs/stuck/publishing/someone-elses-device.md', url: '/stuck/publishing/someone-elses-device/', title: 'I cannot get it onto someone else’s device', move: 'publishing' },
    { doc: 'docs/stuck/publishing/when-is-it-enough.md', url: '/stuck/publishing/when-is-it-enough/', title: 'I do not know when it is enough', move: 'publishing' },
    { doc: 'docs/stuck/publishing/life.md', url: '/stuck/publishing/life/', title: 'Life got in the way this week', move: 'publishing' }
  ];

  // The library's files mapped to their pages, for render.js's SITE map.
  function stuckSiteMap() {
    var out = { 'docs/stuck/': '/stuck/' };
    STUCK.forEach(function (p) { out[p.doc] = p.url; });
    ['writing', 'playing', 'publishing'].forEach(function (m) { out['docs/stuck/' + m + '/'] = MOVES[m].url; });
    return out;
  }

  // A cohort's week from its session number: 0 is Cohort Prep, 1 to 5 the
  // weeks, anything else (or nothing) has no week of the course.
  function weekOf(n) {
    var k = Number(n);
    if (n === null || n === undefined || n === '' || !isFinite(k)) return null;
    return WEEKS.filter(function (w) { return w.week === k; })[0] || null;
  }

  // The "Stuck?" link for a week: the library page for the move the week
  // leads with, or the whole library when the week is not known.
  function stuckFor(n) {
    var w = weekOf(n);
    if (!w) return { url: '/stuck/', label: 'When you are stuck', move: null };
    var m = MOVES[w.move];
    return { url: m.url, label: m.name, move: w.move, lead: w.lead };
  }

  // "The question." opening a stage's paragraph, as the lesson page
  // template writes it (docs/templates/LESSON-template.md).
  function isQuestionLabel(text) {
    return /^the question\.?$/i.test(String(text || '').replace(/\s+/g, ' ').trim());
  }

  var lib = { WEEKS: WEEKS, MOVES: MOVES, STUCK: STUCK, stuckSiteMap: stuckSiteMap, weekOf: weekOf, stuckFor: stuckFor, isQuestionLabel: isQuestionLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CurriculumPagesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
