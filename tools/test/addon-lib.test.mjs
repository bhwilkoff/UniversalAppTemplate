import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/addon-lib.js');

test('a meeting code reads the same however it was pasted', () => {
  const want = 'abc-defg-hij';
  for (const s of [
    'https://meet.google.com/abc-defg-hij',
    'https://meet.google.com/abc-defg-hij?authuser=1',
    'https://meet.google.com/abc-defg-hij/',
    'http://meet.google.com/ABC-DEFG-HIJ?pli=1#x',
    'meet.google.com/abc-defg-hij',
    '  abc-defg-hij ',
    'ABCDEFGHIJ'
  ]) assert.equal(lib.meetingCode(s), want, s);
});

test('anything that is not a Meet code is refused', () => {
  for (const s of [
    '', null, undefined, 'abc-def-hij', 'abc-defg-hijk', 'abc-defg-hi1',
    'https://example.org/abc-defg-hij', 'https://meet.google.com.evil.example/abc-defg-hij',
    'https://meet.google.com/lookup/abcdefghij', 'https://meet.google.com/', 'not a link'
  ]) assert.equal(lib.meetingCode(s), null, String(s));
});

const rows = {
  sessions: [
    { cohort_id: 'c1', number: 1, meet_url: 'https://meet.google.com/aaa-bbbb-ccc' },
    { cohort_id: 'c1', number: 2, meet_url: 'https://meet.google.com/aaa-bbbb-ccc?authuser=0' },
    { cohort_id: 'c2', number: 1, meet_url: 'https://meet.google.com/zzz-yyyy-xxx' },
    { cohort_id: 'c3', number: 1, meet_url: null }
  ],
  groups: [
    { id: 'g1', cohort_id: 'c1', name: 'Trio A', meet_url: 'https://meet.google.com/ggg-hhhh-iii' },
    { id: 'g2', cohort_id: 'c1', name: 'Trio B', meet_url: null }
  ],
  teaching: ['c1', 'c2']
};

test('the main room is found from any session of the cohort', () => {
  assert.deepEqual(lib.findRoom('aaa-bbbb-ccc', rows), { code: 'aaa-bbbb-ccc', cohortId: 'c1', groupId: null, room: 'main', ambiguous: false });
  assert.equal(lib.findRoom('ZZZYYYYXXX', rows).cohortId, 'c2');
});

test("a group's room is found as that group, in its cohort", () => {
  assert.deepEqual(lib.findRoom('ggg-hhhh-iii', rows), { code: 'ggg-hhhh-iii', cohortId: 'c1', groupId: 'g1', room: 'group', ambiguous: false });
});

test('a code nobody has, or no code at all, finds nothing', () => {
  assert.equal(lib.findRoom('qqq-wwww-eee', rows), null);
  assert.equal(lib.findRoom('', rows), null);
  assert.equal(lib.findRoom('aaa-bbbb-ccc', {}), null);
});

test('when two cohorts share a code, the one this person teaches wins, and it says so', () => {
  const shared = {
    sessions: [
      { cohort_id: 'other', meet_url: 'https://meet.google.com/aaa-bbbb-ccc' },
      { cohort_id: 'mine', meet_url: 'https://meet.google.com/aaa-bbbb-ccc' }
    ],
    groups: [], teaching: ['mine']
  };
  const r = lib.findRoom('aaa-bbbb-ccc', shared);
  assert.equal(r.cohortId, 'mine');
  assert.equal(r.ambiguous, true);
});

test('the panel opens the activity each part of the session needs', () => {
  assert.deepEqual(lib.panelPlan('arrive', 'main'), { open: 'now', lead: 'heard', closingFirst: false });
  assert.deepEqual(lib.panelPlan('show', 'main'), { open: 'now', lead: 'groups', closingFirst: false });
  assert.deepEqual(lib.panelPlan('check', 'main'), { open: 'checks', lead: null, closingFirst: true });
  assert.equal(lib.panelPlan('prompt', 'main').open, 'queue');
  assert.equal(lib.panelPlan(null, 'main').open, 'queue');
  // In a group's room, the group's order leads whatever the clock says.
  assert.deepEqual(lib.panelPlan('prompt', 'group'), { open: 'now', lead: 'groups', closingFirst: false });
});

test('a timer counts down to zero, and no timer is null', () => {
  assert.equal(lib.timeLeft(10_000, 4_000), 6);
  assert.equal(lib.timeLeft(10_000, 20_000), 0);
  assert.equal(lib.timeLeft(null, 0), null);
});

const check = { id: 'k1', state: 'open', prompt: 'Which stage are you on?', choices: ['One', 'Two'], show_tally: false };
const words = { id: 'k2', state: 'open', prompt: 'What is still muddy?', choices: null, show_tally: false };
const closed = { id: 'k3', state: 'closed', prompt: 'Old', choices: null, show_tally: false };
const tallies = { k1: [{ choice: 1, answers: 3 }, { choice: 2, answers: 1 }] };
const part = { key: 'value', name: 'One value at work', endsAt: 1000 };

