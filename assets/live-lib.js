// Pure helpers for the live session page (/live/): the "show your work"
// queue and checks for understanding, with the question bank's six kinds. Tested in tools/test/live-lib.test.mjs.
(function (root) {
  // What a link is, read from its address alone, so a person can paste
  // anything from GitHub and the queue says what it is.
  function classifyLink(url) {
    var u;
    try { u = new URL(String(url || '').trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    var href = u.href;
    if (u.hostname === 'github.com') {
      var p = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      var repo = p.length >= 2 ? p[0] + '/' + p[1] : null;
      if (repo && p[2] === 'commit' && /^[0-9a-f]{7,40}$/i.test(p[3] || '')) {
        return { kind: 'commit', url: href, label: 'Commit ' + p[3].slice(0, 7) + ' in ' + repo };
      }
      if (repo && p[2] === 'issues' && /^\d+$/.test(p[3] || '')) return { kind: 'issue', url: href, label: 'Issue #' + p[3] + ' in ' + repo };
      if (repo && p[2] === 'pull' && /^\d+$/.test(p[3] || '')) return { kind: 'pull', url: href, label: 'Pull request #' + p[3] + ' in ' + repo };
      if (repo && p[2] === 'discussions' && /^\d+$/.test(p[3] || '')) return { kind: 'discussion', url: href, label: 'Discussion #' + p[3] + ' in ' + repo };
      if (repo && p.length === 2) return { kind: 'repo', url: href, label: repo + ' on GitHub' };
    }
    var short = (u.hostname + u.pathname).replace(/\/$/, '');
    return { kind: 'link', url: href, label: short.length > 60 ? short.slice(0, 57) + '…' : short };
  }

  // How an item in the queue reads, from what kind of thing it is.
  function itemLabel(item) {
    if (item.kind === 'app') return 'The app, live at ' + hostOf(item.url);
    if (item.kind === 'share') return 'Shared on the cohort page: ' + hostOf(item.url);
    var c = classifyLink(item.url);
    return c ? c.label : item.url;
  }
  function hostOf(url) { try { return new URL(url).hostname + new URL(url).pathname.replace(/\/$/, ''); } catch (e) { return url; } }

  // The queue in order: still to show, oldest first (the order people
  // asked in), then what has been shown, most recent first.
  function queue(items) {
    var waiting = items.filter(function (i) { return i.state !== 'shown'; })
      .sort(function (a, b) { return a.created_at.localeCompare(b.created_at); });
    var shown = items.filter(function (i) { return i.state === 'shown'; })
      .sort(function (a, b) { return String(b.shown_at || '').localeCompare(String(a.shown_at || '')); });
    return { waiting: waiting, shown: shown };
  }

  // The person who added an item and the cohort's teachers may mark it
  // shown or take it off; nobody else can (the database says the same).
  function canManage(item, meId, teaching) { return !!teaching || item.user_id === meId; }

  // A teacher's question: in their own words (no choices), or two to six
  // choices, one per line.
  function parseCheck(prompt, mode, choicesText) {
    var p = String(prompt || '').trim();
    if (!p) return { error: 'Write the question first.' };
    if (p.length > 500) return { error: 'Keep the question under 500 characters.' };
    if (mode !== 'choices') return { prompt: p, choices: null };
    var list = String(choicesText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (list.length < 2) return { error: 'Give at least two choices, one on each line.' };
    if (list.length > 6) return { error: 'Six choices is the most a question can have.' };
    if (list.some(function (s) { return s.length > 120; })) return { error: 'Keep each choice under 120 characters.' };
    return { prompt: p, choices: list };
  }

  // The anonymous tally, from check_tally's rows ({ choice, answers }).
  // Every choice is listed, even the ones nobody chose.
  function tally(check, rows) {
    var total = rows.reduce(function (n, r) { return n + Number(r.answers); }, 0);
    if (!check.choices) return { total: total, rows: [] };
    var by = {};
    rows.forEach(function (r) { by[r.choice] = Number(r.answers); });
    return {
      total: total,
      rows: check.choices.map(function (label, i) {
        var n = by[i + 1] || 0;
        return { label: label, count: n, share: total ? Math.round((n / total) * 100) : 0 };
      })
    };
  }

  // ------------------------------------------------------------------
  // The question bank (R4): six kinds of question, each asked the same
  // way, answered in each person's own view, and shown with no names.
  // The database checks the same shapes (migration 20261004080000).
  // ------------------------------------------------------------------

  var QUESTION_KINDS = [
    { key: 'choice', name: 'Choose one', line: 'Everyone picks one of a few choices.', choices: true },
    { key: 'multi', name: 'Choose any', line: 'Everyone picks as many of the choices as fit.', choices: true },
    { key: 'scale', name: 'A scale', line: 'Everyone picks a point on a scale, from three to ten points long.', points: true },
    { key: 'words', name: 'A few words', line: 'Everyone gives a word or a few, and the words show together, largest where most people agree.' },
    { key: 'rank', name: 'Put in order', line: 'Everyone puts the choices in their own order, first to last.', choices: true },
    { key: 'short', name: 'In their own words', line: 'Everyone answers in a sentence or a few. Only the teachers read the answers.' }
  ];
  var KIND_BY = {};
  QUESTION_KINDS.forEach(function (k) { KIND_BY[k.key] = k; });
  function questionKind(key) { return KIND_BY[key] || null; }

  // A question's kind, for one asked before there were kinds too.
  function kindOf(q) {
    if (q && KIND_BY[q.kind]) return q.kind;
    return q && q.choices ? 'choice' : 'short';
  }

  // A question from the words a teacher typed: { kind, prompt, choices
  // (one per line), points, low, high } becomes { kind, prompt, choices,
  // points }, or { error } as one plain sentence.
  function parseQuestion(f) {
    f = f || {};
    var kind = KIND_BY[f.kind] ? f.kind : null;
    if (!kind) return { error: 'Choose what kind of question it is.' };
    var p = String(f.prompt || '').trim();
    if (!p) return { error: 'Write the question first.' };
    if (p.length > 500) return { error: 'Keep the question under 500 characters.' };
    var k = KIND_BY[kind];
    if (k.choices) {
      var list = (Array.isArray(f.choices) ? f.choices : String(f.choices || '').split('\n'))
        .map(function (x) { return String(x).trim(); }).filter(Boolean);
      if (list.length < 2) return { error: 'Give at least two choices, one on each line.' };
      if (list.length > 8) return { error: 'Eight choices is the most a question can have.' };
      if (list.some(function (x) { return x.length > 120; })) return { error: 'Keep each choice under 120 characters.' };
      return { kind: kind, prompt: p, choices: list, points: null };
    }
    if (k.points) {
      var n = Number(String(f.points == null ? '' : f.points).trim());
      if (!Number.isInteger(n) || n < 3 || n > 10) return { error: 'A scale has from three to ten points.' };
      var low = String(f.low || '').trim(), high = String(f.high || '').trim();
      if (!low !== !high) return { error: 'Give words for both ends of the scale, or for neither.' };
      if (low.length > 60 || high.length > 60) return { error: 'Keep the words for each end under 60 characters.' };
      return { kind: kind, prompt: p, choices: low ? [low, high] : null, points: n };
    }
    return { kind: kind, prompt: p, choices: null, points: null };
  }

  // The words a form starts from, for a question in the bank, a question
  // asked, or a question scene's configuration ({ prompt, options, kind,
  // points }).
  function questionFields(q) {
    q = q || {};
    var kind = q.kind && KIND_BY[q.kind] ? q.kind : (q.choices || q.options ? 'choice' : 'short');
    var choices = q.choices || q.options || [];
    var scale = kind === 'scale';
    return {
      kind: kind, prompt: q.prompt || '',
      choices: scale ? '' : choices.join('\n'),
      points: scale ? String(q.points || 5) : '5',
      low: scale ? choices[0] || '' : '', high: scale ? choices[1] || '' : '',
      question_id: q.question_id || null
    };
  }

  // A question scene's configuration, from a parsed question: the words
  // stay in the scene, so the run of show reads the same everywhere. A
  // scene with choices and no kind is choose one, and with neither, in
  // their own words, as scenes were before there were kinds.
  function sceneQuestion(parsed, questionId) {
    var c = { prompt: parsed.prompt };
    if (parsed.kind !== 'choice' && parsed.kind !== 'short') c.kind = parsed.kind;
    if (parsed.choices) c.options = parsed.choices;
    if (parsed.points) c.points = parsed.points;
    if (questionId) c.question_id = questionId;
    return c;
  }

  // The question a scene asks, as a row to ask (live_checks' columns), or
  // null when the scene has no question written yet.
  function fromScene(config) {
    var c = config || {};
    if (!c.prompt) return null;
    var p = parseQuestion(Object.assign(questionFields(c), { prompt: c.prompt }));
    if (p.error) return null;
    return { kind: p.kind, prompt: p.prompt, choices: p.choices, points: p.points, question_id: c.question_id || null };
  }

  // The points on a scale, each with its words: "1", "2", ... and the two
  // ends' words beside the first and last.
  function scaleLabels(q) {
    var n = Number(q.points) || 0, ends = q.choices || [];
    var out = [];
    for (var i = 1; i <= n; i++) {
      var w = i === 1 ? ends[0] : i === n ? ends[1] : null;
      out.push(w ? i + ' (' + w + ')' : String(i));
    }
    return out;
  }

  // An answer from what a person did in their view, as live_answers'
  // columns { choice, body, value }, or { error }.
  //   choice, scale: { choice: n }; short, words: { body }; multi:
  //   { picks: [n, ...] }; rank: { order: [n, ...] } (choice numbers,
  //   counted from one).
  function answerRow(q, input) {
    input = input || {};
    var kind = kindOf(q), n = (q.choices || []).length;
    if (kind === 'choice' || kind === 'scale') {
      var max = kind === 'scale' ? Number(q.points) : n;
      var c = Number(input.choice);
      if (!Number.isInteger(c) || c < 1 || c > max) return { error: kind === 'scale' ? 'Choose a point on the scale.' : 'Choose one.' };
      return { choice: c, body: null, value: null };
    }
    if (kind === 'short' || kind === 'words') {
      var b = String(input.body || '').trim();
      if (!b) return { error: kind === 'words' ? 'Write a word or a few.' : 'Write your answer first.' };
      var lim = kind === 'words' ? 60 : 1000;
      if (b.length > lim) return { error: kind === 'words' ? 'Keep it to a few words, under 60 characters.' : 'Keep your answer under 1,000 characters.' };
      return { choice: null, body: b, value: null };
    }
    var list = (kind === 'multi' ? input.picks : input.order) || [];
    list = list.map(Number);
    var fine = list.every(function (x, i) { return Number.isInteger(x) && x >= 1 && x <= n && list.indexOf(x) === i; });
    if (!fine) return { error: 'Choose from the choices given.' };
    if (kind === 'multi' && !list.length) return { error: 'Choose at least one.' };
    if (kind === 'rank' && list.length !== n) return { error: 'Put every choice in your order.' };
    return { choice: null, body: null, value: list };
  }

  // What a person answered, in words: the choice, the point, the choices
  // picked, the order, or their words.
  function answerText(check, answer) {
    if (!answer) return null;
    var kind = kindOf(check), ch = check.choices || [];
    if (kind === 'choice') return ch[answer.choice - 1] || null;
    if (kind === 'scale') {
      if (answer.choice == null) return null;
      var label = scaleLabels(check)[answer.choice - 1];
      return label ? label + ' of ' + check.points : null;
    }
    if (kind === 'multi' || kind === 'rank') {
      var v = Array.isArray(answer.value) ? answer.value : [];
      var names = v.map(function (i) { return ch[i - 1]; }).filter(Boolean);
      if (!names.length) return null;
      return kind === 'rank' ? names.map(function (x, i) { return (i + 1) + '. ' + x; }).join('; ') : names.join('; ');
    }
    return answer.body || null;
  }

  // The results with no names, from check_results, ready to draw:
  //   { kind, total, rows: [{ label, count, share, text }], words:
  //     [{ word, count, size }], note }
  // rows are bars (choice, multi, scale, rank, the first place first for
  // rank); words a cloud, sized one to five; note one line about them.
  function results(check, summary) {
    var kind = kindOf(check), ch = check.choices || [];
    summary = summary || {};
    var total = Number(summary.total) || 0;
    var out = { kind: kind, total: total, rows: [], words: [], note: '' };
    if (kind === 'choice' || kind === 'multi' || kind === 'scale') {
      var labels = kind === 'scale' ? scaleLabels(check) : ch;
      var counts = summary.counts || [];
      out.rows = labels.map(function (label, i) {
        var n = Number(counts[i]) || 0;
        return { label: label, count: n, share: total ? Math.round((n / total) * 100) : 0, text: String(n) };
      });
      if (kind === 'multi') out.note = 'Each person could choose more than one.';
      if (kind === 'scale' && total) {
        var sum = out.rows.reduce(function (s, r, i) { return s + r.count * (i + 1); }, 0);
        out.note = 'The middle of the answers is ' + (Math.round((sum / total) * 10) / 10) + ' of ' + check.points + '.';
      }
    } else if (kind === 'rank') {
      var places = summary.places || [], n = ch.length;
      out.rows = ch.map(function (label, i) {
        var at = places[i] == null ? null : Number(places[i]);
        var share = at == null || n < 2 ? 0 : Math.round(((n - at) / (n - 1)) * 100);
        return { label: label, count: at == null ? 0 : at, share: share, text: at == null ? '' : 'about ' + (Math.round(at * 10) / 10) };
      }).sort(function (a, b) { return (a.text ? a.count : 99) - (b.text ? b.count : 99); });
      out.note = 'In the order people put them, on average, first at the top.';
    } else if (kind === 'words') {
      var ws = (summary.words || []).filter(function (w) { return w && typeof w.word === 'string'; });
      var top = ws.reduce(function (m, w) { return Math.max(m, Number(w.count) || 0); }, 0);
      out.words = ws.map(function (w) {
        var c = Number(w.count) || 0;
        return { word: w.word, count: c, size: top ? Math.max(1, Math.round((c / top) * 5)) : 1 };
      });
    }
    return out;
  }

  function counted(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // The two questions a teacher can ask at the close of every session,
  // answered privately (the notes' 6.1 and 6.2, item 6; awaiting Ben's
  // review). The teacher reads both before the next session.
  var CLOSING_CHECKS = [
    'What can you decide or judge about your app now that you could not last week?',
    'What is still muddy?'
  ];

  // The trio protocol (the notes' 3.3 and 6.1: the Tuning protocol and
  // Liz Lerman's Critical Response Process, in the course's own words):
  // each builder's turn, in steps, with relative lengths that add up to
  // eight. Data, so the steps can change in one place.
  var TURN = [
    { key: 'ask', name: 'Their question', weight: 1, what: 'The builder says, in a line, what they want to know.' },
    { key: 'show', name: 'Show it, and one decision', weight: 3, what: 'On the real device, and then one decision explained with the agent closed.' },
    { key: 'clarify', name: 'One clarifying question', weight: 1, what: 'Partners ask one question to understand it, not to judge it. “What did you give up?” is a good one.' },
    { key: 'three', name: 'The three questions', weight: 2, what: 'Partners answer where it is going, how it is going, and what is next, while the builder listens.' },
    { key: 'next', name: 'What comes next', weight: 1, what: 'The builder says what they will do next.' }
  ];

  // Each step's length in seconds, so that every builder in the group has
  // a whole turn inside the part's minutes, rounded to quarter minutes and
  // never under thirty seconds.
  function turnSteps(partMinutes, builders) {
    var n = Math.max(1, builders || 1);
    var weights = TURN.reduce(function (s, t) { return s + t.weight; }, 0);
    var unit = (partMinutes * 60) / (n * weights);
    return TURN.map(function (t) {
      return { key: t.key, name: t.name, what: t.what, seconds: Math.max(30, Math.round((t.weight * unit) / 15) * 15) };
    });
  }

  // A rehearsal room's own scenes (R6): one turn's steps, from the rooms
  // scene the teacher planned on the class page (its room_scenes, each a
  // title and minutes), or, for a scene with none, the trio protocol's
  // steps fitted to the scene's minutes. A step named like one of the
  // protocol's keeps that step's line about what happens in it.
  function roomTurn(scene, builders) {
    var planned = scene && scene.config && Array.isArray(scene.config.room_scenes) ? scene.config.room_scenes : [];
    if (planned.length) {
      return planned.slice(0, 20).map(function (r, i) {
        var known = TURN.filter(function (t) { return t.name.toLowerCase() === String(r.title || '').trim().toLowerCase(); })[0];
        return { key: known ? known.key : 'scene-' + i, name: String(r.title || 'Step ' + (i + 1)), what: known ? known.what : '', seconds: Math.max(30, Math.round((Number(r.minutes) || 1) * 60)) };
      });
    }
    return turnSteps(scene && scene.minutes ? scene.minutes : 25, builders);
  }

  // The order builders take their turns in a group: by name, moved along
  // by one each week, so a different person goes first every session. It
  // is the same order on every screen, and nobody's partners change.
  function presentingOrder(people, week) {
    var sorted = (people || []).slice().sort(function (a, b) {
      return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()) || String(a.id).localeCompare(String(b.id));
    });
    if (!sorted.length) return sorted;
    var k = ((Math.max(1, week || 1) - 1) % sorted.length + sorted.length) % sorted.length;
    return sorted.slice(k).concat(sorted.slice(0, k));
  }

  // A builder's newest bring-back from a list already limited to this
  // session's window.
  function latestBringBack(shares, userId) {
    return (shares || []).filter(function (s) { return s.user_id === userId && s.kind === 'bring-back'; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); })[0] || null;
  }

  function clock(seconds) {
    var s = Math.max(0, Math.round(seconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  var lib = {
    classifyLink: classifyLink, itemLabel: itemLabel, queue: queue, canManage: canManage, parseCheck: parseCheck, tally: tally, answerText: answerText, counted: counted,
    QUESTION_KINDS: QUESTION_KINDS, questionKind: questionKind, kindOf: kindOf, parseQuestion: parseQuestion, questionFields: questionFields,
    sceneQuestion: sceneQuestion, fromScene: fromScene, scaleLabels: scaleLabels, answerRow: answerRow, results: results,
    CLOSING_CHECKS: CLOSING_CHECKS, TURN: TURN, turnSteps: turnSteps, roomTurn: roomTurn, presentingOrder: presentingOrder, latestBringBack: latestBringBack, clock: clock
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.LiveLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
