import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/live-lib.js');

test('a GitHub link says what it is', () => {
  assert.deepEqual(lib.classifyLink('https://github.com/bea/garden-swap/commit/a1b2c3d4e5f6'),
    { kind: 'commit', url: 'https://github.com/bea/garden-swap/commit/a1b2c3d4e5f6', label: 'Commit a1b2c3d in bea/garden-swap' });
  assert.equal(lib.classifyLink('https://github.com/bea/garden-swap/issues/12').label, 'Issue #12 in bea/garden-swap');
  assert.equal(lib.classifyLink('https://github.com/bea/garden-swap/pull/3').kind, 'pull');
  assert.equal(lib.classifyLink('https://github.com/humanshaped/cohort-fall/discussions/7').label, 'Discussion #7 in humanshaped/cohort-fall');
  assert.equal(lib.classifyLink('https://github.com/bea/garden-swap/').kind, 'repo');
});

test('any other https link is a link, and anything else is refused', () => {
  assert.equal(lib.classifyLink('https://bea.github.io/garden-swap/').label, 'bea.github.io/garden-swap');
  assert.equal(lib.classifyLink('https://github.com/bea/garden-swap/tree/main/web').kind, 'link');
  assert.equal(lib.classifyLink('http://example.org'), null);
  assert.equal(lib.classifyLink('javascript:alert(1)'), null);
  assert.equal(lib.classifyLink('not a link'), null);
});

test('the queue keeps the order people asked in, and shown items move below', () => {
  const items = [
    { id: 'b', state: 'waiting', created_at: '2026-10-20T23:10:00Z' },
    { id: 'a', state: 'waiting', created_at: '2026-10-20T23:05:00Z' },
    { id: 'c', state: 'shown', created_at: '2026-10-20T23:01:00Z', shown_at: '2026-10-20T23:20:00Z' },
    { id: 'd', state: 'shown', created_at: '2026-10-20T23:02:00Z', shown_at: '2026-10-20T23:30:00Z' }
  ];
  const q = lib.queue(items);
  assert.deepEqual(q.waiting.map((i) => i.id), ['a', 'b']);
  assert.deepEqual(q.shown.map((i) => i.id), ['d', 'c']);
});

test('only the person and the teacher can manage an item', () => {
  assert.equal(lib.canManage({ user_id: 'me' }, 'me', false), true);
  assert.equal(lib.canManage({ user_id: 'them' }, 'me', false), false);
  assert.equal(lib.canManage({ user_id: 'them' }, 'me', true), true);
});

test('a question is in their own words, or two to six choices', () => {
  assert.deepEqual(lib.parseCheck(' What next? ', 'words', 'ignored'), { prompt: 'What next?', choices: null });
  assert.deepEqual(lib.parseCheck('Which?', 'choices', 'One\n\n Two \n'), { prompt: 'Which?', choices: ['One', 'Two'] });
  assert.match(lib.parseCheck('', 'words').error, /question first/);
  assert.match(lib.parseCheck('Which?', 'choices', 'Only').error, /at least two/);
  assert.match(lib.parseCheck('Which?', 'choices', '1\n2\n3\n4\n5\n6\n7').error, /Six choices/);
});

test('the tally lists every choice, names no one, and counts words answers', () => {
  const check = { choices: ['Planning', 'Testing', 'Both'] };
  const t = lib.tally(check, [{ choice: 1, answers: 3 }, { choice: 3, answers: '1' }]);
  assert.equal(t.total, 4);
  assert.deepEqual(t.rows.map((r) => [r.label, r.count, r.share]), [['Planning', 3, 75], ['Testing', 0, 0], ['Both', 1, 25]]);
  assert.deepEqual(lib.tally({ choices: null }, [{ choice: null, answers: 5 }]), { total: 5, rows: [] });
  assert.equal(lib.tally(check, []).rows[0].share, 0);
});

test('an answer reads as the choice or the words', () => {
  assert.equal(lib.answerText({ choices: ['A', 'B'] }, { choice: 2 }), 'B');
  assert.equal(lib.answerText({ choices: null }, { body: 'Mine' }), 'Mine');
  assert.equal(lib.answerText({ choices: null }, null), null);
  assert.equal(lib.itemLabel({ kind: 'app', url: 'https://bea.github.io/garden-swap/' }), 'The app, live at bea.github.io/garden-swap');
  assert.equal(lib.counted(1, 'answer', 'answers'), '1 answer');
});

// The trio protocol (M12).
test('every builder gets a whole turn inside the part', () => {
  const steps = lib.turnSteps(25, 3);
  assert.deepEqual(steps.map(s => s.key), ['ask', 'show', 'clarify', 'three', 'next']);
  const total = steps.reduce((n, s) => n + s.seconds, 0) * 3;
  assert.ok(total <= 25 * 60 + 60 && total >= 25 * 60 - 60, String(total));
  assert.ok(steps.every(s => s.seconds % 15 === 0 && s.seconds >= 30));
  assert.ok(Math.abs(steps[1].seconds - 3 * steps[0].seconds) <= 15, 'showing gets about three times the question');
});
test('a short part still gives each step at least thirty seconds', () => {
  assert.ok(lib.turnSteps(5, 4).every(s => s.seconds === 30));
});
test('the presenting order moves along by one each week, and keeps the same people', () => {
  const ppl = [{ id: '3', name: 'cal' }, { id: '1', name: 'Bea' }, { id: '2', name: 'eve' }];
  assert.deepEqual(lib.presentingOrder(ppl, 1).map(p => p.name), ['Bea', 'cal', 'eve']);
  assert.deepEqual(lib.presentingOrder(ppl, 2).map(p => p.name), ['cal', 'eve', 'Bea']);
  assert.deepEqual(lib.presentingOrder(ppl, 4).map(p => p.name), ['Bea', 'cal', 'eve']);
  assert.deepEqual(lib.presentingOrder([], 3), []);
});
test("a builder's newest bring-back is the one their turn opens with", () => {
  const shares = [
    { user_id: 'bea', kind: 'bring-back', created_at: '2026-10-21T10:00:00Z', want_to_know: 'old' },
    { user_id: 'bea', kind: 'question', created_at: '2026-10-23T10:00:00Z' },
    { user_id: 'bea', kind: 'bring-back', created_at: '2026-10-22T10:00:00Z', want_to_know: 'new' },
    { user_id: 'eve', kind: 'bring-back', created_at: '2026-10-24T10:00:00Z' }
  ];
  assert.equal(lib.latestBringBack(shares, 'bea').want_to_know, 'new');
  assert.equal(lib.latestBringBack(shares, 'fay'), null);
  assert.equal(lib.clock(75), '1:15');
  assert.equal(lib.CLOSING_CHECKS.length, 2);
});
