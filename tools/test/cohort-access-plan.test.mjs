// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, outcome } from '../../supabase/functions/cohort-access/plan.js';

const cohort = { github_team: 'cohort-fall-2026' };
const path = '/orgs/humanshaped/teams/cohort-fall-2026/memberships/bea';

test('an enrolled student is added to the team as a member', () => {
  assert.deepEqual(plan({ action: 'join', login: 'bea', cohort, enrollment: { status: 'enrolled' }, teaches: false }),
    { ok: true, method: 'PUT', path, body: { role: 'member' } });
});
test('a teacher is added as a maintainer, without enrolling', () => {
  assert.deepEqual(plan({ action: 'join', login: 'bea', cohort, enrollment: null, teaches: true }).body, { role: 'maintainer' });
});
test('someone not in the cohort cannot join its team', () => {
  assert.equal(plan({ action: 'join', login: 'bea', cohort, enrollment: null, teaches: false }).status, 403);
  assert.equal(plan({ action: 'join', login: 'bea', cohort, enrollment: { status: 'left' }, teaches: false }).status, 403);
});
test('leaving the team is only for someone who has left the cohort', () => {
  assert.deepEqual(plan({ action: 'leave', login: 'bea', cohort, enrollment: { status: 'left' }, teaches: false }),
    { ok: true, method: 'DELETE', path });
  assert.equal(plan({ action: 'leave', login: 'bea', cohort, enrollment: { status: 'enrolled' }, teaches: false }).status, 409);
});
test('a cohort without a team, a missing cohort, and an unknown action are refused', () => {
  assert.equal(plan({ action: 'join', login: 'bea', cohort: {}, enrollment: { status: 'enrolled' } }).status, 409);
  assert.equal(plan({ action: 'join', login: 'bea', cohort: null }).status, 404);
  assert.equal(plan({ action: 'promote', login: 'bea', cohort, enrollment: { status: 'enrolled' } }).status, 400);
});
test('names are escaped into the GitHub path', () => {
  assert.equal(plan({ action: 'leave', login: 'a/b', cohort, enrollment: null, teaches: false }).path,
    '/orgs/humanshaped/teams/cohort-fall-2026/memberships/a%2Fb');
});
test('GitHub answers become member, invited, removed, or failed', () => {
  assert.equal(outcome('PUT', 200, { state: 'active' }).state, 'member');
  assert.equal(outcome('PUT', 200, { state: 'pending' }).state, 'invited');
  assert.equal(outcome('DELETE', 204, null).state, 'removed');
  assert.equal(outcome('DELETE', 404, { message: 'Not Found' }).state, 'removed');
  assert.deepEqual(outcome('PUT', 422, { message: 'Validation Failed' }), { state: 'failed', detail: 'GitHub answered 422: Validation Failed' });
});
