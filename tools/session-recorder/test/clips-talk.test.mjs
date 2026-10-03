// Clip marks and the host's own talk share (C8), on synthetic levels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../extension/lib.js';

test('the notice promises clips go only to the cohort, and says when talk is counted', () => {
  const plain = lib.consentNotice({ cohortTitle: 'Cohort 1' });
  assert.match(plain, /any clip goes only to this cohort/);
  assert.doesNotMatch(plain, /counting how much I talk/);
  const counting = lib.consentNotice({ cohortTitle: 'Cohort 1', countingTalk: true });
  assert.match(counting, /counting how much I talk compared with everyone else/);
  assert.match(counting, /never who else talks/);
  assert.doesNotMatch(counting, /—/);
});

test('a mark is a moment with an optional word, and pressing twice is one moment', () => {
  assert.deepEqual(lib.newMark(12_345.6, '  the   demo  '), { atMs: 12_346, word: 'the demo' });
  assert.equal(lib.newMark(-5).atMs, 0);
  assert.equal(lib.newMark(0, 'x'.repeat(200)).word.length, lib.MARK_WORD_MAX);
  let marks = lib.addMark([], lib.newMark(60_000));
  marks = lib.addMark(marks, lib.newMark(61_000, 'question'));
  assert.deepEqual(marks, [{ atMs: 60_000, word: 'question' }]);
  marks = lib.addMark(marks, lib.newMark(10_000, 'first'));
  assert.deepEqual(marks.map((m) => m.atMs), [10_000, 60_000]);
});

test('a clip runs from before the mark to after it, inside the recording', () => {
  assert.deepEqual(lib.clipRange(120_000, 600_000), { startMs: 90_000, endMs: 210_000 });
  assert.deepEqual(lib.clipRange(10_000, 600_000), { startMs: 0, endMs: 100_000 });
  assert.deepEqual(lib.clipRange(580_000, 600_000), { startMs: 550_000, endMs: 600_000 });
  assert.deepEqual(lib.clipRange(580_000, null), { startMs: 550_000, endMs: 670_000 });
  assert.equal(lib.clipFilename('humanshaped-c1-2026-10-08-1700.webm', { atMs: 3_725_000, word: 'Bea demo' }),
    'humanshaped-c1-2026-10-08-1700-clip-1-02-05-bea-demo.webm');
  assert.equal(lib.clipFilename('r.webm', { atMs: 65_000, word: '' }), 'r-clip-1-05.webm');
});

// Synthetic levels in 100 ms ticks, the way the offscreen recorder feeds
// the counter. Speech is a level of 0.08, a quiet room 0.003.
function run(counter, pattern) {
  for (const [mic, tab, seconds] of pattern) {
    for (let i = 0; i < seconds * 10; i += 1) counter.add(mic, tab, 100);
  }
  return counter.totals();
}

test('the counter splits time into the host, everyone else, both, and quiet', () => {
  const t = run(lib.createTalkCounter(), [
    [0.08, 0.003, 60], // the host talks for a minute
    [0.003, 0.08, 30], // others for half a minute
    [0.08, 0.08, 10], // both at once
    [0.003, 0.003, 20], // nobody
  ]);
  // The hold carries a voice about 300 ms past each change of who is talking.
  const near = (a, b) => Math.abs(a - b) <= 700;
  assert.ok(near(t.hostMs, 60_000), String(t.hostMs));
  assert.ok(near(t.othersMs, 30_000), String(t.othersMs));
  assert.ok(near(t.bothMs, 10_000), String(t.bothMs));
  assert.ok(near(t.quietMs, 20_000), String(t.quietMs));
  assert.equal(t.hostMs + t.othersMs + t.bothMs + t.quietMs, 120_000);
  const share = lib.talkShare(t);
  assert.ok(Math.abs(share - 0.7) < 0.02, String(share));
  assert.equal(lib.talkSentence(share), 'You talked 70 percent of the time anyone was talking.');
});

test('the gaps between words do not count as quiet', () => {
  const c = lib.createTalkCounter();
  // Four seconds of words, each 200 ms long with 200 ms of quiet between.
  for (let i = 0; i < 10; i += 1) {
    c.add(0.08, 0, 100); c.add(0.08, 0, 100);
    c.add(0.003, 0, 100); c.add(0.003, 0, 100);
  }
  assert.equal(c.totals().quietMs, 0);
});

test('too little talk gives no share, and a stalled tick cannot add an hour', () => {
  assert.equal(lib.talkShare(run(lib.createTalkCounter(), [[0.08, 0.003, 20], [0.003, 0.08, 20]])), null);
  assert.equal(lib.talkShare(null), null);
  assert.equal(lib.talkSentence(null), 'There was too little talking to count a share.');
  const c = lib.createTalkCounter();
  c.add(0.08, 0, 3_600_000);
  assert.equal(c.totals().hostMs, 1000);
});

test('levels are the root mean square of the samples', () => {
  assert.equal(lib.rms([]), 0);
  assert.equal(lib.rms(new Float32Array([0.5, -0.5, 0.5, -0.5])), 0.5);
});
