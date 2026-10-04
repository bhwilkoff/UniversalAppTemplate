// The "something is waiting for you" email (G4): only the switch, the
// address, and the counts, never the words of a note or of feedback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({ console });
vm.runInContext(source, gs, { filename: 'Code.gs' });

test('notices stay off unless the switch says exactly true', () => {
  assert.equal(gs.noticesOn('true'), true);
  assert.equal(gs.noticesOn(' TRUE '), true);
  for (const v of [undefined, '', 'yes', '1', 'false']) assert.equal(gs.noticesOn(v), false);
});

test('a note becomes a short email that links back and carries no words', () => {
  const m = gs.noticeEmail({ user_id: 'u', email: 'ivy@example.org', notes: 1, answers: 0 });
  assert.equal(m.to, 'ivy@example.org');
  assert.equal(m.subject, 'A note is waiting for you on Human Shaped');
  assert.match(m.body, /a teacher wrote you a note\./);
  assert.match(m.body, /https:\/\/humanshaped\.org\/account\//);
  assert.match(m.body, /turn them off there/);
});

test('answers alone, and both together, are said plainly', () => {
  assert.match(gs.noticeEmail({ email: 'a@b.org', notes: 0, answers: 2 }).body, /2 answers came in on what you shared\./);
  assert.equal(gs.noticeEmail({ email: 'a@b.org', notes: 0, answers: 1 }).subject, 'Someone answered what you shared on Human Shaped');
  assert.match(gs.noticeEmail({ email: 'a@b.org', notes: 2, answers: 1 }).body,
    /your teachers wrote you 2 notes, and someone answered what you shared\./);
});

test('nothing waiting, or no sensible address, sends nothing', () => {
  assert.equal(gs.noticeEmail({ email: 'a@b.org', notes: 0, answers: 0 }), null);
  assert.equal(gs.noticeEmail({ email: 'not an address', notes: 1, answers: 0 }), null);
  assert.equal(gs.noticeEmail(null), null);
});
