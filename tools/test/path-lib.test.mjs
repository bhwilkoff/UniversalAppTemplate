import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/path-lib.js');

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('a stage is known by its file, and companion pages are not stages', () => {
  assert.equal(P.stageFromSrc('docs/path/01-first-prototype.md'), '01');
  assert.equal(P.stageFromSrc('docs/path/setup.md'), 'setup');
  assert.equal(P.stageFromSrc('docs/path/08-working-with-ai.md'), '08');
  assert.equal(P.stageFromSrc('docs/path/talking-to-your-agent.md'), null);
  assert.equal(P.stageFromSrc('docs/path/09-later.md'), null);
  assert.equal(P.stageFromSrc('COURSE.md'), null);
});

test('the steps and the bar are found by their words, as the stages write them', () => {
  assert.ok(P.isStepsHeading('Working with your agent'));
  assert.ok(P.isStepsHeading('What to do'));
  assert.ok(!P.isStepsHeading('What I want'));
  assert.ok(P.isReadyLead('When you are ready to move on,'));
  assert.ok(P.isReadyLead('When you are done with the path,'));
  assert.ok(P.isReadyLead('When you are done with the stages,'));
  assert.ok(!P.isReadyLead('When something goes wrong'));
  assert.equal(P.stepTitle('Add the wish to your note.'), 'Add the wish to your note');
});

test('a quoted prompt is copied as someone would paste it', () => {
  const raw = '\nA fully realized multi-player\ntrivia game.\n\nFull features should include:\n  ten of them\n';
  assert.equal(P.promptText(raw), 'A fully realized multi-player trivia game.\n\nFull features should include: ten of them');
});

test('marks follow the same rules as the database', () => {
  assert.ok(P.validMark({ stage: '01', item: 'step-2', state: 'done' }));
  assert.ok(P.validMark({ stage: '01', item: 'ready', state: 'not-yet' }));
  assert.ok(P.validMark({ stage: 'setup', item: 'note', state: 'kept', note: 'It opened on my phone.' }));
  assert.ok(!P.validMark({ stage: '09', item: 'ready', state: 'ready' }));
  assert.ok(!P.validMark({ stage: '01', item: 'step-1', state: 'ready' }));
  assert.ok(!P.validMark({ stage: '01', item: 'note', state: 'kept', note: '   ' }));
  assert.ok(!P.validMark({ stage: '01', item: 'ready', state: 'ready', note: 'hidden' }));
});

test('setting, clearing, and reading marks', () => {
  let m = {};
  m = P.setMark(m, '01', 'step-3', 'done', null, '2026-10-03T10:00:00Z');
  m = P.setMark(m, '01', 'step-1', 'done', null, '2026-10-03T10:01:00Z');
  m = P.setMark(m, '01', 'ready', 'ready', null, '2026-10-03T10:02:00Z');
  assert.deepEqual(P.stepsDone(m, '01'), [1, 3]);
  assert.equal(P.get(m, '01', 'ready').state, 'ready');
  m = P.setMark(m, '01', 'step-3', null);
  assert.deepEqual(P.stepsDone(m, '01'), [1]);
  const before = m;
  assert.equal(P.setMark(m, '01', 'ready', 'maybe'), before, 'an unknown state changes nothing');
});

test('the stages marked ready come in the path’s order, and not-yet is not ready', () => {
  let m = {};
  m = P.setMark(m, '03', 'ready', 'ready');
  m = P.setMark(m, 'setup', 'ready', 'ready');
  m = P.setMark(m, '01', 'ready', 'not-yet');
  assert.deepEqual(P.readyStages(m).map((s) => s.id), ['setup', '03']);
});

test('marks made signed out join an account without losing its newer ones', () => {
  const local = P.fromRows([
    { stage: '01', item: 'step-1', state: 'done', updated_at: '2026-10-03T09:00:00Z' },
    { stage: '01', item: 'ready', state: 'ready', updated_at: '2026-10-03T08:00:00Z' },
    { stage: '02', item: 'ready', state: 'not-yet', updated_at: '2026-10-03T12:00:00Z' }
  ]);
  const server = P.fromRows([
    { stage: '01', item: 'ready', state: 'not-yet', updated_at: '2026-10-03T10:00:00Z' },
    { stage: '02', item: 'ready', state: 'ready', updated_at: '2026-10-03T11:00:00Z' }
  ]);
  const r = P.merge(local, server);
  assert.equal(P.get(r.marks, '01', 'ready').state, 'not-yet', 'the account’s newer mark stays');
  assert.equal(P.get(r.marks, '02', 'ready').state, 'not-yet', 'this browser’s newer mark wins');
  assert.equal(P.get(r.marks, '01', 'step-1').state, 'done');
  assert.deepEqual(r.send.map((m) => P.key(m.stage, m.item)).sort(), ['01:step-1', '02:ready']);
  assert.deepEqual(P.toRow(r.send[0], 'u1').user_id, 'u1');
});

test('this browser’s copy survives a reload, and a broken store is harmless', () => {
  const store = memoryStore();
  let m = P.setMark({}, '04', 'step-2', 'done', null, '2026-10-03T10:00:00Z');
  assert.ok(P.saveLocal(store, m));
  assert.equal(P.get(P.loadLocal(store), '04', 'step-2').state, 'done');
  assert.ok(P.clearLocal(store));
  assert.equal(store.getItem(P.STORE_KEY), null);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.deepEqual(P.loadLocal(broken), {});
  assert.equal(P.saveLocal(broken, m), false);
  store.setItem(P.STORE_KEY, 'not json');
  assert.deepEqual(P.loadLocal(store), {});
});

test('bringing a stage back goes to each cohort the person is in, or to a private note', () => {
  assert.equal(P.bringBackHref('c1', '03'), '/cohort/?c=c1&bring=03#share-title');
  assert.equal(P.bringParam('?c=c1&bring=03'), '03');
  assert.equal(P.bringParam('?bring=<script>'), null);
  const enrolled = [
    { status: 'enrolled', cohorts: { slug: 'c1', title: 'Cohort 1', status: 'running' } },
    { status: 'left', cohorts: { slug: 'c0', title: 'Old', status: 'running' } },
    { status: 'enrolled', cohorts: { slug: 'c-1', title: 'Done', status: 'finished' } }
  ];
  assert.deepEqual(P.bringChoices(enrolled, '03'), { kind: 'cohorts', cohorts: [{ slug: 'c1', title: 'Cohort 1', href: '/cohort/?c=c1&bring=03#share-title' }] });
  assert.deepEqual(P.bringChoices([], '03'), { kind: 'note' });
});
