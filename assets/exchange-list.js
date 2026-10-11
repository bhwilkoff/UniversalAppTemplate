// Exchanges on /account/ (the ones a person started or added a video to,
// and starting a new one anywhere they belong) and on /cohort/ (the
// cohort's own). Each lists exchanges and starts new ones; the exchange
// itself opens at /exchange/#<link>, where its maker records first.
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

  // The new-exchange form. `where` is a fixed cohort id, or a <select>.
  function wireForm(form, opts) {
    var status = form.querySelector('[data-x-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var checked = X.checkExchange({
        title: form.elements.title.value, prompt: form.elements.prompt.value,
        cohort: opts.cohort || (form.elements.where ? form.elements.where.value : '')
      });
      if (checked.error) { status.textContent = checked.error; return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Starting it…';
      db.rpc('create_exchange', { title: checked.row.title, prompt: checked.row.prompt, cohort: checked.row.cohort }).then(function (r) {
        if (r.error) throw r.error;
        location.href = '/exchange/#' + r.data;
      }).catch(function (err) {
        btn.disabled = false;
        status.textContent = 'It was not started: ' + said(err) + '.';
      });
    });
  }
  function toggle(button, form) {
    button.addEventListener('click', function () {
      form.hidden = false;
      button.hidden = true;
      form.elements.title.focus();
    });
    var cancel = form.querySelector('[data-x-cancel]');
    if (cancel) cancel.addEventListener('click', function () { form.hidden = true; button.hidden = false; });
  }

  // ---- /account/ ----------------------------------------------------------
  function account(box) {
    db.auth.getSession().then(function (s) {
      var me = s.data && s.data.session ? s.data.session.user : null;
      if (!me) return;
      box.hidden = false;
      var list = box.querySelector('[data-x-list]');
      var form = box.querySelector('[data-x-form]');
      toggle(box.querySelector('[data-x-new]'), form);
      wireForm(form, {});
      // Where it can live: anywhere by link, or a cohort the person is in.
      Promise.all([
        db.from('enrollments').select('cohorts(id, title, status)').eq('user_id', me.id).neq('status', 'left'),
        db.from('cohort_teachers').select('cohorts(id, title, status)').eq('user_id', me.id)
      ]).then(function (res) {
        var seen = {}, sel = form.elements.where;
        res.forEach(function (r) {
          (r.data || []).forEach(function (x) {
            var c = x.cohorts;
            if (!c || seen[c.id] || c.status === 'finished') return;
            seen[c.id] = true;
            var o = el('option', null, 'Only the people in ' + c.title);
            o.value = c.id;
            sel.appendChild(o);
          });
        });
      });
      return db.rpc('my_exchanges').then(function (r) {
        if (r.error) throw r.error;
        var any = drawList(list, r.data, function (x) {
          var who = x.made ? 'You started it' : 'You added ' + (x.mine === 1 ? 'a video' : x.mine + ' videos');
          return who + (x.cohort_title ? ' in ' + x.cohort_title : '') + ', and it has ' + count(+x.videos) + '. Last active ' + X.ago(x.active_at) + '.';
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
          var form = box.querySelector('[data-x-form]');
          toggle(box.querySelector('[data-x-new]'), form);
          wireForm(form, { cohort: c.data.id });
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
