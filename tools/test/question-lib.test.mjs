// The question bank's logic in assets/live-lib.js (R4): six kinds of
// question, parsed from a teacher's words, answered in a person's view,
// and shown with no names. The database checks the same shapes
// (supabase/tests/test_policies.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lib = require('../../assets/live-lib.js');

test('there are six kinds, each with a name and a line', () => {
  assert.deepEqual(lib.QUESTION_KINDS.map((k) => k.key), ['choice', 'multi', 'scale', 'words', 'rank', 'short']);
  lib.QUESTION_KINDS.forEach((k) => { assert.ok(k.name && k.line); assert.doesNotMatch(k.line, /—/); });
});

test('a question asked before there were kinds keeps the kind it had', () => {
  assert.equal(lib.kindOf({ choices: ['A', 'B'] }), 'choice');
  assert.equal(lib.kindOf({ choices: null }), 'short');
  assert.equal(lib.kindOf({ kind: 'rank', choices: ['A', 'B'] }), 'rank');
  assert.equal(lib.kindOf({ kind: 'essay' }), 'short');
});

test('a question is parsed from a teacher’s words, kind by kind', () => {
  assert.deepEqual(lib.parseQuestion({ kind: 'multi', prompt: ' Which? ', choices: 'Tests\n\n Docs \n' }),
    { kind: 'multi', prompt: 'Which?', choices: ['Tests', 'Docs'], points: null });
  assert.deepEqual(lib.parseQuestion({ kind: 'scale', prompt: 'How sure?', points: '5' }),
    { kind: 'scale', prompt: 'How sure?', choices: null, points: 5 });
  assert.deepEqual(lib.parseQuestion({ kind: 'scale', prompt: 'How sure?', points: 4, low: 'Not', high: 'Very' }).choices, ['Not', 'Very']);
  assert.deepEqual(lib.parseQuestion({ kind: 'words', prompt: 'One word', choices: 'ignored' }),
    { kind: 'words', prompt: 'One word', choices: null, points: null });
  assert.deepEqual(lib.parseQuestion({ kind: 'rank', prompt: 'Order', choices: ['A', 'B', 'C'] }).choices, ['A', 'B', 'C']);
});

test('a question that will not fit says why in a sentence', () => {
  assert.match(lib.parseQuestion({ kind: 'essay', prompt: 'x' }).error, /kind/);
  assert.match(lib.parseQuestion({ kind: 'choice', prompt: '  ' }).error, /Write the question/);
  assert.match(lib.parseQuestion({ kind: 'choice', prompt: 'x', choices: 'Only' }).error, /two choices/);
  assert.match(lib.parseQuestion({ kind: 'rank', prompt: 'x', choices: 'a\nb\nc\nd\ne\nf\ng\nh\ni' }).error, /Eight/);
  assert.match(lib.parseQuestion({ kind: 'scale', prompt: 'x', points: '2' }).error, /three to ten/);
  assert.match(lib.parseQuestion({ kind: 'scale', prompt: 'x', points: '11' }).error, /three to ten/);
  assert.match(lib.parseQuestion({ kind: 'scale', prompt: 'x', points: '5', low: 'Not' }).error, /both ends/);
  assert.match(lib.parseQuestion({ kind: 'short', prompt: 'x'.repeat(501) }).error, /500/);
});

test('a form starts from a bank question, an asked one, or a scene', () => {
  assert.deepEqual(lib.questionFields({ kind: 'scale', prompt: 'Sure?', choices: ['No', 'Yes'], points: 7 }),
    { kind: 'scale', prompt: 'Sure?', choices: '', points: '7', low: 'No', high: 'Yes', question_id: null });
  assert.equal(lib.questionFields({ prompt: 'x', question_id: 'q1' }).question_id, 'q1');
  assert.equal(lib.questionFields({ prompt: 'Which?', options: ['A', 'B'] }).kind, 'choice');
  assert.equal(lib.questionFields({ prompt: 'Which?', options: ['A', 'B'] }).choices, 'A\nB');
  assert.equal(lib.questionFields({ prompt: 'Why?' }).kind, 'short');
  assert.equal(lib.questionFields(null).prompt, '');
});

test('a scene keeps a question’s words, and asks it the same way', () => {
  const p = lib.parseQuestion({ kind: 'scale', prompt: 'Sure?', points: 5, low: 'No', high: 'Yes' });
  const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const c = lib.sceneQuestion(p, id);
  assert.deepEqual(c, { prompt: 'Sure?', kind: 'scale', options: ['No', 'Yes'], points: 5, question_id: id });
  assert.deepEqual(lib.fromScene(c), { kind: 'scale', prompt: 'Sure?', choices: ['No', 'Yes'], points: 5, question_id: id });
  // A scene from before kinds: choices mean choose one, none means their own words.
  assert.equal(lib.fromScene({ prompt: 'Which?', options: ['A', 'B'] }).kind, 'choice');
  assert.deepEqual(lib.sceneQuestion(lib.parseQuestion({ kind: 'choice', prompt: 'Which?', choices: 'A\nB' })), { prompt: 'Which?', options: ['A', 'B'] });
  assert.deepEqual(lib.sceneQuestion(lib.parseQuestion({ kind: 'short', prompt: 'Why?' })), { prompt: 'Why?' });
  assert.equal(lib.fromScene({ prompt: 'Why?' }).kind, 'short');
  assert.equal(lib.fromScene({}), null);
  assert.equal(lib.fromScene({ prompt: 'x', kind: 'rank', options: ['A'] }), null);
});

