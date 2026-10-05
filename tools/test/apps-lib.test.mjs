import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/apps-lib.js');

const DECLARATION = `---
# Copy this file to the root of your repository as HUMAN-SHAPED.md
app: "Garden Swap"
website: "https://bea.github.io/garden-swap"
repository: "https://github.com/bea/garden-swap"
principles_version: "0.4"
status: "working toward"   # declared | working toward | withdrawn
declared_by: "Bea"
date: "2026-10-20"         # the date of the last change to this file
platforms: [web, ios]
---

# Garden Swap is human-shaped

**What it is for, and who it is for.** Neighbors on my street trade
seedlings in spring, and this keeps the list of [who has what](https://example.org).

## 1. A human-shaped problem

**Start from a human-shaped problem.**

*How someone can tell:* the builder has written it down.

**Answer:** meets

**In my words:** The list lived on a fridge, and
only one house could see it.

**Evidence:** [the why](https://github.com/bea/garden-swap/blob/main/README.md)

## 2. More possible, not more profit

**Answer:** Not yet.

**In my words:** It is free, but I have not written that down.

**Evidence:** [link]

## 3. Values as guardrails

**Answer:** meets / not yet / does not apply

**In my words:**

**Evidence:** [link]

## One value, and the decision it changed

Something.
`;

test('a declaration gives its header, purpose, and each answer in the builder\'s words', () => {
  const d = lib.parseDeclaration(DECLARATION);
  assert.equal(d.app, 'Garden Swap');
  assert.equal(d.status, 'working toward');
  assert.equal(d.version, '0.4');
  assert.equal(d.date, '2026-10-20');
  assert.deepEqual(d.platforms, ['web', 'ios']);
  assert.equal(d.purpose, 'Neighbors on my street trade seedlings in spring, and this keeps the list of who has what.');
  assert.equal(d.principles.length, 3);
  assert.deepEqual(d.principles[0], {
    n: 1, title: 'A human-shaped problem', answer: 'meets',
    words: 'The list lived on a fridge, and only one house could see it.',
    evidence: ['https://github.com/bea/garden-swap/blob/main/README.md']
  });
  assert.equal(d.principles[1].answer, 'not yet');
  assert.equal(d.principles[2].answer, null, 'the template\'s placeholder is not an answer');
  assert.equal(d.principles[2].words, '');
  assert.deepEqual(d.counts, { meets: 1, 'not yet': 1, unanswered: 1 });
});

test('an untouched template declares nothing', () => {
  const d = lib.parseDeclaration('---\napp: "Your app\'s name"\nwebsite: "https://"\ndeclared_by: "Your name"\ndate: "YYYY-MM-DD"\n---\n\n**What it is for, and who it is for.** One or two sentences, in your\nown words.\n');
  assert.equal(d.app, '');
  assert.equal(d.website, null);
  assert.equal(d.declaredBy, '');
  assert.equal(d.date, '');
  assert.equal(d.purpose, '');
  assert.equal(d.status, '');
});

test('an unknown status is not passed through', () => {
  assert.equal(lib.parseDeclaration('---\nstatus: "certified"\n---\n').status, '');
});

test('directory apps and shown cohort apps make one list, without repeats', () => {
  const apps = lib.mergeApps(
    [{ name: 'Archive Watch', repository: 'https://github.com/bhwilkoff/Archive-Watch', status: 'founding' }],
    [{ app_name: 'Garden Swap', app_repo: 'bea/garden-swap', app_url: 'javascript:alert(1)' },
     { app_name: 'Again', app_repo: 'BHWILKOFF/archive-watch', app_url: null },
     { app_name: null, app_repo: 'cal/tide-log', app_url: 'https://cal.github.io/tide-log' }]
  );
  assert.deepEqual(apps.map(a => [a.name, a.repo, a.status]), [
    ['Archive Watch', 'bhwilkoff/Archive-Watch', 'founding'],
    ['Garden Swap', 'bea/garden-swap', 'cohort'],
    ['tide-log', 'cal/tide-log', 'cohort']
  ]);
  assert.equal(apps[1].website, null, 'only https addresses are kept');
  assert.equal(lib.findApp(apps, 'BHWILKOFF/ARCHIVE-WATCH').name, 'Archive Watch');
  assert.equal(lib.findApp(apps, 'someone/else'), null);
});

