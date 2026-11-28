import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, blank, publicRoom, summary, hostWords, hostWorks, meetOk, workbookBlocks, repoOk, siteOk, stanceCounts, TAKE_OVER_MS, LIMITS } from '../rooms/room-logic.js';

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
  ['talk', 'go', 'show', 'ask', 'reveal', 'close', 'clear', 'page', 'site', 'board', 'pasted', 'card', 'clock', 'clockAdd', 'hand', 'title', 'works', 'feature', 'groups', 'draw', 'workbook', 'wbCollect'].forEach((t) => {
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
  assert.deepEqual(publicRoom(r).page, { owner: null, repo: null, sha: null, htmlV: 0, url: 'https://ana.github.io/app/', path: null, v: 0, name: 'ana.github.io', together: false });
});

test('showing the same site again reloads it, and a page in a repository is a file that stays inside it', () => {
  const r = started();
  apply(r, A, { t: 'site', url: 'https://ana.github.io/app/' }, 2);
  apply(r, A, { t: 'site', url: 'https://ana.github.io/app/' }, 3);
  assert.equal(publicRoom(r).page.v, 1);
  const sha = 'a'.repeat(40);
  apply(r, A, { t: 'page', owner: 'ana', repo: 'app', sha, path: 'game/play.html' }, 4);
  assert.equal(publicRoom(r).page.path, 'game/play.html');
  apply(r, A, { t: 'page', owner: 'ana', repo: 'app', sha }, 5);
  assert.equal(publicRoom(r).page.path, 'index.html');
  ['../x.html', 'game/../../x.html', 'a//b.html', 'x.js', '/abs.html'].forEach((path) => assert.match(apply(r, A, { t: 'page', owner: 'ana', repo: 'app', sha, path }, 6).error, /could not be read/, path));
});

test('a leader opens and closes stances, and each opening starts at zero', () => {
  const r = started();
  assert.equal(publicRoom(r).stancesOpen, false);
  assert.match(apply(r, B, { t: 'stances', open: true }, 2).error, /Only the host/);
  apply(r, B, { t: 'stance', stance: 'agree' }, 3);
  assert.equal(stanceCounts(r).agree, 1);
  apply(r, A, { t: 'stances', open: true }, 4);
  assert.equal(publicRoom(r).stancesOpen, true);
  assert.equal(stanceCounts(r).total, 0);
  apply(r, A, { t: 'stances', open: false }, 5);
  assert.equal(publicRoom(r).stancesOpen, false);
});

test('a running clock moves by half a minute, and never into the past', () => {
  const r = started();
  apply(r, A, { t: 'clock', seconds: 60, label: '' }, 1000);
  apply(r, A, { t: 'clockAdd', seconds: 30 }, 2000);
  assert.equal(r.clock.endsAt, 91000);
  apply(r, A, { t: 'clockAdd', seconds: -300 }, 3000);
  assert.equal(r.clock.endsAt, 3000);
  apply(r, A, { t: 'clock', seconds: 0 }, 4000);
  assert.ok(apply(r, A, { t: 'clockAdd', seconds: 30 }, 5000).error);
});

test('a model shown together carries one shared state anyone in the call can change', () => {
  const r = started(), url = 'https://ideasatplay.org/play/do-random-events-cluster-9f6544?v=4';
  assert.deepEqual(apply(r, A, { t: 'site', url, name: 'Do Random Events Cluster?', together: true }, 2), { room: true });
  assert.equal(publicRoom(r).page.together, true);
  assert.deepEqual(publicRoom(r).mstate, { state: '', seq: 0, by: null });
  assert.deepEqual(apply(r, B, { t: 'mstate', state: '{"pick":"A"}' }, 3), { room: true });
  assert.deepEqual(publicRoom(r).mstate, { state: '{"pick":"A"}', seq: 1, by: 'b' });
  assert.deepEqual(apply(r, A, { t: 'mstate', state: '{"pick":"A"}' }, 4), {});
  assert.match(apply(r, A, { t: 'mstate', state: 'not json' }, 5).error, /could not be shared/);
  assert.match(apply(r, A, { t: 'mstate', state: JSON.stringify({ x: 'y'.repeat(LIMITS.mstate) }) }, 6).error, /too much/);
});

test('only an Ideas at Play model can be shared, and a page shown alone shares nothing', () => {
  const r = started();
  apply(r, A, { t: 'site', url: 'https://example.org/', together: true }, 2);
  assert.equal(publicRoom(r).page.together, false);
  assert.equal(publicRoom(r).mstate, null);
  assert.match(apply(r, B, { t: 'mstate', state: '{}' }, 3).error, /No shared model/);
  apply(r, A, { t: 'site', url: 'https://ideasatplay.org/play/x-1a2b3c?v=1' }, 4);
  assert.match(apply(r, B, { t: 'mstate', state: '{}' }, 5).error, /No shared model/);
});

