// The open cohorts on /cohorts/, read straight from the hub. Anyone may
// read a cohort that is not a draft; joining happens on /account/, after
// sign-in, where the person is asked once more.
(function () {
  var box = document.querySelector('[data-open-list]');
  if (!box || !window.supabase || !window.HUB || !window.TeachLib) return;
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  db.from('cohorts')
    .select('slug, title, description, starts_on, weeks, capacity, session_weekday, session_time, session_minutes, time_zone')
    .eq('status', 'open').order('starts_on')
    .then(function (r) {
      if (r.error || !r.data.length) return;
      r.data.forEach(function (c) {
        var card = el('article', 'open-cohort');
        card.appendChild(el('h3', null, c.title));
        card.appendChild(el('p', 'small', TeachLib.openingLine(c)));
        card.appendChild(el('p', 'small', TeachLib.scheduleText(c, zone)));
        if (c.description) card.appendChild(el('p', null, c.description));
        var join = el('a', 'btn-github', 'Join with GitHub');
        join.href = '/account/?join=' + encodeURIComponent(c.slug);
        var actions = el('div', 'actions'); actions.appendChild(join); card.appendChild(actions);
        box.appendChild(card);
      });
      box.hidden = false;
      document.querySelector('[data-none-open]').hidden = true;
      document.querySelector('[data-some-open]').hidden = false;
    });
})();
