import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../../assets/code-lib.js');

test('only a known language and a program of sensible size is sent', () => {
  assert.deepEqual(C.message('js', 'console.log(1)\r\n', true), { lang: 'js', text: 'console.log(1)\n', stage: true });
  assert.equal(C.message('ruby', 'puts 1'), null);
  assert.equal(C.message('py', '   '), null);
  assert.equal(C.message('py', 'x'.repeat(C.MAX + 1)), null);
  assert.equal(C.read({ lang: 'py', text: 'print(1)', extra: 1 }).stage, false);
});

test('the shared code is a teacher\'s, the same on every screen', () => {
  const presence = { s1: [{ code: { lang: 'js', text: 'student' } }], t2: [{ code: { lang: 'py', text: 'second' } }], t1: [{ code: { lang: 'js', text: 'first' } }] };
  assert.equal(C.shared(presence, ['t1', 't2']).text, 'first');
  assert.equal(C.shared(presence, ['nobody']), null);
  assert.equal(C.shared({ t1: [{}] }, ['t1']), null);
});

test('a program runs in a frame that cannot close its own script tag early', () => {
  const doc = C.jsDocument('console.log("</script><b>x</b>")', 'tok');
  assert.equal(doc.split('</script>').length, 2);
  assert.match(doc, /\\u003c\/script>/);
  assert.match(doc, /"tok"/);
});

test('the stage shows code only while the teacher has put it there', () => {
  assert.deepEqual(C.readStage(C.stageMessage({ lang: 'py', text: 'print(1)', stage: true })), { code: { lang: 'py', text: 'print(1)' } });
  assert.deepEqual(C.readStage(C.stageMessage({ lang: 'py', text: 'print(1)', stage: false })), { code: null });
  assert.equal(C.readStage('{"type":"hs-react","v":1}'), null);
  assert.match(C.trimOut('x'.repeat(9000)), /the rest was cut/);
});
