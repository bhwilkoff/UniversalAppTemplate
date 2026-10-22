// The leader's guide (/teach/guide/; PAGES.md): each step links to that
// step in a cohort the reader leads, chosen at the top when they lead
// more than one. Signed out, or leading none, the steps are plain text.
(function () {
  var root = document.querySelector('[data-guide]');
  if (!root || !window.CohortNav) return;
  var AT = { setup: 'teach', sessions: 'teach', followup: 'teach', people: 'teach', groups: 'teach', apps: 'teach', credentials: 'teach', settings: 'teach', talk: 'home', week: 'home', live: 'live' };
  var note = window.HS && window.HS.roles ? window.HS.roles() : null;
  var mine = ((note && note.cohorts) || []).filter(function (c) { return c.role === 'teacher' && c.status !== 'finished'; });
  function place(c, key) {
    if (key === 'edit') return '/teach/cohort/edit/?c=' + c.id;
    return window.CohortNav.href({ cohort: c }, { key: key, at: AT[key] });
  }
  function apply(c) {
    root.querySelectorAll('[data-place]').forEach(function (a) {
      if (c) a.href = place(c, a.getAttribute('data-place')); else a.removeAttribute('href');
    });
    root.querySelectorAll('.btn-secondary[data-place]').forEach(function (a) { a.hidden = !c; });
  }
  if (note && note.teacher && !mine.length) root.querySelector('[data-guide-none]').hidden = false;
  if (!mine.length) { apply(null); return; }
  var pick = root.querySelector('[data-guide-cohort]');
  mine.forEach(function (c) { var o = document.createElement('option'); o.value = c.id; o.textContent = c.title; pick.appendChild(o); });
  var kept = null;
  try { kept = localStorage.getItem('hs-guide-cohort'); } catch (e) {}
  if (kept && mine.some(function (c) { return c.id === kept; })) pick.value = kept;
  root.querySelector('[data-guide-for]').hidden = false;
  function chosen() { return mine.filter(function (c) { return c.id === pick.value; })[0] || mine[0]; }
  pick.addEventListener('change', function () {
    try { localStorage.setItem('hs-guide-cohort', pick.value); } catch (e) {}
    apply(chosen());
  });
  apply(chosen());
})();
