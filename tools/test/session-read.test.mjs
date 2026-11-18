import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { callerOk, clean, cleanWords, driveId, due, ISSUER, AUDIENCE, MOST_TRIES } from '../../supabase/functions/session-read/logic.js';
import { WORKFLOW, WORKFLOW_PATH } from '../../supabase/functions/_shared/session-read-workflow.js';

const repo = 'cohort-a';
const good = {
  iss: ISSUER, aud: AUDIENCE, repository: 'humanshaped/cohort-a', ref: 'refs/heads/main', event_name: 'repository_dispatch',
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
  assert.equal(due(s, row({ started_at: '2026-11-11T19:00:00Z' }), now), true);
  assert.equal(due(s, row({ state: 'done', started_at: '2026-11-11T19:00:00Z' }), now), false);
  assert.equal(due(s, row({ tries: MOST_TRIES, started_at: '2026-11-11T19:00:00Z' }), now), false);
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

test('words are kept on the same terms as turns', () => {
  const r = cleanWords({ said: [{ user_id: 'a', start: 0, end: 5, text: ' Hello. ' }, { user_id: 'stranger', name: 'Guest', start: 5, end: 9, text: 'Hi.' }] }, ['a']);
  assert.deepEqual(r, [
    { user_id: 'a', name: null, started_s: 0, ended_s: 5, body: 'Hello.' },
    { user_id: null, name: 'Guest', started_s: 5, ended_s: 9, body: 'Hi.' },
  ]);
  assert.equal(cleanWords({ said: [{ start: 9, end: 5, text: 'x' }] }, []), null);
  assert.equal(cleanWords({ said: [{ start: 0, end: 5, text: '  ' }] }, []), null);
  assert.equal(cleanWords({}, []), null);
  assert.equal(cleanWords({ said: [{ start: 0, end: 5, text: 'y'.repeat(9000) }] }, [])[0].body.length, 8000);
});

test('the job says what it sends, and logs none of it', () => {
  assert.match(WORKFLOW, /what was said/);
  const run = readFileSync(new URL('../session-read/run.py', import.meta.url), 'utf8');
  const prints = run.match(/print\(.*\)/g);
  assert.deepEqual(prints, ["print('Done.')", "print('Stopped: ' + type(e).__name__)"]);
  assert.doesNotMatch(readFileSync(new URL('../session-read/words.py', import.meta.url), 'utf8'), /print\(/);
});

test('each word goes to whoever was marked, and a handoff finds the sentence end', () => {
  const code = `
import json, sys
sys.path.insert(0, 'tools/session-read')
import words
turns = [{'user_id': 'a', 'name': None, 'start': 0, 'end': 10}, {'user_id': None, 'name': 'Guest', 'start': 10, 'end': 20}]
said = [(0, 1, ' Hello'), (1, 2, ' there.'), (6, 7, ' Are'), (7, 8, ' you'), (8, 9, ' ready?'), (9, 10, ' Yes'), (10, 11, ' I'), (11, 12, ' am.'), (40, 41, ' Later.')]
print(json.dumps(words.place(said, turns)))`;
  const rows = JSON.parse(execFileSync('python3', ['-c', code], { encoding: 'utf8' }));
  assert.deepEqual(rows.map((r) => [r.user_id, r.name, r.text]), [
    ['a', null, 'Hello there. Are you ready?'],
    [null, 'Guest', 'Yes I am.'],
    [null, null, 'Later.'],
  ]);
});

test('Drive’s transcript becomes whole-second stretches, and anything else is refused', async () => {
  const { captionsFrom, hasAsrTrack, captionsUrls, captionsDue } = await import('../../supabase/functions/session-read/logic.js');
  const xml = '<?xml version="1.0" encoding="utf-8" ?><transcript><text start="4.08" dur="5.2">All right, cool. We are started feeling</text>' +
    '<text start="7.6" dur="5.959">good</text><text start="9.28" dur="4.279">about it.</text><text start="14.08" dur="5.199">Sattik&#39;s plan &amp; yours</text></transcript>';
  const lines = captionsFrom(xml);
  assert.deepEqual(lines, [
    { started_s: 4, ended_s: 14, body: 'All right, cool. We are started feeling good about it.' },
    { started_s: 14, ended_s: 20, body: 'Sattik\'s plan & yours' },
  ]);
  assert.equal(captionsFrom('<html>Error 400</html>'), null);
  assert.equal(hasAsrTrack('<transcript_list><track id="0" kind="asr" name="" lang_code="en" lang_original="English"/></transcript_list>'), true);
  assert.equal(hasAsrTrack('<transcript_list></transcript_list>'), false);
  assert.match(captionsUrls('abc_123').track, /^https:\/\/drive\.google\.com\/timedtext\?id=abc_123&v=abc_123&type=track&lang=en&kind=asr/);
  const s = { recording_url: 'https://drive.google.com/file/d/1-7GVOzynQjj-0jQ3H3inGHkO3tQgEFr9/view' };
  const now = new Date('2026-11-18T22:00:00Z');
  assert.equal(captionsDue(s, null, now), true);
  assert.equal(captionsDue(s, { recording_url: s.recording_url, state: 'done' }, now), false);
  assert.equal(captionsDue(s, { recording_url: s.recording_url, state: 'waiting', first_at: '2026-11-18T21:30:00Z', checked_at: '2026-11-18T21:55:00Z' }, now), false);
  assert.equal(captionsDue(s, { recording_url: s.recording_url, state: 'waiting', first_at: '2026-11-18T21:30:00Z', checked_at: '2026-11-18T21:50:00Z' }, now), true);
  assert.equal(captionsDue(s, { recording_url: s.recording_url, state: 'waiting', first_at: '2026-11-15T21:30:00Z', checked_at: '2026-11-18T20:00:00Z' }, now), false);
});
