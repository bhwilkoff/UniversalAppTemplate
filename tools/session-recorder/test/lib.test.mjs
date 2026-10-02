import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../extension/lib.js';

test('pickMimeType prefers VP9, falls back, and admits defeat', () => {
  assert.equal(lib.pickMimeType(() => true), 'video/webm;codecs=vp9,opus');
  assert.equal(lib.pickMimeType((t) => !t.includes('vp9')), 'video/webm;codecs=vp8,opus');
  assert.equal(lib.pickMimeType((t) => t === 'video/webm'), 'video/webm');
  assert.equal(lib.pickMimeType(() => false), null);
});

test('recordingFilename is stable, sortable and safe', () => {
  const d = new Date(2026, 9, 20, 17, 5);
  assert.equal(lib.recordingFilename({ cohortId: 'c1', startedAt: d }), 'humanshaped-c1-2026-10-20-1705.webm');
  assert.equal(lib.recordingFilename({ cohortId: 'Fall Cohort / #2', startedAt: d }), 'humanshaped-fall-cohort-2-2026-10-20-1705.webm');
  assert.equal(lib.recordingFilename({ cohortId: '', startedAt: d.getTime() }), 'humanshaped-session-2026-10-20-1705.webm');
  assert.throws(() => lib.recordingFilename({ cohortId: 'c1', startedAt: 'not a date' }));
});

test('consent notice names the cohort, the audience, and the way out', () => {
  const text = lib.consentNotice({ cohortTitle: 'Cohort 1' });
  assert.match(text, /recording this session for Cohort 1/);
  assert.match(text, /only to this cohort/);
  assert.match(text, /camera off/);
  assert.match(text, /Breakout rooms are not recorded, and I will stop the recording/);
  assert.doesNotMatch(text, /\u2014/, 'no em dashes');
  assert.match(lib.consentNotice(), /^I am recording this session now/);
  assert.match(lib.stopNotice(), /stopped recording/);
});

test('parseFolderId takes IDs and the links people actually paste', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  assert.equal(lib.parseFolderId(id), id);
  assert.equal(lib.parseFolderId(`https://drive.google.com/drive/folders/${id}?usp=sharing`), id);
  assert.equal(lib.parseFolderId(`https://drive.google.com/drive/u/1/folders/${id}`), id);
  assert.equal(lib.parseFolderId(`https://drive.google.com/open?id=${id}`), id);
  assert.equal(lib.parseFolderId('  '), null);
  assert.equal(lib.parseFolderId('not a folder'), null);
});

test('parseCohortList reads the meet-events line format and reports bad lines', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  const { cohorts, errors } = lib.parseCohortList(`# comment\nc1 | Cohort 1, fall 2026 | ${id}\n\nc2 | Cohort 2 | https://drive.google.com/drive/folders/${id}`);
  assert.deepEqual(errors, []);
  assert.deepEqual(cohorts, [
    { id: 'c1', label: 'Cohort 1, fall 2026', folderId: id },
    { id: 'c2', label: 'Cohort 2', folderId: id },
  ]);
  const bad = lib.parseCohortList('c1 | only two\nc2 | x | nope');
  assert.equal(bad.cohorts.length, 0);
  assert.equal(bad.errors.length, 2);
  assert.equal(lib.parseCohortList(lib.formatCohortList(cohorts)).cohorts.length, 2);
});

test('upload chunk sizes respect Drive\'s 256 KiB rule', () => {
  assert.equal(lib.uploadChunkSize(), 8 * 1024 * 1024);
  assert.equal(lib.uploadChunkSize(1000), 256 * 1024);
  assert.equal(lib.uploadChunkSize(300 * 1024) % (256 * 1024), 0);
  assert.equal(lib.contentRange(0, 524288, 2000000), 'bytes 0-524287/2000000');
});

test('Range header parsing and status classes', () => {
  assert.equal(lib.nextOffsetFromRange(null), 0);
  assert.equal(lib.nextOffsetFromRange('bytes=0-42'), 43);
  assert.equal(lib.classifyUploadStatus(200), 'done');
  assert.equal(lib.classifyUploadStatus(201), 'done');
  assert.equal(lib.classifyUploadStatus(308), 'incomplete');
  assert.equal(lib.classifyUploadStatus(401), 'auth');
  assert.equal(lib.classifyUploadStatus(404), 'expired');
  assert.equal(lib.classifyUploadStatus(503), 'retry');
  assert.equal(lib.classifyUploadStatus(400), 'fatal');
  assert.equal(lib.backoffMs(10), 30000);
});

test('a 90-minute session at standard quality stays under 2 GB', () => {
  const bytes = lib.estimateBytes('standard', 90);
  assert.ok(bytes > 1e9 && bytes < 2e9, `got ${bytes}`);
  assert.ok(lib.estimateBytes('smaller', 90) < bytes);
});

test('formatting helpers', () => {
  assert.equal(lib.formatDuration(65_000), '1:05');
  assert.equal(lib.formatDuration(5_400_000), '1:30:00');
  assert.equal(lib.formatBytes(512), '512 B');
  assert.equal(lib.formatBytes(1.5 * 1024 ** 3), '1.5 GB');
});

test('isMeetUrl only accepts a Meet call', () => {
  assert.ok(lib.isMeetUrl('https://meet.google.com/abc-defg-hij'));
  assert.ok(lib.isMeetUrl('https://meet.google.com/abc-defg-hij?authuser=1'));
  assert.ok(!lib.isMeetUrl('https://meet.google.com/'));
  assert.ok(!lib.isMeetUrl('https://meet.google.com.evil.example/abc-defg-hij'));
  assert.ok(!lib.isMeetUrl('http://meet.google.com/abc-defg-hij'));
  assert.ok(!lib.isMeetUrl(undefined));
});

test('the placeholder client ID is recognized', () => {
  assert.ok(lib.isPlaceholderClientId('REPLACE_WITH_CLIENT_ID.apps.googleusercontent.com'));
  assert.ok(lib.isPlaceholderClientId(undefined));
  assert.ok(!lib.isPlaceholderClientId('1234-abcd.apps.googleusercontent.com'));
});