test('show your work: the host asks, each person offers one address, and only the host sees the list', () => {
  const r = started();
  assert.match(apply(r, B, { t: 'work', url: 'https://bo.example/' }, 2).error, /not asking/);
  assert.equal(hostWorks(r), null);
  apply(r, A, { t: 'works', open: true }, 3);
  assert.equal(publicRoom(r).worksOpen, true);
  assert.deepEqual(apply(r, B, { t: 'work', url: 'https://bo.example/' }, 4), { room: true, myWork: 'https://bo.example/' });
  assert.deepEqual(apply(r, B, { t: 'work', url: 'https://bo.example/v2' }, 5), { room: true, myWork: 'https://bo.example/v2' });
  assert.deepEqual(hostWorks(r), { works: [{ id: 'b', name: 'Bo', url: 'https://bo.example/v2', at: 5 }] });
  assert.match(apply(r, B, { t: 'work', url: 'http://bo.example/' }, 6).error, /https/);
  assert.match(apply(r, B, { t: 'work', url: 'https://humanshaped.org/x' }, 6).error, /cannot be shown/);
  assert.equal(JSON.stringify(publicRoom(r)).includes('bo.example'), false);
  assert.deepEqual(apply(r, B, { t: 'work', url: '' }, 7), { room: true, myWork: null });
  assert.deepEqual(hostWorks(r), { works: [] });
});

test('the host features one offer on the stage under its maker’s name, and stopping erases every offer', () => {
  const r = started();
  apply(r, A, { t: 'works', open: true }, 2);
  apply(r, B, { t: 'work', url: 'https://bo.example/' }, 3);
  assert.deepEqual(apply(r, A, { t: 'feature', id: 'b' }, 4), { room: true });
  assert.equal(r.show, 'page');
  assert.deepEqual(publicRoom(r).page.url, 'https://bo.example/');
  assert.equal(publicRoom(r).page.name, 'Bo’s work');
  assert.match(apply(r, A, { t: 'feature', id: 'nobody' }, 5).error, /taken back/);
  apply(r, A, { t: 'works', open: false }, 6);
  assert.equal(hostWorks(r), null);
  assert.deepEqual(r.works, {});
  assert.match(apply(r, B, { t: 'work', url: 'https://bo.example/' }, 7).error, /not asking/);
});

test('breakout rooms deal everyone but the host into the Meet links, and the host brings them back', () => {
  const r = started(), same = (a) => a;
  const who = { ...A, present: ['a', 'b', 'c', 'd'] };
  assert.match(apply(r, who, { t: 'groups', links: ['https://meet.google.com/abc-defg-hij'] }, 2).error, /at least two/);
  assert.match(apply(r, who, { t: 'groups', links: ['https://meet.google.com/abc-defg-hij', 'https://meet.google.com/abc-defg-hij?authuser=1'] }, 2).error, /at least two/);
  assert.match(apply(r, who, { t: 'groups', links: ['https://zoom.us/j/1', 'https://example.org/'] }, 2).error, /at least two/);
  assert.deepEqual(apply(r, who, { t: 'groups', links: ['https://meet.google.com/abc-defg-hij?pli=1', 'meet.google.com/xyz', 'https://meet.google.com/klm-nopq-rst'] }, 3, { shuffle: same }), { room: true });
  assert.deepEqual(publicRoom(r).groups, [
    { link: 'https://meet.google.com/abc-defg-hij', members: ['b', 'd'] },
    { link: 'https://meet.google.com/klm-nopq-rst', members: ['c'] }
  ]);
  assert.deepEqual(apply(r, A, { t: 'groups', open: false }, 4), { room: true });
  assert.equal(publicRoom(r).groups, null);
});

test('only a Meet call address counts as a breakout room', () => {
  assert.equal(meetOk(' https://meet.google.com/abc-defg-hij#x '), 'https://meet.google.com/abc-defg-hij');
  assert.equal(meetOk('http://meet.google.com/abc-defg-hij'), null);
  assert.equal(meetOk('https://meet.google.com.evil.example/abc-defg-hij'), null);
  assert.equal(meetOk('https://meet.google.com/abc-defg-hijk'), null);
});

