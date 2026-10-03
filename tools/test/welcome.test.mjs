import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/addon-lib.js');
const C = require('../../assets/cohort-lib.js');

const cohort = { title: 'Cohort 1', session_minutes: 75 };
const session = { number: 2, title: 'Prove it', scope: 'Ship the first screen.' };
const W = C.welcome(cohort, session, C.agenda(75));

test('the welcome carries the cohort, the week, the challenge, and how we begin', () => {
  assert.equal(W.cohort, 'Cohort 1');
  assert.equal(W.week, 2);
  assert.equal(W.title, 'Prove it');
  assert.equal(W.challenge, 'Ship the first screen.');
  assert.equal(W.first.name, 'Arrive');
  assert.equal(C.welcome(cohort, { number: 3, title: 'Week 3' }, []).title, null);
  assert.equal(C.welcome(cohort, { number: 3 }, []).challenge, null);
  assert.equal(C.welcome(null, session, []), null);
});

test('before any part begins, the stage shows the welcome', () => {
  assert.equal(A.stageView({ welcome: W }).mode, 'welcome');
  assert.equal(A.stageView({ welcome: W, part: { key: 'arrive', name: 'Arrive', endsAt: null } }).mode, 'part');
  assert.equal(A.stageView({}).mode, 'part');
});

test('the teacher can put the welcome back on the stage during a part', () => {
  const v = A.stageView({ welcome: W, part: { key: 'show', name: 'Show', endsAt: 5 }, onStage: { kind: 'welcome' } });
  assert.equal(v.mode, 'welcome');
  assert.equal(v.welcome.challenge, 'Ship the first screen.');
});

test('a welcome survives the trip to the stage, and a malformed one is refused', () => {
  const v = A.stageView({ welcome: W });
  assert.deepEqual(A.readStageMessage(A.stageMessage(v)), v);
  assert.equal(A.readStageMessage(JSON.stringify({ type: 'hs-stage', v: 1, view: { mode: 'welcome', welcome: { cohort: 7 } } })), null);
  const long = A.readStageMessage(A.stageMessage({ mode: 'welcome', part: null, welcome: { cohort: 'C', challenge: 'x'.repeat(900) } }));
  assert.equal(long.welcome.challenge.length, 400);
});
