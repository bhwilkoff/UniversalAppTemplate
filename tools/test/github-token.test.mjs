import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshBody, fromGitHub, stillGood, CLIENT_ID } from '../../supabase/functions/github-token/tokens.js';

test('the refresh request is the form GitHub expects, for the Human Shaped Hub app', () => {
  const b = new URLSearchParams(refreshBody(CLIENT_ID, 's3cret', 'ghr_x'));
  assert.equal(b.get('client_id'), 'Iv23littIQfinZfsRuZ9');
  assert.equal(b.get('grant_type'), 'refresh_token');
  assert.equal(b.get('refresh_token'), 'ghr_x');
});

test('GitHub’s answer becomes a new pair with their expiry times', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const r = fromGitHub({ access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_b', refresh_token_expires_in: 15811200 }, now);
  assert.equal(r.access, 'ghu_a');
  assert.equal(r.refresh, 'ghr_b');
  assert.equal(r.accessExpires, '2026-10-23T20:00:00.000Z');
});

test('a retired refresh token is a problem that says it expired', () => {
  const r = fromGitHub({ error: 'bad_refresh_token', error_description: 'The refresh token passed is incorrect or expired.' }, new Date());
  assert.equal(r.expired, true);
  assert.match(r.problem, /incorrect or expired/);
  assert.ok(fromGitHub(null, new Date()).problem);
});

test('a kept token is handed out only with more than ten minutes left', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  assert.equal(stillGood({ access_token: 'a', access_expires_at: '2026-10-23T12:30:00Z' }, now), true);
  assert.equal(stillGood({ access_token: 'a', access_expires_at: '2026-10-23T12:05:00Z' }, now), false);
  assert.equal(stillGood(null, now), false);
});
