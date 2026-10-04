// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseCohort, cohortsText, thisWeekText, nextSessionText, groupText, workText, methodUrls, stagePart, thisSessionText, teacherCohort, rosterText, studentWorkText, classNowText, TEACHER_ASIDE, ownAppText, ownReviewPrompt } from '../../supabase/functions/mcp/shape.js';

const a = { slug: 'fall-2026', title: 'Fall 2026', status: 'running', weeks: 5, starts_on: '2026-10-06', role: 'student' };
const b = { slug: 'winter-2027', title: 'Winter 2027', status: 'open', weeks: 5, starts_on: null, role: 'teacher' };

test('a question without a cohort goes to the only one, or the running one, or asks', () => {
  assert.equal(chooseCohort([a], undefined).cohort, a);
  assert.equal(chooseCohort([a, b], undefined).cohort, a);
  assert.match(chooseCohort([a, { ...b, status: 'running' }], undefined).text, /say which one/);
  assert.match(chooseCohort([], undefined).text, /not in a cohort yet/);
  assert.match(chooseCohort([a], 'nope').text, /not in a cohort called "nope"/);
  assert.equal(chooseCohort([a, b], 'winter-2027').cohort, b);
});

test('the cohort list says each role and links each cohort page', () => {
  const t = cohortsText([a, b]);
  assert.match(t, /You are a student\./);
  assert.match(t, /You are its teacher\./);
  assert.match(t, /cohort\/\?c=fall-2026/);
  assert.match(t, /dates to come/);
});

