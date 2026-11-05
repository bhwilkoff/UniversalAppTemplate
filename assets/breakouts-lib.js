// Breakouts, without the page around them: who goes where, and who has
// arrived. See assets/breakouts.js.
(function (root) {
  // A sensible number of rooms: about four people each, and at least two.
  function roomCount(people) { return Math.max(2, Math.round((Number(people) || 0) / 4)); }

  // People dealt into rooms in turn, so no room runs more than one ahead.
  function split(ids, rooms) {
    var out = [];
    for (var i = 0; i < rooms; i++) out.push([]);
    (ids || []).forEach(function (id, i) { out[i % rooms].push(id); });
    return out;
  }

  // Who the panel says is in this room, from the class channel. A person is
  // there once they open the add-on in the room's call.
  function isIn(presence, id, groupId) {
    var mine = [].concat((presence || {})[id] || []);
    return mine.some(function (p) { return p && p.room === groupId; });
  }
  function arrived(group, presence) {
    var ids = (group.group_members || []).map(function (m) { return m.user_id; });
    return { here: ids.filter(function (id) { return isIn(presence, id, group.id); }), total: ids.length };
  }

  var lib = { roomCount: roomCount, split: split, isIn: isIn, arrived: arrived };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BreakoutsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
