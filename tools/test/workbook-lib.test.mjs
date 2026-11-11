import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../../assets/workbook-lib.js');

const minerva = {
  title: 'Pre-Class Work ',
  blocks: [
    { type: 'Instructions', block_components: [{ type: 'Text', value: '{"ops":[{"insert":"Read this","attributes":{"bold":true}},{"insert":"\\n"}]}' }] },
    { type: 'FreeResponse', block_components: [{ type: 'Text', value: '{"ops":[{"insert":"Why?\\n"}]}' }, { type: 'RichTextField', height: 'long' }] },
    { type: 'MultipleChoice', block_components: [{ type: 'Text', value: '{"ops":[{"insert":"Pick\\n"}]}' }, { type: 'ChoicesField', multiple: 'true', choices: [{ label: 'A', value: '0' }, { label: 'B', value: '1' }] }] },
    { type: 'Table', block_components: [{ type: 'Text', value: '{"ops":[{"insert":"Fill in\\n"}]}' }, { type: 'TableField', value: [[{ value: { ops: [{ insert: 'Word\n' }] }, readOnly: true }, { value: { ops: [] }, readOnly: false }]] }] },
    { type: 'File', block_components: [{ type: 'Text', value: '{"ops":[{"insert":"Hand in\\n"},{"insert":{"image":"data:image/png;base64,AAA"}}]}' }, { type: 'FileField' }] },
    { type: 'Something new', block_components: [] }
  ]
};

test('Minerva\'s workbook data becomes blocks, keyed by place', () => {
  const w = W.normalize(minerva);
  assert.equal(w.title, 'Pre-Class Work');
  assert.deepEqual(w.blocks.map((b) => [b.key, b.type]), [['b1', 'text'], ['b2', 'free'], ['b3', 'choice'], ['b4', 'table'], ['b5', 'file']]);
  assert.equal(w.blocks[0].text, '**Read this**');
  assert.equal(w.blocks[1].height, 'long');
  assert.deepEqual(w.blocks[2], { key: 'b3', type: 'choice', text: 'Pick', multiple: true, choices: ['A', 'B'] });
  assert.deepEqual(w.blocks[3].rows, [[{ text: 'Word', fill: false }, { text: '', fill: true }]]);
  assert.equal(w.blocks[4].text, 'Hand in\n![](i1.png)');
  assert.deepEqual(w.images, [{ name: 'i1.png', data: 'data:image/png;base64,AAA' }]);
});

test('the plain export gives the same blocks', () => {
  const plain = { title: 'Pre-Class Work', blocks: [{ type: 'Instructions', text: '**Read this**' }, { type: 'FreeResponse', text: 'Why?', height: 'long' }, { type: 'MultipleChoice', text: 'Pick', multiple: true, choices: ['A', 'B'] }, { type: 'Table', text: 'Fill in', rows: [[{ text: 'Word', fill: false }, { text: '', fill: true }]] }, { type: 'File', text: 'Hand in\n![](i1.png)' }], images: { 'i1.png': 'data:image/png;base64,AAA' } };
  assert.deepEqual(W.normalize(plain), W.normalize(minerva));
});

test('an answer keeps only what its block can hold', () => {
  const w = W.normalize(minerva);
  assert.deepEqual(W.answerOf(w.blocks[1], { text: 'Because' }), { text: 'Because' });
  assert.equal(W.answerOf(w.blocks[1], { text: '   ' }), null);
  assert.deepEqual(W.answerOf(w.blocks[2], { picks: [1, 0, 1, 9, 'x'] }), { picks: [0, 1] });
  const single = Object.assign({}, w.blocks[2], { multiple: false });
  assert.deepEqual(W.answerOf(single, { picks: [1, 0] }), { picks: [1] });
  assert.deepEqual(W.answerOf(w.blocks[3], { cells: [['tamper', 'mine']] }), { cells: [['', 'mine']] });
  assert.equal(W.answerOf(w.blocks[0], { text: 'no' }), null);
});

test('a leader sees counts for choices and the words for the rest', () => {
  const w = W.normalize(minerva);
  const answers = [
    { block: 'b2', user_id: 'a', value: { text: 'One' } },
    { block: 'b3', user_id: 'a', value: { picks: [0] } },
    { block: 'b3', user_id: 'b', value: { picks: [0, 1] } }
  ];
  const s = W.summary(w, answers, (a) => a.user_id.toUpperCase());
  assert.deepEqual(s.map((x) => x.key), ['b2', 'b3', 'b4', 'b5']);
  assert.deepEqual(s[0].answers, [{ who: 'A', value: { text: 'One' } }]);
  assert.deepEqual(s[1].counts, [{ label: 'A', count: 2 }, { label: 'B', count: 1 }]);
  assert.equal(s[2].answered, 0);
});

test('an image that is not a picture, or is missing, stays a note', () => {
  const w = W.normalize({ title: 'x', blocks: [{ type: 'Instructions', text: '![](i1.png)\n![](i2.png)' }], images: { 'i1.png': 'javascript:alert(1)' } });
  assert.equal(w.blocks[0].text, '[An image]\n[An image]');
  assert.equal(w.images, undefined);
  const m = W.normalize({ blocks: [{ type: 'Instructions', block_components: [{ type: 'Text', value: '{"ops":[{"insert":{"image":"https://example.com/a.png"}}]}' }] }] });
  assert.equal(m.blocks[0].text, '[An image]');
});

test('a block reads as words and images in order', () => {
  assert.deepEqual(W.parts('Look\n![](i1.png)\n![](i2.jpg)\nafter'), [{ text: 'Look' }, { image: 'i1.png' }, { image: 'i2.jpg' }, { text: 'after' }]);
  assert.deepEqual(W.parts('![](../x.png)'), [{ text: '![](../x.png)' }]);
});

test('blocks replace others only in the same shape, and a workbook waits for its images', () => {
  const a = W.normalize(minerva).blocks;
  assert.equal(W.sameShape(a, a.map((b) => Object.assign({}, b, { text: 'new' }))), true);
  assert.equal(W.sameShape(a, a.slice(1)), false);
  assert.equal(W.waiting({ blocks: [] }), true);
  assert.equal(W.waiting({ blocks: [{ text: 'See\n[An image]' }] }), true);
  assert.equal(W.waiting({ blocks: a }), false);
});
