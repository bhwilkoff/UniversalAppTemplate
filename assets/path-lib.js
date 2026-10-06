// Pure helpers for working through the path (LOOP-PLAN.md, G3): which
// parts of a rendered stage become steps, prompts to copy, and a ready
// check, and a person's own marks on them. The site never copies the
// template's words, so everything here reads the shape of the rendered
// Markdown. Used by assets/path-marks.js, assets/hub.js, and
// assets/cohort.js, and tested in tools/test/path-lib.test.mjs.
//
// Marks are private and never counted against anyone: no points, no
// streaks, no comparing (DECISIONS.md). Signed out they live only in this
// browser; signed in, in stage_marks, which only their owner can read.
(function (root) {
  // The path in order, with the names its index page gives each stage.
  var STAGES = [
    { id: 'setup', title: 'Getting set up', href: '/path/setup/' },
    { id: '00', title: 'Why we build', href: '/path/00/' },
    { id: '01', title: 'The first prototype', href: '/path/01/' },
    { id: '02', title: 'The shape of an app', href: '/path/02/' },
    { id: '03', title: 'Going native', href: '/path/03/' },
    { id: '04', title: 'Seeing it work', href: '/path/04/' },
    { id: '05', title: 'Shipping', href: '/path/05/' },
    { id: '06', title: 'Keeping it running', href: '/path/06/' },
    { id: '07', title: 'Raising the ceiling', href: '/path/07/' },
    { id: '08', title: 'Working with AI', href: '/path/08/' }
  ];
  var IDS = STAGES.map(function (s) { return s.id; });

  function isStage(id) { return IDS.indexOf(id) >= 0; }
  function stageInfo(id) { return STAGES[IDS.indexOf(id)] || null; }

  // docs/path/01-first-prototype.md is stage 01; docs/path/setup.md is
  // setup. The companion pages (talking to your agent, showing your work)
  // are not stages, and have nothing to mark.
  function stageFromSrc(src) {
    var m = String(src || '').match(/^docs\/path\/(setup|0[0-8])[-.]/);
    return m ? m[1] : null;
  }

  // The section whose numbered list is the stage's steps.
  function isStepsHeading(text) {
    return /^(working with your agent|what to do)\.?$/i.test(String(text || '').trim());
  }

  // The bar for moving on: a paragraph that opens with these words in
  // bold on a stage, or a heading of its own on the setup page.
  function isReadyLead(text) {
    return /^when you are (ready to move on|done with the (path|stages))/i.test(String(text || '').trim());
  }

  // A step's name is its bold opening, without the full stop.
  function stepTitle(boldText) {
    var t = String(boldText || '').trim().replace(/[.:]$/, '');
    return t.length > 120 ? t.slice(0, 117).trimEnd() + '…' : t;
  }

  // A quoted prompt as someone would paste it: each paragraph on one
  // line, paragraphs apart, and nothing around it.
  function promptText(raw) {
    return String(raw || '').split(/\n\s*\n/).map(function (p) {
      return p.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).join(' ');
    }).filter(Boolean).join('\n\n');
  }

  // ------------------------------------------------------------------
  // Marks
  // ------------------------------------------------------------------

  // A mark is { stage, item, state, note, updated_at }: item is step-N,
  // ready, or note; state is done (a step), ready or not-yet (the bar),
  // or kept (a private note). The same rules as the database's.
  function validMark(m) {
    if (!m || !isStage(m.stage)) return false;
    if (/^step-[1-9][0-9]?$/.test(m.item)) return m.state === 'done' && !m.note;
    if (m.item === 'ready') return (m.state === 'ready' || m.state === 'not-yet') && !m.note;
    if (m.item === 'note') return m.state === 'kept' && typeof m.note === 'string' && !!m.note.trim() && m.note.length <= 4000;
    return false;
  }

  function key(stage, item) { return stage + ':' + item; }

  // Marks kept as a map from key to mark, so each kind is set once.
  function fromRows(rows) {
    var out = {};
    (rows || []).forEach(function (r) {
      var m = { stage: r.stage, item: r.item, state: r.state, note: r.note || null, updated_at: r.updated_at || null };
      if (validMark(m)) out[key(m.stage, m.item)] = m;
    });
    return out;
  }

  // Setting a mark, or clearing it with a null state, gives new marks.
  function setMark(marks, stage, item, state, note, nowIso) {
    var out = Object.assign({}, marks);
    var k = key(stage, item);
    if (state == null) { delete out[k]; return out; }
    var m = { stage: stage, item: item, state: state, note: note == null ? null : String(note).trim(), updated_at: nowIso || null };
    if (!validMark(m)) return marks;
    out[k] = m;
    return out;
  }

  function get(marks, stage, item) { return (marks || {})[key(stage, item)] || null; }

  // Which steps of a stage are done, as numbers.
  function stepsDone(marks, stage) {
    return Object.keys(marks || {}).map(function (k) { return marks[k]; })
      .filter(function (m) { return m.stage === stage && /^step-/.test(m.item); })
      .map(function (m) { return Number(m.item.slice(5)); })
      .sort(function (a, b) { return a - b; });
  }

  // The stages someone has marked ready, in the path's order. Not a
  // count, and nothing to compare.
  function readyStages(marks) {
    return STAGES.filter(function (s) {
      var m = get(marks, s.id, 'ready');
      return m && m.state === 'ready';
    });
  }

  // Bringing marks made while signed out into an account: everything in
  // this browser the account does not have yet, or has an older copy of.
  // The account's newer marks stay. Returns the marks to show and the
  // ones to send.
  function merge(local, server) {
    var out = Object.assign({}, server), send = [];
    Object.keys(local || {}).forEach(function (k) {
      var l = local[k], s = (server || {})[k];
      if (!validMark(l)) return;
      if (!s || (l.updated_at && s.updated_at && Date.parse(l.updated_at) > Date.parse(s.updated_at))) {
        out[k] = l;
        send.push(l);
      }
    });
    return { marks: out, send: send };
  }

  // A mark as a row for stage_marks; the database sets the time.
  function toRow(m, userId) {
    return { user_id: userId, stage: m.stage, item: m.item, state: m.state, note: m.item === 'note' ? m.note : null };
  }

  // ------------------------------------------------------------------
  // This browser's copy, for anyone signed out
  // ------------------------------------------------------------------

  // Storage can be missing or refuse (a private window), so every call is
  // guarded and the page works without it.
  var STORE_KEY = 'hs-path-marks';
  function loadLocal(store) {
    try {
      var raw = store && store.getItem(STORE_KEY);
      if (!raw) return {};
      var list = JSON.parse(raw);
      return fromRows(Array.isArray(list) ? list : []);
    } catch (e) { return {}; }
  }
  function saveLocal(store, marks) {
    try {
      if (!store) return false;
      var list = Object.keys(marks || {}).map(function (k) { return marks[k]; });
      if (list.length) store.setItem(STORE_KEY, JSON.stringify(list));
      else store.removeItem(STORE_KEY);
      return true;
    } catch (e) { return false; }
  }
  function clearLocal(store) { return saveLocal(store, {}); }

  // ------------------------------------------------------------------
  // Bringing it back
  // ------------------------------------------------------------------

  // The cohort page's bring-back form, opened for this stage.
  function bringBackHref(slug, stage) {
    return '/cohort/?c=' + encodeURIComponent(slug) + '&bring=' + encodeURIComponent(stage) + '#share-title';
  }

  // The stage a cohort page was opened to bring back, if it is one.
  function bringParam(search) {
    var v = null;
    try { v = new URLSearchParams(search || '').get('bring'); } catch (e) { return null; }
    return isStage(v) ? v : null;
  }

  // What "bring this back" offers: a link to each cohort the person is
  // in, or, with none, a private note. Cohorts come from enrollments with
  // their cohort, and only those still running or open.
  function bringChoices(enrollments, stage) {
    var cohorts = (enrollments || []).filter(function (e) {
      return e && e.status !== 'left' && e.cohorts && e.cohorts.slug && e.cohorts.status !== 'finished' && e.cohorts.status !== 'draft';
    }).map(function (e) { return { slug: e.cohorts.slug, title: e.cohorts.title || e.cohorts.slug, href: bringBackHref(e.cohorts.slug, stage) }; });
    return cohorts.length ? { kind: 'cohorts', cohorts: cohorts } : { kind: 'note' };
  }

  var lib = {
    STAGES: STAGES, isStage: isStage, stageInfo: stageInfo, stageFromSrc: stageFromSrc,
    isStepsHeading: isStepsHeading, isReadyLead: isReadyLead, stepTitle: stepTitle, promptText: promptText,
    validMark: validMark, key: key, fromRows: fromRows, setMark: setMark, get: get, stepsDone: stepsDone, readyStages: readyStages,
    merge: merge, toRow: toRow, STORE_KEY: STORE_KEY, loadLocal: loadLocal, saveLocal: saveLocal, clearLocal: clearLocal,
    bringBackHref: bringBackHref, bringParam: bringParam, bringChoices: bringChoices
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.PathLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
