// Exchanges on the signed-in home page (the ones a person started or added
// a video to) and on /cohort/ (the cohort's own), as rows that open each
// one at /exchange/#<link>. Starting one is its own page, /exchange/new/.
(function () {
  var X = window.ExchangeLib;
  if (!X || !window.supabase || !window.HUB) return;
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function count(n) { return n === 0 ? 'no videos yet' : n === 1 ? 'one video' : n + ' videos'; }

  function drawList(box, rows, line) {
    box.replaceChildren();
    if (!rows.length) return false;
    var ul = el('ul', 'x-list');
    rows.forEach(function (r) {
      var li = el('li');
      var a = el('a', 'x-list-title', r.title);
      a.href = '/exchange/#' + r.token;
      li.appendChild(a);
      li.appendChild(el('span', 'x-list-line', line(r)));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return true;
  }

  // ---- the signed-in home (/) ---------------------------------------------
  function account(box) {
    db.auth.getSession().then(function (s) {
      var me = s.data && s.data.session ? s.data.session.user : null;
      if (!me) return;
      box.hidden = false;
      var list = box.querySelector('[data-x-list]');
      return db.rpc('my_exchanges').then(function (r) {
        if (r.error) throw r.error;
        var any = drawList(list, r.data, function (x) {
          var who = x.made ? 'You started it' : 'You added ' + (x.mine === 1 ? 'a video' : x.mine + ' videos');
          return who + (x.cohort_title ? ' in ' + x.cohort_title : x.for_members ? ' for Human Shaped members' : '') + ', and it has ' + count(+x.videos) + '. Last active ' + X.ago(x.active_at) + '.';
        });
        if (!any) list.appendChild(el('p', 'small', 'Exchanges you start or add a video to will be here.'));
        if (location.hash === '#exchanges') box.scrollIntoView();
      });
    }).catch(function (e) {
      box.querySelector('[data-x-list]').textContent = 'Your exchanges could not be loaded: ' + said(e) + '.';
    });
  }

  // ---- /cohort/?c= ---------------------------------------------------------
  function cohort(box) {
    var slug = new URLSearchParams(location.search).get('c') || '';
    if (!slug) return;
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) return;
      return db.from('cohorts').select('id, title').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error || !c.data) return;
        return db.rpc('cohort_exchanges', { cohort: c.data.id }).then(function (r) {
          if (r.error) return;
          box.hidden = false;
          var list = box.querySelector('[data-x-list]');
          box.querySelector('[data-x-new]').href = '/exchange/new/?c=' + c.data.id;
          var any = drawList(list, r.data, function (x) {
            return 'Started by ' + x.maker + ', with ' + count(+x.videos) + (x.replies_open ? '' : ', closed to new videos') + '. Last active ' + X.ago(x.active_at) + '.';
          });
          if (!any) list.appendChild(el('p', 'small', 'No exchanges yet in this cohort.'));
        });
      });
    });
  }

  var a = document.querySelector('[data-exchanges-account]');
  if (a) account(a);
  var c = document.querySelector('[data-exchanges-cohort]');
  if (c) cohort(c);
})();
