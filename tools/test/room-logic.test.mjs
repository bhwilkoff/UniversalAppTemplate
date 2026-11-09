import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, blank, publicRoom, summary, hostWords, repoOk, siteOk, stanceCounts, TAKE_OVER_MS, LIMITS } from '../rooms/room-logic.js';

const A = { pid: 'a', name: 'Ana', isHere: () => true }, B = { pid: 'b', name: 'Bo', isHere: () => true };
function started() { const r = blank(); apply(r, A, { t: 'start', title: 'Hello' }, 1); return r; }

test('the first to start is the host, and nobody else can start over them', () => {
  const r = started();
  assert.equal(r.host, 'a');
  assert.match(apply(r, B, { t: 'start' }, 2).error, /already/);
  assert.equal(r.host, 'a');
});

test('only the host runs the room', () => {
  const r = started();
  ['talk', 'go', 'show', 'ask', 'reveal', 'close', 'clear', 'page', 'site', 'board', 'pasted', 'card', 'clock', 'hand', 'title'].forEach((t) => {
    assert.match(apply(r, B, { t }, 2).error, /Only the host/, t);
  });
});

test('nobody can run a room that has not started', () => {
  assert.match(apply(blank(), A, { t: 'ask', kind: 'short', prompt: 'x' }, 1).error, /Only the host/);
});

test('anyone can take over a minute after the host left, and not before', () => {
  const r = started();
  r.hostLeft = 1000;
  assert.match(apply(r, { ...B, hostHere: true }, { t: 'claim' }, 1000 + TAKE_OVER_MS).error, /still here/);
  assert.match(apply(r, B, { t: 'claim' }, 1000 + TAKE_OVER_MS - 1).error, /still here/);
  apply(r, B, { t: 'claim' }, 1000 + TAKE_OVER_MS);
  assert.equal(r.host, 'b');
});

test('a host hands the room only to someone still in it', () => {
  const r = started();
  assert.match(apply(r, { ...A, isHere: () => false }, { t: 'hand', to: 'b' }, 2).error, /left/);
  apply(r, A, { t: 'hand', to: 'b', name: 'Bo' }, 2);
  assert.equal(r.host, 'b'); assert.equal(r.hostName, 'Bo');
});

test('answers are counted with no names, and one person counts once', () => {
  const r = started();
  apply(r, A, { t: 'ask', kind: 'choice', prompt: 'Which?', choices: ['One', 'Two'] }, 2);
  const id = r.question.id;
  apply(r, B, { t: 'answer', id, choice: 1 }, 3);
  apply(r, B, { t: 'answer', id, choice: 2 }, 3);
  apply(r, { pid: 'c' }, { t: 'answer', id, choice: 2 }, 3);
  assert.deepEqual(summary(r), { total: 2, counts: [0, 2] });
  const out = JSON.stringify(publicRoom(r));
  assert.ok(!out.includes('"answers"'));
});

test('an answer outside the question is refused', () => {
  const r = started();
  apply(r, A, { t: 'ask', kind: 'choice', prompt: 'Which?', choices: ['One', 'Two'] }, 2);
  assert.ok(apply(r, B, { t: 'answer', id: r.question.id, choice: 3 }, 3).error);
  assert.ok(apply(r, B, { t: 'answer', id: 'nope', choice: 1 }, 3).error);
  apply(r, A, { t: 'close' }, 4);
  assert.ok(apply(r, B, { t: 'answer', id: r.question.id, choice: 1 }, 5).error);
});

test('a new question starts with no answers', () => {
  const r = started();
  apply(r, A, { t: 'ask', kind: 'short', prompt: 'Why?' }, 2);
  apply(r, B, { t: 'answer', id: r.question.id, body: 'Because' }, 3);
  assert.deepEqual(hostWords(r).words, ['Because']);
  apply(r, A, { t: 'ask', kind: 'short', prompt: 'And?' }, 4);
  assert.deepEqual(hostWords(r).words, []);
});

