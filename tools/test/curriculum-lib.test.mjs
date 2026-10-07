import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../../assets/curriculum-lib.js');
const S = require('../../assets/show-lib.js');
const C = require('../../assets/cohort-lib.js');
const L = require('../../assets/live-lib.js');
const B = require('../../assets/board-lib.js');
globalThis.BoardLib = B;

const agenda = C.agenda(75);
const weeks = ['prep', 1, 2, 3, 4, 5];

test('sessions map to the plan’s weeks, and a sixth session has none', () => {
  assert.equal(K.weekOf(0), 'prep');
  assert.equal(K.weekOf(1), 1);
  assert.equal(K.weekOf(5), 5);
  assert.equal(K.weekOf(6), null);
});

test('every week’s run of show passes the class builder’s own check', () => {
  for (const w of weeks) {
    const show = K.weekShow(w, agenda, L.TURN, S);
    assert.ok(show && show.length === agenda.length, 'week ' + w);
    for (const s of show) assert.equal(S.problem(s), null, 'week ' + w + ': ' + s.title);
    assert.equal(S.total(show), 75, 'week ' + w + ' fits the session');
  }
});

test('each week has its design stage, room prompt, watch note, and question', () => {
  for (const w of weeks) {
    const show = K.weekShow(w, agenda, L.TURN, S);
    const design = show.find(s => s.kind === 'design');
    assert.ok(design && B.template(design.config.template), 'week ' + w + ' design template exists');
    const rooms = show.find(s => s.kind === 'rooms');
    assert.equal(rooms.config.prompt, K.WEEKS[w].room);
    assert.ok(rooms.config.room_scenes.length, 'the trio steps stay in the room');
    assert.equal(rooms.note, K.WEEKS[w].watch);
    const q = show.find(s => s.kind === 'question');
    assert.equal(q.config.prompt, K.WEEKS[w].questions[0].prompt);
  }
  assert.equal(K.weekShow(1, agenda, L.TURN, S).find(s => s.kind === 'design').config.template, 'hum');
});

test('a shorter session still fits, without its break', () => {
  const short = C.agenda(60);
  const show = K.weekShow(2, short, L.TURN, S);
  assert.equal(S.total(show), 60);
  assert.ok(!show.some(s => s.kind === 'break'));
  for (const s of show) assert.equal(S.problem(s), null);
});

test('every prepared question fits the bank’s rules, and bad ones are refused', () => {
  for (const w of weeks) for (const q of K.WEEKS[w].questions) assert.ok(K.bankQuestion(q), 'week ' + w + ': ' + q.prompt);
  assert.equal(K.bankQuestion({ kind: 'multi', prompt: 'One choice', choices: ['only'] }), null);
  assert.equal(K.bankQuestion({ kind: 'short', prompt: 'x', choices: ['a', 'b'] }), null);
  assert.equal(K.bankQuestion({ kind: 'scale', prompt: 'x', points: 2 }), null);
  assert.equal(K.bankQuestion({ kind: 'essay', prompt: 'x' }), null);
  assert.equal(K.bankQuestion({ kind: 'short', prompt: '   ' }), null);
});

test('a published plan wins when it fits, in any of its shapes', () => {
  const scenes = [{ kind: 'talk', title: 'Arrive', minutes: 10, body: 'Hello.', config: {} }, { kind: 'question', title: 'Check', minutes: 5, config: { prompt: 'Why?', kind: 'short' }, note: 'Watch for silence.' }];
  const qs = [{ kind: 'words', prompt: 'One word for today?' }];
  for (const data of [{ weeks: [{ week: 1, scenes, questions: qs }] }, { weeks: { 1: { scenes, questions: qs } } }, { 1: scenes }]) {
    const got = K.plan(1, agenda, L.TURN, S, data);
    assert.equal(got.from, 'published');
    assert.equal(got.scenes.length, 2);
    assert.equal(got.scenes[1].note, 'Watch for silence.');
  }
  assert.deepEqual(K.plan(1, agenda, L.TURN, S, { weeks: { 1: { scenes, questions: qs } } }).questions.map(q => q.prompt), ['One word for today?']);
});

test('a published week that does not fit falls back to the defaults', () => {
  const bad = { weeks: { 2: [{ kind: 'board', title: 'Old name', minutes: 5 }] } };
  const got = K.plan(2, agenda, L.TURN, S, bad);
  assert.equal(got.from, 'defaults');
  assert.equal(got.scenes.find(s => s.kind === 'design').config.template, 'prompt');
  assert.equal(K.plan(7, agenda, L.TURN, S, null), null);
});

test('making the sessions again adds no second copy of a question', () => {
  const wanted = K.defaultQuestions(1);
  assert.equal(K.newQuestions(wanted, []).length, 2);
  assert.equal(K.newQuestions(wanted, [{ kind: 'short', prompt: '  what is still MUDDY for you? ' }]).length, 1);
  assert.equal(K.newQuestions(wanted.concat(wanted), []).length, 2);
});

test('the page’s sentences say what was planned', () => {
  assert.equal(K.summary({ weeks: 5, scenes: 35, questions: 9, errors: [] }), '5 weeks have the course’s run of show, ready to change, and 9 prepared questions are in your question bank.');
  assert.equal(K.summary({ weeks: 1, scenes: 7, questions: 0, errors: [] }), 'One week has the course’s run of show, ready to change.');
  assert.equal(K.summary({ weeks: 0, scenes: 0, questions: 0, errors: [] }), '');
  assert.match(K.summary({ weeks: 0, scenes: 0, questions: 0, errors: ['week 2: refused'] }), /^Not every week could be planned: week 2: refused\.$/);
  assert.equal(K.startLabel(3), 'Start from the course’s plan for week 3');
});

test('Hum sort lays four frames, every word inside its frame', () => {
  const t = B.template('hum');
  assert.equal(t.frames.length, 4);
  const els = B.templateElements('hum', 0);
  const rects = els.filter(e => e.type === 'rectangle');
  for (const e of els.filter(e => e.type === 'text')) {
    const frame = rects.find(r => e.x >= r.x && e.x < r.x + r.width && e.y >= r.y && e.y < r.y + r.height);
    assert.ok(frame && e.y + e.height <= frame.y + frame.height, e.text.slice(0, 20));
  }
  assert.equal(t.frames[0].hint.split('\n').length, 8);
});
