// node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../assets/cohort-files-lib.js');

test('the folders are Resources, Prep, then one for each week', () => {
  assert.deepEqual(F.folders(3), [
    { path: 'resources', label: 'Resources' },
    { path: 'sessions/prep', label: 'Prep' },
    { path: 'sessions/week-1', label: 'Week 1' },
    { path: 'sessions/week-2', label: 'Week 2' },
    { path: 'sessions/week-3', label: 'Week 3' },
  ]);
  assert.equal(F.folders().length, 7);
});

test('the list leaves out the repository’s own machinery and groups by folder in order', () => {
  const tree = [
    { type: 'blob', path: 'README.md', size: 10 },
    { type: 'blob', path: '.github/workflows/keep-replaced-history.yml', size: 10 },
    { type: 'tree', path: 'resources' },
    { type: 'blob', path: 'resources/.gitkeep', size: 0 },
    { type: 'blob', path: 'sessions/week-10/notes.md', size: 5 },
    { type: 'blob', path: 'sessions/week-2/slides 10.pdf', size: 2048 },
    { type: 'blob', path: 'sessions/week-2/slides 9.pdf', size: 2048 },
    { type: 'blob', path: 'resources/reading.pdf', size: 3000 },
    { type: 'blob', path: 'drafts/idea.txt', size: 1 },
    { type: 'blob', path: 'loose.txt', size: 1 },
  ];
  const g = F.groups(tree, 5);
  assert.deepEqual(g.map((x) => x.label), ['Resources', 'Week 2', 'Week 10', 'drafts', 'Other files']);
  assert.deepEqual(g[1].files.map((f) => f.name), ['slides 9.pdf', 'slides 10.pdf']);
  assert.deepEqual(g[0].files[0], { path: 'resources/reading.pdf', name: 'reading.pdf', size: 3000 });
  assert.deepEqual(F.groups([], 5), []);
});

test('a file name is made safe as a path', () => {
  assert.equal(F.cleanName('C:\\Users\\bea\\My Plan.pdf'), 'My Plan.pdf');
  assert.equal(F.cleanName('../../etc/passwd'), 'passwd');
  assert.equal(F.cleanName('.env'), 'env');
  assert.equal(F.cleanName('notes: week 1?.md'), 'notes- week 1-.md');
  assert.equal(F.cleanName('Résumé été.pdf'), 'Résumé été.pdf');
  const long = F.cleanName('a'.repeat(200) + '.pdf');
  assert.equal(long.length, 120);
  assert.ok(long.endsWith('.pdf'));
  assert.equal(F.cleanName(''), '');
});

test('files over 25 MB are refused, and sizes read plainly', () => {
  assert.equal(F.tooBig(25 * 1024 * 1024), false);
  assert.equal(F.tooBig(25 * 1024 * 1024 + 1), true);
  assert.equal(F.size(500), '500 bytes');
  assert.equal(F.size(2048), '2 KB');
  assert.equal(F.size(3 * 1024 * 1024), '3 MB');
  assert.equal(F.size(1.25 * 1024 * 1024), '1.3 MB');
});

test('addresses are built with each part of the path escaped', () => {
  assert.equal(F.contentsUrl('humanshaped/kit-test', 'sessions/week-1/my plan.pdf'),
    'https://api.github.com/repos/humanshaped/kit-test/contents/sessions/week-1/my%20plan.pdf');
  assert.equal(F.pageUrl('humanshaped/kit-test', 'resources/a#b.md'), 'https://github.com/humanshaped/kit-test/blob/HEAD/resources/a%23b.md');
  assert.equal(F.treeUrl('humanshaped/kit-test'), 'https://api.github.com/repos/humanshaped/kit-test/git/trees/HEAD?recursive=1');
  assert.equal(F.folderUrl('humanshaped/kit-test', ''), 'https://github.com/humanshaped/kit-test');
});

test('GitHub’s answers are read as a person would want them said', () => {
  assert.equal(F.problem(200, {}), null);
  assert.equal(F.problem(409, { message: 'Git Repository is empty.' }).kind, 'empty');
  assert.equal(F.problem(401, {}).kind, 'expired');
  assert.equal(F.problem(422, { message: 'Invalid request.\n\n"sha" wasn\'t supplied.' }).kind, 'exists');
  assert.equal(F.problem(403, { message: 'Resource not accessible by integration' }).kind, 'not-ready');
  assert.equal(F.problem(403, { message: 'API rate limit exceeded' }).kind, 'rate');
  assert.equal(F.problem(403, { message: 'Must have push access' }).kind, 'forbidden');
  assert.equal(F.problem(404, { message: 'Not Found' }).kind, 'not-ready');
  assert.equal(F.problem(500, {}).kind, 'github');
});

test('only writers and maintainers add files', () => {
  assert.equal(F.canAdd('write'), true);
  assert.equal(F.canAdd('maintain'), true);
  assert.equal(F.canAdd('triage'), false);
  assert.equal(F.canAdd('read'), false);
  assert.equal(F.canAdd(null), false);
});
