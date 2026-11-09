import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/room-lib.js');
globalThis.LiveLib = require('../../assets/live-lib.js');
const A = require('../../assets/addon-lib.js');

const room = (o) => Object.assign({ on: true, host: 'h', hostName: 'Hana', title: 'T', show: 'welcome', at: 0, shown: 0, notes: [], people: [], question: null, summary: null, page: null, card: '', clock: null }, o);

test('a room is reached only by a Meet code', () => {
  assert.equal(R.code(' ABC-defg-hij '), 'abc-defg-hij');
  assert.equal(R.code('abc-defg'), null);
  assert.equal(R.codeOfSearch('?abc-defg-hij'), 'abc-defg-hij');
  assert.equal(R.codeOfSearch('?dark&room=abc-defg-hij'), 'abc-defg-hij');
  assert.equal(R.codeOfSearch('?<script>'), null);
  assert.equal(R.link('https://humanshaped.org', 'abc-defg-hij'), 'https://humanshaped.org/room/?abc-defg-hij');
  assert.equal(R.socket('https://x.dev/', 'abc-defg-hij'), 'wss://x.dev/room/abc-defg-hij');
});

test('a repository comes from the pair or any address on GitHub', () => {
  assert.equal(R.repoOf('me/talk').name, 'me/talk');
  assert.equal(R.repoOf('https://github.com/me/talk.git').name, 'me/talk');
  assert.equal(R.repoOf('https://github.com/me/talk/blob/main/talk.md').name, 'me/talk');
  assert.equal(R.repoOf('me'), null);
  assert.equal(R.repoOf('me/..'), null);
  assert.equal(R.repoOf('https://example.org/me/talk'), null);
});

test('a page loads its own files from one commit, and base comes first', () => {
  const b = R.assetBase({ owner: 'me', repo: 'talk' }, 'abc');
  assert.equal(b, 'https://cdn.jsdelivr.net/gh/me/talk@abc/');
  assert.equal(R.withBase('<html><head lang="en"><title>x</title></head></html>', b), '<html><head lang="en"><base href="' + b + '"><title>x</title></head></html>');
  assert.ok(R.withBase('<p>Hi</p>', b).startsWith('<base'));
});

test('the title is the first heading', () => {
  assert.equal(R.titleOf('> note\n\n# One thing {.build}\n\n---\n\n# Two'), 'One thing');
  assert.equal(R.titleOf('nothing'), '');
});

test('the host\'s one button names the next step', () => {
  const list = R.stops([{ slide: 0, shown: Infinity }, { slide: 1, shown: 1 }, { slide: 1, shown: Infinity }]);
  assert.deepEqual(list[2], { slide: 1, shown: 0 });
  assert.equal(R.nextStep(room(), {}).act, 'stage');
  assert.equal(R.nextStep(room({ show: 'question' }), { stageOn: true, stops: list }).act, 'close');
  assert.equal(R.nextStep(room(), { stageOn: true, stops: [] }).act, 'talk');
  assert.equal(R.nextStep(room(), { stageOn: true, stops: list }).label, 'Start the slides');
  assert.equal(R.nextStep(room({ show: 'board', at: 1 }), { stageOn: true, stops: list }).label, 'Back to the slides');
  assert.deepEqual(R.nextStep(room({ show: 'slides' }), { stageOn: true, stops: list }).to, { slide: 1, shown: 1 });
  assert.ok(R.nextStep(room({ show: 'slides', at: 1, shown: 0 }), { stageOn: true, stops: list }).disabled);
});

const q = { id: 'q1', kind: 'choice', prompt: 'Which?', choices: ['One', 'Two'], reveal: true, open: true };
const summary = { total: 2, counts: [0, 2] };

test('nobody sees the count until they have answered, and the host always does', () => {
  const r = room({ show: 'question', question: q, summary });
  const before = R.toView(r, { addon: A, you: 'p' });
  assert.equal(before.mode, 'check'); assert.equal(before.count, null); assert.equal(before.answerable, true);
  const after = R.toView(r, { addon: A, you: 'p', mine: { choice: 2 } });
  assert.equal(after.count.total, 2); assert.deepEqual(after.mine, { choice: 2 });
  const host = R.toView(r, { addon: A, you: 'h' });
  assert.equal(host.count.total, 2); assert.equal(host.answerable, false);
});

test('results stay off the stage until the host shows them', () => {
  const v = R.toView(room({ show: 'question', question: { ...q, reveal: false }, summary }), { addon: A, you: 'h' });
  assert.equal(v.count, null);
});

test('each thing a host shows becomes its own view', () => {
  assert.equal(R.toView(room({ on: false }), {}).waiting, true);
  assert.equal(R.toView(room(), {}).mode, 'roomwelcome');
  assert.deepEqual(R.toView(room({ show: 'slides', at: 2 }), { talk: '# x' }).slides, { text: '# x', at: 2, shown: 0 });
  assert.equal(R.toView(room({ show: 'slides' }), {}).mode, 'roomwelcome');
  assert.equal(R.toView(room({ show: 'board' }), { you: 'h' }).host, true);
  assert.equal(R.toView(room({ show: 'page', page: { htmlV: 1 } }), { html: '<p>' }).html, '<p>');
  assert.equal(R.toView(room({ show: 'page', page: { owner: 'a', repo: 'b', sha: 'c' } }), { html: 'old' }).html, null);
  assert.equal(R.toView(room({ show: 'blank' }), {}).mode, 'blank');
  const c = R.toView(room({ show: 'card', card: 'Talk', clock: { endsAt: 9, label: '' } }), {});
  assert.deepEqual(c.card, { body: 'Talk', endsAt: 9 });
  assert.equal(c.part, null, 'the card carries the clock, so it shows once');
});

test('a deck the room holds reads back as the talk, so a new host moves through the same slides', () => {
  const SL = require('../../assets/slides-lib.js');
  const talk = '# One\n\n> mine\n\n---\n\n# Two';
  const deck = SL.deck(SL.withoutNotes(talk));
  assert.equal(SL.count(R.deckBody(deck)), 2);
  assert.equal(R.deckBody('# no head'), '# no head');
});

test('a clock on a clear stage is the whole stage, and rides along with a page or a board', () => {
  const base = { on: true, host: 'a', at: 0, shown: 0, notes: [], board: 'Ideas?', clock: { endsAt: 9e12, label: 'Pair up' } };
  const alone = R.toView({ ...base, show: 'blank' }, { you: 'b' });
  assert.equal(alone.mode, 'part'); assert.equal(alone.roomClock, true); assert.equal(alone.part.name, 'Pair up');
  assert.equal(R.toView({ ...base, show: 'blank', clock: null }, {}).mode, 'blank');
  assert.equal(R.toView({ ...base, show: 'page', page: { url: 'https://a.github.io/' } }, {}).part.endsAt, 9e12);
  const board = R.toView({ ...base, show: 'board' }, { you: 'b' });
  assert.equal(board.prompt, 'Ideas?'); assert.equal(board.part.endsAt, 9e12);
});
