import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, deltaToSlide } from '../../supabase/functions/course-import/convert.js';

// A made-up course in the shape of Course Builder's export (format version 1).
const R = (type, data) => ({ type, data });
const course = {
  headers: { version: 1, source_environment: 'https://coursebuilder.minerva.edu', source_course_id: 99 },
  records: [
    R('Course', { id: 99, course_title: 'Thinking Tools', course_code: 'TT01', course_description: '# Welcome\n\nA short course.' }),
    R('Plan', { id: 2, week_number: 1, class_number: 2, topics: 'Second', study_guide: '', purpose: 'Why two.', pre_class_work: '' }),
    R('Plan', { id: 1, week_number: 1, class_number: 1, topics: 'First', session_overview: 'What today is about.', study_guide: 'Read the guide.', purpose: 'Only for you.', faculty_readings: 'A paper for you.', pre_class_work: '[Join](https://example.com)' }),
    R('Activity', { id: 10, plan_id: 1, order: 1, title: 'Opening', faculty_instructions: { value: 'Set the tone.' }, activity_learning_goals: { value: '- Say what *you* expect.', display: true } }),
    R('ActivityStep', { id: 100, activity_id: 10, order: 1, title: 'Welcome', time: 3, faculty_instructions: { value: '' }, engagement_prompt: { value: 'Ask who has been here before.' }, focus_questions: { values: { q0: { question: 'Are they ready?', answer: 'Most are' } } } }),
    R('ActivityStep', { id: 101, activity_id: 10, order: 2, title: 'Poll', time: 2, faculty_instructions: { value: '' }, engagement_prompt: { value: '' }, focus_questions: { values: {} } }),
    R('ActivityStep', { id: 102, activity_id: 10, order: 3, title: 'Debrief', time: 4, faculty_instructions: { value: '' }, engagement_prompt: { value: '' }, focus_questions: { values: {} } }),
    R('ActivityStep', { id: 103, activity_id: 10, order: 4, title: 'Groups', time: 1, faculty_instructions: { value: '' }, engagement_prompt: { value: '' }, focus_questions: { values: {} } }),
    R('ActivityStep', { id: 104, activity_id: 10, order: 5, title: 'Someone quiet', time: 5, faculty_instructions: { value: '' }, engagement_prompt: { value: '' }, focus_questions: { values: {} } }),
    R('ActivityElement', { id: 1000, activity_step_id: 100, order: 1, type: 'feature-user', attributes: { value: 'teacher' } }),
    R('ActivityElement', { id: 1001, activity_step_id: 100, order: 2, type: 'resource', attributes: { type: 'slide', content: [{ id: 'a', delta: { ops: [{ insert: 'Hello' }, { insert: '\n', attributes: { header: 1 } }, { insert: 'One' }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'Two', attributes: { bold: true } }, { insert: '\n', attributes: { list: 'bullet' } }] } }] } }),
    R('ActivityElement', { id: 1002, activity_step_id: 100, order: 3, type: 'resource', attributes: { type: 'doc', value: 'resource_id:500', content: '**Goals**' } }),
    R('ActivityElement', { id: 1003, activity_step_id: 101, order: 1, type: 'poll', attributes: { type: 'mc', question: 'Pick one', multiple_response: true, student_visible: false, choices: { choice0: { index: 0, choice: 'A' }, choice1: { index: 1, choice: 'B' } } } }),
    R('ActivityElement', { id: 1004, activity_step_id: 102, order: 1, type: 'poll-results', attributes: { value: '1003' } }),
    R('ActivityElement', { id: 1005, activity_step_id: 103, order: 1, type: 'breakout', attributes: { title: 'Trios', sorting: 'random', grouping: 'groups:3:3', duration_in_seconds: 420, content: 'Talk it over.', groupNames: { 0: 'Group 1', 1: 'Group 2' }, groupResources: { 0: { resource_id: 501 }, 1: { resource_id: 502 } } } }),
    R('ActivityElement', { id: 1006, activity_step_id: 104, order: 1, type: 'feature-user', attributes: { value: 'quiet-student' } }),
    R('ClassResource', { id: 500, plan_id: 1, type: 'file', name: 'Goals sheet', url: 'https://course-resources.minerva.edu/uploaded_files/x/goals.pdf' }),
    R('ClassResource', { id: 501, plan_id: 1, type: 'url', name: 'G1 notes', url: 'https://docs.google.com/document/d/one/' }),
    R('ClassResource', { id: 502, plan_id: 1, type: 'url', name: 'G2 workbook', url: '', sle_document_template_id: 7 }),
    R('ClassResource', { id: 503, plan_id: 1, type: 'url', name: 'Pre-class workbook', url: '', sle_document_template_id: 8 }),
    R('SLEDocumentTemplate', { id: 7, uuid: '11111111-2222-3333-4444-555555555555', subtype: 'sled' }),
    R('SLEDocumentTemplate', { id: 8, uuid: '66666666-2222-3333-4444-555555555555', subtype: 'sled' }),
    R('RequiredResource', { id: 600, plan_id: 1, order: 1, citation: 'A reading', url: 'https://example.com/read', why_use: 'It helps.' }),
    R('CourseGradingWeight', { id: 1, type: 'polls', weight: 50 }),
    R('PlanGeneralLearningOutcome', { id: 1, plan_id: 1, general_learning_outcome_id: 8 })
  ]
};

