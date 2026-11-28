import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/show-lib.js');
const C = require('../../assets/cohort-lib.js');
const L = require('../../assets/live-lib.js');

test('the default run of show is COURSE.md’s parts, as scenes, filling the session', () => {
  const show = S.defaultShow(C.agenda(90), L.TURN);
  assert.deepEqual(show.map((s) => s.kind), ['talk', 'rooms', 'break', 'presenter', 'talk', 'reflection', 'question']);
  assert.equal(show[0].title, 'Arrive');
  assert.equal(S.total(show), 90);
  show.forEach((s) => assert.equal(S.problem(s), null, s.title));
  const rooms = show[1];
  assert.equal(rooms.config.room_scenes.length, L.TURN.length);
  assert.equal(rooms.config.room_scenes[0].title, 'Their question');
  // A short session drops the break, as the teaching guide says.
  assert.ok(!S.defaultShow(C.agenda(60), L.TURN).some((s) => s.kind === 'break'));
});

test('a scene is checked the way the database checks it', () => {
  const ok = { kind: 'talk', title: 'Arrive', minutes: 7, config: {} };
  assert.equal(S.problem(ok), null);
  assert.match(S.problem({ ...ok, kind: 'lecture' }), /kind/);
  assert.match(S.problem({ ...ok, title: '  ' }), /title/);
  assert.match(S.problem({ ...ok, minutes: 0 }), /minutes/);
  assert.match(S.problem({ ...ok, minutes: 2.5 }), /whole number/);
  assert.match(S.problem({ ...ok, config: { options: ['a', 'b'] } }), /does not use options/);
  assert.match(S.problem({ kind: 'question', title: 'Q', minutes: 2, config: { options: ['only'] } }), /two to eight/);
  assert.match(S.problem({ kind: 'rooms', title: 'R', minutes: 20, config: { room_scenes: [{ title: 'No minutes' }] } }), /minutes/);
});

test('typed lines become choices and room scenes, and back', () => {
  assert.deepEqual(S.optionsFromText(' Yes \n\nNo\n'), ['Yes', 'No']);
  const rs = S.roomScenesFromText('Their question, 2\nShow it 6 min\nWhat comes next');
  assert.deepEqual(rs, [{ title: 'Their question', minutes: 2 }, { title: 'Show it', minutes: 6 }, { title: 'What comes next', minutes: 1 }]);
  assert.equal(S.roomScenesToText(rs), 'Their question, 2\nShow it, 6\nWhat comes next, 1');
  assert.deepEqual(S.cleanConfig('talk', { prompt: 'x' }), {});
  assert.deepEqual(S.cleanConfig('question', { prompt: '  Which?  ', options: [] }), { prompt: 'Which?' });
});

