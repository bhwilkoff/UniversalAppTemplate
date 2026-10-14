// Exchanges on the signed-in home page (the ones a person started or added
// a video to, and starting a new one anywhere they belong) and on /cohort/ (the
// cohort's own). Each lists exchanges and starts new ones with their
// opening video; the exchange itself is at /exchange/#<link>.
(function () {
  var X = window.ExchangeLib;
  if (!X || !window.supabase || !window.HUB || !window.ExchangeRecorder || !window.ExchangeDrive) return;
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

  // The new-exchange form: a name, where it lives, and the opening video,
  // which is the exchange's prompt. The video goes to the maker's Drive
  // first; the exchange and its opening video are then made together.
  // `opts.cohort` is a fixed cohort id, or the form has a <select>.
  function wireForm(form, opts) {
    var status = form.querySelector('[data-x-status]');
    var bar = form.querySelector('[data-x-progress]');
    var submit = form.querySelector('button[type="submit"]');
    var recorder = null, busy = false, saved = null;
    function ready() { submit.disabled = busy || !(recorder && recorder.result()); }
    form.xOpen = function () {
      if (!recorder) recorder = window.ExchangeRecorder.mount(form.querySelector('[data-x-recorder]'), { onChange: ready });
      ready();
    };
    form.xClose = function () {
      if (recorder) recorder.reset();
      status.textContent = '';
      bar.hidden = true;
    };
    window.addEventListener('pagehide', function () { if (recorder) recorder.release(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var r = recorder && recorder.result();
      var where = opts.cohort || (form.elements.where ? form.elements.where.value : '');
      var members = where === 'members';
      var checked = X.checkExchange({ title: form.elements.title.value, video: !!r, cohort: members ? '' : where });
      if (checked.error) { status.textContent = checked.error; return; }
      busy = true; ready();
      status.textContent = 'Connecting your Google Drive…';
      // A video already saved for this same recording is not saved twice.
      var stored = saved && saved.result === r ? Promise.resolve(saved.id) : window.ExchangeDrive.connect(opts.email).then(function (gtoken) {
        bar.hidden = false; bar.value = 0;
        status.textContent = 'Saving to your Google Drive…';
        return window.ExchangeDrive.save(gtoken, r.blob, {
          name: X.fileName(checked.row.title, new Date(), r.mime), mime: r.mime,
          description: 'Recorded for "' + checked.row.title + '" on humanshaped.org.'
        }, function (f) {
          bar.value = Math.round(f * 100);
          status.textContent = 'Saving to your Google Drive… ' + Math.round(f * 100) + '%';
        });
      }).then(function (id) { saved = { result: r, id: id }; return id; });
      stored.then(function (fileId) {
        status.textContent = 'Starting the exchange…';
        return db.rpc('start_exchange', {
          title: checked.row.title, cohort: checked.row.cohort, drive_file_id: fileId, mime: X.baseType(r.mime),
          kind: r.kind, seconds: r.seconds, note: form.elements.note.value.trim() || null, members: members
        });
      }).then(function (res) {
        if (res.error) throw new Error('your video is in your Drive, but the exchange did not start: ' + res.error.message);
        location.href = '/exchange/#' + res.data;
      }).catch(function (err) {
        busy = false; ready();
        bar.hidden = true;
        status.textContent = 'It was not started: ' + said(err) + '. Your video is still here, so you can try again.';
      });
    });
  }
  function toggle(button, form) {
    button.addEventListener('click', function () {
      form.hidden = false;
      button.hidden = true;
      form.xOpen();
      form.elements.title.focus();
    });
    var cancel = form.querySelector('[data-x-cancel]');
    if (cancel) cancel.addEventListener('click', function () { form.xClose(); form.hidden = true; button.hidden = false; });
  }

  // ---- the signed-in home (/) ---------------------------------------------
  function account(box) {
    db.auth.getSession().then(function (s) {
      var me = s.data && s.data.session ? s.data.session.user : null;
      if (!me) return;
      box.hidden = false;
      var list = box.querySelector('[data-x-list]');
      var form = box.querySelector('[data-x-form]');
      wireForm(form, { email: me.email });
      toggle(box.querySelector('[data-x-new]'), form);
      // Where it can live: anywhere by link, for Human Shaped members, or
      // in a cohort the person is in or teaches.
      var sel = form.elements.where;
      Promise.all([
        db.rpc('am_i_a_member'),
        db.from('enrollments').select('cohorts(id, title, status)').eq('user_id', me.id).neq('status', 'left'),
        db.from('cohort_teachers').select('cohorts(id, title, status)').eq('user_id', me.id)
      ]).then(function (res) {
        if (res[0].data === true) {
          var m = el('option', null, 'Human Shaped members (people in a cohort, now or before, and teachers)');
          m.value = 'members';
          sel.appendChild(m);
        }
        var seen = {}, any = false;
        res.slice(1).forEach(function (r) {
          (r.data || []).forEach(function (x) {
            var c = x.cohorts;
            if (!c || seen[c.id] || c.status === 'finished') return;
            seen[c.id] = any = true;
            var o = el('option', null, 'Only the people in ' + c.title);
            o.value = c.id;
            sel.appendChild(o);
          });
        });
        if (!any) {
          var none = el('option', null, 'Only the people in one of your cohorts (you are in none yet)');
          none.disabled = true;
          sel.appendChild(none);
        }
      });
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
          var form = box.querySelector('[data-x-form]');
          wireForm(form, { cohort: c.data.id, email: s.data.session.user.email });
          toggle(box.querySelector('[data-x-new]'), form);
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
