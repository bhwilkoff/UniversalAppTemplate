import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/showcase-lib.js');

const row = (over = {}) => Object.assign({
  cohort_title: 'Human Shaped Software, cohort 1',
  cohort_slug: 'c1',
  session_number: 5,
  starts_at: '2026-11-18T00:00:00Z',
  minutes: 90,
  time_zone: 'America/Denver',
  title: 'The showing',
  guest_link: null,
  apps: [{ app_name: 'Bird Log', app_repo: 'bea/bird-log', app_url: 'https://bird.example.org' }]
}, over);

test('a showcase row is checked and cut to size before a page shows it', () => {
  const s = S.cleanShowcase(row({
    guest_link: 'javascript:alert(1)',
    apps: [{ app_repo: 'bea/bird-log', app_url: 'http://insecure.example' }, { app_repo: 'not a repo' }, null]
  }));
  assert.equal(s.slug, 'c1');
  assert.equal(s.guestLink, null);
  assert.deepEqual(s.apps, [{ repo: 'bea/bird-log', name: 'bird-log', url: null }]);
  assert.equal(s.endsAt, '2026-11-18T01:30:00.000Z');
  assert.equal(S.cleanShowcase(row({ cohort_slug: '../evil' })), null);
  assert.equal(S.cleanShowcase(row({ guest_link: 'https://meet.google.com/abc-defg-hij' })).guestLink, 'https://meet.google.com/abc-defg-hij');
});

test('a guest following the link sees the next showing, or else the latest', () => {
  const rows = [row({ starts_at: '2026-10-01T00:00:00Z', title: 'Old' }), row({ starts_at: '2026-11-18T00:00:00Z' }), row({ cohort_slug: 'c2' })];
  assert.equal(S.showcaseFor(rows, 'c1', new Date('2026-11-01T00:00:00Z')).title, 'The showing');
  assert.equal(S.showcaseFor(rows, 'c1', new Date('2026-12-01T00:00:00Z')).title, 'The showing');
  assert.equal(S.showcaseFor(rows, 'nope', new Date()), null);
});

test('a showing is upcoming, on now, or over', () => {
  const s = S.cleanShowcase(row());
  assert.equal(S.stateOf(s, new Date('2026-11-17T23:59:00Z')), 'upcoming');
  assert.equal(S.stateOf(s, new Date('2026-11-18T01:00:00Z')), 'now');
  assert.equal(S.stateOf(s, new Date('2026-11-18T02:00:00Z')), 'over');
});

test('showcases join the events list in the cohort\'s own time zone, in order', () => {
  // 00:00 UTC on November 18 is 5 pm on November 17 in Denver.
  const split = S.splitShowcases([row()], new Date('2026-11-01T00:00:00Z'));
  const e = split.upcoming[0];
  assert.equal(e.kind, 'showcase');
  assert.equal(e.starts.day, '2026-11-17');
  assert.equal(e.starts.h, 17);
  assert.equal(e.link, '/showcase/?c=c1');
  const community = { upcoming: [{ starts: { day: '2026-11-20', h: 18, min: 0 } }, { starts: { day: '2026-11-10' } }], past: [] };
  assert.deepEqual(S.mergeSplits(community, split).upcoming.map((x) => x.starts.day), ['2026-11-10', '2026-11-17', '2026-11-20']);
});

test('the lesson is offered once the last session has begun, or the cohort is finished', () => {
  const sessions = [{ number: 4, starts_at: '2026-11-10T00:00:00Z' }, { number: 5, starts_at: '2026-11-17T00:00:00Z' }];
  assert.equal(S.lessonTime({ status: 'running', weeks: 5 }, sessions, new Date('2026-11-12T00:00:00Z')), false);
  assert.equal(S.lessonTime({ status: 'running', weeks: 5 }, sessions, new Date('2026-11-17T01:00:00Z')), true);
  assert.equal(S.lessonTime({ status: 'finished', weeks: 5 }, [], new Date()), true);
  assert.equal(S.lessonTime(null, sessions, new Date()), false);
});

test('the lesson goes to the template as an issue that names no one', () => {
  const url = new URL(S.lessonIssueUrl('Cohort 1'));
  assert.equal(url.origin + url.pathname, 'https://github.com/bhwilkoff/UniversalAppTemplate/issues/new');
  assert.equal(url.searchParams.get('title'), 'A lesson from Cohort 1: ');
  assert.match(url.searchParams.get('body'), /only if each of them said yes/);
  assert.equal(new URL(S.lessonIssueUrl('')).searchParams.get('title'), 'A lesson from a cohort: ');
});