test('drawing together: anyone adds to the drawing, a newer version wins, and the host can start over', () => {
  const r = started(), el = (id, version, versionNonce, x) => ({ id, version, versionNonce, type: 'rectangle', x });
  assert.match(apply(r, B, { t: 'strokes', elements: [el('e1', 1, 5, 0)] }, 2).error, /Nothing is being drawn/);
  assert.deepEqual(apply(r, A, { t: 'draw' }, 3), { room: true, drawing: false });
  assert.equal(r.show, 'draw');
  assert.deepEqual(apply(r, B, { t: 'strokes', elements: [el('e1', 1, 5, 0)] }, 4), { strokes: [el('e1', 1, 5, 0)] });
  assert.deepEqual(apply(r, A, { t: 'strokes', elements: [el('e1', 1, 9, 1)] }, 5), {});
  assert.deepEqual(apply(r, A, { t: 'strokes', elements: [el('e1', 1, 2, 2)] }, 6), { strokes: [el('e1', 1, 2, 2)] });
  assert.deepEqual(apply(r, B, { t: 'strokes', elements: [el('e1', 3, 7, 3), { id: 'bad id!', version: 1, versionNonce: 1 }, { id: 'e2' }] }, 7), { strokes: [el('e1', 3, 7, 3)] });
  assert.equal(Object.keys(r.drawing).length, 1);
  assert.equal(r.drawing.e1.e.x, 3);
  apply(r, A, { t: 'card', body: 'Back soon' }, 8);
  assert.match(apply(r, B, { t: 'strokes', elements: [el('e9', 1, 1, 0)] }, 9).error, /Nothing is being drawn/);
  apply(r, A, { t: 'draw' }, 10);
  assert.equal(r.drawing.e1.e.x, 3);
  assert.deepEqual(apply(r, A, { t: 'draw', clear: true }, 11), { room: true, drawing: true });
  assert.deepEqual(r.drawing, {});
});

test('a drawing has a size, and one element too large to carry is left out', () => {
  const r = started();
  apply(r, A, { t: 'draw' }, 2);
  const big = { id: 'big', version: 1, versionNonce: 1, points: 'x'.repeat(LIMITS.element) };
  assert.deepEqual(apply(r, B, { t: 'strokes', elements: [big] }, 3), {});
  r.drawingBytes = LIMITS.drawingBytes - 10;
  assert.match(apply(r, B, { t: 'strokes', elements: [{ id: 'a1', version: 1, versionNonce: 1, x: 12345 }] }, 4).error, /full/);
});

const WB = [
  { type: 'text', text: 'Read the passage.' },
  { type: 'free', text: 'What do you notice?' },
  { type: 'choice', text: 'Which is random?', choices: ['Left', 'Right', ''] },
  { type: 'table', text: 'Fill in the table.', rows: [[{ text: 'Guess' }, { text: '' }], [{ text: 'Count' }, { text: '' }]] },
  { type: 'choice', text: 'Only one choice', choices: ['A'] },
  { type: 'file', text: 'Upload' }
];

test('a workbook keeps the blocks a room can run, numbered again', () => {
  const b = workbookBlocks(WB);
  assert.deepEqual(b.map((x) => x.key + ':' + x.type), ['b1:text', 'b2:free', 'b3:choice', 'b4:table']);
  assert.deepEqual(b[2].choices, ['Left', 'Right']);
  assert.deepEqual(b[3].rows, [[{ text: 'Guess', fill: false }, { text: '', fill: true }], [{ text: 'Count', fill: false }, { text: '', fill: true }]]);
});

test('each person answers their own workbook, sees only their own, and the host collects them all', () => {
  const r = started();
  assert.match(apply(r, A, { t: 'workbook', title: 'Empty', blocks: [{ type: 'text', text: '' }] }, 2).error, /nothing to answer/);
  assert.deepEqual(apply(r, A, { t: 'workbook', title: 'Random (delete me)', blocks: WB }, 3), { room: true });
  const id = r.workbook.id;
  assert.equal(r.show, 'workbook');
  assert.deepEqual(apply(r, B, { t: 'wbAnswer', id, key: 'b2', value: 'Clumps' }, 4), { room: true, wbMine: { id, a: { b2: 'Clumps' } } });
  assert.deepEqual(apply(r, B, { t: 'wbAnswer', id, key: 'b3', value: [1, 0] }, 5).wbMine.a.b3, [0]);
  assert.deepEqual(apply(r, B, { t: 'wbAnswer', id, key: 'b4', value: { '0,1': '12', '0,0': 'not a blank', '9,9': 'x' } }, 6).wbMine.a.b4, { '0,1': '12' });
  assert.match(apply(r, B, { t: 'wbAnswer', id, key: 'b1', value: 'x' }, 7).error, /could not be read/);
  assert.match(apply(r, B, { t: 'wbAnswer', id: 'old', key: 'b2', value: 'x' }, 7).error, /closed/);
  const pub = JSON.stringify(publicRoom(r));
  assert.equal(pub.includes('Clumps'), false);
  assert.equal(publicRoom(r).wbCount, 1);
  assert.match(apply(r, B, { t: 'wbCollect' }, 8).error, /Only the host/);
  const all = apply(r, A, { t: 'wbCollect' }, 9).reply;
  assert.equal(all.t, 'wbAll');
  assert.deepEqual(all.people, [{ name: 'Bo', a: { b2: 'Clumps', b3: [0], b4: { '0,1': '12' } }, at: 4 }]);
  apply(r, A, { t: 'workbook', close: true }, 10);
  assert.match(apply(r, B, { t: 'wbAnswer', id, key: 'b2', value: 'y' }, 11).error, /closed/);
  assert.equal(apply(r, A, { t: 'wbCollect' }, 12).reply.people.length, 1);
});