test('a slide keeps its headline, its list, and its bold, and drops colors', () => {
  assert.equal(deltaToSlide({ ops: [{ insert: 'Title' }, { insert: '\n', attributes: { header: 1 } }, { insert: 'Line one\nLine two', attributes: { color: '#f00' } }, { insert: '\n' }] }),
    '## Title\n\nLine one\n\nLine two');
  assert.equal(deltaToSlide({ ops: [{ insert: 'A' }, { insert: '\n', attributes: { list: 'ordered' } }, { insert: 'B' }, { insert: '\n', attributes: { list: 'ordered', indent: 1 } }] }), '1. A\n  1. B');
});

test('each class is a session, in class order, named by its topic', () => {
  const r = convert(course);
  assert.deepEqual(r.sessions.map((s) => [s.number, s.title]), [[1, 'First'], [2, 'Second']]);
  assert.equal(r.cohort.schedule, 'custom');
  assert.equal(r.cohort.title, 'Thinking Tools');
  assert.equal(r.cohort.description, 'Welcome\n\nA short course.');
  assert.deepEqual(r.cohort.details.source, { system: 'coursebuilder', course_id: 99, code: 'TT01', environment: 'https://coursebuilder.minerva.edu' });
  assert.match(r.sessions[0].before, /Study guide\*\*\n\nRead the guide\./);
  assert.match(r.sessions[0].before, /\[Join\]\(https:\/\/example\.com\)/);
});

test('every element type lands somewhere, and nothing is silently dropped', () => {
  const r = convert(course);
  const s = r.sessions[0].scenes;
  assert.deepEqual(s.map((x) => x.kind), ['talk', 'question', 'talk', 'rooms', 'presenter']);
  // Slides, a document to show, and leader notes from instructions, engagement, and focus questions.
  assert.equal(s[0].deck, '## Hello\n\n- One\n- **Two**');
  assert.deepEqual(s[0].config.show, { url: 'https://course-resources.minerva.edu/uploaded_files/x/goals.pdf', name: 'Goals sheet' });
  assert.equal(s[0].body, 'Goals');
  assert.match(s[0].notes, /Set the tone\./);
  assert.match(s[0].notes, /Engagement: Ask who has been here before\./);
  assert.match(s[0].notes, /Are they ready\? \(Most are\)/);
  // A multiple-answer poll that hides its counts.
  assert.deepEqual(s[1].config, { prompt: 'Pick one', kind: 'multi', show_tally: false, options: ['A', 'B'] });
  // The debrief points at the poll's part.
  assert.equal(s[2].config.results_of_ref, 'el:1003');
  assert.equal(s[1].ref, 'el:1003');
  // A random breakout in three groups, seven minutes, with each group's document.
  assert.equal(s[3].minutes, 7);
  assert.equal(s[3].config.groups, 3);
  assert.equal(s[3].config.sorting, 'random');
  // A Minerva workbook in a breakout becomes the rooms' group workbook.
  assert.deepEqual(s[3].config.group_docs.map((d) => d.name), ['Group 1']);
  assert.deepEqual(s[3].config.workbooks_refs, ['wb:11111111-2222-3333-4444-555555555555']);
  // Someone quiet is featured.
  assert.deepEqual(s[4].config, { feature: 'quiet' });
  // A class material no step uses becomes a reading; a Minerva workbook says so.
  const reads = r.sessions[0].readings;
  assert.equal(reads[0].title, 'A reading');
  assert.equal(reads.length, 1);
  // A class's own Minerva workbook is an individual workbook on the session.
  assert.deepEqual(r.sessions[0].workbooks.map((w) => [w.kind, w.title, w.source.uuid]), [
    ['individual', 'Pre-class workbook', '66666666-2222-3333-4444-555555555555'],
    ['group', 'G2 workbook', '11111111-2222-3333-4444-555555555555']
  ]);
  assert.equal(r.counts.workbooks, 2);
  // Grading weights are kept in the whole export, never used; outcomes come
  // with their sessions, by Course Builder's number, waiting for names.
  assert.deepEqual(r.counts.skipped, {});
  assert.equal(r.counts.gradingKept, 1);
  assert.deepEqual(r.cohort.outcomes, [{ id: 'glo:8', ref: 8, name: null, text: null }]);
  assert.deepEqual(r.sessions[0].outcomes, ['glo:8']);
  // A class with no steps still arrives as one part.
  assert.equal(r.sessions[1].scenes.length, 1);
});

test('only Course Builder export version 1 is taken', () => {
  assert.throws(() => convert({ headers: { version: 2 }, records: [] }), /format version 1/);
  assert.throws(() => convert(null), /format version 1/);
});

