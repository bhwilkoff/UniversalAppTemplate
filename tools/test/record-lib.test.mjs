import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/record-lib.js');

test('the recorder opens for one cohort and session', () => {
  assert.equal(lib.recordUrl('https://humanshaped.org', 'minerva-admissions-ai-research', 0), 'https://humanshaped.org/record/?c=minerva-admissions-ai-research&s=0');
});

test('the notice names the cohort and where the recording goes', () => {
  const n = lib.notice('Cohort 1');
  assert.match(n, /^I am recording this session for Cohort 1 now/);
  assert.match(n, /linked only from this cohort’s session page/);
  assert.match(n, /Breakout rooms are not recorded/);
  assert.doesNotMatch(lib.notice(''), / for  /);
});

test('the best format this browser records is chosen', () => {
  assert.equal(lib.pickMime((m) => m.startsWith('video/webm')), 'video/webm;codecs=vp9,opus');
  assert.equal(lib.pickMime((m) => m === 'video/mp4'), 'video/mp4');
  assert.equal(lib.pickMime(() => false), '');
  assert.equal(lib.pickMime(() => { throw new Error('no'); }), '');
});

test('the file is named for the session, the cohort, and the day', () => {
  const at = new Date(2026, 9, 28, 13, 0).getTime();
  assert.equal(lib.fileName('Team: 2026/2027', 0, at, 'video/webm;codecs=vp9,opus'), 'Prep, Team 2026 2027, 2026-10-28.webm');
  assert.equal(lib.fileName('', 3, at, 'video/mp4'), 'Week 3, 2026-10-28.mp4');
});

test('pieces sort in recording order and nothing else counts as one', () => {
  const names = [12, 2, 100].map(lib.pieceName).sort();
  assert.deepEqual(names, ['000002.part', '000012.part', '000100.part']);
  assert.ok(lib.isPiece('000002.part'));
  assert.ok(!lib.isPiece('meta.json'));
});

test('durations and sizes read the way people say them', () => {
  assert.equal(lib.duration(65), '1:05');
  assert.equal(lib.duration(3725), '1:02:05');
  assert.equal(lib.size(5 * 1048576), '5 MB');
  assert.equal(lib.size(1.5 * 1073741824), '1.5 GB');
  assert.equal(lib.size(10), '1 KB');
});

test('a wrong choice in the picker says what to choose instead', () => {
  assert.equal(lib.checkCapture('browser', 1), null);
  assert.match(lib.checkCapture('monitor', 0), /whole screen/);
  assert.match(lib.checkCapture('window', 1), /window/);
  assert.match(lib.checkCapture('browser', 0), /Also share tab audio/);
});

test('the session page links the Drive file', () => {
  assert.equal(lib.driveUrl('abc_123'), 'https://drive.google.com/file/d/abc_123/view');
});
