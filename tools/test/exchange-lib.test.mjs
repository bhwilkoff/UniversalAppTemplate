import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const X = require('../../assets/exchange-lib.js');

test('the recording format prefers MP4, then WebM, then nothing', () => {
  assert.equal(X.pickFormat((t) => t.startsWith('video/mp4')), 'video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  assert.equal(X.pickFormat((t) => t === 'video/mp4'), 'video/mp4');
  assert.equal(X.pickFormat((t) => t.startsWith('video/webm')), 'video/webm;codecs=vp9,opus');
  assert.equal(X.pickFormat(() => false), '');
  assert.equal(X.pickFormat(undefined), '');
  assert.equal(X.pickFormat(() => { throw new Error('old browser'); }), '');
});

test('a file takes the extension of what was actually recorded', () => {
  assert.equal(X.extFor('video/webm;codecs=vp9,opus'), 'webm');
  assert.equal(X.extFor('video/mp4;codecs=avc1'), 'mp4');
  assert.equal(X.extFor('video/quicktime'), 'mov');
  assert.equal(X.extFor(''), 'mp4');
});

test('lengths read as a clock and as words', () => {
  assert.equal(X.clock(65), '1:05');
  assert.equal(X.clock(0), '0:00');
  assert.equal(X.lengthWords(42), '42 seconds');
  assert.equal(X.lengthWords(1), '1 second');
  assert.equal(X.lengthWords(150), '3 minutes');
});

test('times read as how long ago', () => {
  const now = new Date('2026-10-11T18:00:00Z');
  assert.equal(X.ago('2026-10-11T17:59:30Z', now), 'just now');
  assert.equal(X.ago('2026-10-11T17:00:00Z', now), '1 hour ago');
  assert.equal(X.ago('2026-10-10T17:00:00Z', now), 'yesterday');
  assert.equal(X.ago('2026-10-07T18:00:00Z', now), '4 days ago');
});

test('Drive links come only from an id that looks like one', () => {
  const d = X.drive('1AbC_def-GHIjkl');
  assert.equal(d.preview, 'https://drive.google.com/file/d/1AbC_def-GHIjkl/preview');
  assert.equal(d.thumb, 'https://lh3.googleusercontent.com/d/1AbC_def-GHIjkl=w640');
  assert.equal(d.shared, 'https://lh3.googleusercontent.com/d/1AbC_def-GHIjkl=w64');
  assert.equal(X.drive('../../x'), null);
  assert.equal(X.drive('short'), null);
});

test('a file is named for the exchange and the moment, without characters Drive or a disk would refuse', () => {
  const when = new Date(2026, 9, 11, 14, 5);
  assert.equal(X.fileName('Week 2: check-in / goals', when, 'video/mp4'), 'Human Shaped exchange, Week 2 check-in goals, 2026-10-11 14.05.mp4');
  assert.equal(X.fileName('', when, 'video/webm'), 'Human Shaped exchange, exchange, 2026-10-11 14.05.webm');
});

test('a resumable upload picks up after what Drive already has', () => {
  assert.equal(X.resumeFrom('bytes=0-1048575'), 1048576);
  assert.equal(X.resumeFrom(null), 0);
  assert.equal(X.chunkEnd(0, 100), 100);
  assert.equal(X.chunkEnd(0, 20 * 1024 * 1024), X.CHUNK);
  assert.equal(X.CHUNK % (256 * 1024), 0);
});

test('a new exchange needs a name and its opening video', () => {
  assert.match(X.checkExchange({ title: '  ', video: true }).error, /name/);
  assert.match(X.checkExchange({ title: 'Hello' }).error, /opening video/);
  assert.deepEqual(X.checkExchange({ title: ' Hello ', video: true }).row, { title: 'Hello', cohort: null });
  assert.match(X.checkExchange({ title: 'x'.repeat(121), video: true }).error, /120/);
});

test('an exchange is summed up in a sentence', () => {
  assert.equal(X.summary({ maker: { name: 'Ben' }, posts: [] }), 'Started by Ben, with no videos yet.');
  assert.equal(X.summary({ maker: { name: 'Ben' }, cohort: { title: 'Fall 2026' }, posts: [{}, {}] }), 'Started by Ben in Fall 2026, with 2 videos so far.');
});

test('recordings stop at five minutes; an existing video may run to thirty', () => {
  assert.equal(X.MAX_SECONDS, 300);
  assert.equal(X.MAX_UPLOAD_SECONDS, 1800);
});
