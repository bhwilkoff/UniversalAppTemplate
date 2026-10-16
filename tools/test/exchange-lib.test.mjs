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
  assert.equal(X.mediaUrl('1AbC_def-GHIjklmnopqrst', 'https://relay.example/'), 'https://relay.example/v/1AbC_def-GHIjklmnopqrst');
  assert.equal(X.mediaUrl('1AbC_def-GHIjklmnopqrst', 'https://relay.example', 'video/quicktime'), 'https://relay.example/v/1AbC_def-GHIjklmnopqrst?type=video%2Fquicktime');
  assert.equal(X.mediaUrl('1AbC_def-GHIjklmnopqrst', 'https://relay.example', 'video/webm;codecs=vp9'), 'https://relay.example/v/1AbC_def-GHIjklmnopqrst?type=video%2Fwebm');
  assert.equal(X.mediaUrl('1AbC_def-GHIjklmnopqrst', ''), null);
  assert.equal(X.mediaUrl('../x', 'https://relay.example'), null);
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

test('who reacted reads as people, with an Oxford comma', () => {
  assert.equal(X.names(['Ana']), 'Ana');
  assert.equal(X.names(['Ana', 'Ben']), 'Ana and Ben');
  assert.equal(X.names(['Ana', 'Ben', 'Cy']), 'Ana, Ben, and Cy');
  assert.equal(X.names(['Ana', 'Ben', 'Cy', 'Di']), 'Ana, Ben, and 2 others');
  assert.equal(X.names(['Ana', 'Ben', 'Cy', 'Di', 'Ed', 'Flo']), 'Ana, Ben, and 4 others');
});

test('the thread nests two levels under the prompt, in time order, and deeper answers join their branch', () => {
  const P = (id, reply_to) => ({ id, reply_to: reply_to || null });
  const posts = [P('prompt'), P('maya', 'prompt'), P('sam', null), P('jo', 'maya'), P('ana', 'jo'), P('lee', 'sam'), P('kim', 'prompt'), P('ray', 'ana')];
  const t = X.threadOrder(posts);
  assert.deepEqual(t.map((x) => x.post.id + ':' + x.depth), ['prompt:0', 'maya:1', 'jo:2', 'ana:2', 'ray:2', 'sam:1', 'lee:2', 'kim:1']);
  assert.deepEqual(t.filter((x) => x.depth === 2).map((x) => x.post.id + '<' + x.parent.id + '@' + x.branch), ['jo<maya@maya', 'ana<jo@maya', 'ray<ana@maya', 'lee<sam@sam']);
  assert.equal(t[1].parent.id, 'prompt');
  assert.equal(t[5].parent, null);
});

test('an answer to a removed video becomes a response of its own, and an empty thread is empty', () => {
  const t = X.threadOrder([{ id: 'p' }, { id: 'x', reply_to: 'gone' }, { id: 'y', reply_to: 'x' }]);
  assert.deepEqual(t.map((x) => x.post.id + ':' + x.depth), ['p:0', 'x:1', 'y:2']);
  assert.equal(t[1].parent, null);
  assert.deepEqual(X.threadOrder([]), []);
});

test('a phone gets the steps for its own screen recorder, a computer none', () => {
  assert.equal(X.phoneKind('Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X)', 5), 'ios');
  assert.equal(X.phoneKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5), 'ios');
  assert.equal(X.phoneKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 0), null);
  assert.equal(X.phoneKind('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/141.0 Mobile', 5), 'android');
  assert.equal(X.phoneKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0', 10), null);
  assert.equal(X.phoneKind(undefined), null);
  assert.match(X.screenSteps('ios')[0], /Control Center/);
  assert.match(X.screenSteps('android')[0], /Screen record/);
  for (const k of ['ios', 'android']) assert.match(X.screenSteps(k).at(-1), /choose the recording/);
  assert.deepEqual(X.screenSteps(null), []);
  X.screenSteps('ios').push('changed');
  assert.equal(X.screenSteps('ios').length, 4);
});

test('the page adds its own play button only where the browser has none', () => {
  const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  assert.equal(X.drawsOwnPlay(chromeMac, false), false);
  assert.equal(X.drawsOwnPlay(chromeMac + ' Edg/141.0.0.0', false), false);
  assert.equal(X.drawsOwnPlay('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', false), true);
  assert.equal(X.drawsOwnPlay('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0', false), true);
  assert.equal(X.drawsOwnPlay('Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1', false), true);
  assert.equal(X.drawsOwnPlay('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', false), true);
  assert.equal(X.drawsOwnPlay(chromeMac, true), true);
});
