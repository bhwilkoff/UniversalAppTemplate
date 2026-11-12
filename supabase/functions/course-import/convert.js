// Turns a Course Builder course export (Minerva's courseexport, format
// version 1) into a cohort with sessions you set: each class plan is a
// session, each step a part, with its slides, leader notes, questions,
// breakouts, featured people, and documents (DECISIONS.md, "Courses come in
// from Course Builder"). Pure: no network, no database. Tested in
// tools/test/course-import.test.mjs with a made-up course of the same shape.

const LIMIT = { title: 120, body: 2000, prompt: 500, notes: 4000, deck: 40000, option: 120, before: 20000, cohortTitle: 200, description: 2000 };

function clean(s) {
  return String(s == null ? '' : s).replace(/​/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function cut(s, n) {
  s = clean(s);
  if (s.length <= n) return s;
  const at = s.lastIndexOf(' ', n - 1);
  return s.slice(0, at > n * 0.6 ? at : n - 1).trimEnd() + '…';
}
function oneLine(s) { return clean(s).replace(/\s*\n\s*/g, ' '); }
// Words a stage shows as they are: no Markdown marks, a link as its words
// and its address.
function plain(s) {
  return clean(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '').replace(/\\([\[\]*_#])/g, '$1');
}

// A Quill delta (the slide editor's own format) as deck lines: the first
// heading is the slide's headline, later ones bold lines; lists keep their
// depth; bold and italic stay; colors and highlights do not travel.
export function deltaToSlide(delta) {
  const ops = (delta && delta.ops) || [];
  const lines = [];
  let segs = [];
  let headed = false;
  function inline(text, a) {
    if (!text) return '';
    if (a && a.bold && a.italic) return '***' + text + '***';
    if (a && a.bold) return '**' + text + '**';
    if (a && a.italic) return '*' + text + '*';
    return text;
  }
  function endLine(attrs) {
    const text = segs.join('').replace(/\s+$/, '');
    segs = [];
    const a = attrs || {};
    if (a.header) {
      if (!text) return;
      if (!headed) { lines.push('## ' + text.replace(/\*+/g, '')); headed = true; }
      else lines.push('**' + text.replace(/\*+/g, '') + '**');
      return;
    }
    if (a.list) {
      if (!text) return;
      const pad = '  '.repeat(Math.min(2, Number(a.indent) || 0));
      lines.push(pad + (a.list === 'ordered' ? '1. ' : '- ') + text);
      return;
    }
    lines.push(text);
  }
  for (const op of ops) {
    if (typeof op.insert !== 'string') continue;
    const parts = op.insert.split('\n');
    parts.forEach((p, i) => {
      if (p) segs.push(inline(p.replace(/​/g, ''), op.attributes));
      if (i < parts.length - 1) endLine(p === '' && parts.length === 2 && i === 0 ? op.attributes : null);
    });
  }
  if (segs.length) endLine(null);
  // Blank lines between blocks, lists kept together.
  const out = [];
  lines.forEach((l, i) => {
    const prev = out.length ? out[out.length - 1] : null;
    const isItem = /^\s*(-|1\.) /.test(l);
    const prevItem = prev != null && /^\s*(-|1\.) /.test(prev);
    if (!l.trim()) { if (prev !== '') out.push(''); return; }
    if (prev != null && prev !== '' && !(isItem && prevItem)) out.push('');
    out.push(l);
  });
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

export function slidesOf(resource) {
  const pages = Array.isArray(resource.content) ? resource.content : [];
  return pages.map((p) => deltaToSlide(p.delta)).filter((s) => s.trim());
}

function pick(records, type) { return records.filter((r) => r.type === type).map((r) => r.data); }
function byOrder(a, b) { return (a.order || 0) - (b.order || 0) || (a.id || 0) - (b.id || 0); }

// Where a resource lives, and whether people outside Minerva can open it.
function resourceLink(r, templates) {
  if (!r) return null;
  if (r.type === 'whiteboard') return { name: r.name, url: null, kind: 'whiteboard' };
  let url = r.url || '';
  let kind = 'page';
  if (r.sle_document_template_id) {
    const t = templates[r.sle_document_template_id];
    if (!url && t && t.uuid) url = 'https://sle-collaboration.minervaproject.com/worksheettemplates/' + t.uuid + '/';
    kind = 'minerva';
    var uuid = t && t.uuid ? t.uuid : null;
  } else if (/course-resources\.minerva\.edu/.test(url)) kind = 'file';
  else if (/docs\.google\.com|drive\.google\.com/.test(url)) kind = 'google';
  url = url.replace(/\?au.*$/, '');
  return { name: oneLine(r.name || 'A document'), url: /^https:\/\//.test(url) ? url : null, kind, uuid: typeof uuid === 'undefined' ? null : uuid };
}

function pollRef(a) {
  for (const k of Object.keys(a || {})) {
    const v = a[k];
    if ((typeof v === 'string' || typeof v === 'number') && /^\d{3,12}$/.test(String(v))) return String(v);
    if (v && typeof v === 'object' && /^\d{3,12}$/.test(String(v.id || v.poll_id || v.element_id || ''))) return String(v.id || v.poll_id || v.element_id);
  }
  return null;
}
// A poll longer than a readable question splits into its passage and the
// question at its end: the trailing sentences that ask something, up to 300
// characters. With no question at the end, the poll's own title asks it.
// Course Builder's template lines a leader never wrote ("[Useful for: ...]",
// "[Overview description of activity.]", "Tell students to pay attention to
// ... [do a subsequent task]", "- [Optional]", "n/a"): left in, they read as
// instructions on the leader's panel.
const FILLER = [/^\[Useful for:[^\]]*\]$/, /^\[Overview description of activity\.\]$/, /^(Engagement:\s*)?Tell students to pay attention to … because .*\[do a subsequent task\]$/,
  /^\[Ask students a question that they can answer only if .*\]$/, /^- \[Optional\]$/, /^n\/a$/i, /^Engagement:\s*$/];
export function withoutFiller(text) {
  return String(text || '').split('\n').filter((l) => !FILLER.some((p) => p.test(l.trim()))).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function splitQuestion(text, title) {
  const t = String(text || '').trim();
  if (t.length <= 300) return { prompt: t, passage: '' };
  const parts = t.split(/(?<=[?.!])\s+(?=[A-Z\u2018\u201c'"])/);
  let k = parts.length, q = '';
  while (k > 0 && /\?["\u201d\u2019']?$/.test(parts[k - 1]) && (parts.slice(k - 1).join(' ').length <= 300)) { k -= 1; q = parts.slice(k).join(' '); }
  if (q && k > 0) return { prompt: q, passage: parts.slice(0, k).join(' '), heading: title || '' };
  return { prompt: title || q || t.slice(0, 300), passage: t, heading: title || '' };
}

function pollQuestion(a) {
  const prompt = clean(a.question);
  const choices = Object.values(a.choices || {}).sort((x, y) => (x.index || 0) - (y.index || 0)).map((c) => oneLine(c.choice)).filter(Boolean);
  const out = { prompt, warn: null };
  if (a.type === 'yn') { out.kind = 'choice'; out.options = ['Yes', 'No']; }
  else if (a.type === 'mc' && choices.length >= 2) {
    out.kind = a.multiple_response ? 'multi' : 'choice';
    out.options = choices.slice(0, 8).map((c) => cut(c, LIMIT.option));
    if (choices.length > 8) out.warn = 'Only 8 choices fit; all ' + choices.length + ': ' + choices.join(' / ');
  } else {
    out.kind = 'short';
    if (a.type === 'mc') out.warn = 'This poll had fewer than two choices, so it asks for a written answer.';
  }
  out.showTally = !!a.student_visible;
  return out;
}

// An activity's learning goal, when its author wrote one to show: never
// Course Builder's own placeholder, and never "N/a".
const GOAL_PLACEHOLDER = /^provide a concise and concrete goal/i;
function activityGoal(act) {
  const g = act && act.activity_learning_goals;
  const v = clean(g && typeof g === 'object' ? g.value : g).replace(/\\([\[\]])/g, '$1');
  if (!v || (g && g.display === false) || GOAL_PLACEHOLDER.test(v) || /^\[?n\/?a\b/i.test(v)) return null;
  return cut(plain(v), 600);
}

// The whole course. Returns { cohort, sessions, warnings, counts }.
export function convert(exported) {
  if (!exported || !exported.headers || exported.headers.version !== 1 || !Array.isArray(exported.records)) {
    throw new Error('This is not a Course Builder export this site knows (format version 1).');
  }
  const rec = exported.records;
  const course = pick(rec, 'Course')[0];
  if (!course) throw new Error('The export has no course in it.');
  const templates = {};
  pick(rec, 'SLEDocumentTemplate').forEach((t) => { templates[t.id] = t; });
  const resources = {};
  pick(rec, 'ClassResource').filter((r) => !r.deleted).forEach((r) => { resources[r.id] = r; });
  const activities = pick(rec, 'Activity');
  const steps = pick(rec, 'ActivityStep');
  const elements = pick(rec, 'ActivityElement');
  const readings = pick(rec, 'RequiredResource');
  const plans = pick(rec, 'Plan').filter((p) => !p.deleted)
    .sort((a, b) => (a.week_number || 0) - (b.week_number || 0) || (a.class_number || 0) - (b.class_number || 0) || (a.day_number || 0) - (b.day_number || 0) || a.id - b.id);

  // Resources a step points at; the rest of a class's materials become its readings.
  const used = new Set();
  elements.forEach((e) => {
    const a = e.attributes || {};
    const m = /resource_id:(\d+)/.exec(String(a.value || ''));
    if (m) used.add(Number(m[1]));
    Object.values(a.groupResources || {}).forEach((g) => { if (g && g.resource_id) used.add(Number(g.resource_id)); });
  });
  const warnings = [];
  const counts = { sessions: 0, parts: 0, slides: 0, questions: 0, breakouts: 0, featured: 0, documents: 0, readings: 0, workbooks: 0, skipped: {} };
  function skip(what) { counts.skipped[what] = (counts.skipped[what] || 0) + 1; }
  // Grading weights are kept only in the whole export (course_sources): this
  // site never scores. Outcomes come with each session, by Course Builder's
  // number; their names come from Course Builder's catalog, not the export.
  counts.gradingKept = pick(rec, 'CourseGradingWeight').length;
  const planOutcomes = {};
  const outcomes = [];
  pick(rec, 'PlanGeneralLearningOutcome').sort((a, b) => Number(a.id) - Number(b.id)).forEach((o) => {
    const n = Number(o.general_learning_outcome_id);
    if (!Number.isInteger(n) || n <= 0) return;
    const id = 'glo:' + n;
    (planOutcomes[o.plan_id] = planOutcomes[o.plan_id] || []).indexOf(id) < 0 && planOutcomes[o.plan_id].push(id);
    if (!outcomes.some((x) => x.id === id)) outcomes.push({ id, ref: n, name: null, text: null });
  });
  counts.outcomes = outcomes.length;

  const sessions = plans.map((plan, i) => {
    const number = i + 1;
    const title = oneLine(plan.topics) || ('Class ' + (plan.class_number || number));
    // Course Builder marks each field: the overview, study guide, pre-class
    // work, and big question are for students; the purpose and background
    // readings are for instructors only, so they go to the leader's notes.
    const before = [
      clean(plan.session_overview) && clean(plan.session_overview),
      clean(plan.study_guide) && '**Study guide**\n\n' + clean(plan.study_guide),
      clean(plan.pre_class_work) && '**Before class**\n\n' + clean(plan.pre_class_work),
      clean(plan.big_question) && '**The big question**\n\n' + clean(plan.big_question)
    ].filter(Boolean).join('\n\n');
    const forLeader = [
      clean(plan.purpose) && 'Purpose of the session:\n' + clean(plan.purpose),
      clean(plan.faculty_readings) && 'Background readings for you:\n' + clean(plan.faculty_readings)
    ].filter(Boolean);
    const workbooks = [];
    function workbook(link, kind) {
      const ref = 'wb:' + (link.uuid || link.name);
      if (!workbooks.some((w) => w.ref === ref)) {
        workbooks.push({ ref, kind, title: cut(link.name, 200), position: workbooks.length, source: { system: 'minerva-workbook', uuid: link.uuid || null, name: link.name } });
        counts.workbooks += 1;
      }
      return ref;
    }
    const reads = readings.filter((r) => r.plan_id === plan.id).sort(byOrder).map((r) => ({
      title: cut(oneLine(r.citation) || r.url || 'A reading', 300),
      url: /^https?:\/\//.test(r.url || '') ? r.url : null,
      note: clean(r.why_use) ? cut(r.why_use, 600) : null
    }));
    Object.values(resources).filter((r) => r.plan_id === plan.id && !used.has(r.id)).sort((a, b) => a.id - b.id).forEach((r) => {
      const link = resourceLink(r, templates);
      if (!link || !link.url) return;
      if (link.kind === 'minerva') { workbook(link, 'individual'); return; }
      reads.push({ title: cut(link.name, 300), url: link.url, note: 'Class material' });
    });
    counts.readings += reads.length;

    const scenes = [];
    activities.filter((a) => a.plan_id === plan.id).sort(byOrder).forEach((act) => {
      const goal = activityGoal(act);
      const mine = steps.filter((s) => s.activity_id === act.id).sort(byOrder);
      mine.forEach((step, si) => {
        const els = elements.filter((e) => e.activity_step_id === step.id).sort(byOrder);
        const base = oneLine(step.title) || oneLine(act.title) || 'A part';
        const stepTitle = mine.length > 1 && oneLine(act.title) && oneLine(act.title) !== base ? oneLine(act.title) + ': ' + base : base;
        const notes = [];
        if (clean(act.faculty_instructions && act.faculty_instructions.value) && si === 0) notes.push(clean(act.faculty_instructions.value));
        if (clean(step.faculty_instructions && step.faculty_instructions.value)) notes.push(clean(step.faculty_instructions.value));
        if (clean(step.engagement_prompt && step.engagement_prompt.value)) notes.push('Engagement: ' + clean(step.engagement_prompt.value));
        // Course Builder fills an empty step with "Question 1?" and "Answer 1".
        const fq = Object.values((step.focus_questions && step.focus_questions.values) || {}).filter((q) => clean(q.question) && !(/^question \d+\??$/i.test(oneLine(q.question)) && (!clean(q.answer) || /^answer \d+$/i.test(oneLine(q.answer)))));
        if (fq.length) notes.push('Focus questions:\n' + fq.map((q) => '- ' + oneLine(q.question) + (clean(q.answer) ? ' (' + oneLine(q.answer) + ')' : '')).join('\n'));

        const slides = [], shows = [], extras = [];
        let poll = [], breakout = [], results = null, feature = null, board = false, docText = [], featureCount = 0, repoll = [], compare = null;
        els.forEach((e) => {
          const a = e.attributes || {};
          if (e.type === 'poll') poll.push({ el: e, q: pollQuestion(a) });
          else if (e.type === 'breakout') breakout.push(e);
          else if (e.type === 'poll-results') results = String(a.value || '');
          else if (e.type === 'feature-user') {
            const who = a.value === 'random-student' ? 'random' : a.value === 'quiet-student' ? 'quiet' : 'teacher';
            if (who !== 'teacher') { feature = feature || who; featureCount += 1; }
          } else if (e.type === 'feature-breakout-people-and-notes' || e.type === 'feature-breakout-groups') feature = feature || 'group';
          // Asking a poll again, and showing the two side by side: the export's
          // shape for these was not seen in Ben's course, so any attribute that
          // names an earlier poll element is the one they point at.
          else if (e.type === 'repoll') repoll.push({ el: e, ref: pollRef(a) });
          else if (e.type === 'poll-comparison') compare = pollRef(a) || compare;
          else if (e.type === 'resource') {
            if (a.type === 'slide') { slidesOf(a).forEach((s) => slides.push(s)); }
            else if (a.type === 'whiteboard') { board = true; }
            else {
              const m = /resource_id:(\d+)/.exec(String(a.value || ''));
              const link = m ? resourceLink(resources[Number(m[1])], templates) : null;
              if (link && link.kind === 'minerva') workbook(link, 'individual');
              else if (link && link.url) { shows.push(link); counts.documents += 1; }
              if (clean(a.content)) docText.push(clean(a.content));
            }
          } else skip('element: ' + e.type);
        });

        function scene(kind, title, extra) {
          const s = Object.assign({ kind, title: cut(title, LIMIT.title), minutes: Math.max(1, Math.min(240, Number(step.time) || 1)), body: '', config: {}, notes: '', deck: '', ref: null, goal }, extra || {});
          scenes.push(s);
          counts.parts += 1;
          return s;
        }
        const first = [];
        repoll.forEach((rp) => {
          const earlier = rp.ref ? elements.filter((x) => String(x.id) === rp.ref && x.type === 'poll')[0] : null;
          if (!earlier) { skip('repoll without its poll'); return; }
          const q = pollQuestion(earlier.attributes || {});
          const s = scene('question', stepTitle + ' (again)', { ref: 'el:' + rp.el.id });
          s.config = { prompt: cut(oneLine(plain(q.prompt)), LIMIT.prompt) || 'What do you think?', kind: q.kind, show_tally: q.showTally, rerun_of_ref: 'el:' + earlier.id };
          if (q.options) s.config.options = q.options;
          counts.questions += 1;
          first.push(s);
        });
        poll.forEach((p, pi) => {
          const s = scene('question', poll.length > 1 ? stepTitle + ' (' + (pi + 1) + ')' : stepTitle, { ref: 'el:' + p.el.id });
          // A long poll (a passage, then its question) becomes a slide beside a
          // short question, so nothing is cut and the question stays readable
          // (found running an imported course: a 776-character poll was cut at
          // 500, mid-sentence, on every stage).
          const split = splitQuestion(oneLine(plain(p.q.prompt)), oneLine((p.el.attributes || {}).title || ''));
          s.config = { prompt: cut(split.prompt, LIMIT.prompt) || 'What do you think?', kind: p.q.kind, show_tally: p.q.showTally };
          if (split.passage) s.deck = '## ' + (split.heading || s.title) + '\n\n' + split.passage;
          if (p.q.options) s.config.options = p.q.options;
          if (clean(p.q.prompt).length > LIMIT.prompt || /\n/.test(clean(p.q.prompt))) s.body = cut(plain(p.q.prompt), LIMIT.body);
          if (p.q.warn) { warnings.push(title + ', ' + s.title + ': ' + p.q.warn); notes.push(p.q.warn); }
          counts.questions += 1;
          first.push(s);
        });
        breakout.forEach((e, bi) => {
          const a = e.attributes || {};
          const g = /groups:(\d+)(?::(\d+))?/.exec(String(a.grouping || ''));
          const names = a.groupNames || {};
          const wbRefs = [];
          const docs = Object.keys(a.groupResources || {}).sort((x, y) => Number(x) - Number(y)).map((k) => {
            const link = resourceLink(resources[(a.groupResources[k] || {}).resource_id], templates);
            if (link && link.kind === 'minerva') { wbRefs.push(workbook(link, 'group')); return null; }
            return link && link.url ? { name: cut(names[k] || ('Group ' + (Number(k) + 1)), 120), url: link.url } : null;
          }).filter(Boolean).slice(0, 40);
          const s = scene('rooms', oneLine(a.title) || (breakout.length > 1 ? stepTitle + ' (' + (bi + 1) + ')' : stepTitle), { ref: 'el:' + e.id });
          s.minutes = Math.max(1, Math.min(240, Math.round((Number(a.duration_in_seconds) || 60 * s.minutes) / 60)));
          s.config = { sorting: a.sorting === 'random' ? 'random' : 'roster' };
          // groups:<flavors>:<most per group>. Forum makes as many groups as
          // the class needs at that size and deals the flavors out in turn.
          if (g) s.config.groups = Math.max(1, Math.min(40, Number(g[1])));
          if (g && g[2]) s.config.group_size = Math.max(1, Math.min(40, Number(g[2])));
          if (docs.length) s.config.group_docs = docs;
          if (wbRefs.length) s.config.workbooks_refs = wbRefs;
          // The breakout's notes overview is for instructors only.
          if (clean(a.content)) notes.push('In the breakout:\n' + clean(a.content));
          counts.breakouts += 1;
          first.push(s);
        });
        if (!first.length) {
          // A step that features people is a talk with featuring, never a
          // Showing work part: that kind hands every learner Show my app
          // (found running an imported training course, which had no apps).
          const kind = board ? 'design' : 'talk';
          const s = scene(kind, stepTitle);
          if (feature && feature !== 'teacher') { s.config = {}; counts.featured += 1; }
          if (kind === 'design') s.config = { template: 'blank' };
          if (results || compare) s.config.results_of_ref = 'el:' + (compare || results);
          first.push(s);
        }
        // Whom to feature and how many, beside whatever else the step does
        // (a "5-up with poll" step features four people beside its poll).
        if (feature && feature !== 'group') {
          first[0].config.feature = feature;
          if (featureCount > 1) first[0].config.feature_count = Math.min(8, featureCount);
        } else if (feature === 'group' && first[0].kind === 'talk') first[0].config.feature = 'group';
        const lead = first[0];
        if (slides.length) { lead.deck = [lead.deck].concat(slides).filter(Boolean).join('\n\n---\n\n'); counts.slides += slides.length; }
        if (shows.length) {
          lead.config.show = { url: shows[0].url, name: cut(shows[0].name, 200) };
          shows.slice(1).forEach((x) => extras.push('- ' + x.name + ': ' + x.url));
        }
        if (docText.length) {
          const text = docText.join('\n\n');
          if (!lead.body) lead.body = cut(plain(text), LIMIT.body);
          else notes.push(text);
        }
        if (extras.length) notes.push('More to show:\n' + extras.join('\n'));
        if (feature === 'quiet') notes.push('Feature someone who has been quiet so far.');
        lead.notes = cut(notes.map((n) => withoutFiller(plain(n).replace(/^[ \t]*\*[ \t]+/gm, '- '))).filter((n, i, all) => n && all.indexOf(n) === i).join('\n\n'), LIMIT.notes);
        first.slice(1).forEach((s) => { if (!s.notes) s.notes = ''; });
      });
    });
    // A class with no steps still arrives, as one part with its overview.
    if (!scenes.length) scenes.push({ kind: 'talk', title: cut(title, LIMIT.title), minutes: 10, body: cut(plan.session_overview || '', LIMIT.body), config: {}, notes: '', deck: '', ref: null });
    if (forLeader.length && scenes.length) {
      scenes[0].notes = cut(forLeader.map((n) => plain(n).replace(/^[ \t]*\*[ \t]+/gm, '- ')).concat(scenes[0].notes ? [scenes[0].notes] : []).join('\n\n'), LIMIT.notes);
    }
    scenes.forEach((s, p) => { s.position = p; });
    counts.sessions += 1;
    return { number, title: cut(title, LIMIT.title), before: before ? cut(before, LIMIT.before) : null, readings: reads.length ? reads.slice(0, 60) : null, scenes, workbooks, after: null, outcomes: (planOutcomes[plan.id] || []).slice(0, 60) };
  });

  const minutes = Math.max(30, Math.min(240, Math.round(Math.max(...sessions.map((s) => s.scenes.reduce((n, x) => n + x.minutes, 0)), 60) / 15) * 15));
  return {
    cohort: {
      title: cut(oneLine(course.course_title) || 'An imported course', LIMIT.cohortTitle),
      description: clean(course.course_description) ? cut(clean(course.course_description).replace(/^#{1,6}\s+/gm, ''), LIMIT.description) : null,
      schedule: 'custom',
      outcomes: outcomes.slice(0, 300),
      session_minutes: minutes,
      details: { source: { system: 'coursebuilder', course_id: exported.headers.source_course_id, code: oneLine(course.course_code) || null, environment: exported.headers.source_environment } }
    },
    sessions,
    warnings,
    counts
  };
}
