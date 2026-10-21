// A teacher's polls for finding a weekly time, as a list (/teach/times/;
// migration 20261009010000). Each poll has its own page, /teach/times/poll/,
// and a new one is made on /teach/times/new/.
(function () {
  var root = document.querySelector('[data-teach-times]');
  if (!root || !window.supabase || !window.HUB || !window.TimesLib || !window.TeachTimesPage) return;
  var T = window.TimesLib, P = window.TeachTimesPage, el = P.el;

  // Old links named one poll as /teach/times/#<its id>.
  if (/^#[0-9a-f-]{36}$/.test(location.hash)) {
    location.replace('/teach/times/poll/?p=' + location.hash.slice(1));
    return;
  }

  var page = P.start(root, function (db) {
    return db.from('time_polls').select('*, time_poll_answers(count), cohorts(title)').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return page.fail('Your polls could not be loaded: ' + r.error.message);
      var box = root.querySelector('[data-poll-list]');
      box.replaceChildren();
      if (!r.data.length) box.appendChild(el('p', 'small', 'You have not made a poll yet.'));
      r.data.forEach(function (p) {
        var n = (p.time_poll_answers[0] || {}).count || 0;
        var card = el('article', 'cohort-card');
        var h = card.appendChild(el('h3'));
        var a = h.appendChild(el('a', null, p.title));
        a.href = '/teach/times/poll/?p=' + p.id;
        var state = (p.open ? 'Taking answers' : 'Closed') + (p.cohorts ? ', for ' + p.cohorts.title : '');
        card.appendChild(el('p', 'small', state + ', ' + n + (n === 1 ? ' answer' : ' answers') + '. ' +
          p.days.map(function (d) { return T.DAYS[d]; }).join(', ') + ', ' + T.hoursText(p) + '.'));
        box.appendChild(card);
      });
    });
  });
})();