test('a builder\'s own app is labeled as theirs, and a cohort app of the same repository wins', () => {
  const apps = lib.mergeApps([], [
    { app_name: 'Garden Swap', app_repo: 'bea/garden-swap', app_url: null, kind: 'cohort' },
    { app_name: 'Tide Log', app_repo: 'kim/tide-log', app_url: 'https://kim.github.io/tide-log/', kind: 'builder' },
    { app_name: 'Again', app_repo: 'Bea/Garden-Swap', app_url: null, kind: 'builder' },
    { app_name: 'Odd', app_repo: 'x/odd', app_url: null, kind: 'something else' }
  ]);
  assert.deepEqual(apps.map(a => [a.repo, a.status, a.source]), [
    ['bea/garden-swap', 'cohort', 'cohort'],
    ['kim/tide-log', 'builder', 'builder'],
    ['x/odd', 'cohort', 'cohort']
  ]);
  assert.equal(lib.statusText(apps[1], null), 'Shown here by the person building it');
  assert.equal(lib.statusText(apps[0], null), 'Being built in a cohort');
  assert.equal(lib.statusText(apps[1], { status: 'declared' }), 'Aligned with Human Shaped');
});

test('only a builder\'s own app carries a way to report it, naming the app and nothing else', () => {
  const href = lib.reportHref({ repo: 'kim/tide-log', source: 'builder' });
  assert.ok(href.startsWith('https://github.com/humanshaped/directory/issues/new?title='));
  const q = new URL(href).searchParams;
  assert.equal(q.get('title'), 'Something is wrong with kim/tide-log on humanshaped.org');
  assert.match(q.get('body'), /humanshaped\.org\/apps\/app\/\?r=kim\/tide-log/);
  assert.equal(lib.reportHref({ repo: 'bea/garden-swap', source: 'cohort' }), null);
  assert.equal(lib.reportHref({ repo: 'a/b', source: 'directory' }), null);
  assert.equal(lib.reportHref(null), null);
});

test('the feed reads active apps first and never more than its cap', () => {
  const apps = [{ repo: 'a/old', active: false }, { repo: 'a/one' }, { repo: null }, { repo: 'a/two', active: true }];
  assert.deepEqual(lib.feedRepos(apps, 2).map(a => a.repo), ['a/one', 'a/two']);
  assert.deepEqual(lib.feedRepos(apps, 9).map(a => a.repo), ['a/one', 'a/two', 'a/old']);
});

test('the feed is newest first, skips merges and bots, and caps each app', () => {
  const c = (sha, date, extra = {}) => lib.commitFrom({ sha, html_url: 'https://github.com/x/' + sha, commit: { message: sha, committer: { date } }, parents: [{}], author: { login: 'bea', type: 'User' }, ...extra });
  const items = lib.feed([
    { app: { name: 'A' }, commits: [c('a1', '2026-10-03T10:00:00Z'), c('a2', '2026-10-03T09:00:00Z'), c('a3', '2026-10-03T08:00:00Z'), c('a4', '2026-10-03T07:00:00Z')] },
    { app: { name: 'B' }, commits: [
      c('merge', '2026-10-03T12:00:00Z', { parents: [{}, {}] }),
      c('bot', '2026-10-03T11:30:00Z', { author: { login: 'github-actions[bot]', type: 'Bot' } }),
      c('b1', '2026-10-03T09:30:00Z')] }
  ], 10, 3);
  assert.deepEqual(items.map(i => i.commit.sha), ['a1', 'b1', 'a2', 'a3']);
  assert.equal(lib.feed([{ app: {}, commits: [c('x', '2026-10-01T00:00:00Z')] }], 0, 3).length, 0);
});

