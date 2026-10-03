import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/submit-lib.js');

const S = [1, 2, 3, 4, 5].map((n) => ({ number: n, starts_at: new Date(Date.UTC(2026, 9, 20 + 7 * (n - 1), 23)).toISOString() }));
const running = { status: 'running', starts_on: '2026-10-20', weeks: 5 };
const ready = { role: 'student', status: 'enrolled', app_repo: 'bea/garden-swap', app_url: 'https://bea.github.io/garden-swap', app_public: true };

test('the window is closed before the second-to-last session', () => {
  const w = lib.submissionWindow(running, S, new Date('2026-11-10T22:59:00Z'));
  assert.equal(w.open, false);
  assert.equal(w.opensAt, S[3].starts_at);
  assert.equal(w.lastSessionAt, S[4].starts_at);
});
test('the window opens when week 4 starts, and the cohort has not ended', () => {
  const w = lib.submissionWindow(running, S, new Date('2026-11-10T23:00:00Z'));
  assert.equal(w.open, true); assert.equal(w.ended, false);
});
test('after the last session, the cohort has ended', () => {
  const w = lib.submissionWindow(running, S, new Date('2026-11-18T12:00:00Z'));
  assert.equal(w.open, true); assert.equal(w.ended, true);
});
test('sessions out of order still find the second-to-last', () => {
  const w = lib.submissionWindow(running, S.slice().reverse(), new Date('2026-11-01T00:00:00Z'));
  assert.equal(w.opensAt, S[3].starts_at);
});
test('one session: the week before it', () => {
  const w = lib.submissionWindow(running, [S[0]], new Date('2026-10-14T00:00:00Z'));
  assert.equal(w.open, true);
  assert.equal(lib.submissionWindow(running, [S[0]], new Date('2026-10-13T00:00:00Z')).open, false);
});
test('no sessions yet: counted from the first day', () => {
  assert.equal(lib.submissionWindow(running, [], new Date('2026-11-09T00:00:00Z')).open, false);
  assert.equal(lib.submissionWindow(running, [], new Date('2026-11-10T00:00:00Z')).open, true);
  assert.equal(lib.submissionWindow({ status: 'open' }, [], new Date()).open, false);
});
test('a finished cohort is always past the window', () => {
  const w = lib.submissionWindow({ status: 'finished' }, [], new Date('2020-01-01T00:00:00Z'));
  assert.equal(w.open, true); assert.equal(w.ended, true);
});

test('submitted means ready, a repository, and an https address', () => {
  assert.deepEqual(lib.submission(ready), { submitted: true, missing: [] });
  assert.deepEqual(lib.submission({ ...ready, app_public: false }).missing, ['ready']);
  assert.deepEqual(lib.submission({ ...ready, app_url: 'http://bea.example' }).missing, ['address']);
  assert.deepEqual(lib.submission({ app_public: false }).missing, ['repo', 'address', 'ready']);
});
test('what is missing reads as a list with an Oxford comma', () => {
  assert.equal(lib.missingText(['repo', 'address', 'ready'], 'student'),
    'its repository on GitHub, the address where people can use it, and your word that it is ready to show');
  assert.equal(lib.missingText(['address', 'ready'], 'teacher'), 'a live address and their word that it is ready');
  assert.equal(lib.missingText(['ready'], 'teacher'), 'their word that it is ready');
});

test('a student sees no note before the window, once submitted, or as a mentor', () => {
  const closed = { open: false };
  const open = { open: true, ended: false };
  assert.equal(lib.studentNote({ ...ready, app_public: false }, closed, null), null);
  assert.equal(lib.studentNote(ready, open, null), null);
  assert.equal(lib.studentNote({ ...ready, role: 'mentor', app_public: false }, open, null), null);
  assert.equal(lib.studentNote(null, open, null), null);
});
test('the note names what is missing and the last session', () => {
  const n = lib.studentNote({ ...ready, app_public: false }, { open: true, ended: false }, 'Tuesday, November 17');
  assert.deepEqual(n.missing, ['ready']);
  assert.match(n.text, /with the last session on Tuesday, November 17\./);
  assert.match(n.text, /Yours still needs your word that it is ready to show, which you can add under Your app below\.$/);
  assert.doesNotMatch(n.text, /—/);
});
test('after the end, the note says so, and lists several things', () => {
  const n = lib.studentNote({ role: 'student', app_repo: 'bea/x' }, { open: true, ended: true }, null);
  assert.match(n.text, /^The cohort has come to its end/);
  assert.match(n.text, /the address where people can use it and your word that it is ready to show, all of which/);
});

test('the teacher sees submitted and not yet, by name, students only', () => {
  const p = (login, extra) => ({ user_id: login, role: 'student', status: 'enrolled', profiles: { github_login: login }, ...extra });
  const people = [
    p('zed', { ...ready }),
    p('amy', { app_repo: 'amy/a' }),
    p('bo', { ...ready }),
    p('gone', { ...ready, status: 'left' }),
    p('mia', { ...ready, role: 'mentor' }),
    p('cy', { app_public: false })
  ];
  const v = lib.teacherView(people, [{ user_id: 'zed', reason: 'Names a client.' }, { user_id: 'cy', reason: null }]);
  assert.deepEqual(v.submitted.map((r) => r.person.user_id), ['bo', 'zed']);
  assert.equal(v.submitted[1].hide.reason, 'Names a client.');
  assert.equal(v.submitted[0].hide, null);
  assert.deepEqual(v.notYet.map((r) => r.person.user_id), ['amy', 'cy']);
  assert.deepEqual(v.notYet[0].missing, ['address', 'ready']);
  assert.ok(v.notYet[1].hide, 'a hide on an app that is not submitted stays visible');
});