test('moving a scene gives the new order, or nothing at the ends', () => {
  assert.deepEqual(S.moved(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(S.moved(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.equal(S.moved(['a', 'b', 'c'], 0, -1), null);
  assert.equal(S.moved(['a', 'b', 'c'], 2, 1), null);
  assert.deepEqual(S.startTimes([{ minutes: 7 }, { minutes: 25 }, { minutes: 3 }]), [0, 7, 32]);
});

test('the minutes are told against the session’s length', () => {
  assert.equal(S.fitText([{ minutes: 60 }], 90), '60 minutes planned, 30 to spare in a 90-minute session.');
  assert.equal(S.fitText([{ minutes: 95 }], 90), '95 minutes planned, 5 more than the 90-minute session.');
  assert.equal(S.fitText([{ minutes: 90 }], 90), '90 minutes planned, the whole session.');
});

test('copying starts from the latest earlier week that has a run of show', () => {
  const sessions = [{ id: 'w1', number: 1 }, { id: 'w2', number: 2 }, { id: 'w3', number: 3 }];
  assert.equal(S.copySource(sessions, sessions[2], ['w1']).id, 'w1');
  assert.equal(S.copySource(sessions, sessions[2], ['w1', 'w2']).id, 'w2');
  assert.equal(S.copySource(sessions, sessions[0], ['w2']), null);
});

test('the preview shows what the main stage will', () => {
  const q = S.stagePreview({ kind: 'question', title: 'Check', minutes: 3, config: { prompt: 'Which one?', options: ['This', 'That'] } });
  // The stage names no kind of part; the title says what it is (2026-11-18).
  assert.equal(q.eyebrow, '');
  assert.equal(S.stagePreview({ kind: 'break', title: 'Pause', minutes: 5, config: {} }).eyebrow, 'Break');
  assert.deepEqual(q.lines, ['Which one?']);
  assert.deepEqual(q.items, ['This', 'That']);
  const r = S.stagePreview({ kind: 'rooms', title: 'Rooms', minutes: 25, config: { room_scenes: [{ title: 'Their question', minutes: 2 }] } });
  assert.match(r.note, /25 minutes/);
  assert.deepEqual(r.items, ['Their question, 2 min']);
});

test('the shared board is the design stage', () => {
  assert.equal(S.kind('design').name, 'On the board');
  assert.equal(S.kind('board'), null);
  assert.equal(S.problem({ kind: 'design', title: 'Sketch the screen', minutes: 10, config: { template: 'Phone screen' } }), null);
  assert.match(S.stagePreview({ kind: 'design', title: 'Sketch', minutes: 10, config: {} }).note, /blank/);
});

test('a question scene carries its kind, and the stage preview says how it is answered (R4)', () => {
  const ok = { kind: 'question', title: 'Check', minutes: 5, config: { prompt: 'How sure?', kind: 'scale', points: 4, options: ['Not', 'Very'] } };
  assert.equal(S.problem(ok), null);
  assert.deepEqual(S.stagePreview(ok).items, ['1 (Not)', '2', '3', '4 (Very)']);
  assert.match(S.problem({ ...ok, config: { prompt: 'x', kind: 'scale' } }), /three to ten/);
  assert.match(S.problem({ ...ok, config: { prompt: 'x', kind: 'rank' } }), /two to eight/);
  assert.match(S.problem({ ...ok, config: { prompt: 'x', kind: 'essay' } }), /kind of question/);
  assert.match(S.problem({ ...ok, config: { prompt: 'x', points: 5 } }), /Only a scale/);
  assert.match(S.problem({ ...ok, config: { prompt: 'x', kind: 'words', options: ['a', 'b'] } }), /no choices/);
  const words = S.stagePreview({ kind: 'question', title: 'Word', minutes: 3, config: { prompt: 'One word', kind: 'words' } });
  assert.deepEqual(words.items, []);
  assert.equal(words.note, 'No names are shown.');
  assert.equal(S.stagePreview({ kind: 'question', title: 'Q', minutes: 3, config: { prompt: 'Why?', kind: 'short' } }).note, 'Only your leaders read the answers.');
  assert.deepEqual(S.cleanConfig('question', { prompt: 'x', kind: 'multi', options: ['a', 'b'], question_id: 'q', template: 't' }), { prompt: 'x', kind: 'multi', options: ['a', 'b'], question_id: 'q' });
});

test('a writing part keeps its words on the stage, with its prompt after them', () => {
  const p = S.stagePreview({ kind: 'reflection', title: 'Start your log', body: 'Write one line a day.', config: { prompt: 'What happened today?' } });
  assert.deepEqual(p.lines, ['Write one line a day.']);
  assert.equal(p.note, 'What happened today?');
  assert.deepEqual(S.stagePreview({ kind: 'reflection', title: 'X', config: { prompt: 'Only this?' } }).lines, ['Only this?']);
});

test('a part keeps what its form does not edit, for the kind it is now', () => {
  const c = { prompt: 'x', show: { url: 'https://a.example' }, feature: 'random', feature_count: 3, groups: 4, workbooks: ['w'], show_tally: false, rerun_of: 'q' };
  assert.deepEqual(S.carriedConfig('rooms', c), { show: { url: 'https://a.example' }, feature: 'random', feature_count: 3, groups: 4, workbooks: ['w'] });
  assert.deepEqual(S.carriedConfig('question', c), { show: { url: 'https://a.example' }, feature: 'random', feature_count: 3, show_tally: false, rerun_of: 'q' });
  assert.deepEqual(S.carriedConfig('talk', {}), {});
});

test('callConfig keeps each kind its own call settings', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  assert.deepEqual(S.callConfig('talk', { show_url: 'https://example.org/doc', show_name: 'The doc', feature: 'random', feature_count: '3', results_of: id, show_tally: true }),
    { show: { url: 'https://example.org/doc', name: 'The doc' }, feature: 'random', feature_count: 3, results_of: id });
  assert.deepEqual(S.callConfig('question', { show_tally: true, rerun_of: id, show_url: 'http://no' }), { show_tally: true, rerun_of: id });
  assert.deepEqual(S.callConfig('rooms', { count: '4', by: 'size', sorting: 'random', group_docs: [{ name: 'Notes', url: 'https://docs.google.com/x' }, { name: '', url: '' }], workbooks: [id, 'nope'] }),
    { group_size: 4, sorting: 'random', group_docs: [{ name: 'Notes', url: 'https://docs.google.com/x' }], workbooks: [id] });
  assert.deepEqual(S.callConfig('rooms', { count: '6', by: 'rooms' }), { groups: 6 });
  assert.deepEqual(S.callConfig('talk', { feature: 'group', feature_count: 2 }), { feature: 'group' });
});

test('callProblem names a bad link in a sentence', () => {
  assert.equal(S.callProblem({ show_url: 'example.org' }), 'The page to show starts with https:// and has no spaces.');
  assert.equal(S.callProblem({ group_docs: [{ name: 'A', url: 'ftp://x' }] }), 'Each room document needs a name and a link that starts with https://.');
  assert.equal(S.callProblem({ show_url: '', group_docs: [{ name: '', url: '' }] }), null);
});
