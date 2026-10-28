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
  assert.equal(lib.pickMime(() => true), 'video/webm;codecs=vp9,opus');
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

test('a recorder link plays through the relay; any other link does not', () => {
  const link = lib.driveUrl('1mgOsEufkb9NlIDv9Ft5ZUywydLbTYuep');
  assert.equal(lib.driveId(link), '1mgOsEufkb9NlIDv9Ft5ZUywydLbTYuep');
  assert.equal(lib.playUrl(link, 'https://relay.example/'), 'https://relay.example/v/1mgOsEufkb9NlIDv9Ft5ZUywydLbTYuep');
  assert.equal(lib.driveId('https://drive.google.com/file/d/abc'), null);
  assert.equal(lib.driveId('https://evil.example/file/d/1mgOsEufkb9NlIDv9Ft5ZUywydLbTYuep/view'), null);
  assert.equal(lib.playUrl('https://youtu.be/xyz', 'https://relay.example'), null);
  assert.equal(lib.playUrl(link, ''), null);
});

// The header of a real WebM that Chrome recorded in the meet@ test, up to
// its first Cluster: no Duration in its Info.
const HEADER = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua/2uvNeBAXPFhys7R+aFJmCDgQFV7oEBhoVWX1ZQOeCfsIIL0LqCBQRTwIEBVbCQVbGBAVW5gQFVuoEBVbuBAa6914ECc8WHva+HAU1rs4OBAoaGQV9PUFVTY6KTT3B1c0hlYWQBAgAAgLsAAAAAAOGNtYRHO4AAn4ECYmSBIA==', 'base64');

function durationOf(bytes) {
  const i = Buffer.from(bytes).indexOf(Buffer.from([0x44, 0x89, 0x88]));
  return i < 0 ? null : new DataView(bytes.buffer, bytes.byteOffset + i + 3, 8).getFloat64(0);
}

test('a WebM gets its length written into the header', () => {
  assert.equal(durationOf(new Uint8Array(HEADER)), null);
  const fixed = lib.fixDuration(new Uint8Array(HEADER), 62345);
  assert.ok(fixed);
  assert.equal(durationOf(fixed), 62345);
  assert.equal(fixed.length, HEADER.length + 11 + 7);
  // The rest of the file follows unchanged, and doing it twice keeps one Duration.
  const withCluster = new Uint8Array([...HEADER, 0x1F, 0x43, 0xB6, 0x75, 0x81, 0x00]);
  const twice = lib.fixDuration(lib.fixDuration(withCluster, 1000), 2000);
  assert.equal(durationOf(twice), 2000);
  assert.equal(Buffer.from(twice).indexOf(Buffer.from([0x44, 0x89])), Buffer.from(twice).lastIndexOf(Buffer.from([0x44, 0x89])));
  assert.deepEqual([...twice.slice(-6)], [0x1F, 0x43, 0xB6, 0x75, 0x81, 0x00]);
});

test('anything that is not a WebM header is left alone', () => {
  assert.equal(lib.fixDuration(new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]), 1000), null);
  assert.equal(lib.fixDuration(new Uint8Array(HEADER.subarray(0, 40)), 1000), null);
});