test('a part with no timer running has no end, never a timer that already ran out', () => {
  const v = lib.stageView({ part: { key: 'show', name: 'Show', endsAt: null } });
  assert.equal(v.part.endsAt, null);
  assert.equal(lib.readStageMessage(lib.stageMessage(v)).part.endsAt, null);
  assert.equal(lib.timeLeft(undefined, 0), null);
});

test('the stage shows the part and its timer when nothing is on it', () => {
  assert.deepEqual(lib.stageView({ part }), { mode: 'part', part });
  assert.deepEqual(lib.stageView({}), { mode: 'part', part: null });
});

test('a check on the stage shows its question, and its count only when the teacher shows it', () => {
  const hidden = lib.stageView({ part, onStage: { kind: 'check', id: 'k1' }, checks: [check], tallies });
  assert.equal(hidden.mode, 'check');
  assert.equal(hidden.prompt, 'Which stage are you on?');
  assert.deepEqual(hidden.choices, ['One', 'Two']);
  assert.equal(hidden.count, null);
  const shown = lib.stageView({ part, onStage: { kind: 'check', id: 'k1' }, checks: [{ ...check, show_tally: true }], tallies });
  assert.equal(shown.count.total, 4);
  assert.deepEqual(shown.count.rows.map(r => r.count), [3, 1]);
  assert.deepEqual(shown.count.rows.map(r => r.share), [75, 25]);
});

test('the stage never carries an answer or a name on an answer', () => {
  const v = lib.stageView({ onStage: { kind: 'check', id: 'k2' }, checks: [words], tallies: {}, answers: [{ user_id: 'u1', body: 'secret' }], names: { u1: 'Bea' } });
  const text = JSON.stringify(v);
  assert.ok(!text.includes('secret'));
  assert.ok(!text.includes('Bea'));
  assert.equal(v.count, null);
});

test('a closed check, or one that is gone, falls back to the part', () => {
  assert.equal(lib.stageView({ onStage: { kind: 'check', id: 'k3' }, checks: [closed] }).mode, 'part');
  assert.equal(lib.stageView({ onStage: { kind: 'check', id: 'nope' }, checks: [check] }).mode, 'part');
  assert.equal(lib.stageView({ onStage: { kind: 'item', id: 'nope' }, items: [] }).mode, 'part');
});

test('an item from the queue shows who, what, and their note', () => {
  const items = [{ id: 'i1', user_id: 'u1', kind: 'commit', url: 'https://github.com/bea/garden-swap/commit/a1b2c3d4', note: 'The new filter' }];
  const v = lib.stageView({ onStage: { kind: 'item', id: 'i1' }, items, names: { u1: 'Bea' } });
  assert.deepEqual(v, { mode: 'item', part: null, who: 'Bea', what: 'Commit a1b2c3d in bea/garden-swap', note: 'The new filter' });
});

test('a stage message survives the trip, and anything else is refused', () => {
  const view = lib.stageView({ part, onStage: { kind: 'check', id: 'k1' }, checks: [{ ...check, show_tally: true }], tallies });
  assert.deepEqual(lib.readStageMessage(lib.stageMessage(view)), view);
  assert.equal(lib.readStageMessage('not json'), null);
  assert.equal(lib.readStageMessage(JSON.stringify({ type: 'other', v: 1, view })), null);
  assert.equal(lib.readStageMessage(JSON.stringify({ type: 'hs-stage', v: 1, view: { mode: 'html', html: '<b>' } })), null);
  assert.ok(lib.isHello(lib.HELLO));
  assert.ok(!lib.isHello(lib.stageMessage(view)));
});

test('the sign-in window hands back only the two tokens, to the window that opened it, from this origin', () => {
  const opened = {};
  const msg = lib.handoff({ access_token: 'a.b.c', refresh_token: 'r1', provider_token: 'gho_secret', user: { id: 'u' } });
  assert.deepEqual(msg, { type: 'hs-session', access_token: 'a.b.c', refresh_token: 'r1' });
  const origin = 'https://humanshaped.org';
  assert.deepEqual(lib.acceptHandoff({ origin, source: opened, data: msg }, origin, opened), { access_token: 'a.b.c', refresh_token: 'r1' });
  assert.equal(lib.acceptHandoff({ origin: 'https://evil.example', source: opened, data: msg }, origin, opened), null);
  assert.equal(lib.acceptHandoff({ origin, source: {}, data: msg }, origin, opened), null);
  assert.equal(lib.acceptHandoff({ origin, source: opened, data: msg }, origin, null), null);
  assert.equal(lib.acceptHandoff({ origin, source: opened, data: { type: 'hs-session', access_token: 'a' } }, origin, opened), null);
  assert.equal(lib.handoff(null), null);
});