test('GitHub\'s answers become plain sentences, including its hourly limit', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  assert.equal(lib.trouble(200, '59', null, now), null);
  assert.equal(lib.trouble(404, null, null, now).kind, 'missing');
  assert.equal(lib.trouble(409, null, null, now).kind, 'empty');
  const limited = lib.trouble(403, '0', String(now.getTime() / 1000 + 600), now);
  assert.deepEqual(limited, { kind: 'limited', minutes: 10 });
  assert.match(lib.troubleText(limited), /about 10 minutes/);
  assert.equal(lib.trouble(403, '12', null, now).kind, 'unavailable', 'a 403 with calls left is not the limit');
  assert.equal(lib.trouble(500, null, null, now).kind, 'unavailable');
});

test('the builder\'s own words come from the declaration, then the directory, then GitHub', () => {
  const app = { in_its_own_words: 'From the directory.' };
  assert.equal(lib.ownWords(app, { purpose: 'From the declaration.' }, { description: 'From GitHub.' }).from, 'declaration');
  assert.equal(lib.ownWords(app, { purpose: '' }, { description: 'From GitHub.' }).from, 'directory');
  assert.equal(lib.ownWords({}, null, { description: 'From GitHub.' }).text, 'From GitHub.');
  assert.equal(lib.ownWords({}, null, { description: null }), null);
});

test('where an app stands, and where to talk about it', () => {
  assert.equal(lib.statusText({ status: 'founding' }, null), 'One of the four apps the method came from');
  assert.equal(lib.statusText({ status: 'founding' }, { status: 'declared' }), 'Aligned with Human Shaped');
  assert.equal(lib.statusText({ status: 'cohort' }, { status: '' }), 'Being built in a cohort');
  assert.deepEqual(lib.conversation('a/b', { has_discussions: true, has_issues: true }), { href: 'https://github.com/a/b/discussions', kind: 'discussions' });
  assert.deepEqual(lib.conversation('a/b', { has_discussions: false, has_issues: true }), { href: 'https://github.com/a/b/issues', kind: 'issues' });
  assert.equal(lib.conversation('a/b', { has_discussions: false, has_issues: false }), null);
});

test('platforms read as a person says them, with an Oxford comma', () => {
  assert.equal(lib.joinWithAnd(lib.platformNames(['web', 'ios', 'iphone', 'android'])), 'the web, iPhone, and Android');
  assert.equal(lib.joinWithAnd(lib.platformNames(['web', 'roku'])), 'the web and Roku');
});

test('automated commits are recognized, people are not', () => {
  const c = (name, email, login, message = 'Work') => lib.commitFrom({ sha: 'x', commit: { message, author: { name, email }, committer: { date: '2026-10-03T00:00:00Z' } }, author: login ? { login, type: 'User' } : null, parents: [{}] });
  assert.equal(c('github-actions[bot]', '41898282+github-actions[bot]@users.noreply.github.com', 'github-actions[bot]').bot, true);
  assert.equal(c('boba-pricing-bot', 'bot@bobaplaybook.com', null).bot, true);
  assert.equal(c('tidbits-dailyboard-bot', 'bot@users.noreply.github.com', 'bot').bot, true);
  assert.equal(c('Bea', 'bea@example.org', 'bea', 'Refresh prices [skip ci]').bot, true);
  assert.equal(c('Ben Wilkoff', 'ben@example.org', 'bhwilkoff').bot, false);
  assert.equal(c('Abbott Lee', 'abbott@example.org', 'abbot').bot, false);
  assert.equal(c('Robotics Club', 'robots@example.org', 'robotics').bot, false);
});

test('an app says which mark is true of it, with no one approving it (October 5)', () => {
  assert.equal(lib.statusText({ status: 'template' }, null), 'Endorsed by Human Shaped, made from the template');
  assert.equal(lib.statusText({ status: 'cohort' }, { status: 'working toward', principles: [{ n: 1 }] }), 'Aligned with Human Shaped');
  assert.equal(lib.statusText({ status: 'cohort' }, { status: 'withdrawn', principles: [{ n: 1 }] }), 'Its answers to the principles have been withdrawn');
});
