// Pure helpers for the cohort page, tested in tools/test/cohort-lib.test.mjs.
(function (root) {
  // The week the cohort is in: the most recent session that has started,
  // or the first one if none has. "next" is the first session still to
  // come (a session counts as still to come until it has ended).
  function currentAndNext(sessions, now, minutes) {
    var sorted = sessions.filter(function (s) { return s.starts_at; })
      .slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var length = (minutes || 75) * 60000;
    var t = now.getTime();
    var started = sorted.filter(function (s) { return Date.parse(s.starts_at) <= t; });
    var upcoming = sorted.filter(function (s) { return Date.parse(s.starts_at) + length > t; });
    return {
      current: started.length ? started[started.length - 1] : (sorted[0] || null),
      next: upcoming[0] || null,
      live: !!(upcoming[0] && Date.parse(upcoming[0].starts_at) <= t)
    };
  }

  // A commit as a person reads it: the first line of its message, cut to
  // a sensible length, and how long ago it happened.
  function commitLine(message) {
    var first = String(message || '').split('\n')[0].trim();
    return first.length > 90 ? first.slice(0, 87).trimEnd() + '…' : first;
  }

  function ago(iso, now) {
    var s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
    if (s < 90) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' minutes ago';
    var h = Math.round(m / 60); if (h < 36) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago');
    var w = Math.round(d / 7); return w + ' weeks ago';
  }

  function repoPath(text) {
    var m = String(text || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '')
      .match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
    return m ? m[1] + '/' + m[2] : null;
  }

  // The live session's agenda, from the session shape Ben adopted from the
  // teaching research (research/notes/facilitation-assessment-social-
  // learning-notes.md, 6.1): arrive, show what you brought back in your
  // group, one decision your values changed, read one real prompt trying
  // first, and start, then check. Built for 75 minutes and scaled to the
  // cohort's own session length. The page finds its tools by each part's
  // key, never by its name or place, so the names, minutes, and order can
  // change here alone (COURSE.md is the source; awaiting Ben's review).
  // The six parts of every session and the break between them, as
  // COURSE.md and docs/teaching/README.md in the template describe them,
  // with that guide's minutes for 75. Sessions of an hour or less drop
  // the break, as the guide says.
  var PARTS = [
    { key: 'arrive', name: 'Arrive', minutes: 7, what: 'One line each in the chat: what you shipped this week, or where you are stuck. Then your teacher says what they read in last week\u2019s checks, and what they changed because of it. Cameras are welcome, and never required.' },
    { key: 'show', name: 'Show what you brought back', minutes: 25, what: 'In your group of three, about eight minutes each: say what you want to know, show it on the real device, and explain one decision with the agent closed. Partners ask one clarifying question, then answer three: where is it going, how is it going, and what is next. End by saying what you will do next, and whether the stage is ready or not yet.' },
    { key: 'break', name: 'A short break', minutes: 3, what: 'Stretch, refill, and come back to the main session.' },
    { key: 'value', name: 'One value at work', minutes: 6, what: 'Back together, one person shares a decision their values changed this week and what it cost them, and your teacher names one thing they heard across the groups.' },
    { key: 'prompt', name: 'Read one real prompt, trying first', minutes: 22, what: 'Write the prompt you would send for the situation on screen, compare it with a partner, and then see the real one and talk about the difference.' },
    { key: 'start', name: 'Start', minutes: 9, what: 'Send this week\u2019s first prompt to your agent before you leave, with a room open for anyone who is stuck.' },
    { key: 'check', name: 'Check for understanding', minutes: 3, what: 'Answer your teacher\u2019s two questions privately, on this page: this week\u2019s question, and what is still muddy.' }
  ];
  function agenda(minutes, parts) {
    parts = parts || PARTS;
    if (minutes && minutes <= 60) parts = parts.filter(function (p) { return p.key !== 'break'; });
    var total = parts.reduce(function (n, p) { return n + p.minutes; }, 0);
    var want = minutes || total, scale = want / total, start = 0;
    return parts.map(function (p, i) {
      var len = i === parts.length - 1 ? Math.max(1, Math.round(want - start)) : Math.max(1, Math.round(p.minutes * scale));
      var part = { key: p.key, name: p.name, start: start, minutes: len, what: p.what };
      start += len;
      return part;
    });
  }

  // Which part of the session it is, from the clock: the first part from
  // an hour before the start (people arrive early), each part in its
  // minutes, and none once the session is over or more than an hour away.
  // A part someone started a timer for wins over the clock, because
  // sessions run late and the room knows where it is better than a clock.
  function partNow(parts, startsAt, now, chosenKey) {
    if (chosenKey) {
      var chosen = parts.filter(function (p) { return p.key === chosenKey; })[0];
      if (chosen) return chosen;
    }
    if (!startsAt || !parts.length) return null;
    var m = (now.getTime() - Date.parse(startsAt)) / 60000;
    if (m < -60) return null;
    if (m < 0) return parts[0];
    for (var i = 0; i < parts.length; i++) {
      if (m < parts[i].start + parts[i].minutes) return parts[i];
    }
    return null;
  }

  // Which stages of the path each week covers (COURSE.md, five weeks).
  var WEEK_STAGES = { 1: ['00', '01'], 2: ['02', '03'], 3: ['04'], 4: ['05', '06'], 5: ['07', '08'] };
  function stagesForWeek(n) { return WEEK_STAGES[n] || []; }

  // Each stage's file in the template, read live the way render.js does.
  var STAGE_FILES = {
    '00': 'docs/path/00-why-we-build.md', '01': 'docs/path/01-first-prototype.md',
    '02': 'docs/path/02-shape-of-an-app.md', '03': 'docs/path/03-going-native.md',
    '04': 'docs/path/04-seeing-it-work.md', '05': 'docs/path/05-shipping.md',
    '06': 'docs/path/06-keeping-it-running.md', '07': 'docs/path/07-raising-the-ceiling.md',
    '08': 'docs/path/08-working-with-ai.md'
  };
  function stageFile(n) { return STAGE_FILES[n] || null; }

  // A stage's bar: the first sentence of its "When you are ready to move
  // on" paragraph, as plain words. The rest of that paragraph points at
  // the next stage, which is not part of the bar. Null when a stage has
  // none (stage 08 does not, today).
  function readyBar(markdown) {
    var lines = String(markdown || '').split('\n');
    var at = -1;
    for (var i = 0; i < lines.length; i++) { if (/^\*\*When you are ready to move on,\*\*/.test(lines[i])) { at = i; break; } }
    if (at < 0) return null;
    var para = [];
    for (var j = at; j < lines.length && lines[j].trim(); j++) para.push(lines[j].trim());
    var text = para.join(' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ');
    var end = text.search(/\.(\s|$)/);
    return end < 0 ? text : text.slice(0, end + 1);
  }

  // How a bring-back's mark reads, in the builder's own terms. Never a
  // score: ready, or not yet with what is missing, or nothing at all.
  function readinessText(share, isMine) {
    if (!share || !share.readiness) return null;
    if (share.readiness === 'ready') return isMine ? 'You marked it ready to move on.' : 'Ready to move on, by their own reading.';
    return (isMine ? 'You marked it not yet' : 'Not yet, by their own reading') + (share.missing ? ': ' + share.missing : '.');
  }

  // Who saw it working on a device, as one line with names.
  function seenText(names) {
    if (!names || !names.length) return null;
    var list = names.length < 3 ? names.join(' and ') : names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
    return 'Seen working on a device by ' + list + '.';
  }

  // Whether this person may confirm a bring-back: it is marked ready, it
  // is not theirs, and they are in a group with its builder or teach the
  // cohort (the database checks the same, in private.can_confirm).
  function canConfirm(share, meId, partnerIds, teaching) {
    if (!share || share.kind !== 'bring-back' || share.readiness !== 'ready' || share.user_id === meId) return false;
    return !!teaching || (partnerIds || []).indexOf(share.user_id) >= 0;
  }

  // The people in my groups in this cohort, not counting me.
  function partnersOf(meId, groups) {
    var out = [];
    (groups || []).forEach(function (g) {
      var ids = (g.group_members || []).map(function (m) { return m.user_id; });
      if (ids.indexOf(meId) < 0) return;
      ids.forEach(function (id) { if (id !== meId && out.indexOf(id) < 0) out.push(id); });
    });
    return out;
  }

  // The steps a new member takes before week 1, each one's state read
  // from what the hub already knows, so nobody ticks a box by hand.
  // "unknown" means the hub cannot see it (a connected agent lives with
  // the person, not here), so it is offered as a link and never marked.
  function setupSteps(mine, access, cohort) {
    var steps = [
      { key: 'setup', label: 'Read Getting set up, and make your own copy of the template', href: '/path/setup/', done: !!(mine && mine.app_repo) },
      { key: 'repo', label: 'Add your app\u2019s repository under Your app, so your classmates can follow it', href: '#mine-title', done: !!(mine && mine.app_repo) },
      { key: 'address', label: 'Add the address where your app is live, the first win', href: '#mine-title', done: !!(mine && mine.app_url) }
    ];
    if (cohort && cohort.github_team) {
      steps.push({ key: 'talk', label: 'Open the cohort\u2019s conversation on GitHub', href: '#talk-title', done: !!(access && access.state === 'member') });
    }
    steps.push({ key: 'agent', label: 'Connect your own AI agent, if you would like it to know what the cohort is doing', href: '/connect/', done: null });
    return steps;
  }

  var lib = {
    setupSteps: setupSteps, agenda: agenda, partNow: partNow, stagesForWeek: stagesForWeek, stageFile: stageFile,
    readyBar: readyBar, readinessText: readinessText, seenText: seenText, canConfirm: canConfirm, partnersOf: partnersOf,
    currentAndNext: currentAndNext, commitLine: commitLine, ago: ago, repoPath: repoPath, PARTS: PARTS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CohortLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
