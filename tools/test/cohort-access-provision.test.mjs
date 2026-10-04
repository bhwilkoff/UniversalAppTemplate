// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  marker, mayProvision, namesFor, stepsFor, repoRequest, teamRequest, teamReadRequest,
  discussionsMutation, recorded, isAgentToken,
} from '../../supabase/functions/cohort-access/provision.js';

const cohort = { id: 'c0ffee00-0000-4000-8000-000000000001', slug: 'fall-2026', title: 'Human Shaped Software, fall', status: 'draft', github_repo: null, github_team: null };
const names = namesFor(cohort);
const mine = { description: marker(cohort.id) + ': Human Shaped Software, fall', private: true, has_discussions: false };

test('only a teacher of an unfinished cohort may ask, and never an agent', () => {
  assert.equal(mayProvision({ agent: false, cohort, teaches: true }).ok, true);
  assert.equal(mayProvision({ agent: true, cohort, teaches: true }).status, 403);
  assert.equal(mayProvision({ agent: false, cohort, teaches: false }).status, 403);
  assert.equal(mayProvision({ agent: false, cohort: null, teaches: true }).status, 404);
  assert.equal(mayProvision({ agent: false, cohort: { ...cohort, status: 'finished' }, teaches: true }).status, 409);
});

test('the names come from the slug, or from what the cohort already records', () => {
  assert.deepEqual(names, { ok: true, repo: 'fall-2026', team: 'fall-2026', recorded: false });
  const kept = namesFor({ ...cohort, github_repo: 'humanshaped/cohort-test', github_team: 'cohort-test' });
  assert.deepEqual(kept, { ok: true, repo: 'cohort-test', team: 'cohort-test', recorded: true });
  assert.equal(namesFor({ ...cohort, slug: 'Fall 2026' }).ok, false);
});

test('a new cohort gets every step, in order', () => {
  const r = stepsFor({ cohort, names, repo: null, team: null, teamCanRead: false });
  assert.deepEqual(r.steps, ['create-repo', 'turn-on-discussions', 'create-team', 'let-team-read', 'record']);
});

test('asking again finishes only what is missing', () => {
  const half = stepsFor({ cohort, names, repo: mine, team: null, teamCanRead: false });
  assert.deepEqual(half.steps, ['turn-on-discussions', 'create-team', 'let-team-read', 'record']);
  const done = stepsFor({ cohort: { ...cohort }, names: { ...names, recorded: true }, repo: { ...mine, has_discussions: true }, team: { description: '' }, teamCanRead: true });
  assert.deepEqual(done.steps, []);
});

test('a name taken by something the cohort did not make is refused, never reused', () => {
  const other = { description: 'Someone else’s project', private: true, has_discussions: true };
  assert.equal(stepsFor({ cohort, names, repo: other, team: null, teamCanRead: false }).status, 409);
  assert.equal(stepsFor({ cohort, names, repo: null, team: { description: marker('another-cohort') }, teamCanRead: false }).status, 409);
});

test('a public repository is never used for a cohort', () => {
  assert.equal(stepsFor({ cohort, names, repo: { ...mine, private: false }, team: null, teamCanRead: false }).status, 409);
});

test('the requests make a private repository, a secret team, and read access, in humanshaped', () => {
  const repo = repoRequest(cohort, names);
  assert.equal(repo.path, '/orgs/humanshaped/repos');
  assert.equal(repo.body.private, true);
  assert.ok(repo.body.description.startsWith(marker(cohort.id)));
  const team = teamRequest(cohort, names);
  assert.equal(team.body.privacy, 'secret');
  assert.equal(team.body.description, marker(cohort.id));
  const read = teamReadRequest(names);
  assert.equal(read.path, '/orgs/humanshaped/teams/fall-2026/repos/humanshaped/fall-2026');
  assert.deepEqual(read.body, { permission: 'pull' });
  assert.match(discussionsMutation('R_1').query, /hasDiscussionsEnabled: true/);
  assert.deepEqual(recorded(names), { github_repo: 'humanshaped/fall-2026', github_team: 'fall-2026' });
});

test('an agent’s token is told apart from a person’s by its client_id', () => {
  const jwt = (claims) => 'x.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.y';
  assert.equal(isAgentToken(jwt({ sub: 'u', client_id: 'claude' })), true);
  assert.equal(isAgentToken(jwt({ sub: 'u' })), false);
  assert.equal(isAgentToken('not a token'), false);
});