test('several picks, a scale, and words are counted the way the stage reads them', () => {
  const r = started();
  apply(r, A, { t: 'ask', kind: 'multi', prompt: 'Any?', choices: ['One', 'Two', 'Three'] }, 2);
  apply(r, B, { t: 'answer', id: r.question.id, picks: [1, 3, 3, 9] }, 3);
  assert.deepEqual(summary(r), { total: 1, counts: [1, 0, 1] });
  apply(r, A, { t: 'ask', kind: 'scale', prompt: 'How?', choices: ['Low', 'High'], points: 5 }, 4);
  apply(r, B, { t: 'answer', id: r.question.id, choice: 5 }, 5);
  assert.deepEqual(summary(r).counts, [0, 0, 0, 0, 1]);
  apply(r, A, { t: 'ask', kind: 'words', prompt: 'One word?' }, 6);
  apply(r, A, { t: 'answer', id: r.question.id, body: 'Calm' }, 7);
  apply(r, B, { t: 'answer', id: r.question.id, body: ' calm' }, 7);
  assert.deepEqual(summary(r).words, [{ word: 'calm', count: 2 }]);
});

test('a question needs words, and choices when it has them', () => {
  const r = started();
  assert.ok(apply(r, A, { t: 'ask', kind: 'choice', prompt: '', choices: ['a', 'b'] }, 2).error);
  assert.ok(apply(r, A, { t: 'ask', kind: 'choice', prompt: 'x', choices: ['a'] }, 2).error);
  assert.ok(apply(r, A, { t: 'ask', kind: 'nonsense', prompt: 'x' }, 2).error);
});

test('anyone adds notes and votes, a vote toggles, and a note comes down only for its writer or the host', () => {
  const r = started();
  apply(r, B, { t: 'note', text: '  A   thought ' }, 2);
  const id = r.notes[0].id;
  assert.equal(r.notes[0].text, 'A thought');
  apply(r, A, { t: 'vote', id }, 3); apply(r, B, { t: 'vote', id }, 3);
  assert.equal(r.notes[0].votes.length, 2);
  apply(r, B, { t: 'vote', id }, 4);
  assert.deepEqual(r.notes[0].votes, ['a']);
  assert.ok(apply(r, { pid: 'c' }, { t: 'unnote', id }, 5).error);
  apply(r, A, { t: 'unnote', id }, 5);
  assert.equal(r.notes.length, 0);
});

test('the board has a limit for each person and for the room', () => {
  const r = started();
  for (let i = 0; i < LIMITS.notesEach; i++) apply(r, B, { t: 'note', text: 'n' + i }, 2);
  assert.match(apply(r, B, { t: 'note', text: 'more' }, 2).error, /as many/);
  for (let i = r.notes.length; i < LIMITS.notes; i++) r.notes.push({ id: 'x' + i, by: 'x' + i, votes: [] });
  assert.match(apply(r, A, { t: 'note', text: 'more' }, 2).error, /full/);
});

test('a page must be a real repository at one commit, and not a blocked one', () => {
  const r = started(), sha = 'a'.repeat(40);
  assert.ok(apply(r, A, { t: 'page', owner: 'x/y', repo: 'z', sha }, 2).error);
  assert.ok(apply(r, A, { t: 'page', owner: 'x', repo: '..', sha }, 2).error);
  assert.ok(apply(r, A, { t: 'page', owner: 'x', repo: 'z', sha: 'main' }, 2).error);
  assert.match(apply(r, A, { t: 'page', owner: 'Bad', repo: 'Page', sha }, 2, { blocked: ['bad/page'] }).error, /cannot be shown/);
  apply(r, A, { t: 'page', owner: 'x', repo: 'z', sha }, 2);
  assert.equal(r.show, 'page');
  assert.equal(publicRoom(r).page.name, 'x/z');
  assert.ok(repoOk('humanshaped', 'stage-template'));
});

