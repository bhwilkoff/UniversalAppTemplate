import test from 'node:test';
import assert from 'node:assert/strict';
import { callerOk, clean, driveId, due, ISSUER, AUDIENCE, MOST_TRIES } from '../../supabase/functions/session-read/logic.js';
import { WORKFLOW, WORKFLOW_PATH } from '../../supabase/functions/_shared/session-read-workflow.js';

const repo = 'cohort-a';
const good = {
  iss: ISSUER, aud: AUDIENCE, repository: 'humanshaped/cohort-a', ref: 'refs/heads/main', event_name: 'workflow_dispatch',
  workflow_ref: `humanshaped/cohort-a/${WORKFLOW_PATH}@refs/heads/main`, workflow_sha: 'a'.repeat(40),
};

test('only the real workflow of this session’s own repository may call', () => {
  assert.equal(callerOk(good, repo).ok, true);
  for (const [k, v, why] of [['repository', 'humanshaped/other', 'repository'], ['ref', 'refs/heads/mine', 'ref'], ['event_name', 'push', 'event'],
    ['workflow_ref', `humanshaped/cohort-a/.github/workflows/mine.yml@refs/heads/main`, 'workflow'], ['workflow_sha', 'x', 'sha'], ['aud', 'elsewhere', 'audience'], ['iss', 'me', 'issuer']]) {
    assert.deepEqual(callerOk({ ...good, [k]: v }, repo), { ok: false, reason: why });
  }
  assert.equal(callerOk(good, null).ok, false);
  assert.equal(callerOk(good, 'humanshaped/cohort-a').ok, true);
});

test('the job asks only to prove itself, keeps nothing, and logs no one', () => {
  assert.match(WORKFLOW, /id-token: write/);
  assert.doesNotMatch(WORKFLOW, /contents: write|secrets\.|upload-artifact/);
});

test('a recording is read once, and tried again only after it goes quiet', () => {
  const s = { recording_url: 'https://drive.google.com/file/d/abcdefghijkl/view', cohorts: { github_repo: repo } };
  const now = new Date('2026-11-11T22:00:00Z');
  const row = (x) => ({ recording_url: s.recording_url, state: 'running', tries: 1, started_at: '2026-11-11T21:30:00Z', ...x });
  assert.equal(due(s, null, now), true);
  assert.equal(due(s, row({}), now), false);
  assert.equal(due(s, row({ started_at: '2026-11-11T20:00:00Z' }), now), true);
  assert.equal(due(s, row({ state: 'done', started_at: '2026-11-11T20:00:00Z' }), now), false);
  assert.equal(due(s, row({ tries: MOST_TRIES, started_at: '2026-11-11T20:00:00Z' }), now), false);
  assert.equal(due(s, row({ state: 'done', recording_url: 'https://drive.google.com/file/d/other12345678/view' }), now), true);
  assert.equal(due({ ...s, recording_url: 'https://example.com/x' }, null, now), false);
  assert.equal(due({ ...s, cohorts: {} }, null, now), false);
});

test('a reading keeps only this cohort’s people and real times', () => {
  const r = clean({ read_seconds: 100, turns: [{ user_id: 'a', start: 0, end: 5 }, { user_id: 'stranger', name: 'Guest', start: 5, end: 9 }] }, ['a']);
  assert.deepEqual(r.turns, [{ user_id: 'a', name: null, started_s: 0, ended_s: 5 }, { user_id: null, name: 'Guest', started_s: 5, ended_s: 9 }]);
  assert.equal(clean({ read_seconds: 100, turns: [{ start: 9, end: 5 }] }, []), null);
  assert.equal(clean({ read_seconds: 10, turns: [{ start: 0, end: 500 }] }, []), null);
  assert.equal(clean({ read_seconds: 'x', turns: [] }, []), null);
  assert.equal(clean({ read_seconds: 10 }, []), null);
});

test('a Drive link gives its file', () => {
  assert.equal(driveId('https://drive.google.com/file/d/abcdefghijkl/view'), 'abcdefghijkl');
  assert.equal(driveId('https://evil.example/file/d/abcdefghijkl/view'), null);
});