test('this week names the challenge, the stages, and where to read them', () => {
  const t = thisWeekText(a, { current: { number: 2, title: 'Going native', scope: 'Run it on a second platform.' } }, ['02', '03'], 'Tuesdays at 5:00 PM MDT.');
  assert.match(t, /Week 2: Going native/);
  assert.match(t, /challenge, in the teacher's words: Run it on a second platform\./);
  assert.match(t, /02 \(method part "stage-02"/);
  assert.match(thisWeekText(a, { current: null }, [], ''), /No sessions are scheduled yet/);
});

test('the next session lists the agenda and what was shared, or says nothing was', () => {
  const parts = [{ start: 0, minutes: 5, name: 'Arrive', what: 'One line.' }];
  const t = nextSessionText(a, { next: { number: 3, meet_url: 'https://meet.google.com/x' }, live: false }, parts, 'Tuesday', []);
  assert.match(t, /Minute 0, 5 min, Arrive/);
  assert.match(t, /meet\.google\.com\/x/);
  assert.match(t, /have not shared anything since the last session/);
  assert.match(nextSessionText(a, { next: null }, [], '', []), /no session still to come/);
});

test('a group shows partners by GitHub name and repository, never email', () => {
  const t = groupText(a, { name: 'Trio A', expectations: 'Check in Fridays.' }, [{ login: 'cal', app_name: 'Seed Swap', app_repo: 'cal/seed-swap', email: 'cal@example.org' }]);
  assert.match(t, /@cal, building Seed Swap, https:\/\/github\.com\/cal\/seed-swap/);
  assert.doesNotMatch(t, /example\.org/);
  assert.match(groupText(a, null, []), /not in a group yet/);
});

test('feedback is marked as from the teacher, a classmate, or yourself', () => {
  const shares = [{ kind: 'for-feedback', note: 'Card order?', created_at: '2026-10-08T00:00:00Z', feedback: [
    { author_id: 't1', body: 'Lead with the swap list.' }, { author_id: 'c1', body: 'Nice.' }, { author_id: 'me', body: 'Thanks!' }] }];
  const t = workText(a, { app_name: 'Plant Swap', app_repo: 'me/plant-swap' }, shares, ['t1'], 'me');
  assert.match(t, /Feedback from your teacher: Lead with the swap list\./);
  assert.match(t, /Feedback from a classmate: Nice\./);
  assert.match(t, /Feedback from you: Thanks!/);
  assert.match(workText(a, null, [], [], 'me'), /not shared anything/);
});

test('method parts map to template files, and stage 00 is "why"', () => {
  assert.equal(methodUrls('review-skill').github, 'https://github.com/bhwilkoff/UniversalAppTemplate/blob/main/.claude/skills/human-shaped-review/SKILL.md');
  assert.equal(methodUrls('nope'), null);
  assert.equal(stagePart('00'), 'why');
  assert.equal(stagePart('04'), 'stage-04');
});

test('this session gives your place in the queue and the open questions, and never answers for you', () => {
  const queue = [
    { user_id: 'c1', login: 'cal', label: 'Commit 9f3e2a1 in cal/seed-swap', url: 'https://github.com/cal/seed-swap/commit/9f3e2a1', note: 'The date picker', state: 'waiting', created_at: '2026-10-20T23:10:00Z' },
    { user_id: 'me', login: 'bea', label: 'The app, live at bea.github.io/garden-swap', url: 'https://bea.github.io/garden-swap/', state: 'waiting', created_at: '2026-10-20T23:05:00Z' },
    { user_id: 'd1', login: 'dee', label: 'x', url: 'https://x.org', state: 'shown', created_at: '2026-10-20T23:00:00Z' }
  ];
  const checks = [
    { id: 'k1', prompt: 'Which platform next?', choices: ['Android', 'iPhone'], state: 'open' },
    { id: 'k2', prompt: 'What is the matrix for?', choices: null, state: 'open' },
    { id: 'k3', prompt: 'Closed one', choices: null, state: 'closed' }
  ];
  const t = thisSessionText(a, { number: 2 }, true, queue, checks, [{ check_id: 'k1', choice: 2 }], { k1: [{ choice: 1, answers: 3 }, { choice: 2, answers: '1' }] }, 'me');
  assert.match(t, /week 2 \(happening now\)/);
  assert.match(t, /2 waiting to be shown, 1 already shown\./);
  assert.match(t, /Yours, number 1 in line: The app, live at bea\.github\.io\/garden-swap/);
  assert.doesNotMatch(t, /cal|date picker/, 'classmates\' items are counted, never described');
  assert.match(t, /You answered: iPhone/);
  assert.match(t, /Count so far, with no names: Android 3, iPhone 1\./);
  assert.match(t, /"What is the matrix for\?" \(answered in their own words\)\n  You have not answered yet\./);
  assert.doesNotMatch(t, /Closed one/);
  assert.match(t, /Do not write or suggest an answer/);
  assert.match(t, /read-only/);
});

test('this session says plainly when nothing is happening', () => {
  assert.match(thisSessionText(a, null, false, [], [], [], {}, 'me'), /no sessions are scheduled yet/);
  const t = thisSessionText(a, { number: 1 }, false, [], [], [], {}, 'me');
  assert.match(t, /not live yet/);
  assert.match(t, /nothing is in the queue yet/);
  assert.match(t, /no question is open right now/);
});

test('a student sees the notes their teacher sent them, newest first', () => {
  const t = workText(a, null, [], [], 'me', [{ body: 'Bring the sync question.', created_at: '2026-10-14T00:00:00Z' }, { body: 'Welcome.', created_at: '2026-10-07T00:00:00Z' }]);
  assert.match(t, /Notes from your teacher, to you alone:\n- 2026-10-14: Bring the sync question\.\n- 2026-10-07: Welcome\./);
  assert.doesNotMatch(workText(a, null, [], [], 'me'), /Notes from your teacher/);
});

// Teachers' tools (C6).
const t1 = { slug: 'fall-2026', title: 'Fall 2026', status: 'running', role: 'teacher' };
const t2 = { slug: 'spring-2027', title: 'Spring 2027', status: 'open', role: 'teacher' };
const s1 = { slug: 'other', title: 'Other', status: 'running', role: 'student' };

test('the teachers\' tools refuse anyone who does not teach the cohort', () => {
  assert.match(teacherCohort([s1], undefined).text, /for the teachers of a cohort, and you are not one of Other's teachers/);
  assert.match(teacherCohort([s1, t1], 'other').text, /not one of Other's teachers.*my_work/);
  assert.match(teacherCohort([], undefined).text, /do not teach one/);
  assert.match(teacherCohort([t1], 'nope').text, /do not teach a cohort called "nope"\. The cohorts you teach: fall-2026/);
  assert.equal(teacherCohort([s1, t1], undefined).cohort, t1);
  assert.equal(teacherCohort([t1, t2], undefined).cohort, t1);
  assert.match(teacherCohort([t1, { ...t2, status: 'running' }], undefined).text, /say which one/);
  assert.equal(teacherCohort([t1, t2], 'spring-2027').cohort, t2);
});

const people = [
  { user_id: 'b', status: 'enrolled', role: 'student', app_name: 'Garden Swap', app_repo: 'bea/garden-swap', app_url: 'https://bea.github.io/garden-swap', app_public: true, profiles: { github_login: 'bea', display_name: 'Bea' }, email: 'bea@example.org' },
  { user_id: 'c', status: 'enrolled', role: 'mentor', app_repo: null, profiles: { github_login: 'cal' } },
  { user_id: 'd', status: 'left', role: 'student', profiles: { github_login: 'dee' } },
];

test('the roster names everyone still in the cohort with their app, and never an email', () => {
  const t = rosterText(t1, people, [{ name: 'Trio A', expectations: 'Fridays', group_members: [{ user_id: 'b' }, { user_id: 'c' }] }]);
  assert.match(t, /the people in it \(2\)/);
  assert.match(t, /- Bea \(@bea\), student, building Garden Swap, https:\/\/github\.com\/bea\/garden-swap, live at https:\/\/bea\.github\.io\/garden-swap, they have said it is ready to show/);
  assert.match(t, /- cal \(@cal\), mentor, no repository given yet/);
  assert.match(t, /Trio A: Bea, cal\. For: Fridays/);
  assert.doesNotMatch(t, /dee|example\.org/);
  assert.match(t, /GitHub's own MCP server, connected read-only/);
  assert.ok(t.endsWith(TEACHER_ASIDE));
});

test('the teacher aside says it is read-only and the feedback is the teacher\'s to give or not', () => {
  assert.match(TEACHER_ASIDE, /read-only/);
  assert.match(TEACHER_ASIDE, /the teacher's to give or not/);
  assert.match(TEACHER_ASIDE, /never sends what an agent wrote/);
});

test('a student\'s work shows their marks, answers, queue, feedback both ways, and notes, by name', () => {
  const work = {
    shares: [{ id: 'bb', kind: 'bring-back', note: 'Round three', url: 'https://bea.github.io/garden-swap', created_at: '2026-10-12T00:00:00Z', want_to_know: 'Does the list read?', readiness: 'not-yet', missing: 'offline', feedback: [
      { author_id: 't', body: 'Try it on the train.', created_at: '2026-10-14T00:00:00Z' }, { author_id: 'c', body: 'Nice.', created_at: '2026-10-13T00:00:00Z' }, { author_id: 'b', body: 'Thanks', created_at: '2026-10-15T00:00:00Z' }] }],
    confirmations: [{ share_id: 'bb', user_id: 'c' }],
    answers: [{ week: 2, prompt: 'What is still muddy?', text: 'Sync' }],
    queue: [{ week: 2, label: 'The app, live at bea.github.io/garden-swap', url: 'https://bea.github.io/garden-swap', state: 'shown' }],
    given: [{ to: 'c', body: 'The colors help.', created_at: '2026-10-13T00:00:00Z' }],
    notes: [{ author_id: 't', body: 'Glad you came.', created_at: '2026-10-15T00:00:00Z' }],
  };
  const t = studentWorkText(t1, people[0], work, { t: 'Ben', c: 'Cal', b: 'Bea' }, ['t'], 't');
  assert.match(t, /^Bea \(@bea\) in Fall 2026/);
  assert.match(t, /Their question: Does the list read\?/);
  assert.match(t, /Their own mark: not yet, because offline\./);
  assert.match(t, /Seen working on a device by Cal\./);
  assert.match(t, /Feedback from Cal \(a classmate\): Nice\.\n    Feedback from you \(a teacher\): Try it on the train\.\n    Feedback from Bea \(themselves\): Thanks/);
  assert.match(t, /Week 2, "What is still muddy\?": Sync/);
  assert.match(t, /Week 2, The app, live at bea\.github\.io\/garden-swap .*, shown/);
  assert.match(t, /to Cal: The colors help\./);
  assert.match(t, /from you: Glad you came\./);
  assert.doesNotMatch(t, /example\.org/);
  assert.ok(t.endsWith(TEACHER_ASIDE));
  const empty = studentWorkText(t1, people[1], {}, {}, ['t'], 't');
  assert.match(empty, /have not shared anything/);
  assert.match(empty, /have not answered a check/);
});

test('class now gives the part, the queue by name, answers by name, and commits since the start', () => {
  const t = classNowText(t1, {
    session: { number: 2 }, live: true, started: true, part: { name: 'Start', start: 57, minutes: 9 },
    queue: [
      { name: 'Cal', label: 'Commit 9f3e2a1 in cal/x', url: 'https://github.com/cal/x/commit/9f3e2a1', state: 'waiting', created_at: '2026-10-13T23:20:00Z' },
      { name: 'Bea', label: 'The app', url: 'https://bea.github.io/garden-swap', note: 'the list', state: 'waiting', created_at: '2026-10-13T23:10:00Z' },
      { name: 'Fay', label: 'A link', url: 'https://x.org', state: 'shown', created_at: '2026-10-13T23:00:00Z' },
    ],
    checks: [{ prompt: 'What is still muddy?', choices: null, state: 'open', answers: [{ name: 'Bea', text: 'Sync' }] }, { prompt: 'Closed', state: 'closed', answers: [] }],
    commits: [{ date: '2026-10-13T23:40:00Z', name: 'Bea', repo: 'bea/garden-swap', line: 'Sort the list', agent: 'Claude', url: 'https://github.com/bea/garden-swap/commit/abc' }],
    unread: 'cal/x is private or moved, so its commits are not shown.',
  });
  assert.match(t, /week 2 \(happening now\)/);
  assert.match(t, /the part now is "Start" \(minute 57, for 9 minutes\)/);
  assert.match(t, /2 waiting, 1 shown\.\n1\. Bea: The app .*"the list"\n2\. Cal: /);
  assert.match(t, /Open check: "What is still muddy\?" 1 answered\.\n- Bea: Sync/);
  assert.doesNotMatch(t, /Closed/);
  assert.match(t, /- 23:40 UTC, Bea in bea\/garden-swap: Sort the list \(with Claude\) https:\/\/github\.com\/bea\/garden-swap\/commit\/abc/);
  assert.match(t, /cal\/x is private or moved/);
  assert.ok(t.endsWith(TEACHER_ASIDE));
});

test('class now says plainly when there is no session, or it has not begun', () => {
  assert.match(classNowText(t1, { session: null }), /no sessions are scheduled yet/);
  const t = classNowText(t1, { session: { number: 1 }, live: false, started: false, queue: [], checks: [], commits: [] });
  assert.match(t, /it has not begun yet/);
  assert.match(t, /nothing is in the queue/);
  assert.match(t, /no question is open/);
  assert.match(t, /the session has not begun, so nothing has been pushed/);
  assert.match(classNowText(t1, { session: { number: 1 }, live: false, started: true, queue: [], checks: [], commits: [] }), /since the session began: none yet/);
});

test('someone building on their own hears about their own app and their own marks, never compared with anyone', () => {
  const app = { app_repo: 'kim/tide-log', app_name: 'Tide Log', app_url: 'https://kim.github.io/tide-log/', public: true };
  const marks = [
    { stage: '02', item: 'ready', state: 'not-yet', note: null },
    { stage: '01', item: 'ready', state: 'ready', note: null },
    { stage: '01', item: 'step-2', state: 'done', note: null },
    { stage: '01', item: 'note', state: 'kept', note: 'The tide chart on my phone.' },
  ];
  const t = ownAppText(app, null, marks);
  assert.match(t, /^Working on your own, outside any cohort/);
  assert.match(t, /Repository: https:\/\/github\.com\/kim\/tide-log/);
  assert.match(t, /shown, at https:\/\/humanshaped\.org\/apps\/app\/\?r=kim\/tide-log/);
  assert.ok(t.indexOf('Stage 01: ready to move on') < t.indexOf('Stage 02: not yet'));
  assert.match(t, /method part "stage-01"/);
  assert.match(t, /Stage 01: The tide chart on my phone\./);
  assert.doesNotMatch(t, /step-2/);
  assert.match(t, /its feedback is an AI's/);
});

test('a private, hidden, or missing own app is said plainly', () => {
  assert.match(ownAppText({ app_repo: 'a/b', public: false }, null, []), /private to you/);
  assert.match(ownAppText({ app_repo: 'a/b', public: true }, { reason: 'unsafe' }, []), /kept off the apps page.*because: unsafe\. Your own switch is unchanged/);
  assert.match(ownAppText(null, null, []), /account\/#own-app/);
  assert.match(ownAppText(null, null, [{ stage: 'setup', item: 'ready', state: 'ready' }]), /Setup: ready to move on \(method part "setup"\)/);
});

test('the review for someone on their own reads my_app and the method, labels itself as AI, and shares nothing', () => {
  const t = ownReviewPrompt();
  assert.match(t, /call my_app/);
  assert.match(t, /method with part "review-skill"/);
  assert.match(t, /first one I have not marked ready/);
  assert.match(t, /AI feedback/);
  assert.match(t, /no scores or grades/);
  assert.match(t, /do not compare me with anyone/);
  assert.match(t, /Do not share it anywhere/);
  assert.doesNotMatch(t, /cohort page|this_week/);
});

test('the own review can be pointed at one stage, and setup by name', () => {
  assert.match(ownReviewPrompt('03'), /method part "stage-03"/);
  assert.match(ownReviewPrompt('setup'), /method part "setup"/);
  assert.match(chooseCohort([], undefined).text, /review_my_own_work/);
});

test('an agent reads every kind of question, its own answer, and the results with no names (R4)', () => {
  const checks = [
    { id: 'm', kind: 'multi', prompt: 'Which did you try?', choices: ['Tests', 'Docs'], state: 'open' },
    { id: 'r', kind: 'rank', prompt: 'Order these', choices: ['Speed', 'Care'], state: 'open' },
    { id: 's', kind: 'scale', prompt: 'How sure?', choices: ['Not', 'Very'], points: 5, state: 'open' },
    { id: 'w', kind: 'words', prompt: 'One word', choices: null, state: 'open' }
  ];
  const mine = [{ check_id: 'm', value: [2, 1] }, { check_id: 'r', value: [2, 1] }, { check_id: 's', choice: 4 }];
  const results = { m: { kind: 'multi', total: 2, counts: [2, 1] }, w: { kind: 'words', total: 2, words: [{ word: 'calm', count: 2 }] } };
  const t = thisSessionText(a, { number: 2 }, true, [], checks, mine, results, 'me');
  assert.match(t, /Choose any that fit: 1\. Tests; 2\. Docs\./);
  assert.match(t, /You answered: Docs; Tests/);
  assert.match(t, /You answered: Care, then Speed/);
  assert.match(t, /A scale from 1 to 5, where 1 is "Not" and 5 is "Very"\.\n  You answered: 4 of 5/);
  assert.match(t, /Count so far, with no names: Tests 2, Docs 1\./);
  assert.match(t, /Words so far, with no names: calm \(2\)\./);
});
