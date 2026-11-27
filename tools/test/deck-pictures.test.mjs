import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SL = require('../../assets/slides-lib.js');
globalThis.SlidesLib = SL;
const DP = require('../../assets/deck-pictures.js');
const A = require('../../assets/addon-lib.js');

const C = '11111111-1111-4111-8111-111111111111';
const P = '22222222-2222-4222-8222-222222222222';
const GONE = '33333333-3333-4333-8333-333333333333';

// A stand-in for supabase-js: one bucket of files, and the scenes table.
function fakeDb(files, scenes) {
  const removed = [];
  const signedAsked = [];
  const bucket = {
    list(dir) {
      const seen = new Map();
      for (const [path, made] of files) {
        if (!path.startsWith(dir + '/')) continue;
        const rest = path.slice(dir.length + 1);
        const [head, ...more] = rest.split('/');
        if (more.length) seen.set(head, { name: head, id: null });
        else seen.set(head, { name: head, id: 'id-' + head, created_at: new Date(made).toISOString() });
      }
      return Promise.resolve({ data: [...seen.values()], error: null });
    },
    remove(paths) { paths.forEach((p) => { removed.push(p); files.delete(p); }); return Promise.resolve({ data: paths, error: null }); },
    createSignedUrls(paths) {
      signedAsked.push(...paths);
      return Promise.resolve({ data: paths.map((p) => ({ path: p, signedUrl: 'https://store.example/sign/' + p + '?token=t' })), error: null });
    }
  };
  return {
    removed, signedAsked,
    storage: { from: () => bucket },
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: scenes.map((id) => ({ id })), error: null }) }) })
  };
}

const OLD = Date.now() - 60 * 60 * 1000;

test('a deck names its own pictures with pic:, and only plain names count', () => {
  const text = '# One\n![a sunrise](pic:abc123def4.webp)\n---\n# Two\n- first ![x](pic:ffff0000aa.png)\n![bad](pic:../other/x.webp)\n![web](https://example.org/a.png)';
  assert.deepEqual(SL.picNames(text), ['abc123def4.webp', 'ffff0000aa.png']);
});

test('a picture with no link yet shows its words alone, and nothing beside other words', () => {
  const text = '![a sunrise](pic:aaaaaa1111.webp)\n- point ![p](pic:bbbbbb2222.webp)';
  assert.equal(SL.resolve(text), 'a sunrise\n- point ');
});

test('prepare makes links once, and the deck then draws them', async () => {
  const db = fakeDb(new Map(), []);
  const text = '![one](pic:cccccc3333.webp)\n---\n![two](pic:dddddd4444.webp)';
  assert.equal(await DP.prepare(db, C, P, text), true);
  assert.deepEqual(db.signedAsked, [C + '/' + P + '/cccccc3333.webp', C + '/' + P + '/dddddd4444.webp']);
  assert.match(SL.resolve(text), /!\[one\]\(https:\/\/store\.example\/sign\/.+cccccc3333\.webp\?token=t\)/);
  assert.equal(await DP.prepare(db, C, P, text), false, 'a fresh link is not asked for again');
  assert.equal(db.signedAsked.length, 2);
  assert.ok(SL.picsFor(text)['dddddd4444.webp']);
});

test('tidy deletes what the deck dropped, keeps what it uses and what is brand new, and clears parts that are gone', async () => {
  const files = new Map([
    [C + '/' + P + '/keep000001.webp', OLD],
    [C + '/' + P + '/drop000002.webp', OLD],
    [C + '/' + P + '/new0000003.webp', Date.now()],
    [C + '/' + GONE + '/left000004.webp', OLD]
  ]);
  const db = fakeDb(files, [P]);
  const n = await DP.tidy(db, C, P, '![k](pic:keep000001.webp)');
  assert.equal(n, 2);
  assert.deepEqual(db.removed.sort(), [C + '/' + GONE + '/left000004.webp', C + '/' + P + '/drop000002.webp'].sort());
  assert.ok(files.has(C + '/' + P + '/keep000001.webp'));
  assert.ok(files.has(C + '/' + P + '/new0000003.webp'));
});

test('forgetCohort clears every part folder before the cohort goes', async () => {
  const files = new Map([[C + '/' + P + '/a000000001.webp', OLD], [C + '/' + GONE + '/b000000002.png', OLD]]);
  const db = fakeDb(files, []);
  assert.equal(await DP.forgetCohort(db, C), 2);
  assert.equal(files.size, 0);
});

test('the stage message carries picture links, and the stage keeps only plain names and https links', () => {
  const view = { mode: 'part', part: null };
  const msg = A.stageMessage(view, false, false, null, false, {
    'eeeeee5555.webp': 'https://store.example/sign/x?token=t',
    '../evil.webp': 'https://store.example/e',
    'ffffff6666.png': 'javascript:alert(1)'
  });
  const v = A.readStageMessage(msg);
  assert.deepEqual(v.pics, { 'eeeeee5555.webp': 'https://store.example/sign/x?token=t' });
  assert.equal(A.readStageMessage(A.stageMessage(view, false, false, null, false, {})).pics, undefined);
});

test('a link that changed tells the stage to draw again', () => {
  assert.equal(SL.usePictures({ 'gggggg7777.webp': 'https://store.example/1' }), 1);
  assert.equal(SL.usePictures({ 'gggggg7777.webp': 'https://store.example/1' }), 0);
  assert.equal(SL.usePictures({ 'gggggg7777.webp': 'https://store.example/2' }), 1);
});
