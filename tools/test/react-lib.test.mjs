import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('../../assets/react-lib.js');

test('every reaction and stance has its own key', () => {
  const keys = [...R.REACTIONS, ...R.STANCES].map(x => x.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(R.REACTIONS.map(r => r.id), ['smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown']);
});

test('a key press means a reaction or a stance, but never while typing or with a modifier', () => {
  assert.deepEqual(R.keyFor({ key: '4', target: { tagName: 'DIV' } }), { reaction: 'clap' });
  assert.deepEqual(R.keyFor({ key: 'A', target: { tagName: 'BODY' } }), { stance: 'agree' });
  assert.equal(R.keyFor({ key: '4', target: { tagName: 'TEXTAREA' } }), null);
  assert.equal(R.keyFor({ key: 'a', target: { tagName: 'INPUT' } }), null);
  assert.equal(R.keyFor({ key: 'a', target: { tagName: 'DIV', isContentEditable: true } }), null);
  assert.equal(R.keyFor({ key: '1', ctrlKey: true, target: {} }), null);
  assert.equal(R.keyFor({ key: '1', repeat: true, target: {} }), null);
  assert.equal(R.keyFor({ key: 'x', target: {} }), null);
});

test('a reaction carries only which one and a first name', () => {
  assert.deepEqual(R.message('love', 'Bea Example'), { r: 'love', n: 'Bea' });
  assert.equal(R.message('shout', 'Bea'), null);
  assert.deepEqual(R.read({ r: 'mind', n: 'Eve', extra: 'no' }), { r: 'mind', n: 'Eve' });
  assert.equal(R.read({ r: 'nope' }), null);
  assert.deepEqual(R.read({ r: 'clap' }), { r: 'clap', n: null });
});

test('five reactions in three seconds, and no more', () => {
  let times = [], ok = 0;
  for (let i = 0; i < 8; i++) { const a = R.allow(times, 1000 + i * 100); times = a.times; if (a.ok) ok++; }
  assert.equal(ok, 5);
  assert.equal(R.allow(times, 1000 + 3200).ok, true);
});

test('stances are counted from presence, and never named', () => {
  const c = R.stanceCounts({ a: [{ stance: 'agree', name: 'Bea' }], b: [{ stance: 'agree' }], c: [{ stance: 'disagree' }], d: [{}], e: [{ stance: 'shrug' }] });
  assert.deepEqual(c, { agree: 2, unsure: 0, disagree: 1, total: 3 });
  assert.deepEqual(R.shares(c), { agree: 67, unsure: 0, disagree: 33 });
  assert.equal(R.shares({ total: 0 }), null);
});

test('the stage takes only the shape the panel sends', () => {
  const msg = R.stageMessage([{ r: 'clap', n: 'Bea' }, { r: 'bad' }], { agree: 1, unsure: 1, disagree: 0, total: 2 });
  assert.deepEqual(R.readStage(msg), { floats: [{ r: 'clap', n: 'Bea' }], stance: { agree: 1, unsure: 1, disagree: 0, total: 2 } });
  assert.equal(R.readStage('not json'), null);
  assert.equal(R.readStage(JSON.stringify({ type: 'hs-stage', v: 1 })), null);
  assert.equal(R.readStage(R.stageMessage([], { total: 0 })).stance, null);
  const many = Array.from({ length: 30 }, () => ({ r: 'smile', n: 'X' }));
  assert.equal(R.readStage(R.stageMessage(many, null)).floats.length, 12);
});