test('a pasted page is sent apart from the room, with a limit', () => {
  const r = started();
  assert.ok(apply(r, A, { t: 'pasted', html: '   ' }, 2).error);
  assert.ok(apply(r, A, { t: 'pasted', html: 'x'.repeat(LIMITS.html + 1) }, 2).error);
  const did = apply(r, A, { t: 'pasted', html: '<p>Hi</p>' }, 2);
  assert.ok(did.html);
  assert.ok(!JSON.stringify(publicRoom(r)).includes('<p>Hi'));
});

test('moving to a slide clears where people stand, and a stance can be taken back', () => {
  const r = started();
  apply(r, B, { t: 'stance', stance: 'agree' }, 2);
  assert.equal(stanceCounts(r).agree, 1);
  apply(r, B, { t: 'stance', stance: 'agree' }, 3);
  assert.equal(stanceCounts(r).total, 0);
  apply(r, B, { t: 'stance', stance: 'unsure' }, 3);
  apply(r, A, { t: 'go', at: 1 }, 4);
  assert.equal(stanceCounts(r).total, 0);
});

test('a clock counts from now, and zero takes it away', () => {
  const r = started();
  apply(r, A, { t: 'clock', seconds: 120, label: 'Talk' }, 1000);
  assert.deepEqual(r.clock, { endsAt: 121000, label: 'Talk' });
  apply(r, A, { t: 'clock', seconds: 0 }, 2000);
  assert.equal(r.clock, null);
});

test('a talk reaches the room without changing what it means, and a closed question goes back to it', () => {
  const r = started();
  apply(r, A, { t: 'talk', text: '# One', show: true }, 2);
  assert.equal(r.talkV, 1); assert.equal(r.show, 'slides');
  apply(r, A, { t: 'ask', kind: 'short', prompt: 'x' }, 3);
  apply(r, A, { t: 'close' }, 4);
  assert.equal(r.show, 'slides');
});

test('nothing unknown changes a room', () => {
  const r = started(), before = JSON.stringify(r);
  assert.ok(apply(r, A, { t: 'hello' }, 2).error);
  assert.ok(apply(r, A, null, 2).error);
  assert.equal(JSON.stringify(r), before);
});

test('a board opens with what everyone should add, and a new prompt starts it clean', () => {
  const r = started();
  assert.match(apply(r, A, { t: 'show', show: 'board' }, 2).error, /add first/);
  assert.match(apply(r, A, { t: 'board', prompt: '  ' }, 2).error, /add first/);
  apply(r, A, { t: 'board', prompt: 'What should we build?' }, 2);
  assert.equal(r.show, 'board');
  apply(r, B, { t: 'note', text: 'A map' }, 3);
  apply(r, A, { t: 'board', prompt: 'What should we build?' }, 4);
  assert.equal(r.notes.length, 1, 'the same prompt keeps its notes');
  apply(r, A, { t: 'board', prompt: 'What worries you?' }, 5);
  assert.equal(r.notes.length, 0);
  assert.equal(publicRoom(r).board, 'What worries you?');
});

test('a website is shown by an https address that is not this site', () => {
  assert.equal(siteOk('https://ana.github.io/app/'), 'https://ana.github.io/app/');
  ['http://ana.github.io/', 'javascript:alert(1)', 'https://humanshaped.org/x', 'https://www.humanshaped.org/', 'https://humanshaped-rooms.benwilkoff.workers.dev/', 'https://u:p@example.com/', 'not a url', 'https://example.com/' + 'a'.repeat(LIMITS.url)].forEach((u) => assert.equal(siteOk(u), null, u));
  const r = started();
  assert.match(apply(r, A, { t: 'site', url: 'https://humanshaped.org/' }, 2).error, /cannot be shown/);
  apply(r, A, { t: 'site', url: 'https://ana.github.io/app/' }, 2);
  assert.equal(r.show, 'page');
  assert.deepEqual(publicRoom(r).page, { owner: null, repo: null, sha: null, htmlV: 0, url: 'https://ana.github.io/app/', name: 'ana.github.io' });
});
