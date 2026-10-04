import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/reach-lib.js');

test('nothing chosen saves as nothing on', () => {
  assert.deepEqual(R.checkChoice({}).row, { email: null, teachers_may_email: false, notices: false });
});

test('a choice needs an address, and a real-looking one', () => {
  assert.match(R.checkChoice({ teachers_may_email: true }).error, /address/);
  assert.match(R.checkChoice({ email: 'ivy at example', notices: true }).error, /does not look/);
  assert.deepEqual(R.checkChoice({ email: ' ivy@example.org ', teachers_may_email: true }).row,
    { email: 'ivy@example.org', teachers_may_email: true, notices: false });
});

test('the mail link carries the address, subject, and draft, encoded', () => {
  const href = R.mailtoHref('ivy+hs@example.org', 'Checking in, from Fall & Winter', 'We missed you.\nHere is the recording?');
  assert.ok(href.startsWith('mailto:ivy%2Bhs@example.org?subject='));
  assert.match(href, /subject=Checking%20in%2C%20from%20Fall%20%26%20Winter/);
  assert.match(href, /body=We%20missed%20you\.%0AHere%20is%20the%20recording%3F/);
  assert.equal(R.mailtoHref('nope', 's', 'b'), null);
  assert.equal(R.mailtoHref('a@b.org', '', ''), 'mailto:a@b.org');
});

test('a long draft is trimmed at a word and says so', () => {
  const href = R.mailtoHref('a@b.org', '', 'word '.repeat(1000));
  const body = decodeURIComponent(href.split('body=')[1]);
  assert.ok(body.length < R.MAX_BODY + 60);
  assert.match(body, /word\n\n\[Your draft was longer\. Paste the rest here\.\]$/);
});

test('the subject names the cohort', () => {
  assert.equal(R.reachSubject('Fall 2026'), 'Checking in, from Fall 2026');
  assert.equal(R.reachSubject(''), 'Checking in, from your Human Shaped cohort');
});

test('reach_for rows by person never hold an address someone did not allow', () => {
  const by = R.byPerson([
    { user_id: 'a', may_email: true, email: 'a@b.org' },
    { user_id: 'b', may_email: false, email: 'leak@b.org' },
    { user_id: 'c', may_email: false, email: null }
  ]);
  assert.deepEqual(by.a, { mayEmail: true, email: 'a@b.org' });
  assert.deepEqual(by.b, { mayEmail: false, email: null });
  assert.deepEqual(by.c, { mayEmail: false, email: null });
});
