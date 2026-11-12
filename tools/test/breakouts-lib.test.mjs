import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/breakouts-lib.js');

test('about four to a room, and never fewer than two rooms', () => {
  assert.equal(lib.roomCount(4), 2);
  assert.equal(lib.roomCount(30), 8);
  assert.equal(lib.roomCount(0), 2);
});
test('people are dealt evenly', () => {
  assert.deepEqual(lib.split(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'c', 'e'], ['b', 'd']]);
});
test('a person has arrived once their add-on says it is in the room', () => {
  const g = { id: 'r1', group_members: [{ user_id: 'a' }, { user_id: 'b' }] };
  assert.deepEqual(lib.arrived(g, { a: [{ room: 'r1' }], b: [{ room: null }] }), { here: ['a'], total: 2 });
  assert.deepEqual(lib.arrived(g, {}), { here: [], total: 2 });
});

test('a random order is the same for the same seed, and different for another', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const one = lib.shuffle(ids, 'part-1');
  assert.deepEqual(lib.shuffle(ids, 'part-1'), one);
  assert.deepEqual(one.slice().sort(), ids);
  assert.notDeepEqual(lib.shuffle(ids, 'part-2'), one);
});

test('the cohort’s groups become rooms for the people here, and newcomers join the smallest', () => {
  const groups = [{ name: 'Builders', members: ['a', 'b', 'c'] }, { name: 'Makers', members: ['d', 'e'] }, { name: 'Away', members: ['z'] }];
  const r = lib.fromGroups(groups, ['a', 'b', 'd', 'n']);
  assert.deepEqual(r.names, ['Builders', 'Makers']);
  assert.deepEqual(r.rooms, [['a', 'b'], ['d', 'n']]);
  assert.deepEqual(lib.fromGroups([], ['a']).rooms, [['a']]);
});

test('rooms kept as groups carry names, and an empty room is not kept', () => {
  assert.deepEqual(lib.toGroups([['a'], [], ['b', 'c']], ['  Front  row ', 'x', '']), [{ name: 'Front row', members: ['a'] }, { name: 'Group 3', members: ['b', 'c'] }]);
});
