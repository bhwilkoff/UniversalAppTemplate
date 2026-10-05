import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../../assets/board-pages-lib.js');
const C = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';

test('a PDF or a picture can be placed; a deck is asked for as a PDF', () => {
  assert.equal(P.kindOf({ name: 'Week 1.pdf', type: 'application/pdf', size: 1000 }).kind, 'pdf');
  assert.equal(P.kindOf({ name: 'diagram.PNG', type: '', size: 10 }).kind, 'image');
  assert.equal(P.kindOf({ name: 'deck.pptx', size: 10 }).kind, null);
  assert.match(P.kindOf({ name: 'deck.pptx', size: 10 }).why, /export it as a PDF/);
  assert.equal(P.kindOf({ name: 'big.pdf', size: 30 * 1024 * 1024 }).kind, null);
  assert.equal(P.kindOf({ name: 'notes.txt', size: 10 }).kind, null);
});

test('a page lives in its board folder, and only such a name is fetched', () => {
  const path = P.pathFor(C, B, 'Week 1: The Why!.pdf', 3, 1700, 'jpg');
  assert.equal(path, `${C}/${B}/1700-week-1-the-why-3.jpg`);
  assert.equal(P.pathOf(P.fileIdOf(path)), path);
  assert.equal(P.pathOf('hs:../../etc/passwd'), null);
  assert.equal(P.pathOf('some-excalidraw-id'), null);
});

test('the pictures a page still needs, once each', () => {
  const id = P.fileIdOf(`${C}/${B}/1-a-1.jpg`);
  const els = [{ type: 'image', fileId: id }, { type: 'image', fileId: id }, { type: 'image', fileId: 'x' }, { type: 'image', fileId: id, isDeleted: true }, { type: 'rectangle' }];
  assert.deepEqual(P.missingFiles(els, {}), [{ fileId: id, path: `${C}/${B}/1-a-1.jpg` }]);
  assert.deepEqual(P.missingFiles(els, { [id]: true }), []);
});

test('new pages go under what is already on the board, one after another', () => {
  const at = P.layout([{ x: 100, y: 0, width: 50, height: 400 }, { x: -20, y: 0, height: 10, isDeleted: true }], [{ width: 800, height: 600 }, { width: 600, height: 800 }]);
  assert.deepEqual(at[0], { x: 100, y: 520, width: 1200, height: 900 });
  assert.deepEqual(at[1], { x: 100, y: 1480, width: 1200, height: 1600 });
  assert.deepEqual(P.layout([], [{ width: 1, height: 1 }])[0], { x: 0, y: 0, width: 1200, height: 1200 });
  const e = P.pageElement('p1', 'hs:x', at[0], 0, 5);
  assert.equal(e.type, 'image'); assert.equal(e.locked, true); assert.equal(e.fileId, 'hs:x');
});

test('a library is a GitHub folder, pasted either way', () => {
  assert.deepEqual(P.libraryOf('bhwilkoff/teaching/library'), { owner: 'bhwilkoff', repo: 'teaching', ref: null, path: 'library', api: 'https://api.github.com/repos/bhwilkoff/teaching/contents/library' });
  assert.equal(P.libraryOf('https://github.com/bhwilkoff/teaching/tree/main/week 1').api, 'https://api.github.com/repos/bhwilkoff/teaching/contents/week%201?ref=main');
  assert.equal(P.libraryOf('not a library'), null);
  assert.equal(P.libraryOf('a/b/../c'), null);
  const files = P.libraryFiles([
    { type: 'file', name: 'b.pdf', size: 10, download_url: 'https://raw.githubusercontent.com/o/r/main/b.pdf' },
    { type: 'file', name: 'a.png', size: 10, download_url: 'https://raw.githubusercontent.com/o/r/main/a.png' },
    { type: 'file', name: 'c.md', size: 10, download_url: 'https://raw.githubusercontent.com/o/r/main/c.md' },
    { type: 'dir', name: 'more' },
    { type: 'file', name: 'evil.png', download_url: 'https://evil.example/a.png' }
  ]);
  assert.deepEqual(files.map(f => f.name), ['a.png', 'b.pdf']);
});
