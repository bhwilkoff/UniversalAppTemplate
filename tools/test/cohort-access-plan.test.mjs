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

// Repository roles (migration 20261022020000).
import { wantedRole, collaboratorRequest, roleOutcome, syncStep, repoName } from '../../supabase/functions/cohort-access/plan.js';

test('a leader maintains, a learner writes unless a leader chose otherwise, anyone else has no role', () => {
  assert.equal(wantedRole({ teaches: true, enrolled: false }), 'maintain');
  assert.equal(wantedRole({ teaches: true, enrolled: true, chosen: 'read' }), 'maintain');
  assert.equal(wantedRole({ teaches: false, enrolled: true }), 'write');
  assert.equal(wantedRole({ teaches: false, enrolled: true, chosen: 'read' }), 'read');
  assert.equal(wantedRole({ teaches: false, enrolled: true, chosen: 'admin' }), 'write');
  assert.equal(wantedRole({ teaches: false, enrolled: false, chosen: 'write' }), null);
});
test('roles become GitHub permissions on the repository; no role takes the person off', () => {
  assert.deepEqual(collaboratorRequest('cohort-test', 'bea', 'write'),
    { method: 'PUT', path: '/repos/humanshaped/cohort-test/collaborators/bea', body: { permission: 'push' } });
  assert.equal(collaboratorRequest('cohort-test', 'bea', 'read').body.permission, 'pull');
  assert.equal(collaboratorRequest('cohort-test', 'bea', 'maintain').body.permission, 'maintain');
  assert.deepEqual(collaboratorRequest('cohort-test', 'a/b', null), { method: 'DELETE', path: '/repos/humanshaped/cohort-test/collaborators/a%2Fb' });
  assert.equal(repoName({ github_repo: 'humanshaped/cohort-test' }), 'cohort-test');
  assert.equal(repoName({ github_repo: null }), null);
});
test('GitHub answers for a role', () => {
  assert.ok(roleOutcome('PUT', 204, null).ok);
  assert.ok(roleOutcome('DELETE', 404, null).ok);
  assert.equal(roleOutcome('PUT', 403, { message: 'Resource not accessible by integration' }).ok, false);
});
test('bringing GitHub up to date leaves alone anyone who never asked', () => {
  assert.equal(syncStep({ login: 'bea', enrolled: true, access: null }), null);
  assert.equal(syncStep({ login: 'bea', enrolled: true, access: { state: 'removed' } }), null);
  assert.equal(syncStep({ login: null, enrolled: true, access: { state: 'member' } }), null);
});
test('and changes only what differs', () => {
  assert.equal(syncStep({ login: 'bea', enrolled: true, access: { state: 'member', repo_role: 'write' } }), null);
  assert.deepEqual(syncStep({ login: 'bea', enrolled: true, chosen: 'read', access: { state: 'member', repo_role: 'write' } }), { kind: 'set-role', role: 'read' });
  assert.deepEqual(syncStep({ login: 'bea', enrolled: true, access: { state: 'member', repo_role: null } }), { kind: 'set-role', role: 'write' });
  assert.deepEqual(syncStep({ login: 'bea', enrolled: true, access: { state: 'invited' } }), { kind: 'check-invitation', role: 'write' });
  assert.deepEqual(syncStep({ login: 'bea', enrolled: true, access: { state: 'failed' } }), { kind: 'join', role: 'write' });
  assert.deepEqual(syncStep({ login: 'bea', enrolled: false, access: { state: 'member', repo_role: 'write' } }), { kind: 'remove' });
  assert.deepEqual(syncStep({ login: 'kofi', teaches: true, access: { state: 'member', repo_role: 'maintain' } }), null);
});
