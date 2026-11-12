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

  // People in an order set by chance but fixed by a seed, so the rooms a
  // leader sees before launching are the rooms that launch (a part's
  // random sorting, from Course Builder).
  function shuffle(ids, seed) {
    function h(t) { var x = 2166136261; for (var i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x; }
    return (ids || []).slice().sort(function (a, b) { return h(seed + ':' + a) - h(seed + ':' + b) || (a < b ? -1 : 1); });
  }

  // The cohort's own groups (cohorts.groups), as rooms for the people here:
  // each group keeps its name and whoever of it is here, an empty group
  // stays closed, and anyone in no group joins the smallest room.
  function fromGroups(groups, hereIds) {
    var here = {}, placed = {};
    (hereIds || []).forEach(function (id) { here[id] = true; });
    var rooms = [], names = [];
    (groups || []).forEach(function (g, i) {
      var ids = (g && Array.isArray(g.members) ? g.members : []).filter(function (id) { return here[id] && !placed[id]; });
      ids.forEach(function (id) { placed[id] = true; });
      if (!ids.length) return;
      rooms.push(ids); names.push(String((g && g.name) || ('Group ' + (i + 1))).slice(0, 60));
    });
    (hereIds || []).forEach(function (id) {
      if (placed[id]) return;
      if (!rooms.length) { rooms.push([]); names.push('Group 1'); }
      var small = 0;
      rooms.forEach(function (r, k) { if (r.length < rooms[small].length) small = k; });
      rooms[small].push(id); placed[id] = true;
    });
    return { rooms: rooms, names: names };
  }

  // Rooms as the cohort's groups, ready to keep: named, at most 40.
  function toGroups(rooms, names) {
    return (rooms || []).slice(0, 40).map(function (ids, i) {
      var n = String((names && names[i]) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      return { name: n || ('Group ' + (i + 1)), members: (ids || []).slice() };
    }).filter(function (g) { return g.members.length; });
  }

  var lib = { roomCount: roomCount, split: split, shuffle: shuffle, isIn: isIn, arrived: arrived, fromGroups: fromGroups, toGroups: toGroups };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BreakoutsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
