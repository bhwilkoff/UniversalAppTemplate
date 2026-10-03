// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseCohort, cohortsText, thisWeekText, nextSessionText, groupText, workText, methodUrls, stagePart } from '../../supabase/functions/mcp/shape.js';

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