test('long words are cut at a word, within the database limits', () => {
  const big = JSON.parse(JSON.stringify(course));
  big.records.find((r) => r.type === 'ActivityStep' && r.data.id === 100).data.title = 'word '.repeat(60);
  const r = convert(big);
  assert.ok(r.sessions[0].scenes[0].title.length <= 120);
  assert.ok(r.sessions[0].scenes[0].title.endsWith('…'));
});

test('words for the stage carry no Markdown marks, and links keep their address', () => {
  const c = JSON.parse(JSON.stringify(course));
  c.records.find((r) => r.type === 'ActivityElement' && r.data.id === 1002).data.attributes.content = '**Bold** and *soft* with [a link](https://example.com/x) and \\[brackets\\]';
  assert.equal(convert(c).sessions[0].scenes[0].body, 'Bold and soft with a link (https://example.com/x) and [brackets]');
});

test('leader notes keep their lines and lists, without Markdown marks', () => {
  const c = JSON.parse(JSON.stringify(course));
  c.records.find((r) => r.type === 'Activity').data.faculty_instructions.value = '**General guidelines**\n\n* Ask about key terms\n* Avoid telling the answers';
  const notes = convert(c).sessions[0].scenes[0].notes;
  assert.match(notes, /\n\nGeneral guidelines\n\n- Ask about key terms\n- Avoid telling the answers/);
});

test('what Course Builder marks for instructors only stays in the leader notes', () => {
  const r = convert(course);
  const first = r.sessions[0];
  assert.match(first.before, /^What today is about\./);
  assert.doesNotMatch(first.before, /Only for you/);
  assert.match(first.scenes[0].notes, /^Purpose of the session:\nOnly for you\.\n\nBackground readings for you:\nA paper for you\./);
  // The breakout's notes overview never reaches the stage.
  const rooms = first.scenes.find((x) => x.kind === 'rooms');
  assert.equal(rooms.body, '');
  assert.equal(rooms.config.prompt, undefined);
  assert.match(rooms.notes, /In the breakout:\nTalk it over\./);
  // groups:<flavors>:<most per group>
  assert.equal(rooms.config.groups, 3);
  assert.equal(rooms.config.group_size, 3);
  assert.match(r.sessions[1].scenes[0].notes, /Purpose of the session:\nWhy two\./);
});

test('a step features several beside its poll, and a repoll asks the poll again', () => {
  const c = JSON.parse(JSON.stringify(course));
  ['a', 'b', 'c', 'd'].forEach((x, i) => c.records.push(R('ActivityElement', { id: 2000 + i, activity_step_id: 101, order: 5 + i, type: 'feature-user', attributes: { value: 'random-student' } })));
  c.records.push(R('ActivityStep', { id: 105, activity_id: 10, order: 6, title: 'Again', time: 2, faculty_instructions: { value: '' }, engagement_prompt: { value: '' }, focus_questions: { values: {} } }));
  c.records.push(R('ActivityElement', { id: 2100, activity_step_id: 105, order: 1, type: 'repoll', attributes: { poll: 1003 } }));
  const s = convert(c).sessions[0].scenes;
  const poll = s.find((x) => x.ref === 'el:1003');
  assert.equal(poll.config.feature, 'random');
  assert.equal(poll.config.feature_count, 4);
  const again = s.find((x) => x.ref === 'el:2100');
  assert.equal(again.kind, 'question');
  assert.equal(again.config.rerun_of_ref, 'el:1003');
  assert.deepEqual(again.config.options, ['A', 'B']);
});

test('a part carries its activity\'s goal, never Course Builder\'s placeholder or N/a', () => {
  const r = convert(course);
  assert.equal(r.sessions[0].scenes[0].goal, '- Say what you expect.');
  const c = JSON.parse(JSON.stringify(course));
  c.records.filter((x) => x.type === 'Activity')[0].data.activity_learning_goals = { value: 'Provide a concise and concrete goal that can be evaluated at the end of the activity.', display: true };
  assert.equal(convert(c).sessions[0].scenes[0].goal, null);
  c.records.filter((x) => x.type === 'Activity')[0].data.activity_learning_goals = { value: '\\[N/a for this step\\]', display: false };
  assert.equal(convert(c).sessions[0].scenes[0].goal, null);
});

test('Course Builder\'s placeholder focus questions and repeated instructions stay out of the notes', () => {
  const c = JSON.parse(JSON.stringify(course));
  const steps = c.records.filter((x) => x.type === 'ActivityStep');
  steps[0].data.focus_questions = { values: { q0: { question: 'Question 1?', answer: 'Answer 1' }, q1: { question: 'Are they ready?', answer: '' } } };
  steps[0].data.faculty_instructions = { value: 'Set the tone.' };
  const notes = convert(c).sessions[0].scenes[0].notes;
  assert.ok(!/Question 1\?/.test(notes));
  assert.ok(/Are they ready\?/.test(notes));
  assert.equal(notes.split('Set the tone.').length, 2);
});