test('a scale’s points carry the words for its ends', () => {
  assert.deepEqual(lib.scaleLabels({ points: 4, choices: ['Lost', 'Clear'] }), ['1 (Lost)', '2', '3', '4 (Clear)']);
  assert.deepEqual(lib.scaleLabels({ points: 3, choices: null }), ['1', '2', '3']);
});

test('an answer fits its kind, as the database requires', () => {
  const choice = { kind: 'choice', choices: ['A', 'B'] };
  assert.deepEqual(lib.answerRow(choice, { choice: '2' }), { choice: 2, body: null, value: null });
  assert.ok(lib.answerRow(choice, { choice: 3 }).error);
  assert.deepEqual(lib.answerRow({ kind: 'scale', points: 5 }, { choice: 5 }).choice, 5);
  assert.ok(lib.answerRow({ kind: 'scale', points: 5 }, { choice: 6 }).error);
  assert.deepEqual(lib.answerRow({ kind: 'words' }, { body: ' Calm ' }), { choice: null, body: 'Calm', value: null });
  assert.match(lib.answerRow({ kind: 'words' }, { body: 'x'.repeat(61) }).error, /60/);
  assert.ok(lib.answerRow({ kind: 'short' }, { body: '' }).error);
  const multi = { kind: 'multi', choices: ['A', 'B', 'C'] };
  assert.deepEqual(lib.answerRow(multi, { picks: [3, 1] }).value, [3, 1]);
  assert.match(lib.answerRow(multi, { picks: [] }).error, /at least one/);
  assert.ok(lib.answerRow(multi, { picks: [1, 1] }).error);
  assert.ok(lib.answerRow(multi, { picks: [4] }).error);
  const rank = { kind: 'rank', choices: ['A', 'B', 'C'] };
  assert.deepEqual(lib.answerRow(rank, { order: [2, 3, 1] }).value, [2, 3, 1]);
  assert.match(lib.answerRow(rank, { order: [2, 1] }).error, /every choice/);
});

test('what someone answered reads in words, for every kind', () => {
  assert.equal(lib.answerText({ kind: 'multi', choices: ['A', 'B', 'C'] }, { value: [1, 3] }), 'A; C');
  assert.equal(lib.answerText({ kind: 'rank', choices: ['A', 'B'] }, { value: [2, 1] }), '1. B; 2. A');
  assert.equal(lib.answerText({ kind: 'scale', points: 5, choices: ['No', 'Yes'] }, { choice: 5 }), '5 (Yes) of 5');
  assert.equal(lib.answerText({ kind: 'scale', points: 5 }, { choice: 3 }), '3 of 5');
  assert.equal(lib.answerText({ kind: 'words' }, { body: 'calm' }), 'calm');
  assert.equal(lib.answerText({ kind: 'multi', choices: ['A'] }, { value: null }), null);
});

test('the results name no one and are ready to draw', () => {
  const multi = lib.results({ kind: 'multi', choices: ['Tests', 'Docs'] }, { kind: 'multi', total: 4, counts: [3, 1] });
  assert.deepEqual(multi.rows, [{ label: 'Tests', count: 3, share: 75, text: '3' }, { label: 'Docs', count: 1, share: 25, text: '1' }]);
  assert.match(multi.note, /more than one/);
  const scale = lib.results({ kind: 'scale', points: 3, choices: ['No', 'Yes'] }, { total: 2, counts: [0, 1, 1] });
  assert.deepEqual(scale.rows.map((r) => r.label), ['1 (No)', '2', '3 (Yes)']);
  assert.match(scale.note, /2\.5 of 3/);
  const rank = lib.results({ kind: 'rank', choices: ['Speed', 'Care', 'Cost'] }, { total: 2, places: [2, 1, 3] });
  assert.deepEqual(rank.rows.map((r) => r.label), ['Care', 'Speed', 'Cost']);
  assert.deepEqual(rank.rows.map((r) => r.share), [100, 50, 0]);
  assert.equal(rank.rows[0].text, 'about 1');
  const words = lib.results({ kind: 'words' }, { total: 3, words: [{ word: 'calm', count: 2 }, { word: 'tired', count: 1 }] });
  assert.deepEqual(words.words, [{ word: 'calm', count: 2, size: 5 }, { word: 'tired', count: 1, size: 3 }]);
  const short = lib.results({ kind: 'short' }, { total: 5 });
  assert.equal(short.total, 5); assert.deepEqual(short.rows, []); assert.deepEqual(short.words, []);
  assert.equal(lib.results({ kind: 'choice', choices: ['A', 'B'] }, null).rows[0].share, 0);
});
