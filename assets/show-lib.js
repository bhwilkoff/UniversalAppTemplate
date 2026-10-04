// Pure helpers for the run of show (research/notes/run-of-show-design.md,
// milestone R2): a session's plan as scenes in order, each of one kind,
// with its minutes, title, the words the main stage shows, and a little
// configuration that depends on the kind. The database checks the same
// rules (migration 20261004050000); they are checked here first so a
// teacher reads a plain sentence instead of a refusal. Used by the class
// builder on /teach/ and the run of show on /cohort/, and tested in
// tools/test/show-lib.test.mjs. Words by Claude, awaiting Ben's review.
(function (root) {
  // The kinds of scene, in the design's own words. `keys` is what each
  // kind may carry in its configuration; anything else is dropped.
  var KINDS = [
    { key: 'talk', name: 'Talk', what: 'You explain. The main stage shows a title and a few lines.', keys: [] },
    { key: 'presenter', name: 'Presenter', what: 'Someone from the wings shows their work, and the audience gets one thing to do.', keys: ['prompt'] },
    { key: 'question', name: 'Question', what: 'Everyone answers, and the answers go on the main stage when you show them.', keys: ['prompt', 'options', 'kind', 'points', 'question_id'] },
    { key: 'design', name: 'Design stage', what: 'The shared board on the main stage, where everyone draws together, blank or from a template.', keys: ['template'] },
    { key: 'rooms', name: 'Rehearsal rooms', what: 'Everyone goes to their trio’s room for a set time, and the room runs its own scenes.', keys: ['prompt', 'room_scenes'] },
    { key: 'break', name: 'Break', what: 'A pause, with the clock on the main stage.', keys: [] },
    { key: 'reflection', name: 'Reflection', what: 'One closing question, often what is still muddy.', keys: ['prompt'] }
  ];
  var BY_KEY = {};
  KINDS.forEach(function (k) { BY_KEY[k.key] = k; });

  function kind(key) { return BY_KEY[key] || null; }

  // COURSE.md's six parts (and the break) as the default run of show: the
  // design's mapping from each part to a kind of scene.
  var PART_KIND = { arrive: 'talk', show: 'rooms', 'break': 'break', value: 'presenter', prompt: 'talk', start: 'reflection', check: 'question' };

  // The room's own scenes for the trio protocol: each builder's turn, in
  // its steps, with whole minutes that add up to about the rooms scene.
  function roomScenes(turn, partMinutes, builders) {
    if (!turn || !turn.length) return [];
    var n = Math.max(1, builders || 3);
    var weights = turn.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
    var unit = partMinutes / (n * weights);
    return turn.map(function (t) {
      return { title: t.name, minutes: Math.max(1, Math.round((t.weight || 1) * unit)) };
    });
  }

  // agendaParts: CohortLib.agenda(session minutes), so the default fits
  // the cohort's own session length. turn: LiveLib's trio steps, if the
  // page has them.
  function defaultShow(agendaParts, turn) {
    return (agendaParts || []).map(function (p) {
      var k = PART_KIND[p.key] || 'talk';
      var config = {};
      if (k === 'rooms') {
        config.prompt = 'Show what you brought back on the real device, and explain one decision with the agent closed.';
        var rs = roomScenes(turn, p.minutes, 3);
        if (rs.length) config.room_scenes = rs;
      }
      if (k === 'presenter') config.prompt = 'Listen for the value at work, and what it cost.';
      if (k === 'reflection') config.prompt = 'What is the first prompt you will send this week?';
      if (k === 'question') config.prompt = 'What is still muddy for you?';
      return { kind: k, title: p.name, minutes: p.minutes, body: p.what || null, config: config };
    });
  }

  function total(scenes) {
    return (scenes || []).reduce(function (n, s) { return n + (Number(s.minutes) || 0); }, 0);
  }

  // How the planned minutes sit against the session's length, in a line.
  function fitText(scenes, sessionMinutes) {
    var t = total(scenes);
    if (!sessionMinutes) return t + ' minutes planned.';
    if (t === sessionMinutes) return t + ' minutes planned, the whole session.';
    if (t < sessionMinutes) return t + ' minutes planned, ' + (sessionMinutes - t) + ' to spare in a ' + sessionMinutes + '-minute session.';
    return t + ' minutes planned, ' + (t - sessionMinutes) + ' more than the ' + sessionMinutes + '-minute session.';
  }

  // Where each scene starts, in minutes from the top of the session.
  function startTimes(scenes) {
    var at = 0;
    return (scenes || []).map(function (s) { var here = at; at += Number(s.minutes) || 0; return here; });
  }

  // A new order of ids with the scene at `index` moved by `delta`, or
  // null when it cannot move that way.
  function moved(ids, index, delta) {
    var to = index + delta;
    if (index < 0 || index >= ids.length || to < 0 || to >= ids.length || delta === 0) return null;
    var out = ids.slice();
    var x = out.splice(index, 1)[0];
    out.splice(to, 0, x);
    return out;
  }

  // Options typed one per line become a clean list.
  function optionsFromText(text) {
    return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // A room's scenes typed one per line, "Their question, 2" (a title,
  // then its minutes after the last comma; one minute when none is given).
  function roomScenesFromText(text) {
    return String(text || '').split('\n').map(function (line) {
      line = line.trim();
      if (!line) return null;
      var m = line.match(/^(.*?)[,\s]+(\d{1,3})\s*(?:min(?:ute)?s?)?$/i);
      var title = (m ? m[1] : line).trim().replace(/[,\s]+$/, '');
      var minutes = m ? parseInt(m[2], 10) : 1;
      return title ? { title: title, minutes: minutes } : null;
    }).filter(Boolean);
  }

  function roomScenesToText(list) {
    return (list || []).map(function (r) { return r.title + ', ' + r.minutes; }).join('\n');
  }

  // Keep only what the kind may carry, trimmed, with empty values left out.
  function cleanConfig(k, config) {
    var allowed = (kind(k) || { keys: [] }).keys;
    var out = {};
    config = config || {};
    allowed.forEach(function (key) {
      var v = config[key];
      if (v == null) return;
      if (typeof v === 'string') { v = v.trim(); if (!v) return; }
      if (Array.isArray(v) && !v.length) return;
      out[key] = v;
    });
    return out;
  }

  // The first problem with a scene as a sentence, or null when it fits.
  function problem(scene) {
    var k = kind(scene && scene.kind);
    if (!k) return 'Choose what kind of scene this is.';
    var title = String(scene.title || '').trim();
    if (!title) return 'Give the scene a title, so everyone knows where they are.';
    if (title.length > 120) return 'Keep the title under 120 characters.';
    var m = Number(scene.minutes);
    if (!Number.isInteger(m) || m < 1 || m > 240) return 'Give it a whole number of minutes, from 1 to 240.';
    if (scene.body && String(scene.body).length > 2000) return 'Keep what the stage shows under 2,000 characters.';
    var c = scene.config || {};
    for (var key in c) if (Object.prototype.hasOwnProperty.call(c, key) && k.keys.indexOf(key) === -1) return 'A ' + k.name.toLowerCase() + ' scene does not use ' + key + '.';
    if (c.prompt && String(c.prompt).length > 500) return 'Keep the prompt under 500 characters.';
    if (c.template && String(c.template).length > 60) return 'Keep the template’s name under 60 characters.';
    if (c.options) {
      if (c.options.length < 2 || c.options.length > 8) return 'A question with choices needs two to eight of them.';
      for (var i = 0; i < c.options.length; i++) {
        var o = String(c.options[i] || '');
        if (!o || o.length > 120) return 'Keep each choice to one line, under 120 characters.';
      }
    }
    // A question's kind (R4): the ones with choices need them, a scale
    // needs its points, and its two ends are the only options it takes.
    if (c.kind != null) {
      if (['choice', 'multi', 'short', 'scale', 'words', 'rank'].indexOf(c.kind) === -1) return 'Choose what kind of question it is.';
      if (['multi', 'rank'].indexOf(c.kind) >= 0 && !c.options) return 'A question with choices needs two to eight of them.';
      if (c.kind === 'scale' && !(Number.isInteger(c.points) && c.points >= 3 && c.points <= 10)) return 'A scale has from three to ten points.';
      if (c.kind === 'scale' && c.options && c.options.length !== 2) return 'A scale takes words for its two ends, or none.';
      if (c.kind === 'words' && c.options) return 'A words question has no choices.';
    }
    if (c.points != null && c.kind !== 'scale') return 'Only a scale has points.';
    if (c.room_scenes) {
      if (c.room_scenes.length > 12) return 'A room can run at most twelve scenes.';
      for (var j = 0; j < c.room_scenes.length; j++) {
        var r = c.room_scenes[j];
        if (!r || !r.title || String(r.title).length > 120) return 'Give each of the room’s scenes a title.';
        if (!Number.isFinite(r.minutes) || r.minutes < 1 || r.minutes > 120) return 'Give each of the room’s scenes its minutes, from 1 to 120.';
      }
    }
    return null;
  }

  // The session to copy from: the latest earlier session that has a run
  // of show. sessions: [{ id, number }]; withScenes: ids that have one.
  function copySource(sessions, session, withScenes) {
    var have = withScenes || [];
    var earlier = (sessions || []).filter(function (s) { return s.number < session.number && have.indexOf(s.id) >= 0; })
      .sort(function (a, b) { return b.number - a.number; });
    return earlier[0] || null;
  }

  // What the main stage shows for a scene, before anyone acts on it: the
  // same few lines the stage will draw, for the class builder's preview.
  function stagePreview(scene) {
    var k = kind(scene.kind) || KINDS[0];
    var c = scene.config || {};
    var p = { eyebrow: k.name, title: String(scene.title || ''), lines: [], items: [], minutes: Number(scene.minutes) || 0 };
    if (scene.body) p.lines = String(scene.body).split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 4);
    if (k.key === 'question') {
      if (c.prompt) p.lines = [c.prompt];
      var qk = c.kind || (c.options && c.options.length ? 'choice' : 'short');
      if (qk === 'scale') {
        var n = Number(c.points) || 0, ends = c.options || [];
        for (var i = 1; i <= n && i <= 10; i++) p.items.push(i === 1 && ends[0] ? '1 (' + ends[0] + ')' : i === n && ends[1] ? i + ' (' + ends[1] + ')' : String(i));
      } else if (qk !== 'words' && qk !== 'short') p.items = (c.options || []).slice(0, 8);
      p.note = {
        choice: 'Everyone chooses one. The count shows here, without names, when you show it.',
        multi: 'Everyone chooses any that fit. The count shows here, without names, when you show it.',
        scale: 'Everyone picks a point. The count shows here, without names, when you show it.',
        rank: 'Everyone puts these in order. The average order shows here, without names, when you show it.',
        words: 'Everyone gives a word or a few. The words show here together, without names, when you show them.',
        short: 'Answers in their own words, read by you, shown only if you choose.'
      }[qk];
    } else if (k.key === 'presenter') {
      p.note = c.prompt ? 'The audience: ' + c.prompt : 'The presenter’s work fills the stage.';
    } else if (k.key === 'design') {
      var BL = root.BoardLib, t = c.template && BL ? BL.template(c.template) : null;
      p.note = c.template ? 'The board, from the ' + (t ? t.name : c.template) + ' template, live on the main stage.' : 'The board, blank, live on the main stage.';
      if (t) p.items = t.frames.map(function (f) { return f.title; });
    } else if (k.key === 'rooms') {
      p.note = 'Everyone is in their room for ' + p.minutes + ' minutes.';
      p.items = (c.room_scenes || []).map(function (r) { return r.title + ', ' + r.minutes + ' min'; });
      if (c.prompt) p.lines = [c.prompt];
    } else if (k.key === 'reflection') {
      if (c.prompt) p.lines = [c.prompt];
    } else if (k.key === 'break') {
      p.note = 'Back in ' + p.minutes + ' minutes.';
    }
    return p;
  }

  var lib = {
    KINDS: KINDS, PART_KIND: PART_KIND, kind: kind, roomScenes: roomScenes, defaultShow: defaultShow, total: total,
    fitText: fitText, startTimes: startTimes, moved: moved, optionsFromText: optionsFromText,
    roomScenesFromText: roomScenesFromText, roomScenesToText: roomScenesToText, cleanConfig: cleanConfig,
    problem: problem, copySource: copySource, stagePreview: stagePreview
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ShowLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
